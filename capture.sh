#!/usr/bin/env bash
# capture.sh — screenshot the exact $CAPTURE_URL into $CAPTURE_DIR (desktop + mobile), leave the app running.
set -euo pipefail
cd "$(dirname "$0")"

/usr/bin/time -p test -n "${CAPTURE_URL:-}" || { echo 'capture.sh: Set CAPTURE_URL to the exact preview URL.' >&2; exit 1; }
/usr/bin/time -p test -n "${CAPTURE_DIR:-}" || { echo 'capture.sh: Set CAPTURE_DIR to the output directory.' >&2; exit 1; }
/usr/bin/time -p test -n "${RUNTIME_DIR:-}" || { echo 'capture.sh: Set RUNTIME_DIR to the runtime scripts directory.' >&2; exit 1; }
/usr/bin/time -p mkdir -p "$CAPTURE_DIR"
/usr/bin/time -p test -f "${RUNTIME_DIR:?}/scripts/default-capture.mjs" || { echo 'capture.sh: default-capture.mjs missing.' >&2; exit 1; }
/usr/bin/time -p node "${RUNTIME_DIR:?}/scripts/default-capture.mjs"
/usr/bin/time -p test -f "$CAPTURE_DIR/final-desktop.png" || { echo 'capture.sh: final-desktop.png was not rendered.' >&2; exit 1; }
/usr/bin/time -p test -f "$CAPTURE_DIR/final-mobile.png" || { echo 'capture.sh: final-mobile.png was not rendered.' >&2; exit 1; }
echo "capture.sh: saved final-desktop.png and final-mobile.png in $CAPTURE_DIR (app left running)."
