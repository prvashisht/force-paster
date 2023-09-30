const BADGE_TEXT_COLOR = "#ffffff",
BADGE_TEXT_ENABLED = "on",
BADGE_TEXT_DISABLED = "off",
BADGE_BG_ENABLED = "#518c60",
BADGE_BG_DISABLED = "#ff0000";

let isForcePasterEnabled = false;

let setExtensionIconToMatchEnabledState = (isEnabled) => {
    isForcePasterEnabled = isEnabled;
    chrome.action.setBadgeText({ text: isEnabled ? BADGE_TEXT_ENABLED : BADGE_TEXT_DISABLED });
    chrome.action.setBadgeBackgroundColor({ color: isEnabled ? BADGE_BG_ENABLED : BADGE_BG_DISABLED });
}

chrome.action.setBadgeTextColor({
    color: BADGE_TEXT_COLOR
});

chrome.storage.local.set({ 'isForcePasterEnabled': false }, () => {
    setExtensionIconToMatchEnabledState(false)
});

chrome.action.onClicked.addListener(() => { 
    chrome.storage.local.set({'isForcePasterEnabled': !isForcePasterEnabled}, () => {
        setExtensionIconToMatchEnabledState(!isForcePasterEnabled);
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

chrome.runtime.setUninstallURL('https://forms.gle/S7xqSYG6xZjcdzwa6');