import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, chmodSync, copyFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const names = ['@songzhuozhu/peterflow-zh', '@songzhuozhu/peterflow-en'];
const previous = { version: '0.1.2', files: [], verification: { sourceCommit: 'a'.repeat(40) } };

test('a retry finishes both complete language bundles, then only releases changed content', t => {
  const dir = mkdtempSync(join(tmpdir(), 'peterflow-registry-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const item of ['plugins', 'README.md', 'README.zh-CN.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md']) {
    cpSync(join(root, item), join(dir, item), { recursive: true });
  }
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  copyFileSync(join(root, 'test/fixtures/clawhub'), join(bin, 'clawhub'));
  chmodSync(join(bin, 'clawhub'), 0o755);
  const store = join(dir, 'registry.json');
  const read = () => JSON.parse(readFileSync(store, 'utf8'));
  const write = data => writeFileSync(store, JSON.stringify(data));
  write({ [names[0]]: previous, [names[1]]: previous, uploads: [] });

  function run(lang, revision, args = []) {
    const result = spawnSync(process.execPath, [join(root, 'scripts/sync-clawhub.mjs'), lang, revision.repeat(40), ...args], {
      cwd: dir, encoding: 'utf8', env: { ...process.env, PETERFLOW_TEST_REGISTRY: store, PATH: bin + delimiter + process.env.PATH },
    });
    if (result.error) throw result.error;
    return result;
  }
  function ok(result) { assert.equal(result.status, 0, result.stderr + result.stdout); }

  ok(run('zh', 'b'));
  assert.deepEqual(read().uploads, []);
  assert.notEqual(run('zh', 'b', ['--check']).status, 0);
  ok(run('zh', 'b', ['--publish']));
  ok(run('zh', 'b', ['--check']));
  write({ ...read(), state: 'failed' });
  const failed = run('en', 'b', ['--publish']);
  assert.notEqual(failed.status, 0);
  assert.match(failed.stderr, /0\.1\.3 is failed/);
  write({ ...read(), state: 'absent' });
  ok(run('zh', 'b', ['--publish']));
  ok(run('en', 'b', ['--publish']));
  assert.deepEqual(read().uploads, names.map(name => [name, '0.1.3']));

  for (const [index, lang] of ['zh', 'en'].entries()) {
    const files = read()[names[index]].files;
    assert.equal(files.filter(f => f.path.endsWith('/SKILL.md')).length, 21);
    const contract = 'skills/dev-support/feature-retcon/scripts/contract.py';
    const expected = readFileSync(join(dir, 'plugins', 'peterflow-' + lang, contract));
    assert.equal(files.find(f => f.path === contract).sha256, createHash('sha256').update(expected).digest('hex'));
    assert.ok(files.some(f => f.path === 'package.json'));
    assert.ok(files.some(f => f.path === '.claude-plugin/plugin.json'));
  }

  appendFileSync(join(dir, 'plugins/peterflow-zh/skills/dev/plan/SKILL.md'), '\n仅改中文版。\n');
  ok(run('en', 'c', ['--publish']));
  ok(run('zh', 'c', ['--publish']));
  ok(run('zh', 'd', ['--publish']));
  assert.deepEqual(read().uploads.at(-1), [names[0], '0.1.4']);
  assert.equal(read().uploads.length, 3);
});
