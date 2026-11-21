#!/usr/bin/env bash
# Exit 0 only when the CI workflow (ci.yaml) passed on a commit: the container publishes nothing red (PLAN.md item 1).
# tools/ci-gate.sh <sha> [minutes to wait for a run still going, default 0]   (needs `gh`, and GH_TOKEN on Actions)
#
# CI runs only on the head of each push, so a release commit pushed together with its STATE note has no run of its
# own. Then the gate takes the run on the nearest later commit of main that contains it, when everything between is
# notes CI ignores anyway, so the tested code is the published code (needs full history: checkout with fetch-depth 0).
# Why: v7.191.0 and v7.196.0 waited 70 minutes for a run that never existed, holding the publish queue while every
# newer tag was cancelled; players sat 9 versions back (pass 150).
set -euo pipefail
shopt -s inherit_errexit   # a gh error inside $( ) stops the gate too
sha="${1:?usage: tools/ci-gate.sh <sha> [wait-minutes]}"
sha="$(git rev-parse --verify -q "$sha^{commit}" 2>/dev/null || echo "$sha")"   # the API wants the full sha
wait="${2:-0}"
repo="${GITHUB_REPOSITORY:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
deadline=$(( $(date +%s) + wait * 60 ))

# The sha whose CI run stands for this commit: its own run, else the nearest notes-only descendant on main with one.
target_sha() {
  local own best="" head heads other
  own="$(gh run list --repo "$repo" --workflow ci.yaml --commit "$sha" --limit 1 --json headSha -q '.[0].headSha')"
  if [[ -n "$own" ]]; then echo "$sha"; return; fi
  heads="$(gh run list --repo "$repo" --workflow ci.yaml --branch main --event push --limit 40 --json headSha \
    -q '.[].headSha')"
  # Newest first; the last match seen is the nearest one.
  while read -r head; do
    [[ -z "$head" || "$head" == "$sha" ]] && continue
    git merge-base --is-ancestor "$sha" "$head" 2>/dev/null || continue
    # Only notes lie between when no other path is left (read whole first: grep -q under pipefail can SIGPIPE git).
    other="$(git diff --name-only "$sha" "$head" | grep -vE '(\.md$|^\.claude/)' || true)"
    if [[ -z "$other" ]]; then best="$head"; fi
  done <<<"$heads"
  echo "$best"
}

run_sha=""
while :; do
  [[ -n "$run_sha" ]] || run_sha="$(target_sha)"
  line=""
  if [[ -n "$run_sha" ]]; then
    # The newest CI run on that commit (a re-run replaces the old result).
    line="$(gh run list --repo "$repo" --workflow ci.yaml --commit "$run_sha" --limit 1 --json status,conclusion,url \
      -q '.[0] | "\(.status) \(.conclusion) \(.url)"')"
  fi
  read -r status conclusion url <<<"${line:-none none none}"
  if [[ "$status" == completed ]]; then
    via=""; [[ "$run_sha" != "$sha" ]] && via=" (run on $run_sha, which contains it)"
    if [[ "$conclusion" == success ]]; then echo "CI passed on $sha$via: $url"; exit 0; fi
    echo "CI did not pass on $sha$via ($conclusion): $url" >&2; exit 1
  fi
  if (( $(date +%s) >= deadline )); then
    echo "No finished CI run on $sha (status: ${status}); nothing is published from an untested commit." >&2; exit 1
  fi
  sleep 60
done
