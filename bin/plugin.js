import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, sep } from 'node:path';

function digestTree(root) {
  const hash = createHash('sha256');
  for (const path of readdirSync(root, { recursive: true }).sort()) {
    const file = join(root, path);
    if (lstatSync(file).isDirectory()) continue;
    hash.update(path.split(sep).join('/')).update('\0');
    hash.update(createHash('sha256').update(readFileSync(file)).digest());
  }
  return hash.digest('hex');
}

function marketplacePath(root, agent) {
  if (!root.split(sep).includes('node_modules')) return root;
  // Native hosts register a directory by path. It must survive both npx cache eviction and upgrades.
  const marketplace = join(homedir(), '.peterflow', 'marketplace');
  const sources = join(root, 'plugins');
  const digest = digestTree(sources);
  const releases = join(marketplace, 'releases');
  const release = join(releases, digest);
  mkdirSync(releases, { recursive: true });
  const staging = mkdtempSync(join(releases, '.install-'));
  try {
    if (existsSync(release)) {
      if (digestTree(release) !== digest) throw new Error(`Local marketplace files have changed: ${release}`);
    } else {
      const payload = join(staging, 'payload');
      cpSync(sources, payload, { recursive: true });
      try {
        renameSync(payload, release);
      } catch (error) {
        if (error.code !== 'EEXIST' && error.code !== 'ENOTEMPTY') throw error;
      }
    }
    const manifest = agent === 'codex' ? '.agents/plugins/marketplace.json' : '.claude-plugin/marketplace.json';
    const market = JSON.parse(readFileSync(join(root, manifest), 'utf8'));
    for (const entry of market.plugins) {
      const path = `./releases/${digest}/${entry.name}`;
      if (agent === 'codex') entry.source.path = path;
      else entry.source = path;
    }
    const target = join(marketplace, manifest);
    mkdirSync(dirname(target), { recursive: true });
    const pending = join(staging, 'marketplace.json');
    writeFileSync(pending, JSON.stringify(market, null, 2) + '\n');
    renameSync(pending, target);
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
  return marketplace;
}

export function installPlugin(root, agent, zh) {
  function run(args, stdio = 'inherit') {
    const result = spawnSync(agent, args, { stdio, encoding: 'utf8' });
    if (result.error?.code === 'ENOENT') {
      throw new Error(zh ? `找不到 ${agent} 命令，请安装宿主或选择单项安装。` : `Could not find ${agent}. Install its CLI or choose standalone skills.`);
    }
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${agent} ${args.join(' ')}: ${result.signal ?? result.status}`);
    return result.stdout;
  }
  run(['plugin', '--help'], 'ignore');
  const source = marketplacePath(root, agent);
  const id = `peterflow-${zh ? 'zh' : 'en'}@peterflow`;
  run(['plugin', 'marketplace', 'add', source]);
  if (agent === 'claude') {
    const installed = JSON.parse(run(['plugin', 'list', '--json'], ['ignore', 'pipe', 'inherit']));
    const action = installed.some(plugin => plugin.id === id && plugin.scope === 'user') ? 'update' : 'install';
    run(['plugin', action, id, '--scope', 'user']);
  } else {
    run(['plugin', 'add', id]);
  }
  console.log(zh ? `已安装插件 ${id}。市场目录：${source}` : `Installed ${id}. Marketplace: ${source}`);
}
