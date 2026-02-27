#!/usr/bin/env bash
# Produces two distributable zips under dist/:
#   force-paster-chrome-vX.X.X.zip
#   force-paster-firefox-vX.X.X.zip
#
# Usage: ./build.sh

set -euo pipefail

VERSION=$(node -p "require('./manifest.json').version")
NOTES_VERSION=$(node -p "require('./release-notes.json').version")
DIST="dist"

if [ "$VERSION" != "$NOTES_VERSION" ]; then
    echo "❌  Version mismatch:"
    echo "    manifest.json      → $VERSION"
    echo "    release-notes.json → $NOTES_VERSION"
    echo ""
    echo "Update release-notes.json to version $VERSION before building."
    exit 1
fi

# Extension source files to include in both zips
SOURCES=(
    analytics.js
    content.js
    icons
    options.html
    options.js
    release-notes.json
    service_worker.js
    webext.js
)

mkdir -p "$DIST"

# build <browser> <js-transform-applied-to-manifest-object-m>
build() {
    local browser="$1"
    local transform="$2"
    local outfile; outfile="$(pwd)/$DIST/force-paster-${browser}-v${VERSION}.zip"
    local tmp; tmp=$(mktemp -d)
    # shellcheck disable=SC2064
    trap "rm -rf '$tmp'" RETURN

    for f in "${SOURCES[@]}"; do
        cp -r "$f" "$tmp/"
    done

    # Write a browser-specific manifest into the temp dir
    node -e "
        const fs = require('fs');
        const m = JSON.parse(fs.readFileSync('./manifest.json', 'utf8'));
        $transform
        fs.writeFileSync('$tmp/manifest.json', JSON.stringify(m, null, 2) + '\n');
    "

    rm -f "$outfile"
    (cd "$tmp" && zip -qr "$outfile" . --exclude "*.DS_Store")
    echo "  $outfile"
}

echo "Building Force Paster v$VERSION ..."

# Chrome/Edge: drop Firefox-only fields (gecko block + background.scripts)
build "chrome" "delete m.browser_specific_settings; delete m.background.scripts;"

# Firefox: drop the Chrome/Edge-only service_worker key (Firefox uses background.scripts)
build "firefox" "delete m.background.service_worker;"

echo "Done."
