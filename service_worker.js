chrome.action.setBadgeTextColor({
    color: "#fff"
});

let isForcePasterEnabled = false;
let change_icon_settings = (isEnabled) => {
    isForcePasterEnabled = isEnabled;
    chrome.action.setBadgeText({ text: isEnabled ? "on" : "off" });
    chrome.action.setBadgeBackgroundColor({ color: isEnabled ? "#518c60" : "#ff0000" });
}

chrome.storage.local.set({ 'isForcePasterEnabled': false }, () => {
    change_icon_settings(false)
});

chrome.action.onClicked.addListener(() => { 
    chrome.storage.local.set({'isForcePasterEnabled': !isForcePasterEnabled}, () => {
        change_icon_settings(!isForcePasterEnabled);
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