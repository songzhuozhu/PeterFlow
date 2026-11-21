"""Build the Chinese skills.sh discovery source from the tracked PeterFlow files."""

import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


def build(output):
    root = Path("plugins/peterflow-zh/skills")
    catalog = output / ".well-known/agent-skills"
    catalog.mkdir(parents=True, exist_ok=True)
    tracked = subprocess.check_output(["git", "ls-files", "-z", "--", str(root)])
    files = [Path(name.decode()) for name in tracked.split(b"\0") if name]
    entries = []
    for manifest in sorted(path for path in files if path.name == "SKILL.md"):
        directory = manifest.parent
        name = directory.name
        frontmatter = manifest.read_text(encoding="utf-8").split("\n---\n", 1)[0]
        declared = re.search(r"^name: (.+)$", frontmatter, re.M)
        description = re.search(r"^description: (.+)$", frontmatter, re.M)
        if not declared or declared[1] != name or not description:
            raise ValueError(f"Missing or inconsistent skill metadata in {manifest}")
        summary = description[1]
        if summary.startswith('"'):
            summary = json.loads(summary)
        archive = catalog / f"{name}.zip"
        with ZipFile(archive, "w") as bundle:
            for path in files:
                if path.is_relative_to(directory):
                    member = ZipInfo(path.relative_to(directory).as_posix())
                    member.external_attr = (0o100755 if path.stat().st_mode & 0o111 else 0o100644) << 16
                    bundle.writestr(member, path.read_bytes(), compress_type=ZIP_DEFLATED)
        digest = hashlib.sha256(archive.read_bytes()).hexdigest()
        entries.append(dict(name=name, type="archive", description=summary, url=archive.name, digest=f"sha256:{digest}"))

    if len(entries) != 21 or len({entry["name"] for entry in entries}) != 21:
        raise ValueError("Expected 21 distinct PeterFlow skills in Chinese")
    index = {"$schema": "https://schemas.agentskills.io/discovery/0.2.0/schema.json", "skills": entries}
    (catalog / "index.json").write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (output / "index.html").write_text(Path("scripts/skill-site.html").read_text(encoding="utf-8"), encoding="utf-8")


if __name__ == "__main__":
    build(Path(sys.argv[1]))
