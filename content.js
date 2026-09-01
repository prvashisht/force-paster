let forcePasterSettings = {
    isPasteEnabled: false,
    clickCount: 0,
    pasteCount: 0,
};

chrome.storage.local.get(['forcepaster'], function(item) {
    forcePasterSettings = item.forcepaster || forcePasterSettings;
})
chrome.storage.onChanged.addListener(function(changes) {
    if (changes.forcepaster?.newValue) {
        forcePasterSettings = changes.forcepaster.newValue;
    }
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

const isInputOrTextarea = (el) => ["input", "textarea"].includes(el.tagName.toLowerCase());
const isContentEditable = (el) => !!(el && el.isContentEditable);

// Give-up on a blocked field. Editors that handle paste usually write sooner;
// waiting much longer than this feels laggy on bank/exam pages.
const FORCE_PASTE_WAIT_MS = 51;

// Capture so we see the paste. We do not cancel it — ChatGPT / Notion / the
// browser get the real event. If they put the text in the field, we do nothing.
// We only insert when the page cancelled paste and the text never appeared.
document.addEventListener('paste', event => {
    if (!forcePasterSettings.isPasteEnabled) return;

    const currEle = document.activeElement;
    const isField    = isInputOrTextarea(currEle);
    const isEditable = isContentEditable(currEle);

    if (!isField && !isEditable) return;

    const clipboardData = event.clipboardData || window.clipboardData || event.originalEvent?.clipboardData;
    if (!clipboardData) return;

    const pastedText = clipboardData.getData('Text');
    const pastedHtml = clipboardData.getData('text/html');
    const snapshot   = snapshotPasteTarget(currEle, isField);

    let settled = false;
    const finish = (shouldForce) => {
        if (settled) return;
        settled = true;
        observer.disconnect();
        clearTimeout(giveUp);

        if (!shouldForce) return;
        if (!forcePasterSettings.isPasteEnabled) return;
        if (!currEle.isConnected) return;
        if (document.activeElement !== currEle && !currEle.contains(document.activeElement)) return;
        if (pasteAlreadyLanded(currEle, isField, pastedText, snapshot)) return;

        chrome.runtime.sendMessage({ type: "onpastestart", on: currEle.tagName.toLowerCase() });

        if (isField) {
            pasteIntoInputField(currEle, pastedText);
        } else {
            pasteIntoContentEditable(currEle, pastedText, pastedHtml);
        }

        chrome.runtime.sendMessage({ type: "onpastecomplete" }, response => {
            if (response?.showRatingPrompt) {
                showRatingToast();
            }
        });
    };

    const observer = new MutationObserver(() => {
        if (pasteAlreadyLanded(currEle, isField, pastedText, snapshot)) finish(false);
    });
    observer.observe(currEle, { childList: true, subtree: true, characterData: true });

    queueMicrotask(() => {
        if (pasteAlreadyLanded(currEle, isField, pastedText, snapshot)) finish(false);
    });

    // Editors like ChatGPT often write after the paste event. Watch for the
    // text. If the page cancelled paste and nothing showed up, then we insert.
    const giveUp = setTimeout(() => {
        if (pasteAlreadyLanded(currEle, isField, pastedText, snapshot)) {
            finish(false);
            return;
        }
        finish(event.defaultPrevented);
    }, FORCE_PASTE_WAIT_MS);
}, true /* capture */);

function snapshotPasteTarget(el, isField) {
    if (isField) {
        const start = el.selectionStart;
        const end   = el.selectionEnd;
        return {
            text:  el.value ?? '',
            start: typeof start === 'number' ? start : 0,
            end:   typeof end === 'number' ? end : 0,
        };
    }
    const text = el.textContent ?? '';
    const sel  = snapshotSelection(el);
    if (!sel) return { text, start: text.length, end: text.length };
    return {
        text,
        start: Math.min(sel.anchorOffset, sel.focusOffset),
        end:   Math.max(sel.anchorOffset, sel.focusOffset),
    };
}

// True if the clipboard text already made it into the field — native paste,
// the site's editor, or a same-text replace (copy "abc", paste over "abc").
function pasteAlreadyLanded(el, isField, pastedText, snap) {
    // Image/file paste has no text. Leave it to the real event; don't shove "".
    if (!pastedText) return true;

    const after    = isField ? (el.value ?? '') : (el.textContent ?? '');
    const expected = snap.text.slice(0, snap.start) + pastedText + snap.text.slice(snap.end);
    if (after === expected) return true;

    const fold = (s) => s.replace(/\r\n/g, '\n').replace(/\n+$/g, '');
    if (fold(after) === fold(expected)) return true;

    const replaced = snap.end - snap.start;
    const grew     = after.length - snap.text.length;
    if (after.includes(pastedText) && grew >= Math.max(0, pastedText.length - replaced)) return true;

    return false;
}

// ---------------------------------------------------------------------------
// Input / textarea
// Uses the native prototype setter so React's internal fiber tracking sees the
// mutation, then fires input + change for Vue / Angular too.
// ---------------------------------------------------------------------------
function pasteIntoInputField(el, pastedText) {
    const start    = el.selectionStart;
    const end      = el.selectionEnd;
    const curr     = el.value;
    const finalVal = curr.slice(0, start) + pastedText + curr.slice(end);
    const caretPos = start + pastedText.length;

    const proto = el.tagName.toLowerCase() === 'textarea'
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (nativeSetter) {
        nativeSetter.call(el, finalVal);
    } else {
        el.value = finalVal;
    }

    setCaretPositionToEndOfPastedText(el, caretPos);
    fireFrameworkEvents(el);
}

// ---------------------------------------------------------------------------
// contenteditable  (Gmail, Notion, Slack-style editors)
//
// Only used when the site blocked paste and the text never showed up. Insert
// HTML if we have it, otherwise plain text. We do not re-fire a fake paste —
// that races editors that apply the real event a frame later (ChatGPT).
// ---------------------------------------------------------------------------
function pasteIntoContentEditable(el, pastedText, pastedHtml) {
    el.focus();

    if (pastedHtml) {
        const inserted = document.execCommand('insertHTML', false, pastedHtml);
        if (inserted) return;
    }

    const inserted = document.execCommand('insertText', false, pastedText);
    if (!inserted) {
        insertTextViaSelectionAPI(el, pastedText);
    }
}

function snapshotSelection(el) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    const anchorOffset = textOffsetWithin(el, sel.anchorNode, sel.anchorOffset);
    const focusOffset  = textOffsetWithin(el, sel.focusNode, sel.focusOffset);
    if (anchorOffset === null || focusOffset === null) return null;
    return { anchorOffset, focusOffset };
}

// Character offset from the start of `el`, or null if the point isn't inside.
function textOffsetWithin(el, node, offset) {
    if (!node || !el.contains(node)) return null;
    const range = document.createRange();
    try {
        range.selectNodeContents(el);
        range.setEnd(node, offset);
    } catch {
        return null;
    }
    return range.toString().length;
}

function insertTextViaSelectionAPI(container, text) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    fireFrameworkEvents(container);
}

