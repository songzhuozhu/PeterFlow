import { execFileSync } from 'node:child_process';
import { copyFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { isDeepStrictEqual, parseArgs } from 'node:util';
import { fileHashes } from './standalone-skills.mjs';

const repo = 'songzhuozhu/PeterFlow';
const { positionals: [lang, commit, ...extra], values: { publish, out, check } } = parseArgs({
  allowPositionals: true, options: { publish: { type: 'boolean' }, check: { type: 'boolean' }, out: { type: 'string' } },
});
if (!['en', 'zh'].includes(lang) || !/^[a-f0-9]{40}$/.test(commit) || extra.length || (publish && check)) {
  throw new Error('Usage: node scripts/sync-clawhub.mjs <en|zh> <full Git commit> [--publish | --check] [--out directory]');
}
const name = '@songzhuozhu/peterflow';
const source = `plugins/peterflow-${lang}`;
const suffix = lang === 'zh' ? '-zh' : '';
const guide = lang === 'zh' ? 'README.zh-CN.md' : 'README.md';
const manifest = JSON.parse(readFileSync(`${source}/.claude-plugin/plugin.json`, 'utf8'));
const markdown = readFileSync(guide, 'utf8');
const staging = mkdtempSync(join(tmpdir(), 'peterflow-clawhub-'));
const bundle = join(staging, 'package');

function clawhub(...args) {
  const stdout = execFileSync('clawhub', ['--registry', 'https://clawhub.ai', '--no-input', 'package', ...args, '--json'], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 8 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}

// Inspect the package first. The CLI can exit successfully with no JSON for an unknown tag.
function taggedRelease() {
  let detail;
  try {
    detail = clawhub('inspect', name);
  } catch (error) {
    if (error.stderr?.includes('Package not found or not visible to this account.')) return null;
    throw error;
  }
  if (detail.owner.handle !== 'songzhuozhu' || detail.package.name !== name || detail.package.family !== 'bundle-plugin') {
    throw new Error(`Unexpected publisher or package family for ${name}.`);
  }
  if (!Object.hasOwn(detail.package.tags, lang)) return null;
  return clawhub('inspect', name, '--tag', lang).version;
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
    homepage: 'https://clawhub.ai/songzhuozhu/plugins/peterflow',
    repository: { type: 'git', url: `git+https://github.com/${repo}.git`, directory: source },
  };
  writeFileSync(join(bundle, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
  writeFileSync(join(bundle, '.claude-plugin/plugin.json'), JSON.stringify({ ...manifest, name: 'peterflow', version }, null, 2) + '\n');
}

function matchesRelease(release) {
  const published = Object.fromEntries(release.files.map(file => [file.path, file.sha256]));
  return isDeepStrictEqual(published, fileHashes(bundle));
}

function saveArchive(version) {
  if (!out) return;
  const filename = `peterflow-${version}.zip`;
  execFileSync('zip', ['-qXr', filename, 'package'], { cwd: staging });
  mkdirSync(out, { recursive: true });
  copyFileSync(join(staging, filename), join(out, filename));
}

async function publicationState(version) {
  const deadline = Date.now() + 15 * 60_000;
  let state;
  try {
    state = clawhub('publication', name, '--version', version).state;
  } catch (error) {
    if (error.stderr?.includes('Package not found or not visible to this account.')) return 'absent';
    throw error;
  }
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

  let latest = taggedRelease();
  while (true) {
    let patch = 0;
    if (latest) {
      const version = /^1\.0\.(\d+)(-zh)?$/.exec(latest.version);
      if (!version || (version[2] ?? '') !== suffix || !/^[a-f0-9]{40}$/.test(latest.verification.sourceCommit)) {
        throw new Error(`Unexpected release on ${name}@${lang}: ${latest.version}.`);
      }
      writeMetadata(latest.version, latest.verification.sourceCommit);
      if (matchesRelease(latest)) {
        saveArchive(latest.version);
        console.log(`${name}@${lang} (${latest.version}) already contains these files.`);
        return;
      }
      patch = Number(version[1]) + 1;
    }
    if (check) throw new Error(`${name}@${lang} does not match the tested edition.`);
    const next = `1.0.${patch}${suffix}`;
    if (publish) {
      const state = await publicationState(next);
      if (state === 'published') {
        latest = taggedRelease();
        if (latest?.version !== next) throw new Error(`${name}@${next} exists but is missing its ${lang} tag.`);
        continue;
      }
      if (state !== 'absent') throw new Error(`${name}@${next} is ${state}. Inspect this publication before retrying.`);
    }
    writeMetadata(next, commit);
    const report = clawhub('validate', bundle, '--openclaw-version', '2026.11.10-beta.1', '--out', join(staging, 'report'));
    console.log(`Plugin Inspector: ${report.status}, ${report.summary.issueCount} findings.`);
    if (report.status !== 'pass') throw new Error(`ClawHub validation failed: ${JSON.stringify(report.summary)}`);
    const args = ['publish', bundle, '--family', 'bundle-plugin', '--bundle-format', 'claude',
      '--owner', 'songzhuozhu', '--name', name, '--display-name', 'PeterFlow',
      '--version', next, '--source-repo', repo, '--source-commit', commit, '--source-ref', 'main', '--source-path', source,
      '--changelog', `PeterFlow (${lang}) · https://github.com/${repo}/commit/${commit}`, '--tags', lang === 'en' ? 'en,latest' : 'zh'];
    const result = clawhub(...args, ...(publish ? ['--wait', '--wait-timeout', '900'] : ['--dry-run']));
    if (result.name !== name || result.version !== next || result.files !== Object.keys(fileHashes(bundle)).length) {
      throw new Error(`Unexpected ClawHub package inventory: ${JSON.stringify(result)}`);
    }
    if (publish) {
      const tagged = taggedRelease();
      if (result.publicationStatus !== 'published' || tagged?.version !== next || !matchesRelease(tagged)) {
        throw new Error(`Could not verify ${name}@${lang} against ${next}.`);
      }
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
