import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = join(root, 'bin/peterflow.js');
const excludedFromPackage = /(^|\/)(\.DS_Store|__pycache__|node_modules|\.git)(\/|$)|\.pyc$/;

function temp(t) {
  const dir = mkdtempSync(join(tmpdir(), 'peterflow-distribution-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function run(cmd, args, cwd, options = {}) {
  const result = spawnSync(cmd, args, { cwd, encoding: 'utf8', timeout: 60000, ...options });
  if (result.error) throw result.error;
  return result;
}

function ok(result) {
  assert.equal(result.status, 0, result.stderr + result.stdout);
}

function files(dir) {
  return readdirSync(dir, { recursive: true })
    .filter(p => !excludedFromPackage.test(p.split(sep).join('/')) && lstatSync(join(dir, p)).isFile()).sort();
}

function sameTree(a, b) {
  const paths = files(a);
  assert.deepEqual(paths, files(b));
  for (const p of paths) assert.deepEqual(readFileSync(join(a, p)), readFileSync(join(b, p)), p);
}

function skillFolders(skills) {
  return files(skills).filter(path => basename(path) === 'SKILL.md').map(dirname);
}

test('marketplaces, versions, skill names and on-demand resources match both editions', () => {
  const json = path => JSON.parse(readFileSync(join(root, path), 'utf8'));
  const pkg = json('package.json');
  const codex = json('.agents/plugins/marketplace.json');
  const claude = json('.claude-plugin/marketplace.json');
  const locales = [];
  for (const id of ['peterflow-en', 'peterflow-zh']) {
    const base = `plugins/${id}`;
    assert.equal(codex.plugins.find(p => p.name === id).source.path, './' + base);
    assert.equal(claude.plugins.find(p => p.name === id).source, './' + base);
    const skills = join(root, base, 'skills');
    const groups = readdirSync(skills, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort();
    assert.deepEqual(groups, ['agent-collab', 'daily-work', 'dev', 'dev-support']);
    for (const host of ['.claude-plugin', '.codex-plugin']) {
      const manifest = json(`${base}/${host}/plugin.json`);
      assert.equal(manifest.name, id);
      assert.equal(manifest.version, pkg.version);
      assert.ok(existsSync(join(root, base, manifest.icon ?? manifest.interface.logo)));
      if (host === '.claude-plugin') assert.deepEqual(manifest.skills.toSorted(), groups.map(group => './skills/' + group));
    }
    const folders = skillFolders(skills);
    assert.equal(folders.length, 21);
    for (const folder of folders) {
      assert.ok(groups.includes(dirname(folder)), folder);
      const name = basename(folder);
      const body = readFileSync(join(skills, folder, 'SKILL.md'), 'utf8');
      assert.equal(body.match(/^name: (.+)$/m)?.[1], name);
      assert.ok(body.match(/^description: .+$/m), name);
      assert.ok(existsSync(join(skills, folder, 'LICENSE')), folder);
    }
    locales.push(files(skills).map(p => p.replace(join('daily-work', 'plainly') + sep, join('daily-work', 'shuorenhua') + sep)).sort());
  }
  assert.deepEqual(locales[0], locales[1]);
});

test('both standalone standards guides expose the levels documented in the Chinese README', () => {
  function levels(path) {
    const text = readFileSync(join(root, path), 'utf8');
    return [...new Set(text.match(/\bL\d+\b/g))].sort();
  }
  const expected = levels('README.zh-CN.md');
  assert.deepEqual(expected, ['L0', 'L1', 'L2', 'L3']);
  assert.deepEqual(levels('README.md'), expected);
  for (const edition of ['peterflow-zh', 'peterflow-en']) {
    assert.deepEqual(levels(`plugins/${edition}/skills/dev-support/maintain-standards/SKILL.md`), expected, edition);
  }
});

test('relative Markdown file links resolve in a checkout', () => {
  const paths = ['README.md', 'README.zh-CN.md', 'THIRD_PARTY_NOTICES.md', ...files(join(root, 'plugins')).filter(p => p.endsWith('.md')).map(p => join('plugins', p))];
  for (const path of paths) {
    const prose = readFileSync(join(root, path), 'utf8').replace(/^`{3}[^\n]*\n[\s\S]*?^`{3}[^\n]*$/gm, '');
    for (const match of prose.matchAll(/\[[^\]\n]*\]\(([^\s)]+)\)/g)) {
      const target = match[1].split('#')[0];
      if (!target || /^[a-z]+:/i.test(target)) continue;
      assert.ok(existsSync(resolve(root, dirname(path), decodeURIComponent(target))), `${path} → ${target}`);
    }
  }
});

test('npm pack and offline npx install complete standalone bundles in both languages', async t => {
  const dir = temp(t);
  const env = { ...process.env, npm_config_cache: join(dir, 'npm-cache'), npm_config_offline: 'true', npm_config_yes: 'true', npm_config_update_notifier: 'false' };
  const packed = run('npm', ['pack', '--json', '--pack-destination', dir], root, { env });
  ok(packed);
  const [pack] = Object.values(JSON.parse(packed.stdout));
  const contents = new Set(pack.files.map(f => f.path));
  for (const p of files(join(root, 'plugins'))) assert.ok(contents.has('plugins/' + p.split(sep).join('/')), p);
  for (const p of ['.agents/plugins/marketplace.json', '.claude-plugin/marketplace.json', 'README.zh-CN.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'bin/peterflow.js']) assert.ok(contents.has(p), p);
  assert.ok(![...contents].some(p => excludedFromPackage.test(p)));
  const archive = join(dir, pack.filename);
  await t.test('keyboard wizard selects groups, skills, agent and scope in a real terminal', { skip: process.platform === 'win32' }, () => {
    ok(run('python3', [join(root, 'test/keyboard_install.py'), archive], dir, { env }));
  });
  for (const [lang, id] of [['en', 'peterflow-en'], ['zh-CN', 'peterflow-zh']]) {
    const dest = join(dir, lang + ' installed');
    ok(run('npx', ['--yes', '--offline', '--package', archive, 'peterflow', '--lang', lang, '--dir', dest, '--all'], dir, { env }));
    const sources = join(root, 'plugins', id, 'skills');
    const folders = skillFolders(sources);
    assert.deepEqual(readdirSync(dest).sort(), folders.map(folder => basename(folder)).sort());
    for (const folder of folders) sameTree(join(sources, folder), join(dest, basename(folder)));
  }
  const project = join(dir, 'project');
  mkdirSync(project);
  const wizard = run('npx', ['--yes', '--offline', '--package', archive, 'peterflow'], project, { env, input: '2\n2\n999\n1,13\n2\n' });
  ok(wizard);
  assert.match(wizard.stdout, /未知技能/);
  const picked = join(project, '.claude', 'skills');
  assert.deepEqual(readdirSync(picked).sort(), ['plan', 'shuorenhua']);
  sameTree(join(root, 'plugins/peterflow-zh/skills/daily-work/shuorenhua'), join(picked, 'shuorenhua'));

  const grouped = run('npx', ['--yes', '--offline', '--package', archive, 'peterflow'], project, { env, input: '2\n4\nunknown\n3,agent-collab\n1\n' });
  ok(grouped);
  assert.match(grouped.stdout, /未知分组/);
  assert.deepEqual(readdirSync(join(project, '.agents/skills')).sort(),
    ['ask-peter', 'context-handoff', 'learn', 'quickstart', 'research', 'shuorenhua', 'writing-for-agents']);
  const english = join(dir, 'everyday');
  ok(run('npx', ['--yes', '--offline', '--package', archive, 'peterflow', '--lang', 'en', '--dir', english,
    '--group', 'daily-work', '--group', 'agent-collab', 'plan', 'plainly'], project, { env }));
  assert.deepEqual(readdirSync(english).sort(),
    ['ask-peter', 'context-handoff', 'learn', 'plainly', 'plan', 'quickstart', 'research', 'writing-for-agents']);
});

test('each group installs exactly its catalog members in either language', t => {
  const dir = temp(t);
  const members = {
    dev: ['analyze', 'converge', 'implement', 'implement-pro', 'plan', 'tasks', 'tasks-pro'],
    'dev-support': ['code-review', 'debug-expert', 'design-mod', 'feature-retcon', 'maintain-standards', 'retro', 'review-arch'],
    'agent-collab': ['ask-peter', 'context-handoff', 'quickstart', 'writing-for-agents'],
  };
  for (const lang of ['en', 'zh-CN']) {
    const daily = ['learn', lang === 'en' ? 'plainly' : 'shuorenhua', 'research'].sort();
    for (const [group, names] of Object.entries({ ...members, 'daily-work': daily })) {
      const dest = join(dir, lang, group);
      ok(run(process.execPath, [cli, '--lang', lang, '--dir', dest, '--group', group], dir));
      assert.deepEqual(readdirSync(dest).sort(), names);
    }
  }
});

test('agent installs respect shared, host-specific and project-only paths', t => {
  const dir = temp(t);
  const home = join(dir, 'home');
  const config = join(home, 'xdg');
  const env = { ...process.env, HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: config, CLAUDE_CONFIG_DIR: join(home, 'custom-claude') };
  const listing = run(process.execPath, [cli, '--list-agents'], dir, { env });
  ok(listing);
  assert.match(listing.stdout, /github-copilot\tGitHub Copilot\t\.agents\/skills/);
  assert.match(listing.stdout, /promptscript\tPromptScript\t\.agents\/skills\t—/);
  const cases = [
    ['cursor', false, '.agents/skills'], ['trae-cn', false, '.trae/skills'],
    ['trae-cn', true, join(home, '.trae-cn/skills')], ['github-copilot', true, join(home, '.copilot/skills')],
    ['opencode', true, join(config, 'opencode/skills')], ['windsurf', true, join(home, '.codeium/windsurf/skills')],
    ['claude', true, join(home, 'custom-claude/skills')], ['eve', false, 'agent/skills'],
  ];
  for (const [id, global, expected] of cases) {
    const project = join(dir, id);
    mkdirSync(project, { recursive: true });
    const args = [cli, '--agent', id, '--lang', 'zh-CN', ...(global ? ['--global'] : []), 'learn'];
    ok(run(process.execPath, args, project, { env }));
    sameTree(resolve(project, expected, 'learn'), join(root, 'plugins/peterflow-zh/skills/daily-work/learn'));
  }

  const project = join(dir, 'piped');
  mkdirSync(project);
  const piped = run(process.execPath, [cli], project, { env, input: '1\n2\nplan\n6\ngemini-cli\n2\n' });
  ok(piped);
  assert.ok(existsSync(join(home, '.gemini/skills/plan/SKILL.md')));
});

test('unsupported agents, scopes and plugin combinations fail before installing', t => {
  const dir = temp(t);
  const env = { ...process.env, HOME: dir, USERPROFILE: dir, PATH: dir };
  for (const [args, message] of [
    [['--agent', 'unknown', 'plan'], /Unknown agent/],
    [['--agent', 'eve', '--global', '--all'], /only project installation/],
    [['--agent', 'cursor', '--plugin'], /--plugin supports Codex and Claude Code/],
  ]) {
    const result = run(process.execPath, [cli, ...args], dir, { env });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, message);
    assert.deepEqual(readdirSync(dir), []);
  }
});

test('invalid group selections and destination conflicts do not partially install a group', t => {
  const dir = temp(t);
  const dest = join(dir, 'skills');
  for (const extra of [['--group', 'no-such-group'], ['--all'], ['--plugin'], ['--list']]) {
    const result = run(process.execPath, [cli, '--dir', dest, '--group', 'dev', ...extra], dir);
    assert.notEqual(result.status, 0);
    assert.ok(!existsSync(dest));
  }
  mkdirSync(join(dest, 'plan'), { recursive: true });
  const conflict = run(process.execPath, [cli, '--dir', dest, '--group', 'daily-work', '--group', 'dev'], dir);
  assert.notEqual(conflict.status, 0);
  assert.deepEqual(readdirSync(dest), ['plan']);
});

test('a conflict preserves the complete selection and existing data', t => {
  const dir = temp(t);
  const dest = join(dir, 'skills');
  mkdirSync(join(dest, 'implement'), { recursive: true });
  writeFileSync(join(dest, 'implement', 'mine'), 'local edit');
  const result = run(process.execPath, [cli, '--dir', dest, 'plan', 'implement'], dir);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /already exist/);
  assert.deepEqual(readdirSync(dest), ['implement']);
  assert.equal(readFileSync(join(dest, 'implement', 'mine'), 'utf8'), 'local edit');
});

test('invalid names, cancelled input and links to existing skills leave the workspace alone', t => {
  const dir = temp(t);
  const dest = join(dir, 'skills');
  for (const args of [['--dir', dest, '../plan'], ['--dir', dest, 'plan', 'plan'], ['--dir', dest, '--lang', 'fr', 'plan'], ['--dir', dest, 'shuorenhua']]) {
    assert.notEqual(run(process.execPath, [cli, ...args], dir).status, 0);
    assert.ok(!existsSync(dest));
  }
  const cancelled = run(process.execPath, [cli], dir, { input: '1\nplan\n' });
  assert.notEqual(cancelled.status, 0);
  assert.deepEqual(readdirSync(dir), []);
  mkdirSync(dest);
  symlinkSync(join(dir, 'absent'), join(dest, 'plan'), 'dir');
  assert.notEqual(run(process.execPath, [cli, '--dir', dest, 'implement', 'plan'], dir).status, 0);
  assert.deepEqual(readdirSync(dest), ['plan']);
});

test('local plugin files cannot become installation destinations through a path alias', t => {
  const dir = temp(t);
  symlinkSync(join(root, 'plugins'), join(dir, 'alias'), 'dir');
  const out = join(dir, 'alias', 'peterflow-en', 'bad-dest');
  const result = run(process.execPath, [cli, '--dir', out, 'plan'], dir);
  assert.notEqual(result.status, 0);
  assert.ok(!existsSync(out), relative(dir, out));
});

test('missing plugin host reports how to continue before writing any files', t => {
  const dir = temp(t);
  const result = run(process.execPath, [cli, '--lang', 'en', '--plugin', '--agent', 'claude'], dir, { env: { ...process.env, PATH: dir } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Could not find claude/);
  assert.deepEqual(readdirSync(dir), []);
});

test('Claude installs for the current user and updates an existing user installation', t => {
  const dir = temp(t);
  const id = 'peterflow-en@peterflow';
  const log = join(dir, 'calls');
  writeFileSync(join(dir, 'claude'), `#!/bin/sh
printf '%s\\n' "$*" >> "$PETERFLOW_TEST_CALLS"
if [ "$2" = list ]; then printf '%s\\n' "$PETERFLOW_TEST_PLUGINS"; fi
`, { mode: 0o755 });
  for (const [plugins, action] of [[[], 'install'], [[{ id, scope: 'project' }], 'install'], [[{ id, scope: 'user' }], 'update']]) {
    writeFileSync(log, '');
    const env = { ...process.env, PATH: dir, PETERFLOW_TEST_CALLS: log, PETERFLOW_TEST_PLUGINS: JSON.stringify(plugins) };
    ok(run(process.execPath, [cli, '--lang', 'en', '--agent', 'claude', '--plugin'], dir, { env }));
    assert.equal(readFileSync(log, 'utf8').trim().split('\n').at(-1), `plugin ${action} ${id} --scope user`);
  }
});

test('packaged plugin updates keep the marketplace path stable and survive eviction of npx files', t => {
  const dir = temp(t);
  const pkg = join(dir, 'node_modules', 'peterflow');
  const commands = join(dir, 'host-commands');
  mkdirSync(commands);
  writeFileSync(join(commands, 'codex'), '#!/bin/sh\nprintf "%s\\n" "$*" >> "$PETERFLOW_TEST_CALLS"\n', { mode: 0o755 });
  const log = join(dir, 'host.log');
  const env = { ...process.env, HOME: dir, USERPROFILE: dir, PATH: commands, PETERFLOW_TEST_CALLS: log };
  for (const part of ['bin', 'plugins', '.agents/plugins/marketplace.json']) {
    cpSync(join(root, part), join(pkg, part), { recursive: true });
  }
  const args = [join(pkg, 'bin/peterflow.js'), '--lang', 'en', '--plugin', '--agent', 'codex'];
  ok(run(process.execPath, args, dir, { env }));
  const registered = readFileSync(log, 'utf8').split('\n').find(line => line.startsWith('plugin marketplace add ')).slice('plugin marketplace add '.length);
  const manifest = join(registered, '.agents/plugins/marketplace.json');
  const edition = () => join(registered, JSON.parse(readFileSync(manifest)).plugins.find(p => p.name === 'peterflow-en').source.path);
  const before = edition();
  sameTree(before, join(pkg, 'plugins/peterflow-en'));
  appendFileSync(join(pkg, 'plugins/peterflow-en/skills/dev/plan/SKILL.md'), '\nEdited release.\n');
  ok(run(process.execPath, args, dir, { env }));
  const after = edition();
  assert.notEqual(after, before);
  sameTree(after, join(pkg, 'plugins/peterflow-en'));
  assert.equal(readFileSync(log, 'utf8').split('\n').filter(line => line === 'plugin marketplace add ' + registered).length, 2);
  rmSync(pkg, { recursive: true });
  assert.ok(existsSync(join(after, 'skills/dev/plan/SKILL.md')));
  assert.ok(existsSync(join(before, 'skills/dev/plan/SKILL.md')));
});
