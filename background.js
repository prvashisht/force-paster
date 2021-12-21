var isForcePasterEnabled = false;
chrome.storage.local.set({'isForcePasterEnabled': false}, function() {
    chrome.browserAction.setBadgeText({
        text: "off"
    });

    chrome.browserAction.setBadgeBackgroundColor({
        color: "#ff0000"
    });
});

chrome.browserAction.onClicked.addListener(function(tab) { 
    chrome.storage.local.set({'isForcePasterEnabled': !isForcePasterEnabled}, function() {
        isForcePasterEnabled = !isForcePasterEnabled;
        chrome.browserAction.setBadgeText({
            text: isForcePasterEnabled ? "on" : "off"
        });
        chrome.browserAction.setBadgeBackgroundColor({
            color: isForcePasterEnabled ? "#518c60" : "#ff0000"
        });
    });
});
