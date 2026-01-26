# Force Paster Chrome Extension

[![Version](https://img.shields.io/badge/Version-2.2.1-blue.svg)]()

Force Paster is a Chrome extension that enables seamless text pasting in input fields and text areas, even on websites that disable pasting. It also supports adaptive theming, making it comfortable for users in both light and dark mode.

## Features

- **Effortless Text Pasting:** Paste text smoothly in input fields and text areas where pasting is typically disabled.
- **Intuitive Toggle:** Easily enable or disable the extension with a single click.
- **Adaptive Dark Mode Support:** Seamlessly adapts to your preferred theme, ensuring a consistent experience.
- **Privacy First:** Force Paster prioritizes user privacy and does not collect any data.

## Installation

You can install the extension from the [Respective browsers' Web Stores](https://vashis.ht/rd/forcepaster?from=github-readme) or follow these steps for local development:

1. Clone the repository:
```
git clone https://github.com/prvashisht/force-paster.git
```

2. Open Chrome and navigate to `chrome://extensions/`.

3. Enable `Developer mode` in the top right corner.

4. Click on `Load unpacked` and select the cloned repository folder.

## Files

- **`manifest.json`**: Contains metadata about the extension, including permissions, icons, and scripts.
- **`content.js`**: Handles the content script that enables text pasting functionality.
- **`service_worker.js`**: Manages the extension behavior in the background, including badge text and color.

## How to Contribute

Contributions are welcome! Here's how you can get involved:

1. Fork the repository and create your branch from `master`.
2. Make your changes and test thoroughly.
3. Open a pull request, describing the changes you made.
4. Discuss your changes with the community.

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md) and [Contributing Guidelines](CONTRIBUTING.md) when contributing.
