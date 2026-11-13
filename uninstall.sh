#!/usr/bin/env bash
# Uninstalls gleneseo-helpers locally: removes the global link created by install.sh
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
REPO_DIR="$(pwd -P)"
BIN_NAME="gleneseo-helpers"

log() { printf '==> %s\n' "$*"; }
fail() { printf 'error: %s\n' "$*" >&2; exit 1; }

# Resolves a path, following symlinks
resolve() { realpath "$1" 2>/dev/null || readlink -f "$1"; }

# Fails if the command on the PATH does not belong to this repo, so a foreign install is never removed
check_ownership() {
  local existing target
  existing="$(command -v "$BIN_NAME" || true)"
  [ -n "$existing" ] || return 0

  target="$(resolve "$existing")"
  case "$target" in
    "$REPO_DIR"/*) return 0 ;;
  esac
  fail "$existing resolves to $target, which is not part of this repo; it was not removed"
}

# Succeeds if a global npm link for the application exists
is_linked() {
  [ -n "$(command -v "$BIN_NAME" || true)" ] || [ -e "$(npm root -g)/$BIN_NAME" ] || [ -L "$(npm root -g)/$BIN_NAME" ]
}

check_ownership

if ! is_linked; then
  log "$BIN_NAME is not installed; nothing to do"
  exit 0
fi

log "Unlinking from $(npm prefix -g)"
npm unlink -g "$BIN_NAME"

log "Verifying"
hash -r
remaining="$(command -v "$BIN_NAME" || true)"
if [ -n "$remaining" ]; then
  fail "$BIN_NAME is still on the PATH at $remaining"
fi

log "Uninstalled $BIN_NAME"
