import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { editionSkills, fileHashes } from './standalone-skills.mjs';

const [lang, source, previous, revision] = process.argv.slice(2);
if (!source || (previous && !revision)) {
  throw new Error('Usage: node scripts/check-skills-sh.mjs <zh|en> <source URL or absolute directory> [previous revision]');
}
let skills = editionSkills(lang);
if (previous) {
  const changes = execFileSync('git', ['diff', '--no-renames', '--name-only', '-z', previous, revision, '--', 'skills'], { encoding: 'utf8' });
  const names = new Set(changes.split('\0').filter(Boolean).map(path => path.split('/')[2]));
  skills = skills.filter(skill => names.has(skill.name));
}

for (const { name, dir } of skills) {
  const project = mkdtempSync(join(tmpdir(), 'peterflow-single-'));
  try {
    execFileSync('skills', ['add', source, '--skill', name, '--agent', 'codex', '--copy', '--yes'], {
      cwd: project, stdio: ['ignore', 'pipe', 'inherit'], env: { ...process.env, XDG_STATE_HOME: join(project, '.state') },
    });
    const installed = join(project, '.agents/skills');
    assert.deepEqual(readdirSync(installed), [name], `${lang}/${name}: expected one installed skill`);
    assert.deepEqual(fileHashes(join(installed, name)), fileHashes(dir), `${lang}/${name}: installed files differ`);
    console.log(`Verified ${lang}/${name}`);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
}
console.log(`Verified ${skills.length} individual installs from ${source}.`);
