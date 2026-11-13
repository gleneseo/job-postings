#!/usr/bin/env bash
# Installs gleneseo-helpers locally: pulls the latest code, builds it, and links it onto the PATH
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
REPO_DIR="$(pwd -P)"
BIN_NAME="gleneseo-helpers"

log() { printf '==> %s\n' "$*"; }
fail() { printf 'error: %s\n' "$*" >&2; exit 1; }

# Fails unless the active Node and npm satisfy the `engines` field of package.json
check_engines() {
  node -e '
    const { engines } = JSON.parse(require("fs").readFileSync("package.json", "utf8"));
    const [maj, min, pat] = process.versions.node.split(".").map(Number);
    const ok = maj === 26 && (min > 13 || (min === 13 && pat >= 0));
    if (!ok) { console.error(`Node ${process.versions.node} does not satisfy ${engines.node}`); process.exit(1); }
  ' || fail "unsupported Node version"
  local npm_major
  npm_major="$(npm --version | cut -d. -f1)"
  [ "$npm_major" = "12" ] || fail "npm $(npm --version) does not satisfy ^12.2.2"
}

# Resolves a path, following symlinks
resolve() { realpath "$1" 2>/dev/null || readlink -f "$1"; }

# Offers to remove an existing, unrelated install of the application
handle_existing_install() {
  local existing target
  existing="$(command -v "$BIN_NAME" || true)"
  [ -n "$existing" ] || return 0

  target="$(resolve "$existing")"
  case "$target" in
    "$REPO_DIR"/*)
      log "Found a previous install of this repo at $existing; it will be refreshed"
      return 0
      ;;
  esac

  if [ -L "$existing" ]; then
    printf '%s is a symlink to %s\n' "$existing" "$target"
  else
    printf '%s is an existing file\n' "$existing"
  fi
  [ -t 0 ] || fail "$BIN_NAME is already on the PATH and there is no terminal to confirm removal"

  local answer
  read -r -p "Remove $existing? [y/N] " answer
  case "$answer" in
    y | Y | yes | YES) rm -- "$existing" ;;
    *) fail "aborted: $existing was not removed" ;;
  esac
}

check_engines

log "Pulling the latest code"
git pull --ff-only

log "Installing dependencies"
npm ci

log "Building"
npm run build:tsc

handle_existing_install

log "Linking"
npm link

log "Verifying"
hash -r
if ! command -v "$BIN_NAME" >/dev/null; then
  fail "$BIN_NAME is not on the PATH; add \"$(npm prefix -g)/bin\" to your PATH"
fi
"$BIN_NAME" --help >/dev/null || fail "'$BIN_NAME --help' failed"

log "Installed $BIN_NAME at $(command -v "$BIN_NAME")"
