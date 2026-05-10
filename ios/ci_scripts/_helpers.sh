# Общие функции для ci_post_clone.sh и ci_pre_xcodebuild.sh (POSIX sh).
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
    echo "error: yarn install failed (corepack/npm)" >&2
    exit 1
  }
}

ensure_pod() {
  if command -v pod >/dev/null 2>&1; then
    return 0
  fi
  ensure_brew_in_path || install_homebrew || true
  if command -v brew >/dev/null 2>&1 && brew install cocoapods; then
    hash -r
    return 0
  fi
  echo "==> CocoaPods via gem --user-install"
  gem install cocoapods --user-install --no-document
  export PATH="$(ruby -e 'puts Gem.bindir'):$(ruby -e 'puts File.join(Gem.user_dir, "bin")'):$PATH"
  hash -r
}
