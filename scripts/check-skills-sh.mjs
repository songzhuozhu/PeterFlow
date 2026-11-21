import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { editionSkills, fileHashes } from './standalone-skills.mjs';

const [lang, source, ...extra] = process.argv.slice(2);
if (!source || extra.length) throw new Error('Usage: node scripts/check-skills-sh.mjs <zh|en> <edition source>');
const skills = editionSkills(lang);

for (const { name, dir } of skills) {
  const project = mkdtempSync(join(tmpdir(), 'peterflow-single-'));
  try {
    execFileSync('skills', ['add', source, '--skill', name, '--agent', 'codex', '--copy', '--yes'], {
      cwd: project, stdio: ['ignore', 'pipe', 'inherit'], env: { ...process.env, DISABLE_TELEMETRY: '1', XDG_STATE_HOME: join(project, '.state') },
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
