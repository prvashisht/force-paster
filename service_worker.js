var isForcePasterEnabled = false;
chrome.storage.local.set({'isForcePasterEnabled': false}, function() {
    chrome.action.setBadgeText({
        text: "off"
    });

    chrome.action.setBadgeBackgroundColor({
        color: "#ff0000"
    });
});

chrome.action.onClicked.addListener(function(tab) { 
    chrome.storage.local.set({'isForcePasterEnabled': !isForcePasterEnabled}, function() {
        isForcePasterEnabled = !isForcePasterEnabled;
        chrome.action.setBadgeText({
            text: isForcePasterEnabled ? "on" : "off"
        });
        chrome.action.setBadgeBackgroundColor({
            color: isForcePasterEnabled ? "#518c60" : "#ff0000"
        });
    });
});

chrome.runtime.setUninstallURL('https://forms.gle/S7xqSYG6xZjcdzwa6');