var isForcePasterEnabled = false;
chrome.storage.local.get(['isForcePasterEnabled'], function(item) {
   isForcePasterEnabled = item.isForcePasterEnabled;
})
chrome.storage.onChanged.addListener(function(item) {
    isForcePasterEnabled = item.isForcePasterEnabled.newValue;
});

document.body.onpaste = function(e) {
    var currEle = document.activeElement;
    if (isForcePasterEnabled && ["input", "textarea"].indexOf(currEle.tagName.toLowerCase()) !== -1) {
        var currVal = currEle.value;
        var finalVal = "";

        // Stop data actually being pasted into div
        e.stopPropagation();
        e.preventDefault();

        // Get pasted data via clipboard API
        var clipboardData = e.clipboardData || window.clipboardData || e.originalEvent.clipboardData;
        var pastedData = clipboardData.getData('Text');
        
        finalVal = currVal.slice(0, currEle.selectionStart) + pastedData;
        var caretPos = finalVal.length; //get position to place caret after pasting
        finalVal += currVal.slice(currEle.selectionEnd);
        currEle.value = finalVal;
        setCaretPosition(currEle, caretPos);
    }
};

function setCaretPosition(elem, caretPos) {
    if(elem != null) {
        if(elem.createTextRange) {
            var range = elem.createTextRange();
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
