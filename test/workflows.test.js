import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
function workspace(t) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'peterflow-workflow-')));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function python(cwd, args, success = true) {
  const result = spawnSync('python3', ['-B', ...args], { cwd, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (success) assert.equal(result.status, 0, result.stderr + result.stdout);
  else assert.notEqual(result.status, 0, 'Expected this check to fail');
  return result.stdout;
}

for (const locale of ['en', 'zh']) {
  const skills = join(root, 'plugins', 'peterflow-' + locale, 'skills');
  test(`${locale}: task templates pass and a real dependency cycle fails`, t => {
    const dir = workspace(t);
    for (const id of ['tasks', 'tasks-pro']) {
      const template = readFileSync(join(skills, 'dev', id, 'assets/tasks.md'), 'utf8');
      const check = [join(skills, 'dev', id, 'scripts/check_dependencies.py')];
      if (id === 'tasks-pro') check.push('--require-final');
      check.push('tasks.md');
      writeFileSync(join(dir, 'tasks.md'), template);
      python(dir, check);
      const corrupt = template.replace(locale === 'en' ? 'Dependencies: none' : '依赖：无。', locale === 'en' ? 'Dependencies: T004' : '依赖：T004。');
      assert.notEqual(corrupt, template);
      writeFileSync(join(dir, 'tasks.md'), corrupt);
      python(dir, check, false);
    }
  });
  test(`${locale}: independent phases cannot wait on each other's tasks`, t => {
    const dir = workspace(t);
    const list = join(dir, 'tasks.md');
    const phases = `- Final Phase: P003
## Phase P001: Editor
- Dependencies: none
- [ ] T001 Define editor
  - Dependencies: none
- [ ] T002 Connect exporter
  - Dependencies: T003
## Phase P002: Exporter
- Dependencies: none
- [ ] T003 Define exporter
  - Dependencies: none
- [ ] T004 Connect editor
  - Dependencies: T001
## Phase P003: Acceptance
- Dependencies: P001, P002
- [ ] T005 Exercise integration
  - Dependencies: none`;
    writeFileSync(list, phases);
    python(dir, [join(skills, 'dev/tasks/scripts/check_dependencies.py'), list]);
    const check = [join(skills, 'dev/tasks-pro/scripts/check_dependencies.py'), '--require-final', list];
    python(dir, check, false);
    writeFileSync(list, phases.replace('Dependencies: T001', 'Dependencies: none'));
    python(dir, check);
  });
  test(`${locale}: a review receipt is invalidated by a changed reviewed file`, t => {
    const dir = workspace(t);
    const script = join(skills, 'dev/implement-pro/scripts/check_review.py');
    const input = join(dir, 'source.txt');
    writeFileSync(input, 'v1');
    const inputs = JSON.parse(python(dir, [script, 'inputs', 'source.txt']));
    const receipt = { phase: 'P001', reviewer: 'independent-reviewer', standards: 'checked rule', requirements: 'checked entry point', inputs, findings: [{ issue: 'possible mismatch', decision: locale === 'en' ? 'dismissed' : '驳回', reason: 'the cited clause applies to a different entry point' }] };
    writeFileSync(join(dir, 'receipt.json'), JSON.stringify(receipt));
    const check = [script, 'check', 'receipt.json', '--phase', 'P001'];
    python(dir, check);
    writeFileSync(input, 'v2');
    python(dir, check, false);
  });
  test(`${locale}: reconcile, close, detect drift, reopen and restore from the shipped template`, t => {
    const dir = workspace(t);
    const tool = join(skills, 'dev-support/feature-retcon/scripts/contract.py');
    const contract = join(dir, 'RECONCILIATION.md');
    const target = join(dir, 'decision.md');
    const evidence = join(dir, 'acceptance.md');
    const closing = join(dir, 'closure.json');
    const archive = join(dir, 'recovery.json');
    const call = (...args) => python(dir, [tool, ...args]);
    writeFileSync(target, 'old decision\n');
    call('init', dir, '--target-stage', 'requirements', '--completion-stage', 'requirements', '--version-control', 'none', '--writable-root', dir);
    call('prepare', contract, '--path', target);
    const confirmed = 'confirmed decision\n<!-- feature-retcon:journal:begin -->\n<!-- feature-retcon:journal:end -->\n';
    writeFileSync(target, confirmed);
    call('applied', contract, '--path', target);
    assert.equal(JSON.parse(call('verify', contract)).valid, true);
    const round = readFileSync(contract, 'utf8').match(/^round_id: (.+)$/m)[1];
    const roundId = JSON.parse(round);
    function close(outcome, checks, path) {
      writeFileSync(closing, JSON.stringify({
        round_id: roundId, outcome, completed_stage: 'requirements', remaining_work: [],
        checks: Object.fromEntries(checks.map(name => [name, { result: 'pass', evidence: [evidence] }])),
      }));
      call('verify', contract, '--mark-ready', '--evidence', closing);
      call('close', contract, '--archive', path);
      assert.ok(!existsSync(contract));
    }
    assert.equal(readFileSync(target, 'utf8'), confirmed);
    writeFileSync(evidence, 'The sole requirement now records the confirmed decision. No downstream artifacts.');
    close('completed', ['requirements', 'residuals', 'watermark', 'absorption'], archive);
    call('inspect-recovery', archive);
    writeFileSync(target, 'later edit\n');
    const reopen = ['reopen', archive, '--confirmation', 'Undo this test round', '--writable-root', dir];
    python(dir, [tool, ...reopen], false);
    assert.equal(readFileSync(target, 'utf8'), 'later edit\n');
    assert.ok(!existsSync(contract));
    writeFileSync(target, confirmed);
    call(...reopen);
    call('restore', contract);
    assert.equal(readFileSync(target, 'utf8'), 'old decision\n');
    writeFileSync(evidence, 'Restored starting bytes. No active downstream references or unique assertions.');
    close('restored', ['baseline', 'references', 'absorption'], join(dir, 'restored.json'));
    assert.ok(existsSync(archive));
  });
  test(`${locale}: undo a ready directory migration without losing the moved file`, t => {
    const dir = workspace(t);
    const tool = join(skills, 'dev-support/feature-retcon/scripts/contract.py');
    const call = (...args) => JSON.parse(python(dir, [tool, ...args]));
    const contract = join(dir, 'RECONCILIATION.md');
    const oldDir = join(dir, 'old');
    const original = join(oldDir, 'nested', 'spec.md');
    const moved = join(dir, 'new', 'spec.md');
    mkdirSync(join(oldDir, 'nested'), { recursive: true });
    mkdirSync(join(dir, 'new'));
    writeFileSync(original, 'design decision\n', { mode: 0o640 });
    call('init', dir, '--target-stage', 'requirements', '--completion-stage', 'requirements', '--version-control', 'none', '--writable-root', dir);
    for (const path of [original, moved]) call('prepare', contract, '--path', path);
    renameSync(original, moved);
    rmSync(oldDir, { recursive: true });
    for (const path of [original, moved]) call('applied', contract, '--path', path);
    const closing = join(dir, 'closure.json');
    writeFileSync(closing, JSON.stringify({
      round_id: call('status', contract).round_id, outcome: 'completed', completed_stage: 'requirements', remaining_work: [],
      checks: Object.fromEntries(['requirements', 'residuals', 'watermark', 'absorption'].map(name => [name, { result: 'pass', evidence: [moved] }])),
    }));
    assert.equal(call('verify', contract, '--mark-ready', '--evidence', closing).close_ready, true);

    // A later file may now occupy the old directory. Preserve both files on failure.
    writeFileSync(oldDir, 'later file');
    python(dir, [tool, 'restore', contract], false);
    assert.equal(call('status', contract).status, 'blocked');
    assert.equal(readFileSync(moved, 'utf8'), 'design decision\n');
    assert.equal(readFileSync(oldDir, 'utf8'), 'later file');
    rmSync(oldDir);
    if (process.getuid?.() > 0) {
      mkdirSync(oldDir, { mode: 0o500 });
      try {
        python(dir, [tool, 'restore', contract], false);
        assert.equal(readFileSync(moved, 'utf8'), 'design decision\n');
      } finally {
        chmodSync(oldDir, 0o700);
        rmSync(oldDir, { recursive: true });
      }
    }
    assert.equal(call('restore', contract).status, 'restored');
    assert.equal(readFileSync(original, 'utf8'), 'design decision\n');
    assert.equal(statSync(oldDir).mode & 0o777, 0o700);
    assert.equal(statSync(join(oldDir, 'nested')).mode & 0o777, 0o700);
    assert.equal(statSync(original).mode & 0o777, 0o640);
    assert.ok(!existsSync(moved));
    assert.equal(call('verify', contract).valid, true);
  });
}

test('the quickstart example runs its baseline suite through the public CLI', () => {
  const cwd = join(root, 'examples/export');
  python(cwd, ['-m', 'unittest', '-v']);
  assert.equal(python(cwd, ['export.py']), 'name\n');
});
