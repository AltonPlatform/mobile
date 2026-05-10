#!/usr/bin/env bash
#
# ci_post_clone.sh — Xcode Cloud: Node, npm ci, CocoaPods (React Native).
# Отдельный репозиторий mobile: корень клона = корень RN (package.json в корне).
#
# Образ Xcode Cloud часто без Homebrew; Yarn/Corepack могут отсутствовать → exit 127.
# Используем npm ci (есть package-lock.json) и при необходимости ставим Node с nodejs.org.
#
# Документация Apple: ci_scripts ищется от каталога workspace вверх до корня репозитория.
#

set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
export HOMEBREW_NO_ANALYTICS=1
export HOMEBREW_NO_INSTALL_CLEANUP=1
export COCOAPODS_DISABLE_STATS=true
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
export GIT_TERMINAL_PROMPT=0
export NPM_CONFIG_FETCH_TIMEOUT="${NPM_CONFIG_FETCH_TIMEOUT:-600000}"

# Версия официального бинарника Node (darwin), если нет brew. См. package.json → engines.node
CI_NODE_VERSION="${CI_NODE_VERSION:-20.18.1}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -n "${CI_PRIMARY_REPOSITORY_PATH:-}" ]]; then
  REPO_ROOT="$CI_PRIMARY_REPOSITORY_PATH"
else
  REPO_ROOT="$(git -C "$IOS_DIR" rev-parse --show-toplevel)"
fi

echo "==> ci_post_clone: REPO_ROOT=$REPO_ROOT"
echo "==> ci_post_clone: IOS_DIR=$IOS_DIR"
echo "==> CI_PRIMARY_REPOSITORY_PATH=${CI_PRIMARY_REPOSITORY_PATH:-<unset>}"

if [[ -f "$REPO_ROOT/.gitmodules" ]]; then
  echo "==> Initializing git submodules..."
  git -C "$REPO_ROOT" submodule update --init --recursive
fi

if [[ -f "$REPO_ROOT/mobile/package.json" ]]; then
  MOBILE_DIR="$REPO_ROOT/mobile"
elif [[ -f "$REPO_ROOT/package.json" ]]; then
  MOBILE_DIR="$REPO_ROOT"
else
  echo "error: не найден package.json (ожидали \$REPO_ROOT/mobile или \$REPO_ROOT)" >&2
  exit 1
fi

if [[ ! -f "$IOS_DIR/Podfile" ]]; then
  echo "error: Podfile не найден: $IOS_DIR/Podfile" >&2
  exit 1
fi

install_node_from_nodejs_org() {
  local arch
  case "$(uname -m)" in
    arm64) arch=arm64 ;;
    x86_64) arch=x64 ;;
    *) echo "error: неподдерживаемая архитектура: $(uname -m)" >&2; exit 1 ;;
  esac
  local name="node-v${CI_NODE_VERSION}-darwin-${arch}"
  local url="https://nodejs.org/dist/v${CI_NODE_VERSION}/${name}.tar.gz"
  local root="${TMPDIR:-/tmp}/ci-node-${CI_NODE_VERSION}-$$"
  mkdir -p "$root"
  echo "==> Скачиваем Node.js v${CI_NODE_VERSION} (darwin-${arch}) с nodejs.org (Homebrew недоступен)..."
  curl -fsSL "$url" -o "$root/node.tgz"
  tar -xzf "$root/node.tgz" -C "$root"
  export PATH="$root/${name}/bin:$PATH"
  hash -r
}

ensure_node() {
  if command -v node >/dev/null 2>&1; then
    return 0
  fi
  # На Xcode Cloud brew часто есть, но install падает (права/сеть) — без fallback скрипт выходил с 1 и не доходил до tar.gz.
  if command -v brew >/dev/null 2>&1; then
    echo "==> Пробуем установить Node.js через Homebrew..."
    if brew install node; then
      hash -r
      return 0
    fi
    echo "warn: brew install node не удался — ставим официальный бинарник с nodejs.org" >&2
  fi
  install_node_from_nodejs_org
}

