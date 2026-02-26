const BADGE_TEXT_COLOR = "#ffffff",
BADGE_TEXT_ENABLED = "on",
BADGE_TEXT_DISABLED = "off",
BADGE_BG_ENABLED = "#518c60",
BADGE_BG_DISABLED = "#ff0000";

import { sendProxyEvent, TOKEN_STORAGE_KEY, CLIENT_ID_STORAGE_KEY } from "./analytics.js";

let forcePasterSettings = {
    isPasteEnabled: false,
    clickCount: 0,
    pasteCount: 0,
};

// Restore persisted state on service worker startup and sync the context menu checkbox.
chrome.storage.local.get(['forcepaster'], (item) => {
    if (item.forcepaster) {
        forcePasterSettings = item.forcepaster;
        chrome.contextMenus.update("toggle", { checked: forcePasterSettings.isPasteEnabled }).catch(() => {});
    }
});

let saveAndApplyExtensionDetails = newData => {
    forcePasterSettings = {
        ...forcePasterSettings,
        ...newData,
    };
    chrome.storage.local.set({ 'forcepaster': forcePasterSettings });
    setExtensionUninstallURL(forcePasterSettings).catch(e => {
        console.warn("setExtensionUninstallURL failed", e);
    });
    chrome.action.setBadgeText({ text: forcePasterSettings.isPasteEnabled ? BADGE_TEXT_ENABLED : BADGE_TEXT_DISABLED });
    chrome.action.setBadgeBackgroundColor({ color: forcePasterSettings.isPasteEnabled ? BADGE_BG_ENABLED : BADGE_BG_DISABLED });
    chrome.contextMenus.update("toggle", { checked: forcePasterSettings.isPasteEnabled }).catch(() => {});
}

let setExtensionUninstallURL = async debugData => {
    const encodedDebugData = encodeURIComponent(
        Object.keys(debugData).sort()
            .map(key => `${key}: ${debugData[key]}`)
            .join("\n")
    );

    const storageKeys  = await chrome.storage.local.get([TOKEN_STORAGE_KEY, CLIENT_ID_STORAGE_KEY]);
    const token = storageKeys[TOKEN_STORAGE_KEY];
    const clientId = storageKeys[CLIENT_ID_STORAGE_KEY];

    const url = new URL("https://vashis.ht/forcepaster/uninstall");
    url.searchParams.set("utm_source", "chrome");
    url.searchParams.set("utm_medium", "extension");
    url.searchParams.set("utm_campaign", "uninstall");
    url.searchParams.set("debugData", encodedDebugData);

    const hashedParams = new URLSearchParams();
    if (token) hashedParams.set("token", token);
    if (clientId) hashedParams.set("client_id", clientId);
    url.hash = hashedParams.toString();
    
    console.log("Setting uninstall URL:", url.toString());
    chrome.runtime.setUninstallURL( url.toString() );
};

function buildContextMenus() {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({ id: "toggle", type: "checkbox", title: "Enable Force Paste", contexts: ["action"], checked: forcePasterSettings.isPasteEnabled });
        // chrome.contextMenus.create({ id: "sep1", type: "separator", contexts: ["action"] });
        chrome.contextMenus.create({ id: "shortcuts", title: "Manage keyboard shortcuts", contexts: ["action"] });
        // chrome.contextMenus.create({ id: "sep2", type: "separator", contexts: ["action"] });
        chrome.contextMenus.create({ id: "options", title: "Open dashboard", contexts: ["action"] });
        // chrome.contextMenus.create({ id: "sep3", type: "separator", contexts: ["action"] });
        chrome.contextMenus.create({ id: "rate", title: "⭐  Rate Force Paster", contexts: ["action"] });
        chrome.contextMenus.create({ id: "bug", title: "🐛  Report a bug", contexts: ["action"] });
    });
}

chrome.action.onClicked.addListener(async () => {
    const isNextEnabled = !forcePasterSettings.isPasteEnabled;
    saveAndApplyExtensionDetails({
        isPasteEnabled: isNextEnabled,
        clickCount: forcePasterSettings.clickCount + 1,
    });
    try {
        await sendProxyEvent("fp_toggle", {
            enabled: isNextEnabled,
            source: "action_icon"
        });
    } catch (e) {
        console.warn("analytics fp_toggle failed", e);
    }
});

