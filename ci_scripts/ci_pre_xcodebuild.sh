#!/bin/sh
# Подстраховка: если Pods не собраны после post_clone — те же шаги, что в ci_post_clone.sh.
set -e

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
export HOMEBREW_NO_ANALYTICS=1
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

SCRIPT_DIR="$(CDPATH= cd "$(dirname "$0")" && pwd)"
REPO_ROOT="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$SCRIPT_DIR/.." && pwd)}"
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

echo "==> ci_pre_xcodebuild: Pods incomplete, reinstalling..."

if [ ! -f "$IOS_DIR/Podfile" ]; then
  echo "error: Podfile not found at $IOS_DIR/Podfile" >&2
  exit 1
fi

cd "$MOBILE_DIR"
if ! command -v node >/dev/null 2>&1; then
  brew install node
fi
if ! command -v yarn >/dev/null 2>&1; then
  npm install -g yarn
fi
yarn install --network-timeout 600000

if ! command -v pod >/dev/null 2>&1; then
  brew install cocoapods
fi

cd "$IOS_DIR"
echo "export NODE_BINARY=$(command -v node)" >.xcode.env.local
pod install --repo-update

if ! pods_look_complete; then
  echo "error: pod install failed — Pods still incomplete" >&2
  ls -la "$PODS_SUPPORT" 2>&1 || true
  exit 1
fi
echo "==> ci_pre_xcodebuild OK"
