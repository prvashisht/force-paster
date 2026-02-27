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

// ── Pin helper ───────────────────────────────────────────────────────────────

const pinCard = document.getElementById('pin-card');
const pinDesc = document.getElementById('pin-card-desc');
const isFirefoxBrowser = typeof browser !== 'undefined';

function setPinCardVisible(isOnToolbar) {
    if (isOnToolbar) {
        pinCard.classList.remove('visible');
    } else {
        pinDesc.innerHTML = isFirefoxBrowser
            ? 'Right-click the extensions button in the toolbar → <code>Pin to Toolbar</code>.'
            : 'Click the <code>⊕</code> extensions puzzle icon in the toolbar → find Force Paster → click the pin icon.';
        pinCard.classList.add('visible');
    }
}

async function checkPinStatus() {
    try {
        const settings = await webext.action.getUserSettings();
        setPinCardVisible(settings.isOnToolbar);
    } catch {
        // API not available — hide the card silently
    }
}

// Auto-dismiss if user pins the extension while the page is open
if (webext.action.onUserSettingsChanged) {
    webext.action.onUserSettingsChanged.addListener((settings) => {
        setPinCardVisible(settings.isOnToolbar);
    });
}

checkPinStatus();

function track(type, extra = {}) {
    webext.runtime.sendMessage({ type, ...extra }).catch(() => {});
}

// Track dashboard open and link clicks
track("optionsopen");

document.getElementById('rate-link').addEventListener('click', () => track("optionsclick", { item: "rate" }));
document.getElementById('bmc-link').addEventListener('click', () => track("optionsclick", { item: "bmc" }));
document.querySelectorAll('a[href*="issues/new"]').forEach(el =>
    el.addEventListener('click', () => track("optionsclick", { item: "bug" }))
);
document.querySelectorAll('a[href*="github.com/prvashisht/force-paster"]').forEach(el => {
    if (!el.href.includes('issues')) {
        el.addEventListener('click', () => track("optionsclick", { item: "github" }));
    }
});

document.getElementById('footer-link').addEventListener('click', () => track("optionsclick", { item: "footer_author" }));

['watermarker', 'signaturesync', 'classicwebsearch', 'curt'].forEach(id => {
    document.getElementById(`app-${id}`)
        ?.addEventListener('click', () => track("optionsclick", { item: `app_${id}` }));
});

document.getElementById('close-btn').addEventListener('click', () => window.close());

// ── Tabs ─────────────────────────────────────────────────────────────────────

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
});

// ── Release notes ────────────────────────────────────────────────────────────

function stripMarkdown(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .trim();
}

function parseBullets(markdown) {
    return markdown
        .split('\n')
        .map(l => l.replace(/^[-*]\s+/, '').trim())
        .filter(l => l.length > 0 && !l.startsWith('#'));
}

async function loadReleaseNotes() {
    const versionEl = document.getElementById('release-version');
    const listEl = document.getElementById('release-list');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const olderEl = document.getElementById('older-releases');

    try {
        const res = await fetch(webext.runtime.getURL('release-notes.json'));
        const data = await res.json();

        versionEl.textContent = `v${data.version}`;
        listEl.innerHTML = data.notes
            .map(n => `<li>${n}</li>`)
            .join('');
    } catch {
        versionEl.textContent = `v${manifest.version}`;
        listEl.innerHTML = '<li>See release notes on GitHub</li>';
    }

    loadMoreBtn.addEventListener('click', async () => {
        loadMoreBtn.disabled = true;
        loadMoreBtn.textContent = 'Loading…';
        try {
            const res = await fetch('https://api.github.com/repos/prvashisht/force-paster/releases?per_page=10');
            const releases = await res.json();

            // Skip the release matching the locally shipped version
            const localVersion = versionEl.textContent.replace('v', '');
            const older = releases.filter(r => r.tag_name !== `v${localVersion}`);

            if (older.length === 0) {
                loadMoreBtn.textContent = 'No older releases';
                return;
            }

            olderEl.hidden = false;
            olderEl.innerHTML = older.map(r => {
                const bullets = parseBullets(r.body || '');
                const items = bullets.length
                    ? bullets.map(b => `<li>${stripMarkdown(b)}</li>`).join('')
                    : '<li>See full notes on GitHub</li>';
                return `
                    <div class="older-release">
                        <div class="older-release-tag">${r.tag_name}</div>
                        <ul class="release-list">${items}</ul>
                    </div>`;
            }).join('');

            loadMoreBtn.remove();
        } catch {
            loadMoreBtn.textContent = 'Could not load — view on GitHub ↗';
            loadMoreBtn.disabled = false;
            loadMoreBtn.onclick = () => {
                window.open('https://github.com/prvashisht/force-paster/releases', '_blank');
            };
        }
    });
}

loadSettings();
loadShortcut();
loadReleaseNotes();