chrome.contextMenus.onClicked.addListener(async (info) => {
    switch (info.menuItemId) {
        case "toggle": {
            saveAndApplyExtensionDetails({
                isPasteEnabled: info.checked,
                clickCount: forcePasterSettings.clickCount + 1,
            });
            try {
                await sendProxyEvent("fp_toggle", { enabled: info.checked, source: "context_menu" });
            } catch (e) {
                console.warn("analytics fp_toggle failed", e);
            }
            break;
        }
        case "shortcuts":
            try {
                await chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
            } catch {
                chrome.runtime.openOptionsPage();
            }
            break;
        case "options":
            chrome.runtime.openOptionsPage();
            break;
        case "rate":
            chrome.tabs.create({ url: "https://vashis.ht/rd/forcepaster?from=extension-context-menu" });
            break;
        case "bug":
            chrome.tabs.create({ url: "https://github.com/prvashisht/force-paster/issues/new" });
            break;
    }
});

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    const { type, on } = request;
    if (type === "themechange") {
        const icon_paths = {
            "16": `icons/${request.mode}/icon16.png`,
            "32": `icons/${request.mode}/icon32.png`,
            "48": `icons/${request.mode}/icon48.png`,
            "128": `icons/${request.mode}/icon128.png`
        };
        chrome.action.setIcon({path: icon_paths});
    } else if (type === "onpastestart") {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            saveAndApplyExtensionDetails({
                lastDomain: (new URL(tabs[0].url)).hostname,
                lastTag: on,
            });
        })
    } else if (type === "onpastecomplete") {
        saveAndApplyExtensionDetails({ pasteCount: forcePasterSettings.pasteCount + 1, });
        try {
            await sendProxyEvent("fp_paste", {
                tag: forcePasterSettings.lastTag ?? null,
                domain: forcePasterSettings.lastDomain ?? null,
                source: "paste_event"
            });
        } catch (e) {
            console.warn("analytics fp_paste failed", e);
        }
        sendResponse({ totalPastes: forcePasterSettings.pasteCount });
    } else if (type === "setenabled") {
        saveAndApplyExtensionDetails({
            isPasteEnabled: request.enabled,
            clickCount: forcePasterSettings.clickCount + 1,
        });
        try {
            await sendProxyEvent("fp_toggle", { enabled: request.enabled, source: "options_page" });
        } catch (e) {
            console.warn("analytics fp_toggle failed", e);
        }
        sendResponse({ ok: true });
    }
    return true;
});

chrome.runtime.onInstalled.addListener(async installInfo => {
    let installDate, updateDate;
    if (installInfo.reason === "install") {
        installDate = new Date().toISOString();
    } else {
        updateDate = new Date().toISOString();
    }

    const platformInfo = await chrome.runtime.getPlatformInfo();
    let debugData = {
        ...platformInfo,
        agent: navigator.userAgent,
        locale: navigator.language,
        platform: navigator.platform,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        version: chrome.runtime.getManifest().version,
    }
    if (installDate) debugData.installDate = installDate;
    if (updateDate) debugData.updateDate = updateDate;

    try {
        await sendProxyEvent(
            "extension_installed",
            { reason: installInfo.reason },
            {
                userProperties: {
                    ...debugData,
                    install_reason: installInfo.reason,
                    is_fresh_install: installInfo.reason === "install" ? 1 : 0
                }
            });
    } catch (e) {
        console.warn("analytics failed", e);
    }

    if (installInfo.reason === "install") {
        saveAndApplyExtensionDetails({
            isPasteEnabled: false,
            clickCount: 0,
            pasteCount: 0,
            ...debugData
        });
    } else {
        // On update/reload, preserve the user's toggle state and counts.
        // Only refresh the platform/version debug fields.
        const { forcepaster } = await chrome.storage.local.get('forcepaster');
        saveAndApplyExtensionDetails({ ...(forcepaster || {}), ...debugData });
    }
    chrome.action.setBadgeTextColor({ color: BADGE_TEXT_COLOR });
    buildContextMenus();
});
