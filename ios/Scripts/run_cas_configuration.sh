#!/bin/sh
set -e

cd "${SRCROOT}"
export BUNDLE_GEMFILE="${SRCROOT}/Gemfile"

if ! bundle check >/dev/null 2>&1; then
  bundle install
fi

exec bundle exec ruby "${SRCROOT}/Scripts/cas_ai_configuration.rb"
