# 复制到临时目录，替换示例步骤，在 PowerShell 中运行 .\hitl-loop.template.ps1。
# 登录由人完成。只填写已脱敏的观察结果，不填写凭据。
$ErrorActionPreference = 'Stop'

function Show-Step([string]$Instruction) {
    Write-Host ">>> $Instruction"
    [void](Read-Host '完成后按回车')
}

Show-Step '打开本地应用并登录。'
$errored = Read-Host '点击导出后出现了所报告的错误吗？（是/否）'
$errorMessage = Read-Host '填写脱敏后的错误信息，无错误请填：无。'

Write-Output '--- 观察结果 ---'
Write-Output "ERRORED=$errored"
Write-Output "ERROR_MSG=$errorMessage"