# Gemfile.lock задаёт BUNDLED WITH. Bundler 4.x требует Ruby >= 3.2; на Xcode Cloud часто системный Ruby 2.6.
ensure_bundler_from_lock() {
  local lockfile="$1"
  if [[ ! -f "$lockfile" ]]; then
    echo "error: Gemfile.lock не найден: $lockfile" >&2
    exit 1
  fi
  local ver
  ver="$(awk '/^BUNDLED WITH$/{getline; gsub(/^[[:space:]]+/,""); print; exit}' "$lockfile")"
  if [[ -z "${ver:-}" ]]; then
    echo "==> В Gemfile.lock нет BUNDLED WITH — ставим bundler по умолчанию"
    gem install bundler --no-document 2>/dev/null || gem install bundler --user-install --no-document
    export PATH="$(ruby -e 'puts Gem.bindir'):$(ruby -e 'puts File.join(Gem.user_dir, "bin")'):$PATH"
    hash -r
    return 0
  fi

  if ruby -e 'exit Gem::Version.new(ARGV[0]) >= Gem::Version.new("4.0.0")' "$ver" 2>/dev/null; then
    if ! ruby -e 'exit Gem::Version.new(RUBY_VERSION) >= Gem::Version.new("3.2.0")' 2>/dev/null; then
      echo "warn: Bundler ${ver} требует Ruby >= 3.2, сейчас $(ruby -e 'print RUBY_VERSION')" >&2
      if command -v brew >/dev/null 2>&1; then
        echo "==> brew install ruby (нужно для Bundler 4.x)"
        brew install ruby
        export PATH="$(brew --prefix ruby)/bin:$PATH"
        hash -r
      fi
    fi
    if ! ruby -e 'exit Gem::Version.new(RUBY_VERSION) >= Gem::Version.new("3.2.0")' 2>/dev/null; then
      echo "error: Bundler ${ver} требует Ruby >= 3.2; на CI: brew install ruby, или понизьте BUNDLED WITH (bundle update --bundler с Bundler 2.x)" >&2
      exit 1
    fi
  fi

  echo "==> Устанавливаем Bundler ${ver} (секция BUNDLED WITH в Gemfile.lock)"
  gem install "bundler:${ver}" --no-document 2>/dev/null || gem install "bundler:${ver}" --user-install --no-document

  export PATH="$(ruby -e 'puts Gem.bindir'):$(ruby -e 'puts File.join(Gem.user_dir, "bin")'):$PATH"
  hash -r
}

ensure_node
node --version
command -v npm >/dev/null 2>&1 || {
  echo "error: npm не найден после установки Node.js" >&2
  exit 1
}

cd "$MOBILE_DIR"
if [[ ! -f "$MOBILE_DIR/package-lock.json" ]]; then
  echo "error: для npm ci нужен package-lock.json: $MOBILE_DIR/package-lock.json" >&2
  exit 1
fi
echo "==> npm ci в $MOBILE_DIR"
npm ci --no-audit --no-fund

cd "$IOS_DIR"
ensure_bundler_from_lock "$IOS_DIR/Gemfile.lock"
bundle --version

echo "==> bundle install в $IOS_DIR"
bundle install

echo "==> pod install в $IOS_DIR"
if ! bundle exec pod install; then
  echo "==> pod install завершился с ошибкой, повтор с --verbose"
  if ! bundle exec pod install --verbose; then
    echo "error: bundle exec pod install завершился неудачно дважды" >&2
    exit 1
  fi
fi

NODE_BIN="$(command -v node)"
echo "export NODE_BINARY=${NODE_BIN}" >"$IOS_DIR/.xcode.env.local"
echo "==> записан .xcode.env.local с NODE_BINARY=$NODE_BIN"

PODS_SUPPORT="$IOS_DIR/Pods/Target Support Files/Pods-AltonMobile"
RELEASE_XCCONFIG="$PODS_SUPPORT/Pods-AltonMobile.release.xcconfig"
DEBUG_XCCONFIG="$PODS_SUPPORT/Pods-AltonMobile.debug.xcconfig"

# Обязательны только xcconfig — Xcode линкует их к таргету. Имена *.xcfilelist менялись между версиями CocoaPods.
for f in "$RELEASE_XCCONFIG" "$DEBUG_XCCONFIG"; do
  if [[ ! -f "$f" ]]; then
    echo "error: после pod install нет Pods-AltonMobile *.xcconfig: $f" >&2
    ls -la "$PODS_SUPPORT" 2>&1 || ls -la "$IOS_DIR/Pods" 2>&1 || true
    exit 1
  fi
done

echo "==> ci_post_clone OK (Pods-AltonMobile Debug/Release xcconfig на месте)"
