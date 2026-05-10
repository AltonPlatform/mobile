#!/bin/sh
set -e

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
export HOMEBREW_NO_ANALYTICS=1
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
export NPM_CONFIG_FETCH_TIMEOUT="${NPM_CONFIG_FETCH_TIMEOUT:-600000}"
CI_NODE_VERSION="${CI_NODE_VERSION:-20.18.1}"

SCRIPT_DIR="$(CDPATH= cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/_helpers.sh"

REPO_ROOT="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
IOS_DIR="$REPO_ROOT/ios"
MOBILE_DIR="$REPO_ROOT"
PODS_SUPPORT="$IOS_DIR/Pods/Target Support Files/Pods-AltonMobile"
DEBUG_XCCONFIG="$PODS_SUPPORT/Pods-AltonMobile.debug.xcconfig"
RELEASE_XCCONFIG="$PODS_SUPPORT/Pods-AltonMobile.release.xcconfig"

pods_look_complete() {
  [ -f "$DEBUG_XCCONFIG" ] && [ -f "$RELEASE_XCCONFIG" ]
}

if pods_look_complete; then
  echo "==> ci_pre_xcodebuild: Pods OK"
  exit 0
fi

echo "==> ci_pre_xcodebuild: reinstall Pods"

if [ ! -f "$IOS_DIR/Podfile" ]; then
  echo "error: Podfile not found" >&2
  exit 1
fi

cd "$MOBILE_DIR"
ensure_node
ensure_yarn
yarn install --network-timeout 600000

ensure_pod

cd "$IOS_DIR"
echo "export NODE_BINARY=$(command -v node)" >.xcode.env.local
ok=0
if pod install; then
  ok=1
else
  pod install --verbose && ok=1
fi
if [ "$ok" != 1 ]; then
  exit 1
fi

if ! pods_look_complete; then
  echo "error: Pods incomplete after pod install" >&2
  ls -la "$PODS_SUPPORT" 2>&1 || true
  exit 1
fi
echo "==> ci_pre_xcodebuild OK"
