import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, delimiter, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { nativeClawHubSkills } from '../scripts/standalone-skills.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

test('each catalog lists 21 MIT skills and only the 11 approved native ClawHub entries', () => {
  for (const lang of ['zh', 'en']) {
    const owner = `peterflow-${lang}`;
    const dir = join(root, 'plugins', owner);
    const guide = readFileSync(join(dir, 'README.md'), 'utf8');
    const names = readdirSync(join(dir, 'skills'), { recursive: true, withFileTypes: true })
      .filter(e => e.isFile() && e.name === 'SKILL.md').map(e => basename(e.parentPath)).sort();
    const entries = [...guide.matchAll(/^\| \[([\w-]+)\].*$/gm)];
    assert.equal(names.length, 21);
    assert.deepEqual(entries.map(m => m[1]).sort(), names);
    const native = nativeClawHubSkills(lang).map(skill => skill.name);
    assert.deepEqual(native.toSorted(), ['analyze', 'context-handoff', 'converge', 'feature-retcon',
      'implement', 'implement-pro', 'maintain-standards', 'plan', 'quickstart', 'tasks', 'tasks-pro']);
    for (const [line, name] of entries) {
      assert.ok(line.includes(`(https://skills.sh/songzhuozhu/${owner}/${name})`), line);
      assert.equal(line.includes(`(https://clawhub.ai/${owner}/skills/${name})`), native.includes(name), line);
    }
    assert.deepEqual(readFileSync(join(dir, 'LICENSE')), readFileSync(join(root, 'LICENSE')));
  }
});

test('verification keeps the signed-in session, accepts the Skill Card and detects other extra files', t => {
  const bin = mkdtempSync(join(tmpdir(), 'peterflow-public-check-'));
  t.after(() => rmSync(bin, { recursive: true, force: true }));
  copyFileSync(join(root, 'test/fixtures/clawhub-inspect'), join(bin, 'clawhub'));
  chmodSync(join(bin, 'clawhub'), 0o755);
  const args = [join(root, 'scripts/sync-clawhub-skills.mjs'), 'en', 'a'.repeat(40), '--check'];
  const env = { ...process.env, PATH: bin + delimiter + process.env.PATH,
    CLAWHUB_CONFIG_PATH: join(bin, 'release-session.json'), CLAWHUB_SKILL_TOKEN: 'fixture' };
  const result = execFileSync(process.execPath, args, { cwd: root, env, encoding: 'utf8' });
  assert.equal(result.match(/Verified public/g).length, 11);
  const extra = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', env: { ...env, PETERFLOW_TEST_EXTRA_FILE: 'plan' } });
  assert.notEqual(extra.status, 0);
  assert.match(extra.stderr, /unexpected\.md/);
});

test('the edition mirrors advance independently and refuse a divergent history', t => {
  const dir = mkdtempSync(join(tmpdir(), 'peterflow-source-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Test', GIT_COMMITTER_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.invalid',
    GIT_COMMITTER_EMAIL: 'test@example.invalid', GIT_ALLOW_PROTOCOL: 'file' };
  const options = { cwd: dir, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] };
  const git = (...args) => execFileSync('git', args, options).trim();
  const script = join(root, 'scripts/sync-skill-source.sh');
  function sync(lang, ...flags) {
    const output = execFileSync('bash', [script, lang, 'HEAD', join(dir, lang + '.git'), ...flags], options);
    return Object.fromEntries(output.trim().split('\n').map(line => line.split('=')));
  }
  git('init', '-q', '-b', 'main');
  for (const lang of ['zh', 'en']) {
    const skill = join(dir, 'plugins', 'peterflow-' + lang, 'skills/dev/plan');
    mkdirSync(skill, { recursive: true });
    writeFileSync(join(skill, 'SKILL.md'), lang);
    git('init', '-q', '--bare', '-b', 'main', lang + '.git');
  }
  writeFileSync(join(dir, 'private.txt'), 'outside both editions');
  git('add', 'plugins', 'private.txt');
  git('commit', '-qm', 'initial sources');
  const zh = sync('zh'), en = sync('en');
  assert.equal(zh.previous, '');
  assert.equal(git('ls-tree', '-r', '--name-only', zh.revision), 'skills/dev/plan/SKILL.md');
  assert.equal(git('show', zh.revision + ':skills/dev/plan/SKILL.md'), 'zh');
  assert.equal(git('show', en.revision + ':skills/dev/plan/SKILL.md'), 'en');

  writeFileSync(join(dir, 'plugins/peterflow-zh/skills/dev/plan/SKILL.md'), 'updated');
  git('commit', '-qam', 'change Chinese plan');
  assert.throws(() => sync('zh', '--check'));
  assert.equal(sync('en', '--check').revision, en.revision);
  assert.deepEqual(sync('en'), { previous: en.revision, revision: en.revision });
  const updated = sync('zh');
  assert.equal(updated.previous, zh.revision);
  assert.notEqual(updated.revision, zh.revision);

  const other = git('commit-tree', updated.revision + '^{tree}', '-p', updated.revision, '-m', 'independent mirror commit');
  git('push', join(dir, 'zh.git'), other + ':refs/heads/main');
  const rejected = spawnSync('bash', [script, 'zh', 'HEAD', join(dir, 'zh.git')], options);
  assert.notEqual(rejected.status, 0);
  assert.equal(git('--git-dir=zh.git', 'rev-parse', 'main'), other);
});
