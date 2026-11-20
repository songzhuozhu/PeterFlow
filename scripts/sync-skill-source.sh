#!/usr/bin/env bash
set -euo pipefail

edition=${1:?Expected zh or en}
commit=${2:?Expected the source commit}
remote=${3:?Expected the edition repository}
case "$edition" in zh|en) ;; *) echo "Unknown edition: $edition" >&2; exit 2 ;; esac

revision=$(git subtree split -q --prefix="plugins/peterflow-$edition" "$commit")
previous=$(git ls-remote --refs "$remote" refs/heads/main | cut -f1)
git push "$remote" "$revision:refs/heads/main" >&2
printf 'previous=%s\nrevision=%s\n' "$previous" "$revision"
