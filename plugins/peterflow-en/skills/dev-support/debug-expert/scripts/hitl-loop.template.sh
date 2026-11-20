#!/usr/bin/env bash
# Copy to a temporary directory and adapt the steps. Share only redacted observations.
set -euo pipefail

printf '%s\n' 'Open the local app and sign in yourself.'
read -r -p 'Press Enter when ready. ' _
read -r -p 'Did Export trigger the reported error? (yes/no) ' errored
read -r -p 'Redacted error text, or "none": ' error_message
printf 'ERRORED=%s\nERROR_MSG=%s\n' "$errored" "$error_message"
