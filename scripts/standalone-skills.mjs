import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';

export function editionSkills(lang) {
  if (!['zh', 'en'].includes(lang)) throw new Error('Expected the zh or en edition.');
  const root = `plugins/peterflow-${lang}/skills`;
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name === 'SKILL.md')
    .map(entry => ({ name: basename(entry.parentPath), dir: entry.parentPath }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Native ClawHub skill uploads accept MIT-0. Third-party notices must travel with the matching MIT skill.
export function nativeClawHubSkills(lang) {
  const approved = new Set(['plan', 'tasks', 'tasks-pro', 'implement', 'implement-pro', 'analyze', 'converge',
    'context-handoff', 'quickstart', 'maintain-standards', 'feature-retcon']);
  const skills = editionSkills(lang).filter(skill => approved.has(skill.name));
  for (const { name, dir } of skills) {
    const expected = name === 'feature-retcon'
      ? '9d705a8ca54ccc5103e5e1fb7c663a6034a7f463c28ee5137fc0bfdb8eef5a29'
      : '99511c865609f858a59066efa52d23fd9e3e0bbeb432433ce52846a99b356a44';
    const actual = createHash('sha256').update(readFileSync(join(dir, 'LICENSE'))).digest('hex');
    if (actual !== expected) throw new Error(`Review the changed license before publishing ${name} to ClawHub.`);
  }
  return skills;
}

export function fileHashes(root) {
  return Object.fromEntries(readdirSync(root, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && !/^(?:\.DS_Store|.*\.py[co])$/.test(entry.name))
    .map(entry => {
      const file = join(entry.parentPath, entry.name);
      return [relative(root, file).split(sep).join('/'), createHash('sha256').update(readFileSync(file)).digest('hex')];
    }));
}
