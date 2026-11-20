"""Exercise the packed npx installer with an actual terminal and isolated install paths."""
import fcntl
import os
from pathlib import Path
import pty
import select
import struct
import subprocess
import sys
import termios
import time


archive = sys.argv[1]
project = Path.cwd() / "keyboard-project"
home = Path.cwd() / "keyboard-home"
project.mkdir()
home.mkdir()
env = dict(os.environ, HOME=str(home), USERPROFILE=str(home), CLAUDE_CONFIG_DIR=str(home / ".claude"), TERM="xterm-256color")

UP, DOWN, RIGHT, LEFT = "\x1b[A", "\x1b[B", "\x1b[C", "\x1b[D"
ENTER, SPACE = "\r", " "


def play(options, steps, expected_status=0):
    master, slave = pty.openpty()
    try:
        fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack("HHHH", 14, 80, 0, 0))
        original = termios.tcgetattr(slave)
        with subprocess.Popen(
            ["npx", "--yes", "--offline", "--package", archive, "peterflow", *options],
            cwd=project, env=env, stdin=slave, stdout=slave, stderr=slave,
        ) as process:
            pending = b""
            try:
                for prompt, keys in steps:
                    marker = prompt.encode()
                    deadline = time.monotonic() + 10
                    while marker not in pending:
                        timeout = max(0, deadline - time.monotonic())
                        if process.poll() is not None or not select.select([master], [], [], timeout)[0]:
                            raise AssertionError(f"Missing {prompt!r}. Last output: {pending[-1800:]!r}")
                        pending += os.read(master, 8192)
                    pending = pending.split(marker, 1)[1]
                    os.write(master, keys.encode())
                # Keep consuming the terminal while readline echoes the destination and npm exits.
                deadline = time.monotonic() + 10
                while process.poll() is None:
                    if time.monotonic() >= deadline:
                        raise AssertionError(f"Installer did not finish: {pending[-1800:]!r}")
                    if select.select([master], [], [], 0.1)[0]:
                        pending += os.read(master, 8192)
                assert process.returncode == expected_status, pending[-1800:]
            finally:
                if process.poll() is None:
                    process.kill()
        assert termios.tcgetattr(slave) == original, "Terminal mode was not restored"
    finally:
        os.close(master)
        os.close(slave)


play([], [
    ("Language / 语言", DOWN + ENTER),
    ("安装内容", ENTER),
    ("勾选分组或 Skill", ENTER),
    ("请至少勾选一个分组或 Skill。", DOWN * 2 + SPACE + RIGHT + DOWN * 2 + SPACE),
    ("[-] ▾ daily-work · 日常工作 (2/3)", LEFT + DOWN + RIGHT + DOWN * 2 + SPACE + ENTER),
    ("选择 Agent", DOWN + ENTER),
    ("选择安装范围", DOWN),
    (str(home / ".claude/skills"), ENTER),
])
assert sorted(p.name for p in (home / ".claude/skills").iterdir()) == ["ask-peter", "learn", "shuorenhua"]
assert not (project / ".claude/skills").exists()

play(["--lang", "en"], [
    ("What would you like to install?", ENTER),
    ("Select groups or skills", SPACE + SPACE + RIGHT + DOWN + SPACE + ENTER),
    ("Choose an agent", DOWN + UP + ENTER),
    ("Choose the installation scope", ENTER),
])
assert [p.name for p in (project / ".agents/skills").iterdir()] == ["plan"]
assert not (home / ".agents/skills").exists()

play(["--lang", "en"], [
    ("What would you like to install?", DOWN + ENTER),
    ("Choose an agent", DOWN + ENTER),
    ("Choose the installation scope", "\x1b"),
], expected_status=1)
assert not (project / ".claude/skills").exists()

custom = home / "custom destination"
play(["--lang", "en", "--agent", "claude"], [
    ("What would you like to install?", ENTER),
    ("Select groups or skills", DOWN * 2 + SPACE + ENTER),
    ("Choose the installation scope", DOWN * 2 + ENTER),
    ("Path to skills directory", "~/custom destination" + ENTER),
])
assert sorted(p.name for p in custom.iterdir()) == ["learn", "plainly", "research"]
assert not (project / "~").exists()

play(["--lang", "en", "--global"], [
    ("Select groups or skills", DOWN * 2 + SPACE + ENTER),
    ("Choose an agent", "trae-cnz"),
    ("No matching agents", ENTER + "\x7f" + ENTER),
])
assert sorted(p.name for p in (home / ".trae-cn/skills").iterdir()) == ["learn", "plainly", "research"]
