// Inline adapter: options pages run in a window (not a worker), so we skip the ES module.
// Firefox MV3 supports both `browser` and `chrome` in extension pages; prefer `browser`.
const webext = (typeof browser !== 'undefined' && browser.runtime) ? browser : chrome;

const manifest = webext.runtime.getManifest();
document.getElementById('version').textContent = `v${manifest.version}`;

// Swap icon based on color scheme
const logoEl = document.getElementById('logo');
function updateLogo(isDark) {
    logoEl.src = isDark ? 'icons/dark/icon48.png' : 'icons/light/icon48.png';
}
const darkMq = window.matchMedia('(prefers-color-scheme: dark)');
updateLogo(darkMq.matches);
darkMq.addEventListener('change', e => updateLogo(e.matches));

// ── State ────────────────────────────────────────────────────────────────────

function updateUI(settings) {
    if (!settings) return;
    document.getElementById('toggle').checked = settings.isPasteEnabled ?? false;
    document.getElementById('paste-count').textContent = settings.pasteCount ?? 0;
    document.getElementById('toggle-count').textContent = settings.clickCount ?? 0;
}

async function loadSettings() {
    const { forcepaster } = await webext.storage.local.get('forcepaster');
    updateUI(forcepaster);
}

// Reflect changes made elsewhere (icon click, keyboard shortcut, context menu)
webext.storage.onChanged.addListener((changes) => {
    if (changes.forcepaster?.newValue) {
        updateUI(changes.forcepaster.newValue);
    }
});

// ── Toggle ────────────────────────────────────────────────────────────────────

document.getElementById('toggle').addEventListener('change', async (e) => {
    try {
        await webext.runtime.sendMessage({ type: 'setenabled', enabled: e.target.checked });
    } catch (err) {
        // Service worker may be sleeping; write directly and it will pick it up
        const { forcepaster } = await webext.storage.local.get('forcepaster');
        const updated = { ...(forcepaster || {}), isPasteEnabled: e.target.checked };
        await webext.storage.local.set({ forcepaster: updated });
    }
});

// ── Keyboard shortcut ────────────────────────────────────────────────────────

async function loadShortcut() {
    const shortcutEl = document.getElementById('shortcut-display');
    const hintEl = document.getElementById('shortcut-hint');

    try {
        const commands = await webext.commands.getAll();
        const cmd = commands.find(c => c.name === '_execute_action');
        if (cmd?.shortcut) {
            shortcutEl.textContent = cmd.shortcut;
        } else {
            shortcutEl.textContent = 'Not set';
            shortcutEl.classList.add('not-set');
        }
    } catch {
        shortcutEl.textContent = 'Alt+Shift+P';
    }

    // Show browser-appropriate remap hint
    const isFirefox = typeof browser !== 'undefined';
    if (isFirefox) {
        hintEl.innerHTML = 'To remap, go to <code>about:addons</code> → Extensions → Force Paster → Manage.';
    } else {
        hintEl.innerHTML = 'To remap, open <code>chrome://extensions/shortcuts</code> in your address bar.';
    }
}

function track(type, extra = {}) {
    webext.runtime.sendMessage({ type, ...extra }).catch(() => {});
}

// Track dashboard open and link clicks
track("optionsopen");

document.getElementById('rate-link').addEventListener('click', () => track("optionsclick", { item: "rate" }));
document.querySelectorAll('a[href*="issues/new"]').forEach(el =>
    el.addEventListener('click', () => track("optionsclick", { item: "bug" }))
);
document.querySelectorAll('a[href*="github.com/prvashisht/force-paster"]').forEach(el => {
    if (!el.href.includes('issues')) {
        el.addEventListener('click', () => track("optionsclick", { item: "github" }));
    }
});

loadSettings();
loadShortcut();
