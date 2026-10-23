#!/bin/sh
# Publishes the release branch apps install: runs the checks, builds the compiled tree, force-pushes it.
# The same steps as scripts/release.workflow.yml, for when CI cannot push (copy that file to .github/workflows/
# with a token that has the workflow scope to automate this). RELEASE_BRANCH=release-test publishes a test build
# beside it, for trying a change on real projects before apps get it.
set -e
branch="${RELEASE_BRANCH:-release}"
cd "$(dirname "$0")/.."
npm run ci
out="$(mktemp -d)/release"
node scripts/make-release.mjs "$out"
sha="$(git rev-parse --short HEAD)"
remote="$(git remote get-url origin)"
cd "$out"
git init -q -b "$branch"
git add -A
git -c user.name="$(git -C "$OLDPWD" config user.name)" -c user.email="$(git -C "$OLDPWD" config user.email)" commit -qm "release from $sha"
git push -q -f "$remote" "$branch"
echo "$branch branch updated from $sha"
