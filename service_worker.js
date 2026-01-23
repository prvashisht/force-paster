const BADGE_TEXT_COLOR = "#ffffff",
BADGE_TEXT_ENABLED = "on",
BADGE_TEXT_DISABLED = "off",
BADGE_BG_ENABLED = "#518c60",
BADGE_BG_DISABLED = "#ff0000";

import { sendProxyEvent } from "./analytics.js";

let forcePasterSettings = {
    isPasteEnabled: false,
    clickCount: 0,
    pasteCount: 0,
};

let saveAndApplyExtensionDetails = newData => {
    forcePasterSettings = {
        ...forcePasterSettings,
        ...newData,
    };
    chrome.storage.local.set({ 'forcepaster': forcePasterSettings });
    setExtensionUninstallURL(forcePasterSettings);
    chrome.action.setBadgeText({ text: forcePasterSettings.isPasteEnabled ? BADGE_TEXT_ENABLED : BADGE_TEXT_DISABLED });
    chrome.action.setBadgeBackgroundColor({ color: forcePasterSettings.isPasteEnabled ? BADGE_BG_ENABLED : BADGE_BG_DISABLED });
}

let setExtensionUninstallURL = debugData => {
    const encodedDebugData = encodeURIComponent(
        Object.keys(debugData).sort()
            .map(key => `${key}: ${debugData[key]}`)
            .join("\n")
    );
    chrome.runtime.setUninstallURL(`https://pratyushvashisht.com/forcepaster/uninstall?utm_source=chrome&utm_medium=extension&utm_campaign=uninstall&debugData=${encodedDebugData}`);
};

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
                pasteStart: forcePasterSettings.pasteCount + 1,
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

    try {
        await sendProxyEvent("extension_installed", { reason: installInfo.reason });
    } catch (e) {
        console.warn("analytics failed", e);
    }

    const platformInfo = await chrome.runtime.getPlatformInfo();
    // let isExtensionPinned = await chrome.action.getUserSettings().isOnToolbar;
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
    saveAndApplyExtensionDetails({
        isPasteEnabled: false,
        clickCount: 0,
        pasteCount: 0,
        ...debugData
    });
    chrome.action.setBadgeTextColor({ color: BADGE_TEXT_COLOR });
});
