# Force Paster

[![Version](https://img.shields.io/github/manifest-json/v/prvashisht/force-paster/main)](https://github.com/prvashisht/force-paster/blob/main/manifest.json)

Force Paster is a browser extension that lets you paste text into any input field or text area — even on sites that have deliberately blocked pasting. One click enables it; one click turns it back off.

[Privacy Policy](PRIVACY_POLICY.md)

---

## Features

- **Force paste anywhere** — overrides paste-blocking for `<input>`, `<textarea>`, and supported `contenteditable` editors (including rich text and images where the site allows it)
- **One-click toggle** — click the extension icon to enable or disable; the toolbar badge shows the current state (`on` / `off`)
- **Keyboard shortcut** — toggle with **Alt+Shift+P** on desktop (remappable per browser)
- **Right-click context menu** — on desktop: toggle, open the dashboard, manage shortcuts, rate the extension, or report a bug from the toolbar icon
- **Dashboard** — a tabbed settings page (Settings / What's new / More); open it via the context menu or the browser’s extension options
- **Dark & light icons** — the toolbar icon automatically follows your system theme
- **Cross-browser** — Chrome, Brave, Edge, Firefox desktop (121+), and Firefox for Android (toggle via extensions menu or options; no keyboard shortcuts / context menus on Android)

---

## Installation

### From the browser store

| Browser | Link |
|---------|------|
| Chrome / Brave / Edge | [Chrome Web Store](https://vashis.ht/rd/forcepaster?from=github-readme) |
| Firefox (desktop & Android) | [Firefox Add-ons](https://vashis.ht/rd/forcepaster?from=github-readme) |

### Load unpacked (development)

1. Clone the repository:
   ```bash
   git clone https://github.com/prvashisht/force-paster.git
   ```
2. **Chrome / Brave / Edge** — navigate to `chrome://extensions/`, enable **Developer mode**, click **Load unpacked**, and select the cloned folder.
3. **Firefox desktop** — navigate to `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, and select `manifest.json` inside the cloned folder.
4. **Firefox for Android** — use `web-ext` with USB debugging (see [Mozilla’s guide](https://extensionworkshop.com/documentation/develop/developing-extensions-for-firefox-for-android/)), e.g. `npx web-ext run -t firefox-android --adb-device <id> --firefox-apk org.mozilla.firefox`.

> **Chrome load-unpacked note:** loading the raw repo folder may show a warning about Firefox-only manifest fields (`browser_specific_settings`, `background.scripts`). That is expected for the shared source tree. For a Chromium-clean package, run `./build.sh` and load the contents of the Chrome zip from `dist/`.

> **Note (Chrome):** loading the folder unpacked shows a harmless warning — `'background.scripts' requires manifest version of 2 or lower.` This is expected. `manifest.json` is shared across browsers (Firefox uses `background.scripts`, Chrome uses `background.service_worker`), and `build.sh` strips the key that doesn't apply to each target when packaging. The extension still loads and works normally.

---

## How it works

```
User clicks icon / presses Alt+Shift+P / uses context menu / options toggle
        │
        ▼
service_worker.js  ←─ action.onClicked / _execute_action / contextMenus (desktop) / messages
  • toggles isPasteEnabled in storage.local
  • updates badge text ("on" / "off") and badge colour
  • syncs the context menu checkbox when that API exists (skipped on Android)
  • dispatches analytics events (fp_toggle, fp_menu_click, etc.)
        │
        ▼  storage.onChanged
content.js  (injected into every page / frame)
  • document-level capture-phase `paste` listener
  • when isPasteEnabled: lets the site/browser handle paste; if they cancelled
    it and the text never shows up, inserts it:
      – input/textarea: native value setter + input/change events
      – contenteditable: insertHTML / insertText
  • reports a forced paste back to the background via runtime messages
  • watches prefers-color-scheme and notifies the background for icon variants
        │
        ▼  (options page)
options.html / options.js
  • standalone dashboard — reads state from storage.local
  • toggle sends a "setenabled" message (with storage fallback)
  • on Android: hides shortcuts / pin helper; shows a short platform note
  • shows paste count, toggle count, and (on desktop) the keyboard shortcut
```

### Browser compatibility

All Chromium/Firefox API differences are centralised in `webext.js`. The service worker and options page use `webext.*` throughout; `content.js` and `analytics.js` use the `chrome` namespace, which Firefox MV3 also exposes in those contexts. Context menus and keyboard commands are desktop-only; the background script detects missing APIs so Firefox for Android still loads cleanly.

---

## Project structure

| Path | Description |
|------|-------------|
| `manifest.json` | Extension manifest (MV3) — permissions, icons, content scripts, keyboard command, options page, `gecko` / `gecko_android` |
| `webext.js` | Browser adapter — Chromium vs Firefox, unified `webext` helpers |
| `content.js` | Content script — capture-phase paste engine for inputs and contenteditable |
| `service_worker.js` | Background — toggle state, badge, context menus (when available), analytics |
| `options.html` / `options.js` | Dashboard UI and logic |
| `release-notes.json` | Bundled “What’s new” notes (must match manifest version at build time) |
| `analytics.js` | GA4 proxy helper |
| `build.sh` | Builds Chromium and Firefox zips under `dist/` |
| `scripts/lint-firefox.sh` | Builds the Firefox zip and lints it with the same engine AMO uses |
| `test-fixtures/` | Local pages for manual testing (e.g. paste-blocked demo) |
| `PRIVACY_POLICY.md` | Privacy policy |

---

## Analytics events

Events are sent anonymously via the generic Cloud Functions GA proxy, identified as Force Paster with `X-Extension-App: forcepaster`. Existing install token, client ID, and session storage keys are retained for continuity. Analytics failures are logged and do not block extension behavior.

| Event | When | Key params |
|-------|------|------------|
| `fp_extension_installed` | First install | `reason`, platform info, locale |
| `fp_extension_updated` | Extension update | `reason`, platform info, locale |
| `fp_toggle` | Enable/disable toggled | `enabled`, `source` (`action_icon` / `context_menu` / `options_page`) |
| `fp_paste` | Paste completed | `tag` (element type), `domain` |
| `fp_menu_click` | Context menu item clicked (non-toggle) | `item` (`shortcuts` / `options` / `rate` / `bug`) |
| `fp_options_open` | Dashboard page opened | — |
| `fp_options_click` | Link clicked on dashboard | `item` (`rate` / `bug` / `github` / `bmc` / `app_*` / `footer_author`) |
| `fp_rating_prompt` | User responded to the rating toast | `choice` (`rate` / `later` / `never`) |

---

## Development guide

### Prerequisites

- Node.js is **not** required to run the extension — it is plain JavaScript with no app build step.
- Node/`npx` is only needed for packaging helpers (`./build.sh` version checks, `./scripts/lint-firefox.sh`).

### Workflow

1. Make your changes to the source files.
2. In Chrome, go to `chrome://extensions/` and click the **reload** icon on the Force Paster card to pick up changes.
3. In Firefox, go to `about:debugging#/runtime/this-firefox` and click **Reload** next to Force Paster.
4. Test on a paste-blocking page. A local demo is in [`test-fixtures/paste-blocked.html`](test-fixtures/paste-blocked.html) (serve it over `http://localhost` so content scripts inject).

### Package and lint (Firefox / AMO)

```bash
./build.sh                      # Chromium + Firefox zips in dist/
./scripts/lint-firefox.sh       # build Firefox zip, then addons-linter via web-ext
```

Fix **errors** before submitting to AMO. Notices/warnings (for example future `data_collection_permissions`) should be reviewed but may already be known.

### Building the packaged zips

You don't need this to develop, but to produce the distributable zips locally, run `./build.sh`. It writes `dist/force-paster-chrome-v*.zip` and `dist/force-paster-firefox-v*.zip`, and requires Node.js and `zip`. The build fails if the `manifest.json` and `release-notes.json` versions don't match.

### Keyboard shortcut remap

- **Chrome / Brave / Edge** — `chrome://extensions/shortcuts`
- **Firefox desktop** — `about:addons` → Extensions → Force Paster → Manage
- **Firefox Android** — not supported by the platform

### Releasing a new version

1. Bump `"version"` in `manifest.json`.
2. Update `"version"` and `"notes"` in `release-notes.json` to match — the build will **fail** if they differ.
3. Merge to `main`. The `release.yml` workflow triggers automatically, builds both zips, creates a GitHub release with auto-generated notes, and attaches the zips as assets. This in turn triggers `store-deploy.yml`, which publishes automatically to the Chrome Web Store and Firefox Add-ons.
4. **Edge** — upload `force-paster-chrome-v*.zip` from the GitHub release manually at [Microsoft Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview). The Chrome zip is compatible with Chromium browsers such as Brave and Edge; Firefox-only manifest fields are stripped by the build script.

> **Checklist every release:**
> - [ ] `manifest.json` version bumped
> - [ ] `release-notes.json` version and notes updated
> - [ ] README features/structure updated if new things were added
> - [ ] `./scripts/lint-firefox.sh` clean of errors (especially if Firefox/Android packaging changed)
> - [ ] Edge Add-ons updated manually via Partner Center

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) and follow the [Code of Conduct](CODE_OF_CONDUCT.md) before opening a pull request.
