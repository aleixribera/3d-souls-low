#!/usr/bin/env bash
# Exit 0 only when the CI workflow (ci.yaml) passed on a commit: the container publishes nothing red (PLAN.md item 1).
# tools/ci-gate.sh <sha> [minutes to wait for a run still going, default 0]   (needs `gh`, and GH_TOKEN on Actions)
set -euo pipefail
sha="${1:?usage: tools/ci-gate.sh <sha> [wait-minutes]}"
sha="$(git rev-parse --verify -q "$sha^{commit}" 2>/dev/null || echo "$sha")"   # the API wants the full sha
wait="${2:-0}"
repo="${GITHUB_REPOSITORY:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
deadline=$(( $(date +%s) + wait * 60 ))
while :; do
  # The newest CI run on this commit (a re-run replaces the old result).
  line="$(gh run list --repo "$repo" --workflow ci.yaml --commit "$sha" --limit 1 --json status,conclusion,url \
    -q '.[0] | "\(.status) \(.conclusion) \(.url)"')"   # a gh error (auth, scope) stops the gate at once
  read -r status conclusion url <<<"${line:-none none none}"
  if [[ "$status" == completed ]]; then
    if [[ "$conclusion" == success ]]; then echo "CI passed on $sha: $url"; exit 0; fi
    echo "CI did not pass on $sha ($conclusion): $url" >&2; exit 1
  fi
  if (( $(date +%s) >= deadline )); then
    echo "No finished CI run on $sha (status: ${status}); nothing is published from an untested commit." >&2; exit 1
  fi
  sleep 30
done
