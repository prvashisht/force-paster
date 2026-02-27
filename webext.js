/**
 * Browser-agnostic extension API adapter.
 *
 * Usage (ES module):
 *   import { webext, isFirefox } from './webext.js';
 *   webext.storage.local.get(...)
 *   webext.openShortcutsPage()
 *
 * Detection:
 *   - Firefox MV3 exposes a `browser` global with a Promise-based API.
 *   - Chrome and Edge expose `chrome`. Edge also mirrors under `chrome`.
 *   - We prefer `browser` on Firefox so we get native Promises everywhere.
 */

const _isFirefox = typeof browser !== 'undefined' && !!browser.runtime?.getManifest;
const _api = _isFirefox ? browser : chrome;

export const isFirefox = _isFirefox;
export const isChrome  = !_isFirefox;

/**
 * Open the browser's keyboard-shortcut management page.
 * Each browser uses a different internal URL.
 */
async function openShortcutsPage() {
    if (_isFirefox) {
        // Firefox does not support chrome:// URLs; about:addons is the equivalent.
        await _api.tabs.create({ url: 'about:addons' });
    } else {
        // Chrome and Edge
        await _api.tabs.create({ url: 'chrome://extensions/shortcuts' });
    }
}

/**
 * Safely retrieve user action settings.
 * Returns { isOnToolbar: boolean }.
 * Older browsers or browsers that do not implement getUserSettings get a safe default.
 */
async function getActionUserSettings() {
    try {
        if (typeof _api.action?.getUserSettings === 'function') {
            return await _api.action.getUserSettings();
        }
    } catch {
        // ignore
    }
    return { isOnToolbar: true };
}

export const webext = {
    storage:      _api.storage,
    runtime:      _api.runtime,
    tabs:         _api.tabs,
    contextMenus: _api.contextMenus,
    commands:     _api.commands,

    action: {
        ..._api.action,
        // Bind all methods so callers do not need to worry about `this`.
        setBadgeText:            (...a) => _api.action.setBadgeText(...a),
        setBadgeBackgroundColor: (...a) => _api.action.setBadgeBackgroundColor(...a),
        setBadgeTextColor:       (...a) => _api.action.setBadgeTextColor(...a),
        setIcon:                 (...a) => _api.action.setIcon(...a),
        onClicked:               _api.action.onClicked,
        getUserSettings:         getActionUserSettings,
    },

    /** Opens the browser's native keyboard-shortcut management page. */
    openShortcutsPage,
};
