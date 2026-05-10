# Общие функции для ci_post_clone.sh и ci_pre_xcodebuild.sh (POSIX sh).
# CocoaPods: только через Bundler (как в ios/Podfile — bundle exec pod install).
# shellcheck shell=sh

ensure_brew_in_path() {
  if command -v brew >/dev/null 2>&1; then
    return 0
  fi
  if [ -x /opt/homebrew/bin/brew ]; then
    export PATH="/opt/homebrew/bin:$PATH"
    return 0
  fi
  if [ -x /usr/local/bin/brew ]; then
    export PATH="/usr/local/bin:$PATH"
    return 0
  fi
  return 1
}

install_homebrew() {
  echo "==> Installing Homebrew (NONINTERACTIVE)..."
  NONINTERACTIVE=1 CI=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  if [ -x /opt/homebrew/bin/brew ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [ -x /usr/local/bin/brew ]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi
  command -v brew >/dev/null 2>&1
}

install_node_tarball() {
  arch="$(uname -m)"
  case "$arch" in
    arm64) narch=arm64 ;;
    x86_64) narch=x64 ;;
    *) echo "error: unsupported arch $arch" >&2; exit 1 ;;
  esac
  name="node-v${CI_NODE_VERSION}-darwin-${narch}"
  url="https://nodejs.org/dist/v${CI_NODE_VERSION}/${name}.tar.gz"
  root="${TMPDIR:-/tmp}/ci-node-$$"
  mkdir -p "$root"
  echo "==> Node: tarball $url"
  curl -fsSL "$url" -o "$root/node.tgz"
  tar -xzf "$root/node.tgz" -C "$root"
  export PATH="$root/$name/bin:$PATH"
}

ensure_node() {
  if command -v node >/dev/null 2>&1; then
    return 0
  fi
  ensure_brew_in_path || install_homebrew || true
  if command -v brew >/dev/null 2>&1 && brew install node; then
    hash -r
    return 0
  fi
  echo "warn: brew install node failed — nodejs.org tarball" >&2
  install_node_tarball
}

ensure_yarn() {
  if command -v yarn >/dev/null 2>&1; then
    return 0
  fi
  if command -v corepack >/dev/null 2>&1; then
    echo "==> Yarn via Corepack"
    corepack enable
    corepack prepare yarn@1.22.22 --activate
    return 0
  fi
  if command -v npm >/dev/null 2>&1; then
    echo "==> Yarn via npm -g"
    npm install -g yarn || npm install -g yarn --prefix "${HOME}/.npm-global"
    export PATH="${HOME}/.npm-global/bin:$PATH"
    hash -r
  fi
  command -v yarn >/dev/null 2>&1 || {
    echo "error: yarn failed (corepack/npm)" >&2
    exit 1
  }
}

install_bundler_from_lock() {
  lock="$1"
  if [ ! -f "$lock" ]; then
    echo "error: Gemfile.lock not found: $lock" >&2
    exit 1
  fi
  ver="$(awk '/^BUNDLED WITH$/{getline;gsub(/^[[:space:]]+/,"");print;exit}' "$lock")"
  if [ -n "$ver" ]; then
    echo "==> gem install bundler:$ver (BUNDLED WITH)"
    gem install "bundler:$ver" --no-document 2>/dev/null || gem install "bundler:$ver" --user-install --no-document
  else
    gem install bundler --no-document 2>/dev/null || gem install bundler --user-install --no-document
  fi
  export PATH="$(ruby -e 'puts Gem.bindir'):$(ruby -e 'puts File.join(Gem.user_dir, "bin")'):$PATH"
  hash -r
}

# Bundler 4.x из Gemfile.lock требует Ruby >= 3.2 — без brew ruby на старом macOS нельзя.
ensure_ruby_bundler_for_ios() {
  IOS_DIR="$1"
  ensure_brew_in_path || install_homebrew || true
  if ! ruby -e 'exit Gem::Version.new(RUBY_VERSION) >= Gem::Version.new("3.2.0")' 2>/dev/null; then
    if command -v brew >/dev/null 2>&1; then
      echo "==> brew install ruby (нужен Ruby >= 3.2 для Bundler / Gemfile.lock)"
      brew install ruby
      export PATH="$(brew --prefix ruby)/bin:$PATH"
      hash -r
    fi
  fi
  if ! ruby -e 'exit Gem::Version.new(RUBY_VERSION) >= Gem::Version.new("3.2.0")' 2>/dev/null; then
    echo "error: нужен Ruby >= 3.2 (brew install ruby)" >&2
    exit 1
  fi
  install_bundler_from_lock "$IOS_DIR/Gemfile.lock"
  command -v bundle >/dev/null 2>&1 || {
    echo "error: bundle не найден после установки bundler" >&2
    exit 1
  }
}

# Снимок Podfile.lock иногда рассинхронен с «текущим» react-native (yarn дал 0.85.3, lock — 0.85.2).
# Сначала чистый install; при конфликте prebuilt — pod update --no-repo-update (без CDN repo-update).
ios_bundle_pod_install() {
  IOS_DIR="$1"
  cd "$IOS_DIR" || exit 1

  echo "==> rm -rf Pods"
  rm -rf Pods

  echo "==> bundle exec pod install"
  if bundle exec pod install; then
    return 0
  fi

  echo "warn: pod install failed → bundle exec pod update --no-repo-update (синхронизация lock с node_modules)" >&2
  bundle exec pod update --no-repo-update

  echo "==> bundle exec pod install (after pod update)"
  if bundle exec pod install; then
    return 0
  fi

  echo "warn: повтор pod install --verbose" >&2
  bundle exec pod install --verbose
}
