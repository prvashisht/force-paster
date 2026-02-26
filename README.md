# Force Paster

[![Version](https://img.shields.io/github/manifest-json/v/prvashisht/force-paster)](https://github.com/prvashisht/force-paster/blob/master/manifest.json)

Force Paster is a browser extension that lets you paste text into any input field or text area — even on sites that have deliberately blocked pasting. One click enables it; one click turns it back off.

---

## Features

- **Force paste anywhere** — overrides paste-blocking on any website for `<input>` and `<textarea>` elements
- **One-click toggle** — click the extension icon to enable or disable; the toolbar badge shows the current state (`ON` / off)
- **Keyboard shortcut** — toggle with **Alt+Shift+P** (remappable in `chrome://extensions/shortcuts` or `about:addons`)
- **Dark & light icons** — the toolbar icon automatically follows your system theme

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
User clicks icon / presses Alt+Shift+P
        │
        ▼
service_worker.js  ←─ chrome.action.onClicked / _execute_action command
  • toggles isPasteEnabled in chrome.storage.local
  • updates badge text ("ON" / "")
  • reads tabs[0].url to set the active-tab icon
        │
        ▼  storage change event
content.js  (runs in every page)
  • listens on document.body.onpaste
  • when isPasteEnabled, intercepts the paste event, reads clipboard
    text via the Clipboard API, and writes it into the focused element
  • reports paste counts back to the service worker via runtime messages
  • watches prefers-color-scheme to notify the service worker of theme
    changes so the correct toolbar icon variant is displayed
```

---

## Project structure

| File | Description |
|------|-------------|
| `manifest.json` | Extension manifest (MV3) — permissions, icons, content script registration, keyboard command |
| `content.js` | Content script injected into every page — intercepts paste events and forwards theme-change messages |
| `service_worker.js` | Background service worker — manages toggle state, badge, icon, and paste-count tracking |
| `analytics.js` | Lightweight analytics helper used by the service worker to report events |

---

## Development guide

### Prerequisites

- Node.js is **not** required — the extension is plain JavaScript with no build step.

### Workflow

1. Make your changes to the source files.
2. In Chrome, go to `chrome://extensions/` and click the **reload** icon on the Force Paster card to pick up the latest content script and service worker.
3. Test on a site that blocks pasting (e.g. many banking or exam portals).

### Releasing a new version

1. Bump `"version"` in `manifest.json`.
2. Push a tag matching `v*` (e.g. `git tag v2.3.0 && git push --tags`).
3. The `.github/workflows/publish.yml` workflow zips the extension and publishes it to the Chrome Web Store, Firefox Add-ons, and Edge Add-ons automatically (requires the store secrets to be configured in repository settings).

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) and follow the [Code of Conduct](CODE_OF_CONDUCT.md) before opening a pull request.
