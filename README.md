# Force Paster

[![Version](https://img.shields.io/github/manifest-json/v/prvashisht/force-paster)](https://github.com/prvashisht/force-paster/blob/master/manifest.json)

Force Paster is a browser extension that lets you paste text into any input field or text area — even on sites that have deliberately blocked pasting. One click enables it; one click turns it back off.

---

## Features

- **Force paste anywhere** — overrides paste-blocking on any website for `<input>` and `<textarea>` elements
- **One-click toggle** — click the extension icon to enable or disable; the toolbar badge shows the current state (`on` / `off`)
- **Keyboard shortcut** — toggle with **Alt+Shift+P** (remappable per browser)
- **Right-click context menu** — toggle, open the dashboard, manage shortcuts, rate the extension, or report a bug directly from the toolbar icon
- **Dashboard** — a tabbed settings page (Settings / What's new / More); open it via the context menu or `chrome://extensions` → Details → Extension options
- **Dark & light icons** — the toolbar icon automatically follows your system theme
- **Cross-browser** — works on Chrome, Firefox (121+), and Edge

---

## Installation

### From the browser store

| Browser | Link |
|---------|------|
| Chrome / Edge | [Chrome Web Store](https://vashis.ht/rd/forcepaster?from=github-readme) |
| Firefox | [Firefox Add-ons](https://vashis.ht/rd/forcepaster?from=github-readme) |

### Load unpacked (development)

1. Clone the repository:
   ```bash
   git clone https://github.com/prvashisht/force-paster.git
   ```
2. **Chrome / Edge** — navigate to `chrome://extensions/`, enable **Developer mode**, click **Load unpacked**, and select the cloned folder.
3. **Firefox** — navigate to `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, and select `manifest.json` inside the cloned folder.

---

## How it works

```
User clicks icon / presses Alt+Shift+P / uses context menu
        │
        ▼
service_worker.js  ←─ action.onClicked / _execute_action command / contextMenus.onClicked
  • toggles isPasteEnabled in storage.local
  • updates badge text ("on" / "off") and badge colour
  • syncs the "Enable Force Paste" checkbox in the context menu
  • dispatches analytics events (fp_toggle, fp_menu_click, etc.)
        │
        ▼  storage.onChanged
content.js  (injected into every page)
  • listens on document.body.onpaste
  • when isPasteEnabled, intercepts the paste event, reads clipboard
    text, and writes it directly into the focused <input>/<textarea>
  • reports paste completion back to the service worker via runtime messages
  • watches prefers-color-scheme and notifies the service worker so the
    correct toolbar icon variant (light/dark) is displayed
        │
        ▼  (options page)
options.html / options.js
  • standalone dashboard — reads state from storage.local
  • toggle sends a "setenabled" message to the service worker
  • shows paste count, toggle count, and current keyboard shortcut
  • sends analytics events (fp_options_open, fp_options_click) via messages
```

### Browser compatibility

All Chrome/Firefox API differences are centralised in `webext.js`. The service worker and options page use `webext.*` throughout; `content.js` and `analytics.js` use the `chrome` namespace, which Firefox MV3 also exposes in those contexts.

---

## Project structure

| File | Description |
|------|-------------|
| `manifest.json` | Extension manifest (MV3) — permissions, icons, content script registration, keyboard command, options page |
| `webext.js` | Browser adapter — detects Chrome/Edge vs Firefox at runtime, re-exports APIs under a unified `webext` object, and adds helpers like `openShortcutsPage()` and `action.getUserSettings()` |
| `content.js` | Content script injected into every page — intercepts paste events and forwards theme-change messages to the service worker |
| `service_worker.js` | Background service worker — manages toggle state, badge, context menu, options page, and all analytics calls |
| `options.html` | Dashboard markup — tabbed UI with Settings, What's new, and More panels |
| `options.js` | Dashboard logic — reads/writes storage, reflects live state changes, loads release notes, sends analytics via service worker messages |
| `release-notes.json` | Current version's release notes — bundled with the extension and displayed in the What's new tab |
| `analytics.js` | Analytics helper — proxies GA4 events through a Cloud Functions endpoint with client-ID and session management |

---

## Analytics events

Events are sent anonymously via a Cloud Functions proxy. The following events are tracked:

| Event | When | Key params |
|-------|------|------------|
| `extension_installed` | Install or update | `reason`, platform info, locale |
| `fp_toggle` | Enable/disable toggled | `enabled`, `source` (`action_icon` / `context_menu` / `options_page`) |
| `fp_paste` | Paste completed | `tag` (element type), `domain` |
| `fp_menu_click` | Context menu item clicked (non-toggle) | `item` (`shortcuts` / `options` / `rate` / `bug`) |
| `fp_options_open` | Dashboard page opened | — |
| `fp_options_click` | Link clicked on dashboard | `item` (`rate` / `bug` / `github` / `bmc` / `app_*` / `footer_author`) |
| `fp_rating_prompt` | User responded to the rating toast | `choice` (`rate` / `later` / `never`) |

---

## Development guide

### Prerequisites

- Node.js is **not** required — the extension is plain JavaScript with no build step.

### Workflow

1. Make your changes to the source files.
2. In Chrome, go to `chrome://extensions/` and click the **reload** icon on the Force Paster card to pick up changes.
3. In Firefox, go to `about:debugging#/runtime/this-firefox` and click **Reload** next to Force Paster.
4. Test on a site that blocks pasting (e.g. many banking or exam portals).

### Keyboard shortcut remap

- **Chrome / Edge** — `chrome://extensions/shortcuts`
- **Firefox** — `about:addons` → Extensions → Force Paster → Manage

### Releasing a new version

1. Bump `"version"` in `manifest.json`.
2. Update `"version"` and `"notes"` in `release-notes.json` to match — the build will **fail** if they differ.
3. Merge to `main`. The `release.yml` workflow triggers automatically, builds both zips, creates a GitHub release with auto-generated notes, and attaches the zips as assets. This in turn triggers `store-deploy.yml`, which publishes the zips automatically to the Chrome Web Store and Firefox Add-ons.

> **Checklist every release:**
> - [ ] `manifest.json` version bumped
> - [ ] `release-notes.json` version and notes updated
> - [ ] README features/structure updated if new things were added

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) and follow the [Code of Conduct](CODE_OF_CONDUCT.md) before opening a pull request.
