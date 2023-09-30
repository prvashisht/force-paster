let isForcePasterEnabled = false;
chrome.storage.local.get(['isForcePasterEnabled'], function(item) {
   isForcePasterEnabled = item.isForcePasterEnabled;
})
chrome.storage.onChanged.addListener(function(item) {
    isForcePasterEnabled = item.isForcePasterEnabled.newValue;
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
    if (isForcePasterEnabled && ["input", "textarea"].indexOf(currEle.tagName.toLowerCase()) !== -1) {
        let currVal = currEle.value;
        let finalVal = "";

        // Stop data actually being pasted into div
        e.stopPropagation();
        e.preventDefault();

        // Get pasted data via clipboard API
        let clipboardData = e.clipboardData || window.clipboardData || e.originalEvent.clipboardData;
        let pastedData = clipboardData.getData('Text');
        
        finalVal = currVal.slice(0, currEle.selectionStart) + pastedData;
        let caretPos = finalVal.length; //get position to place caret after pasting
        finalVal += currVal.slice(currEle.selectionEnd);
        currEle.value = finalVal;
        setCaretPosition(currEle, caretPos);
    }
};

function setCaretPosition(elem, caretPos) {
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
