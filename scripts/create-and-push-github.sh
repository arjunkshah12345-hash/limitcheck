#!/usr/bin/env bash

set -Eeuo pipefail

repo="${1:-arjunkshah12345-hash/limitcheck}"
remote_name="${REMOTE_NAME:-origin}"
visibility="${VISIBILITY:-public}"
dry_run="${DRY_RUN:-0}"

die() {
  printf 'error: %s\n' "$1" >&2
  exit 1
}

run() {
  if [[ "$dry_run" == "1" ]]; then
    printf '+ '
    printf '%q ' "$@"
    printf '\n'
  else
    "$@"
  fi
}

[[ "$repo" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] || die "repo must look like owner/name"
case "$visibility" in
  public|private|internal) ;;
  *) die "VISIBILITY must be public, private, or internal" ;;
esac

command -v git >/dev/null 2>&1 || die "git is required"
command -v gh >/dev/null 2>&1 || die "GitHub CLI (gh) is required"

root="$(git rev-parse --show-toplevel 2>/dev/null)" || die "run this inside a git repository"
cd "$root"

branch="$(git branch --show-current)"
[[ -n "$branch" ]] || die "detached HEAD; checkout a branch before pushing"
[[ -z "$(git status --porcelain)" ]] || die "working tree is not clean; commit changes first"

if [[ "$dry_run" != "1" ]]; then
  gh auth status >/dev/null 2>&1 || die "authenticate first with: gh auth login"
fi

expected_https="https://github.com/${repo}.git"
expected_ssh="git@github.com:${repo}.git"

if remote_url="$(git remote get-url "$remote_name" 2>/dev/null)"; then
  case "$remote_url" in
    "$expected_https"|"$expected_ssh") ;;
    *) die "remote $remote_name already points to $remote_url" ;;
  esac
  gh repo view "$repo" >/dev/null 2>&1 || die "cannot access $repo"
  run git push --set-upstream "$remote_name" HEAD
  printf 'pushed %s to %s\n' "$branch" "$repo"
  exit 0
fi

if [[ "$dry_run" == "1" ]]; then
  run gh repo create "$repo" "--$visibility" --source "$root" --remote "$remote_name" --push
  exit 0
fi

if gh repo view "$repo" >/dev/null 2>&1; then
  run git remote add "$remote_name" "$expected_https"
  run git push --set-upstream "$remote_name" HEAD
  printf 'attached and pushed %s to %s\n' "$branch" "$repo"
  exit 0
fi

run gh repo create "$repo" "--$visibility" --source "$root" --remote "$remote_name" --push
printf 'created and pushed %s to %s\n' "$branch" "$repo"
