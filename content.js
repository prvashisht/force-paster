let forcePasterSettings = {
    isPasteEnabled: false
};

chrome.storage.local.get(['forcepaster'], function(item) {
    forcePasterSettings = item.forcepaster || { isPasteEnabled: false };
})
chrome.storage.onChanged.addListener(function(changes) {
    forcePasterSettings = changes.forcepaster.newValue || { isPasteEnabled: false };
});

let darkModeListener = (isDarkMode) => {
    chrome.runtime.sendMessage({
        type: "themeChange",
        mode: isDarkMode.matches ? 'dark' : 'light',
    });

}
// MediaQueryList
const darkModePreference = window.matchMedia("(prefers-color-scheme: dark)");
// recommended method for newer browsers: specify event-type as first argument
darkModePreference.addEventListener("change", darkModeListener);
// deprecated method for backward compatibility
darkModePreference.addListener(e => darkModeListener);
// set icons on initial load
darkModeListener(darkModePreference);

document.body.onpaste = function(e) {
    let currEle = document.activeElement;
    if (forcePasterSettings.isPasteEnabled && ["input", "textarea"].indexOf(currEle.tagName.toLowerCase()) !== -1) {
        let currVal = currEle.value;
        let finalVal = "";

        // Stop data actually being pasted into div
        e.stopPropagation();
        e.preventDefault();

        // Get pasted data via clipboard API
        let clipboardData = e.clipboardData || window.clipboardData || e.originalEvent.clipboardData;
        const pastedText = clipboardData.getData('Text');
        
        finalVal = currVal.slice(0, currEle.selectionStart) + pastedText;
        let caretPos = finalVal.length; //get position to place caret after pasting
        finalVal += currVal.slice(currEle.selectionEnd);
        currEle.value = finalVal;
        setCaretPositionToEndOfPastedText(currEle, caretPos);
    }
};

function setCaretPositionToEndOfPastedText(elem, caretPos) {
    if(elem != null) {
        if(elem.createTextRange) {
            let range = elem.createTextRange();
            range.move('character', caretPos);
            range.select();
        } else {
            if (elem.selectionStart) {
                elem.focus();
                elem.setSelectionRange(caretPos, caretPos);
            } else {
                elem.focus();
            }
        }
    }
}
