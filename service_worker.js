const BADGE_TEXT_COLOR = "#ffffff",
BADGE_TEXT_ENABLED = "on",
BADGE_TEXT_DISABLED = "off",
BADGE_BG_ENABLED = "#518c60",
BADGE_BG_DISABLED = "#ff0000";

let forcePasterSettings = {
    enabled: false
};

let setExtensionIconToMatchEnabledState = isEnabled => {
    forcePasterSettings.enabled = isEnabled
    chrome.action.setBadgeText({ text: isEnabled ? BADGE_TEXT_ENABLED : BADGE_TEXT_DISABLED });
    chrome.action.setBadgeBackgroundColor({ color: isEnabled ? BADGE_BG_ENABLED : BADGE_BG_DISABLED });
};

let setExtensionUninstallURL = encodedTechnicalDetails => {
    chrome.runtime.setUninstallURL(`https://docs.google.com/forms/d/e/1FAIpQLSe_DgFmYp0ODEi2-rwNufV5SAJ4ZTywhf-gAYBSNi5myZn1Lg/viewform?usp=pp_url&entry.375030464=${encodedTechnicalDetails}`);
};

chrome.action.setBadgeTextColor({
    color: BADGE_TEXT_COLOR
});

chrome.storage.local.set({ 'forcepaster': forcePasterSettings }, () => {
    setExtensionIconToMatchEnabledState(forcePasterSettings.enabled)
});

chrome.action.onClicked.addListener(() => {
    chrome.storage.local.set({ 'forcepaster': { enabled: !forcePasterSettings.enabled } }, () => {
        setExtensionIconToMatchEnabledState(!forcePasterSettings.enabled);
    });
});

chrome.runtime.onMessage.addListener((request) => {
    if (request.type === "themeChange") {
        let icon_paths = {
            "16": `icons/${request.mode}/icon16.png`,
            "32": `icons/${request.mode}/icon32.png`,
            "48": `icons/${request.mode}/icon48.png`,
            "128": `icons/${request.mode}/icon128.png`
        };
        chrome.action.setIcon({path: icon_paths});
    }
});

chrome.runtime.onInstalled.addListener(installInfo => {
    let installDate, updateDate;
    if (installInfo.reason === "install") {
        installDate = new Date();
    } else {
        updateDate = new Date().toISOString();
    }
    chrome.runtime.getPlatformInfo(platformInfo => {
        let debugData = {
            ...platformInfo,
            agent: navigator.userAgent,
            locale: navigator.language,
            platform: navigator.platform,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }
        if (installDate) debugData.installDate = installDate;
        if (updateDate) debugData.updateDate = updateDate;

        console.log(debugData);
        const encodedDetails = encodeURIComponent(
            Object.keys(debugData)
                .map(debugKey => `${debugKey}: ${debugData[debugKey]}`)
                .join("\n")
        );
        setExtensionUninstallURL(encodedDetails);
    });
});