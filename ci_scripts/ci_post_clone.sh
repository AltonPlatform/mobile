#!/bin/sh
# Xcode Cloud: зависимости JS → CocoaPods (Pods должны появиться до xcodebuild).
# Расположение: репозиторий/ci_scripts/ci_post_clone.sh
#
# В workflow Xcode Cloud обязательно укажите ios/AltonMobile.xcworkspace (не .xcodeproj).
# Без workspace и без сгенерированных Pods Xcode видит пустой PODS_ROOT → пути вида "/Target Support Files/...".
#
# В Podfile проекта сказано не вызывать «pod install --repo-update» целиком — ломает CDN на CI.
set -e

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
export HOMEBREW_NO_ANALYTICS=1
export COCOAPODS_DISABLE_STATS=true
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

REPO_ROOT="${CI_PRIMARY_REPOSITORY_PATH:-$(CDPATH= cd "$(dirname "$0")/.." && pwd)}"
IOS_DIR="$REPO_ROOT/ios"
PODS_SUPPORT="$IOS_DIR/Pods/Target Support Files/Pods-AltonMobile"

echo "==> ci_post_clone REPO_ROOT=$REPO_ROOT"
echo "==> CI_PRIMARY_REPOSITORY_PATH=${CI_PRIMARY_REPOSITORY_PATH:-<unset>}"

cd "$REPO_ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "==> Installing Node.js (brew)..."
  brew install node
fi
node --version

if ! command -v yarn >/dev/null 2>&1; then
  echo "==> Installing Yarn (npm -g)..."
  npm install -g yarn
fi
yarn --version

echo "==> yarn install in $REPO_ROOT"
yarn install --network-timeout 600000

if [ ! -f "$REPO_ROOT/node_modules/react-native/package.json" ]; then
  echo "error: после yarn install нет react-native в node_modules — Podfile не сможет подключить RN" >&2
  exit 1
fi

if ! command -v pod >/dev/null 2>&1; then
  echo "==> Installing CocoaPods CLI (brew)..."
  brew install cocoapods
fi

cd "$IOS_DIR"
echo "export NODE_BINARY=$(command -v node)" >.xcode.env.local

# Без --repo-update (см. комментарий в ios/Podfile: CDN / HTTP2 на CI).
echo "==> pod install in $IOS_DIR"
if ! pod install; then
  echo "warn: pod install завершился с ошибкой, повтор без кэша спеков..." >&2
  pod install --verbose
fi

RELEASE_XC="$PODS_SUPPORT/Pods-AltonMobile.release.xcconfig"
if [ ! -f "$RELEASE_XC" ]; then
  echo "error: после pod install нет $RELEASE_XC — сборка Xcode не найдёт Pods (проверьте лог pod install выше)" >&2
  ls -la "$PODS_SUPPORT" 2>&1 || ls -la "$IOS_DIR/Pods" 2>&1 || true
  exit 1
fi

echo "==> ci_post_clone OK (Pods-AltonMobile.release.xcconfig на месте)"
