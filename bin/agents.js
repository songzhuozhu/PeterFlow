import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';

const home = homedir();
const shared = '.agents/skills';
const xdg = process.env.XDG_CONFIG_HOME;
const configHome = xdg && isAbsolute(xdg) ? xdg : join(home, '.config');
const reasonixHome = process.platform === 'win32'
  ? join(process.env.APPDATA || join(home, 'AppData/Roaming'), 'reasonix')
  : '.reasonix';
const openClawHome = ['.openclaw', '.clawdbot', '.moltbot'].find(dir => existsSync(join(home, dir))) ?? '.openclaw';

function configuredSkills(variable, fallback) {
  return join(process.env[variable]?.trim() || fallback, 'skills');
}

// Directory conventions from skills@1.8.1 and OpenSpec. An omitted user path
// uses the project path under the home directory. Null means project only.
export const agents = [
  ['codex', 'Codex', shared],
  ['claude-code', 'Claude Code', '.claude/skills', configuredSkills('CLAUDE_CONFIG_DIR', '.claude')],
  ['cursor', 'Cursor', shared, '.cursor/skills'],
  ['github-copilot', 'GitHub Copilot', shared, '.copilot/skills'],
  ['gemini-cli', 'Gemini CLI', shared, '.gemini/skills'],
  ['opencode', 'OpenCode', shared, join(configHome, 'opencode/skills')],
  ['cline', 'Cline', shared],
  ['windsurf', 'Windsurf', '.windsurf/skills', '.codeium/windsurf/skills'],
  ['trae', 'Trae', '.trae/skills'],
  ['trae-cn', 'Trae CN', '.trae/skills', '.trae-cn/skills'],
  ['kimi-code-cli', 'Kimi Code CLI', shared],
  ['qwen-code', 'Qwen Code', '.qwen/skills'],
  ['kiro-cli', 'Kiro CLI', '.kiro/skills'],
  ['amp', 'Amp', shared, join(configHome, 'agents/skills')],
  ['pi', 'Pi', shared],
  ['roo', 'Roo Code', '.roo/skills'],
  ['kilo', 'Kilo Code', shared, '.kilo/skills'],
  ['droid', 'Droid', shared, '.factory/skills'],
  ['universal', 'Universal', shared, join(configHome, 'agents/skills')],
  ['adal', 'AdaL', '.adal/skills'],
  ['aider-desk', 'AiderDesk', '.aider-desk/skills'],
  ['antigravity', 'Antigravity', shared, '.gemini/config/skills'],
  ['antigravity-cli', 'Antigravity CLI', shared, '.gemini/config/skills'],
  ['astrbot', 'AstrBot', 'data/skills', '.astrbot/data/skills'],
  ['augment', 'Augment', '.augment/skills'],
  ['autohand-code', 'Autohand Code CLI', '.autohand/skills', configuredSkills('AUTOHAND_HOME', '.autohand')],
  ['codestudio', 'Code Studio', '.codestudio/skills'],
  ['codearts-agent', 'CodeArts Agent', '.codeartsdoer/skills'],
  ['codebuddy', 'CodeBuddy', '.codebuddy/skills'],
  ['codemaker', 'Codemaker', '.codemaker/skills'],
  ['command-code', 'Command Code', '.commandcode/skills'],
  ['continue', 'Continue', '.continue/skills'],
  ['cortex', 'Cortex Code', '.cortex/skills', '.snowflake/cortex/skills'],
  ['costrict', 'CoStrict', '.cospec/skills', null],
  ['crush', 'Crush', '.crush/skills', '.config/crush/skills'],
  ['deepagents', 'Deep Agents', shared, '.deepagents/agent/skills'],
  ['devin', 'Devin for Terminal', '.devin/skills', join(configHome, 'devin/skills')],
  ['dexto', 'Dexto', shared],
  ['eve', 'Eve', 'agent/skills', null],
  ['firebender', 'Firebender', shared, '.firebender/skills'],
  ['forgecode', 'ForgeCode', '.forge/skills'],
  ['fx', 'fx', shared],
  ['goose', 'Goose', '.goose/skills', join(configHome, 'goose/skills')],
  ['grok', 'Grok Build', '.grok/skills', configuredSkills('GROK_HOME', '.grok')],
  ['hermes-agent', 'Hermes Agent', '.hermes/skills', configuredSkills('HERMES_HOME', '.hermes')],
  ['bob', 'IBM Bob', '.bob/skills'],
  ['iflow-cli', 'iFlow CLI', '.iflow/skills'],
  ['inference-sh', 'inference.sh', '.inferencesh/skills'],
  ['jazz', 'Jazz', '.jazz/skills'],
  ['junie', 'Junie', '.junie/skills'],
  ['kimchi', 'Kimchi', '.kimchi/skills', '.config/kimchi/harness/skills'],
  ['kode', 'Kode', '.kode/skills'],
  ['lingma', 'Lingma', '.lingma/skills'],
  ['loaf', 'Loaf', shared],
  ['mcpjam', 'MCPJam', '.mcpjam/skills'],
  ['minimax-code', 'MiniMax Code', '.minimax/skills'],
  ['mistral-vibe', 'Mistral Vibe', '.vibe/skills', configuredSkills('VIBE_HOME', '.vibe')],
  ['moxby', 'Moxby', '.moxby/skills'],
  ['mux', 'Mux', '.mux/skills'],
  ['neovate', 'Neovate', '.neovate/skills'],
  ['oh-my-pi', 'Oh My Pi', '.omp/skills', '.omp/agent/skills'],
  ['ona', 'Ona', '.ona/skills'],
  ['openclaw', 'OpenClaw', 'skills', join(openClawHome, 'skills')],
  ['openhands', 'OpenHands', '.openhands/skills'],
  ['pochi', 'Pochi', '.pochi/skills'],
  ['posit-assistant', 'Posit Assistant', '.posit/assistant/skills'],
  ['promptscript', 'PromptScript', shared, null],
  ['qoder', 'Qoder', '.qoder/skills'],
  ['qoder-cn', 'Qoder CN', '.qoder/skills', '.qoder-cn/skills'],
  ['reasonix', 'Reasonix', '.reasonix/skills', configuredSkills('REASONIX_HOME', reasonixHome)],
  ['replit', 'Replit', shared, join(configHome, 'agents/skills')],
  ['rovodev', 'Rovo Dev', '.rovodev/skills'],
  ['sarvam-code', 'Sarvam Code', shared],
  ['codeassistant', 'SourceCraft Code Assistant (VS Code)', '.codeassistant/skills', null],
  ['tabnine-cli', 'Tabnine CLI', '.tabnine/agent/skills'],
  ['terramind', 'Terramind', '.terramind/skills'],
  ['tinycloud', 'Tinycloud', '.tinycloud/skills'],
  ['warp', 'Warp', shared],
  ['zcode', 'ZCode', '.zcode/skills'],
  ['zed', 'Zed', shared],
  ['zencoder', 'Zencoder', '.zencoder/skills'],
  ['zenflow', 'Zenflow', '.zencoder/skills'],
].map(([value, label, projectDir, userDir = projectDir]) => ({
  value, label, projectDir, globalDir: userDir === null ? null : resolve(home, userDir),
}));

export const pluginCommands = new Map([['codex', 'codex'], ['claude-code', 'claude']]);
export const pluginAgents = agents.filter(agent => pluginCommands.has(agent.value));

const aliases = new Map([
  ['claude', 'claude-code'], ['copilot', 'github-copilot'], ['gemini', 'gemini-cli'],
  ['kimi', 'kimi-code-cli'], ['kiro', 'kiro-cli'], ['qwen', 'qwen-code'],
  ['auggie', 'augment'], ['factory', 'droid'], ['kilocode', 'kilo'], ['omp', 'oh-my-pi'],
]);

export function findAgent(name) {
  const id = aliases.get(name) ?? name;
  const agent = agents.find(entry => entry.value === id);
  if (!agent) throw new Error(`Unknown agent: ${name}. See --list-agents.`);
  return agent;
}

export function destination(agent, global) {
  if (!global) return resolve(agent.projectDir);
  if (!agent.globalDir) throw new Error(`${agent.label}: only project installation is supported. Omit --global.`);
  return agent.globalDir;
}
