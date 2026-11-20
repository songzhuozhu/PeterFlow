#!/usr/bin/env bash
set -euo pipefail

edition=${1:?Expected zh or en}
commit=${2:?Expected the source commit}
remote=${3:?Expected the edition repository}
case "$edition" in zh|en) ;; *) echo "Unknown edition: $edition" >&2; exit 2 ;; esac

revision=$(git subtree split -q --prefix="plugins/peterflow-$edition" "$commit")
previous=$(git ls-remote --refs "$remote" refs/heads/main | cut -f1)
if [[ ${4:-} == --check ]]; then
  if [[ "$previous" != "$revision" ]]; then
    echo "The public edition differs from the tested source; a mirror write credential is required." >&2
    exit 1
  fi
else
  git push "$remote" "$revision:refs/heads/main" >&2
fi
printf 'previous=%s\nrevision=%s\n' "$previous" "$revision"
