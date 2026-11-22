import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { nativeClawHubSkills } from '../scripts/standalone-skills.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

test('each language catalog lists all skills and preserves their native publishing license boundaries', () => {
  for (const lang of ['zh', 'en']) {
    const owner = `peterflow-${lang}`;
    const dir = join(root, 'plugins', owner);
    const guide = readFileSync(join(dir, 'README.md'), 'utf8');
    const names = readdirSync(join(dir, 'skills'), { recursive: true, withFileTypes: true })
      .filter(e => e.isFile() && e.name === 'SKILL.md').map(e => basename(e.parentPath)).sort();
    const entries = [...guide.matchAll(/^\| \[([\w-]+)\].*$/gm)];
    assert.equal(names.length, 22);
    assert.deepEqual(entries.map(m => m[1]).sort(), names);
    if (lang === 'en') {
      const catalog = JSON.parse(readFileSync(join(root, 'skills.sh.json'), 'utf8'));
      assert.deepEqual(catalog.groupings.find(group => group.title === 'English').skills.toSorted(), names);
    }
    const native = nativeClawHubSkills(lang).map(skill => skill.name);
    assert.deepEqual(native.toSorted(), ['analyze', 'context-handoff', 'converge', 'feature-retcon',
      'implement', 'implement-pro', 'maintain-standards', 'plan', 'quickstart', 'tasks', 'tasks-pro']);
    const source = lang === 'zh' ? 'https://songzhuozhu.github.io/PeterFlow/' : 'songzhuozhu/PeterFlow';
    assert.ok(guide.includes(`npx skills add ${source} --skill code-review`));
    assert.deepEqual(readFileSync(join(dir, 'LICENSE')), readFileSync(join(root, 'LICENSE')));
  }
});
