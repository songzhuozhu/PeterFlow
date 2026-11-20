import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { isDeepStrictEqual, parseArgs } from 'node:util';
import { nativeClawHubSkills, fileHashes } from './standalone-skills.mjs';

const { positionals: [lang, commit, ...extra], values: { publish } } = parseArgs({
  allowPositionals: true, options: { publish: { type: 'boolean', default: false } },
});
if (!/^[a-f0-9]{40}$/.test(commit) || extra.length) {
  throw new Error('Usage: node scripts/sync-clawhub-skills.mjs <zh|en> <Git commit> [--publish]');
}
const skills = nativeClawHubSkills(lang);
const owner = `peterflow-${lang}`;
const registry = 'https://clawhub.ai';
const anonymous = mkdtempSync(join(tmpdir(), 'peterflow-public-read-'));
const { CLAWHUB_SKILL_TOKEN: statusToken, ...cliEnv } = process.env;
const publicEnv = { ...cliEnv, CLAWHUB_CONFIG_PATH: join(anonymous, 'anonymous.json') };

function cli(args, env = cliEnv) {
  return JSON.parse(execFileSync('clawhub', ['--registry', registry, '--no-input', ...args, '--json'], {
    env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'],
  }));
}

// The owner-only status route also sees staged versions that do not yet appear under latest.
async function stage(name, version) {
  const url = new URL(`/api/v1/skills/${name}/versions/${version}/publication`, registry);
  url.searchParams.set('ownerHandle', owner);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${statusToken}` },
    redirect: 'error', signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`@${owner}/${name}@${version}: publication lookup returned HTTP ${response.status}`);
  const { skill, publication } = await response.json();
  assert.equal(skill.slug, name);
  assert.equal(publication.version, version);
  return publication;
}

function publicFiles(name, version) {
  const ref = `@${owner}/${name}`;
  const detail = cli(['inspect', ref, '--tag', 'latest', '--files'], publicEnv);
  assert.equal(detail.owner?.handle, owner, ref);
  assert.equal(detail.skill?.slug, name, ref);
  assert.equal(detail.latestVersion?.version, version, ref);
  assert.equal(detail.version?.version, version, ref);
  assert.ok(!detail.moderation?.isMalwareBlocked && !detail.moderation?.isSuspicious, `${ref}: default install is restricted`);
  return Object.fromEntries(detail.version.files.map(f => [f.path, f.sha256]));
}

function verifyPublic({ name, dir }, version) {
  assert.deepEqual(publicFiles(name, version), fileHashes(dir), `@${owner}/${name}@${version}: public files differ`);
  console.log(`Verified public @${owner}/${name}@${version}`);
}

const waiting = new Map();
async function submit(skill, completedVersion) {
  const { name, dir } = skill;
  const ref = `@${owner}/${name}`;
  const args = ['skill', 'publish', dir, '--owner', owner, '--slug', name, '--name', name,
    '--source-repo', 'songzhuozhu/PeterFlow', '--source-commit', commit, '--source-ref', 'main',
    '--source-path', relative(process.cwd(), dir).split(sep).join('/')];
  let plan = cli([...args, '--dry-run']);
  if (plan.status === 'unchanged' && plan.version !== plan.latestVersion) {
    if (isDeepStrictEqual(publicFiles(name, plan.latestVersion), fileHashes(dir))) {
      console.log(`${ref}@${plan.latestVersion}: latest already contains these files`);
      return;
    }
    // The registry found an older release; restoring its content needs a new latest release.
    assert.match(plan.latestVersion, /^\d+\.\d+\.\d+$/);
    args.push('--version', plan.latestVersion.replace(/\d+$/, patch => String(Number(patch) + 1)));
    plan = cli([...args, '--dry-run']);
  }
  assert.ok(['unchanged', 'would-publish'].includes(plan.status), JSON.stringify(plan));
  assert.equal(plan.slug, name);
  assert.equal(plan.fileCount, Object.keys(fileHashes(dir)).length, `${ref}: ClawHub omitted a source file`);
  console.log(`${ref}@${plan.version}: ${plan.status} (${plan.fileCount} files)`);
  if (!publish) return;
  if (plan.status === 'unchanged') {
    verifyPublic(skill, plan.version);
    return;
  }
  assert.notEqual(plan.version, completedVersion, `${ref}: completed version is not visible yet`);
  const previousSubmission = await stage(name, plan.version);
  if (!previousSubmission) {
    const receipt = cli(args);
    assert.equal(receipt.version, plan.version, ref);
    if (receipt.status === 'published' || receipt.status === 'unchanged') {
      verifyPublic(skill, plan.version);
      return;
    }
    assert.ok(['pending-publication', 'submitted'].includes(receipt.status), JSON.stringify(receipt));
  }
  waiting.set(name, { skill, version: plan.version, previousSubmission });
}

const failures = [];
try {
  if (publish && !statusToken) throw new Error('Publishing requires CLAWHUB_SKILL_TOKEN.');
  for (const skill of skills) {
    try {
      await submit(skill);
    } catch (error) {
      failures.push(new Error(`@${owner}/${skill.name}: ${error.message}`));
    }
  }
  const deadline = Date.now() + 15 * 60_000;
  while (waiting.size) {
    for (const [name, { skill, version, previousSubmission }] of [...waiting]) {
      try {
        const status = await stage(name, version);
        if (status?.stage === 'published') {
          waiting.delete(name);
          if (previousSubmission) await submit(skill, version);
          else verifyPublic(skill, version);
          continue;
        } else if (status && (['pending_checks', 'ready_to_finalize', 'finalizing'].includes(status.stage)
          || (status.retrying && ['checks_failed', 'checks_incomplete'].includes(status.stage)))) {
          continue;
        } else {
          throw new Error(status?.stage ?? 'missing publication');
        }
      } catch (error) {
        failures.push(new Error(`@${owner}/${name}@${version}: ${error.message}`));
      }
      waiting.delete(name);
    }
    if (!waiting.size) break;
    if (Date.now() >= deadline) {
      failures.push(new Error(`Still pending at @${owner}: ${[...waiting.keys()].join(', ')}`));
      break;
    }
    await delay(15_000);
  }
  if (failures.length) throw new AggregateError(failures, `Could not sync ${owner}`);
} finally {
  rmSync(anonymous, { recursive: true, force: true });
}
