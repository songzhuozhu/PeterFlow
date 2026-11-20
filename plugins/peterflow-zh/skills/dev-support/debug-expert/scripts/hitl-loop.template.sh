#!/usr/bin/env bash
# 复制到临时目录，替换示例步骤，再用 bash 运行。登录由人完成。
# capture 的回答会原样显示。只填写已脱敏的现象，不填写凭据。
set -euo pipefail

step() {
  printf '\n>>> %s\n' "$1"
  read -r -p "    [完成后按回车] " _
}

capture() {
  local var="$1" question="$2" answer
  printf '\n>>> %s\n' "$question"
  read -r -p "    > " answer
  printf -v "$var" '%s' "$answer"
}

step "打开本地应用并登录。"
capture ERRORED "点击导出后出现了所报告的错误吗？（是/否）"
capture ERROR_MSG "填写脱敏后的错误信息，无错误请填“无”。"

printf '\n--- 观察结果 ---\n'
printf 'ERRORED=%s\n' "$ERRORED"
printf 'ERROR_MSG=%s\n' "$ERROR_MSG"

