let forcePasterSettings = {
    isPasteEnabled: false,
    clickCount: 0,
    pasteCount: 0,
};

chrome.storage.local.get(['forcepaster'], function(item) {
    forcePasterSettings = item.forcepaster || forcePasterSettings;
})
chrome.storage.onChanged.addListener(function(changes) {
    forcePasterSettings = changes.forcepaster.newValue || forcePasterSettings;
});

let darkModeListener = (isDarkMode) => {
    chrome.runtime.sendMessage({
        type: "themechange",
        mode: isDarkMode.matches ? 'dark' : 'light',
    });
}
// MediaQueryList
const darkModePreference = window.matchMedia("(prefers-color-scheme: dark)");
darkModePreference.addEventListener("change", darkModeListener);
// set icons on initial load
darkModeListener(darkModePreference);

const isInputOrTextarea = (currEle) => ["input", "textarea"].includes(currEle.tagName.toLowerCase());
document.body.onpaste = event => {
    let currEle = document.activeElement;
    if (forcePasterSettings.isPasteEnabled) {
        chrome.runtime.sendMessage({ type: "onpastestart", on: currEle.tagName.toLowerCase() })
        if (!isInputOrTextarea(currEle)) return;
        let currVal = currEle.value;

        // Stop data actually being pasted into div
        event.stopPropagation();
        event.preventDefault();

        // Get pasted data via clipboard API
        let clipboardData = event.clipboardData || window.clipboardData || event.originalEvent.clipboardData;
        const pastedText = clipboardData.getData('Text');
        
        let finalVal = currVal.slice(0, currEle.selectionStart) + pastedText;
        let caretPos = finalVal.length; //get position to place caret after pasting
        finalVal += currVal.slice(currEle.selectionEnd);
        currEle.value = "";
        currEle.value = finalVal;
        setCaretPositionToEndOfPastedText(currEle, caretPos);
        chrome.runtime.sendMessage({ type: "onpastecomplete" }, response => {
            if (response.totalPastes > 10) {
                // TODO: show a dismissible box at the top right of the page
                // asking users to rate the extension on the webstore if they liked using it
                // show buttons to proceed, rate never, or rate later.
            }
        });
    }
};

function setCaretPositionToEndOfPastedText(elem, caretPos) {
    if (elem != null) {
        if (elem.selectionStart) {
            elem.focus();
            elem.setSelectionRange(caretPos, caretPos);
        } else {
            elem.focus();
        }
    }
}
