#!/usr/bin/env bash
set -euo pipefail

DIST="dist"

# Clean
rm -rf "$DIST"

# Bundle plugin entry (Node target, externalize electron)
bun build src/index.ts \
  --outdir "$DIST" \
  --target node \
  --external electron

# Bundle electron main process
bun build src/electron/main.ts \
  --outdir "$DIST/electron" \
  --target node \
  --external electron

# Bundle electron preload
bun build src/electron/preload.ts \
  --outdir "$DIST/electron" \
  --target node \
  --external electron

# Copy renderer static assets
mkdir -p "$DIST/renderer"
cp src/renderer/index.html \
   src/renderer/styles.css \
   src/renderer/pet.js \
   src/renderer/sprite-engine.js \
   src/renderer/state-machine.js \
   src/renderer/speech-bubble.js \
   src/renderer/event-handler.js \
   src/renderer/permission-popup.js \
   src/renderer/time-aware.js \
   src/renderer/standup.html \
   "$DIST/renderer/"

if [ -d "pets" ]; then
  cp -r pets "$DIST/pets"
fi

echo "Build complete: $DIST/"