// Dispatch input + change so React / Vue / Angular reconcilers detect the
// mutation after a programmatic value change.
function fireFrameworkEvents(el) {
    el.dispatchEvent(new Event('input',  { bubbles: true, cancelable: true }));
    el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
}

let _ratingToastShown = false;

function showRatingToast() {
    if (_ratingToastShown || document.getElementById('fp-rating-host')) return;
    _ratingToastShown = true;

    const host = document.createElement('div');
    host.id = 'fp-rating-host';
    const shadow = host.attachShadow({ mode: 'closed' });

    shadow.innerHTML = `
        <style>
            .toast {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 2147483647;
                width: 288px;
                background: #ffffff;
                border-radius: 14px;
                box-shadow: 0 8px 30px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08);
                padding: 16px 18px 14px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                animation: fp-in 0.25s cubic-bezier(0.34, 1.3, 0.64, 1);
                box-sizing: border-box;
            }
            @media (prefers-color-scheme: dark) {
                .toast { background: #1f2820; }
                .title { color: #ddeedd; }
                .body  { color: #8aaa8e; }
                .btn-later, .btn-never { color: #567060; }
                .btn-later:hover, .btn-never:hover { color: #8aaa8e; }
            }
            @keyframes fp-in {
                from { transform: translateY(16px); opacity: 0; }
                to   { transform: translateY(0);    opacity: 1; }
            }
            .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 6px;
            }
            .title {
                font-size: 14px;
                font-weight: 600;
                color: #1a2a1e;
                line-height: 1.3;
            }
            .close {
                background: none;
                border: none;
                cursor: pointer;
                color: #8a9e8a;
                font-size: 15px;
                line-height: 1;
                padding: 0 0 0 8px;
                flex-shrink: 0;
            }
            .close:hover { color: #3d6b48; }
            .body {
                font-size: 13px;
                color: #5a7060;
                line-height: 1.5;
                margin-bottom: 14px;
            }
            .actions {
                display: flex;
                align-items: center;
                gap: 4px;
            }
            .btn-rate {
                flex: 1;
                background: #518c60;
                color: #ffffff;
                border: none;
                border-radius: 8px;
                padding: 8px 12px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
            }
            .btn-rate:hover { background: #3d6b48; }
            .btn-later, .btn-never {
                background: none;
                border: none;
                cursor: pointer;
                font-size: 12px;
                color: #8a9e8a;
                padding: 6px 8px;
                white-space: nowrap;
            }
            .btn-later:hover, .btn-never:hover { color: #5a7060; }
        </style>
        <div class="toast">
            <div class="header">
                <span class="title">Enjoying Force Paster? ⭐</span>
                <button class="close" aria-label="Dismiss">✕</button>
            </div>
            <div class="body">A quick rating helps others find it and keeps the project going.</div>
            <div class="actions">
                <button class="btn-rate">Rate it</button>
                <button class="btn-later">Later</button>
                <button class="btn-never">Never</button>
            </div>
        </div>
    `;

    document.documentElement.appendChild(host);

    function respond(choice) {
        chrome.runtime.sendMessage({ type: "ratingresponse", choice });
        host.remove();
    }

    shadow.querySelector('.btn-rate').addEventListener('click', () => respond('rate'));
    shadow.querySelector('.btn-later').addEventListener('click', () => respond('later'));
    shadow.querySelector('.btn-never').addEventListener('click', () => respond('never'));
    shadow.querySelector('.close').addEventListener('click', () => respond('later'));
}

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
