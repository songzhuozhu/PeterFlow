# Copy to a temporary directory and adapt the steps. Share only redacted observations.
$ErrorActionPreference = 'Stop'
Write-Host 'Open the local app and sign in yourself.'
[void](Read-Host 'Press Enter when ready')
$errored = Read-Host 'Did Export trigger the reported error? (yes/no)'
$errorMessage = Read-Host 'Redacted error text, or "none"'
Write-Output "ERRORED=$errored"
Write-Output "ERROR_MSG=$errorMessage"
