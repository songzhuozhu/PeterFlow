import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, relative, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { isDeepStrictEqual, parseArgs } from 'node:util';

const repo = 'songzhuozhu/PeterFlow';
const { positionals: [lang, commit, ...extra], values: { publish, out } } = parseArgs({
  allowPositionals: true, options: { publish: { type: 'boolean', default: false }, out: { type: 'string' } },
});
if (!['en', 'zh'].includes(lang) || !/^[a-f0-9]{40}$/.test(commit) || extra.length) {
  throw new Error('Usage: node scripts/sync-clawhub.mjs <en|zh> <full Git commit> [--publish] [--out directory]');
}
const slug = `peterflow-${lang}`;
const name = `@songzhuozhu/${slug}`;
const source = `plugins/${slug}`;
const guide = lang === 'zh' ? 'README.zh-CN.md' : 'README.md';
const manifest = JSON.parse(readFileSync(`${source}/.claude-plugin/plugin.json`, 'utf8'));
const markdown = readFileSync(guide, 'utf8');
const staging = mkdtempSync(join(tmpdir(), 'peterflow-clawhub-'));
const bundle = join(staging, 'package');

function clawhub(...args) {
  const stdout = execFileSync('clawhub', ['--registry', 'https://clawhub.ai', '--no-input', 'package', ...args, '--json'], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 8 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}

function writeMetadata(version, revision) {
  const blob = `https://github.com/${repo}/blob/${revision}/`;
  const raw = `https://raw.githubusercontent.com/${repo}/${revision}/`;
  const readme = markdown
    .replace(/\]\(([^\s)]+)\)/g, (link, target) => target.startsWith('#') ? link : `](${new URL(target, blob).href})`)
    .replace(/(<img\s[^>]*?src=")([^"]+)"/g, (_, prefix, target) => `${prefix}${new URL(target, raw).href}"`);
  writeFileSync(join(bundle, 'README.md'), readme);
  const pkg = {
    name, version, description: manifest.description, license: manifest.license,
    homepage: `https://clawhub.ai/songzhuozhu/plugins/${slug}`,
    repository: { type: 'git', url: `git+https://github.com/${repo}.git`, directory: source },
  };
  writeFileSync(join(bundle, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
  writeFileSync(join(bundle, '.claude-plugin/plugin.json'), JSON.stringify({ ...manifest, version }, null, 2) + '\n');
}

function bundleHashes() {
  return Object.fromEntries(readdirSync(bundle, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => {
      const file = join(entry.parentPath, entry.name);
      return [relative(bundle, file).split(sep).join('/'), createHash('sha256').update(readFileSync(file)).digest('hex')];
    }));
}

function matchesRelease(release) {
  const published = Object.fromEntries(release.files.map(file => [file.path, file.sha256]));
  return isDeepStrictEqual(published, bundleHashes());
}

function saveArchive(version) {
  if (!out) return;
  const filename = `${slug}-${version}.zip`;
  execFileSync('zip', ['-qXr', filename, 'package'], { cwd: staging });
  mkdirSync(out, { recursive: true });
  copyFileSync(join(staging, filename), join(out, filename));
}

async function publicationState(version) {
  const deadline = Date.now() + 15 * 60_000;
  let state = clawhub('publication', name, '--version', version).state;
  while (state === 'pending' && Date.now() < deadline) {
    console.log(`Waiting for the previous submission of ${name}@${version}.`);
    await delay(15_000);
    state = clawhub('publication', name, '--version', version).state;
  }
  return state;
}

async function sync() {
  mkdirSync(join(bundle, '.claude-plugin'), { recursive: true });
  for (const dir of ['skills', 'assets']) {
    cpSync(join(source, dir), join(bundle, dir), {
      recursive: true, filter: path => !/^(?:__pycache__|\.DS_Store|.*\.py[co])$/.test(basename(path)),
    });
  }
  for (const file of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) copyFileSync(file, join(bundle, file));

  let latest = clawhub('inspect', name, '--tag', 'latest').version;
  while (true) {
    const { version, verification } = latest;
    if (!/^\d+\.\d+\.\d+$/.test(version) || !/^[a-f0-9]{40}$/.test(verification.sourceCommit)) {
      throw new Error(`Expected a stable, source-linked release for ${name}@${version}.`);
    }
    // Reuse the published version and link revision for the comparison. A new commit alone changes neither edition.
    writeMetadata(version, verification.sourceCommit);
    if (matchesRelease(latest)) {
      saveArchive(version);
      console.log(`${name}@${version} already contains these files.`);
      return;
    }
    const next = version.replace(/\d+$/, patch => String(Number(patch) + 1));
    if (publish) {
      const state = await publicationState(next);
      if (state === 'published') {
        latest = clawhub('inspect', name, '--tag', 'latest').version;
        if (latest.version === version) throw new Error(`${name}@${next} exists but latest still points to ${version}.`);
        continue;
      }
      if (state !== 'absent') throw new Error(`${name}@${next} is ${state}. Inspect this publication before retrying.`);
    }
    writeMetadata(next, commit);
    const report = clawhub('validate', bundle, '--openclaw-version', '2026.11.10-beta.1', '--out', join(staging, 'report'));
    console.log(`Plugin Inspector: ${report.status}, ${report.summary.issueCount} findings.`);
    if (report.status !== 'pass') throw new Error(`ClawHub validation failed: ${JSON.stringify(report.summary)}`);
    const args = ['publish', bundle, '--family', 'bundle-plugin', '--bundle-format', 'claude',
      '--owner', 'songzhuozhu', '--name', name, '--display-name', `PeterFlow · ${lang === 'zh' ? '简体中文' : 'English'}`,
      '--version', next, '--source-repo', repo, '--source-commit', commit, '--source-ref', 'main', '--source-path', source,
      '--changelog', `PeterFlow · https://github.com/${repo}/commit/${commit}`, '--tags', 'latest'];
    const result = clawhub(...args, ...(publish ? ['--wait', '--wait-timeout', '900'] : ['--dry-run']));
    if (result.name !== name || result.version !== next || result.files !== Object.keys(bundleHashes()).length) {
      throw new Error(`Unexpected ClawHub package inventory: ${JSON.stringify(result)}`);
    }
    if (publish && (result.publicationStatus !== 'published' || !matchesRelease(clawhub('inspect', name, '--version', next).version))) {
      throw new Error(`Could not verify the published files of ${name}@${next}.`);
    }
    saveArchive(next);
    console.log(`${publish ? 'Published and verified' : 'Dry run'}: ${name}@${next} (${result.files} files).`);
    return;
  }
}

try {
  await sync();
} finally {
  rmSync(staging, { recursive: true, force: true });
}
