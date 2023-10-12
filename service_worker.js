const BADGE_TEXT_COLOR = "#ffffff",
BADGE_TEXT_ENABLED = "on",
BADGE_TEXT_DISABLED = "off",
BADGE_BG_ENABLED = "#518c60",
BADGE_BG_DISABLED = "#ff0000";

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
    chrome.runtime.setUninstallURL(`https://docs.google.com/forms/d/e/1FAIpQLSe_DgFmYp0ODEi2-rwNufV5SAJ4ZTywhf-gAYBSNi5myZn1Lg/viewform?usp=pp_url&entry.375030464=${encodedDebugData}`);
};

chrome.action.onClicked.addListener(() => {
    saveAndApplyExtensionDetails({
        isPasteEnabled: !forcePasterSettings.isPasteEnabled,
        clickCount: forcePasterSettings.clickCount + 1,
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const { type } = request;
    if (type === "themechange") {
        const icon_paths = {
            "16": `icons/${request.mode}/icon16.png`,
            "32": `icons/${request.mode}/icon32.png`,
            "48": `icons/${request.mode}/icon48.png`,
            "128": `icons/${request.mode}/icon128.png`
        };
        chrome.action.setIcon({path: icon_paths});
    } else if (type === "onpaste") {
        saveAndApplyExtensionDetails({
            pasteCount: forcePasterSettings.pasteCount + 1,
        });
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
