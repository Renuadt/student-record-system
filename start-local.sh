#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

for tool in node npm gcc; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    printf 'Missing required tool: %s\n' "$tool" >&2
    printf 'Install Node.js (including npm) and GCC, then try again.\n' >&2
    exit 1
  fi
done

if [ ! -d "$ROOT_DIR/server/node_modules/express" ]; then
  echo "Installing server dependencies..."
  npm --prefix "$ROOT_DIR/server" install
fi

echo "Starting the Student Record System. Press Ctrl+C to stop."
exec node "$ROOT_DIR/server/server.js"
