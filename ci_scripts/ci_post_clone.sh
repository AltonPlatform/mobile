#!/bin/sh
# Xcode Cloud: клон → JS-зависимости (Yarn) → CocoaPods.
# Расположение: корень репозитория /ci_scripts/ci_post_clone.sh
# Workflow: выберите ios/AltonMobile.xcworkspace (см. README команды в ответе ассистента).
set -e

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
export HOMEBREW_NO_ANALYTICS=1
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

REPO_ROOT="${CI_PRIMARY_REPOSITORY_PATH:-$(CDPATH= cd "$(dirname "$0")/.." && pwd)}"
IOS_DIR="$REPO_ROOT/ios"

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

if ! command -v pod >/dev/null 2>&1; then
  echo "==> Installing CocoaPods CLI (brew)..."
  brew install cocoapods
fi

cd "$IOS_DIR"
echo "export NODE_BINARY=$(command -v node)" >.xcode.env.local

echo "==> pod install --repo-update in $IOS_DIR"
pod install --repo-update

echo "==> ci_post_clone OK"
