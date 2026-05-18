#!/bin/sh
set -e

if [ -d "$HOME/.rbenv/shims" ]; then
  export PATH="$HOME/.rbenv/shims:$HOME/.rbenv/bin:$PATH"
  eval "$(rbenv init - sh 2>/dev/null)" || true
fi

cd "${SRCROOT}"
export BUNDLE_GEMFILE="${SRCROOT}/Gemfile"

if ! bundle check >/dev/null 2>&1; then
  bundle install
fi

exec bundle exec ruby "${SRCROOT}/Scripts/cas_ai_configuration.rb"
