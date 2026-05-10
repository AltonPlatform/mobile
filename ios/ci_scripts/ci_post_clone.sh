#!/bin/sh
# Xcode Cloud: ios/ci_scripts рядом с AltonMobile.xcworkspace.
set -e

case "${CI_DEBUG_POST_CLONE:-}" in 1|true|yes) set -x ;; esac

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
export HOMEBREW_NO_ANALYTICS=1
export HOMEBREW_NO_INSTALL_CLEANUP=1
export COCOAPODS_DISABLE_STATS=true
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
export NPM_CONFIG_FETCH_TIMEOUT="${NPM_CONFIG_FETCH_TIMEOUT:-600000}"
CI_NODE_VERSION="${CI_NODE_VERSION:-20.18.1}"

SCRIPT_DIR="$(CDPATH= cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/_helpers.sh"

REPO_ROOT="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
IOS_DIR="$REPO_ROOT/ios"
PODS_SUPPORT="$IOS_DIR/Pods/Target Support Files/Pods-AltonMobile"

echo "==> ci_post_clone REPO_ROOT=$REPO_ROOT"

cd "$REPO_ROOT"

ensure_node
node --version
ensure_yarn
yarn --version

echo "==> yarn install"
yarn install --network-timeout 600000

if [ ! -f "$REPO_ROOT/node_modules/react-native/package.json" ]; then
  echo "error: нет react-native в node_modules" >&2
  exit 1
fi

ensure_pod
pod --version

cd "$IOS_DIR"
echo "export NODE_BINARY=$(command -v node)" >.xcode.env.local

echo "==> pod install"
ok=0
if pod install; then
  ok=1
else
  echo "warn: pod install failed, retry verbose" >&2
  pod install --verbose && ok=1
fi
if [ "$ok" != 1 ]; then
  exit 1
fi

if [ ! -f "$PODS_SUPPORT/Pods-AltonMobile.release.xcconfig" ]; then
  echo "error: нет Pods-AltonMobile.release.xcconfig" >&2
  ls -la "$PODS_SUPPORT" 2>&1 || ls -la "$IOS_DIR/Pods" 2>&1 || true
  exit 1
fi

echo "==> ci_post_clone OK"
