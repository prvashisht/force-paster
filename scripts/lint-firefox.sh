#!/usr/bin/env bash
# Build the Firefox zip and lint it with the same engine AMO uses (addons-linter
# via web-ext). Run before tagging a release that enables Firefox for Android.
#
# Usage: ./scripts/lint-firefox.sh
#
# Exit code is non-zero if the linter reports errors.

set -euo pipefail

cd "$(dirname "$0")/.."

chmod +x build.sh
./build.sh

VERSION=$(node -p "require('./manifest.json').version")
ZIP="dist/force-paster-firefox-v${VERSION}.zip"

if [[ ! -f "$ZIP" ]]; then
    echo "❌  Expected zip not found: $ZIP"
    exit 1
fi

echo ""
echo "Linting $ZIP (addons-linter via web-ext)…"
echo ""

# Lint the packaged zip by extracting to a temp dir — matches what AMO validates.
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
unzip -q "$ZIP" -d "$TMP"

npx --yes web-ext@8 lint --source-dir "$TMP" --output text

echo ""
echo "✅  Firefox package lint finished for v${VERSION}."
