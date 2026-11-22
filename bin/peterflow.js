#!/usr/bin/env node
import { cpSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { agents, destination, findAgent, pluginAgents, pluginCommands } from './agents.js';
import { installPlugin } from './plugin.js';
import { withTerminalMenu } from './terminal-menu.js';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { createInterface } from 'node:readline';
import { stdin, stdout } from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const plugins = fileURLToPath(new URL('../plugins', import.meta.url));
const defaultAgent = findAgent('codex');
const sections = [
  ['dev', 'Development workflow', '开发主线', [
    [1, 'plan'],
    [2, 'tasks'],
    [3, 'implement'],
    [4, 'tasks-pro'],
    [5, 'implement-pro'],
    [6, 'analyze'],
    [7, 'converge'],
    [22, 'spec'],
  ]],
  ['dev-support', 'Engineering support', '工程辅助', [
    [11, 'feature-retcon'],
    [12, 'code-review'],
    [14, 'design-mod'],
    [15, 'review-arch'],
    [16, 'debug-expert'],
    [20, 'retro'],
    [21, 'maintain-standards'],
  ]],
  ['daily-work', 'Everyday work', '日常工作', [
    [13, 'shuorenhua'],
    [17, 'research'],
    [19, 'learn'],
  ]],
  ['agent-collab', 'Working with agents', '与 Agent 协作', [
    [8, 'quickstart'],
    [9, 'ask-peter'],
    [10, 'context-handoff'],
    [18, 'writing-for-agents'],
  ]],
];

const help = `PeterFlow — install engineering skills for coding agents

  peterflow                                 Choose skills, agent and scope with the keyboard
  peterflow --lang en plan implement         Install two skills in this Codex project
  peterflow --lang zh-CN --group daily-work  Install the three everyday skills
  peterflow --lang en --plugin --agent codex  Install the English edition as a native plugin
  peterflow --lang zh-CN --agent claude --global --all
  peterflow --lang en --agent cursor --group dev
  peterflow --list-agents
  peterflow --lang en --dir ./my-skills plainly
  peterflow --lang zh-CN --list

  --lang en|zh-CN       Skill and wizard language (default en outside the wizard)
  --agent ID            Use the agent's skills directory (default codex)
  --list-agents         Show agent IDs and their project and user directories
  --global              Install for the current user (default current project)
  --dir PATH            Use an explicit skills directory instead of a host target
  --all                 Install every skill in this language
  --group NAME          Install a standalone group. Repeat to combine groups.
                        dev, dev-support, daily-work, agent-collab
  --plugin              Install a native Codex or Claude Code plugin
  --list                Show the skill catalog
  --help, -h            Show this help

中文：直接运行进入交互向导，可选择语言、技能和安装位置。
Existing skill folders are preserved. For a native plugin bundle see the README.`;

function catalog(zh) {
  const root = join(plugins, zh ? 'peterflow-zh' : 'peterflow-en', 'skills');
  return sections.flatMap(([group, english, chinese, entries]) => entries.map(([number, id]) => {
    const name = !zh && id === 'shuorenhua' ? 'plainly' : id;
    const source = join(root, group, name);
    const body = readFileSync(join(source, 'SKILL.md'), 'utf8');
    const description = body.match(/^description: (.+)$/m)[1].replace(/^"(.*)"$/, '$1');
    return { number, name, source, description, group, section: group + ' · ' + (zh ? chinese : english) };
  }));
}

function showCatalog(skills) {
  let lastSection;
  for (const skill of skills) {
    if (skill.section !== lastSection) {
      console.log(`\n${skill.section}`);
      lastSection = skill.section;
    }
    console.log(`  ${String(skill.number).padStart(2)}  ${skill.name.padEnd(20)} ${skill.description}`);
  }
}

function selectSkills(tokens, skills, zh, { numbered = false, groups = [] } = {}) {
  const chosen = tokens.map(token => {
    const skill = numbered && /^[1-9]\d*$/.test(token)
      ? skills.find(entry => entry.number === Number(token))
      : skills.find(entry => entry.name === token);
    if (!skill) throw new Error(zh ? `未知技能：${token}` : `Unknown skill: ${token}`);
    return skill;
  });
  if (new Set(chosen).size !== chosen.length) {
    throw new Error(zh ? '同一个技能只需选一次。' : 'Select each skill only once.');
  }
  return [...new Set([...selectGroups(groups, skills, zh), ...chosen])];
}

function selectGroups(groups, skills, zh) {
  for (const group of groups) {
    if (!sections.some(([id]) => id === group)) {
      throw new Error(zh ? `未知分组：${group}` : `Unknown group: ${group}`);
    }
  }
  return skills.filter(skill => groups.includes(skill.group));
}

// Resolve existing parents too, so aliases to the package cannot turn a copy into recursion.
function physicalPath(path) {
  if (lstatSync(path, { throwIfNoEntry: false })) return realpathSync(path);
  return join(physicalPath(dirname(path)), basename(path));
}

function install(skills, path, zh) {
  const homeRelative = path === '~' || path.startsWith('~/') || path.startsWith('~' + sep);
  const dest = resolve(homeRelative ? join(homedir(), path.slice(2)) : path);
  if (lstatSync(dest, { throwIfNoEntry: false })?.isSymbolicLink()) {
    throw new Error(zh ? `目标目录是符号链接：${dest}` : `Destination is a symbolic link: ${dest}`);
  }
  const actualDest = physicalPath(dest);
  const packageSources = realpathSync(plugins);
  if (actualDest === packageSources || actualDest.startsWith(packageSources + sep)) {
    throw new Error(zh ? '请选择插件源码以外的安装位置。' : 'Choose a destination outside the bundled plugins.');
  }
  const conflicts = skills.map(skill => join(dest, skill.name))
    .filter(target => lstatSync(target, { throwIfNoEntry: false }));
  if (conflicts.length) {
    throw new Error((zh ? '以下路径已存在，本次未安装：' : 'Nothing installed. These paths already exist:') + '\n' + conflicts.join('\n'));
  }
  mkdirSync(dest, { recursive: true });
  const reserved = [];
  try {
    // Exclusive mkdir also protects against another installer arriving after preflight.
    for (const skill of skills) {
      const target = join(dest, skill.name);
      mkdirSync(target);
      reserved.push(target);
    }
    for (const [i, skill] of skills.entries()) {
      // Hosts discover SKILL.md. Make it visible only after its bundled resources are ready.
      const resources = readdirSync(skill.source).filter(entry => entry !== 'SKILL.md');
      for (const entry of [...resources, 'SKILL.md']) {
        cpSync(join(skill.source, entry), join(reserved[i], entry), { recursive: true, force: false, errorOnExist: true });
      }
    }
  } catch (error) {
    for (const owned of reserved.reverse()) rmSync(owned, { recursive: true });
    throw error;
  }
  console.log(zh ? `已安装 ${skills.length} 项技能到 ${dest}` : `Installed ${skills.length} skill(s) in ${dest}`);
  console.log(skills.map(skill => skill.name).join(', '));
}

async function keyboardWizard(options) {
  const choice = await withTerminalMenu(async menu => {
    const lang = options.lang ?? await menu('Language / 语言', [
      { value: 'en', label: 'English' }, { value: 'zh-CN', label: '简体中文' },
    ]);
    const zh = lang === 'zh-CN';
    const skills = catalog(zh);
    const canChoosePlugin = !options.agent || pluginCommands.has(options.agent.value);
    let mode = options.plugin ? 'plugin' : 'pick';
    if (!options.plugin && !options.dir && !options.global) {
      mode = await menu(zh ? '安装内容' : 'What would you like to install?', [
        { value: 'pick', label: zh ? '按分组或单个 Skill 勾选' : 'Choose groups and individual skills' },
        { value: 'all', label: zh ? `全部 ${skills.length} 项独立 Skill` : `All ${skills.length} standalone skills` },
        ...(canChoosePlugin ? [{ value: 'plugin', label: zh ? '原生插件 · Codex 或 Claude Code' : 'Native plugin · Codex or Claude Code' }] : []),
      ], { zh });
    }

    let selected = skills;
    if (mode === 'pick') {
      const groups = sections.map(([id]) => {
        const members = skills.filter(skill => skill.group === id);
        return {
          label: members[0].section,
          children: members.map(skill => ({ value: skill.name, label: skill.name, hint: skill.description })),
          hint: members.map(skill => skill.name).join(', '),
        };
      });
      const names = await menu(zh ? '勾选分组或 Skill' : 'Select groups or skills', groups, { zh, multiple: true });
      selected = skills.filter(skill => names.has(skill.name));
    }
    if (options.dir) return { zh, selected, dest: options.dir };

    let choices = mode === 'plugin' ? pluginAgents : agents;
    if (options.global) choices = choices.filter(agent => agent.globalDir);
    const agent = options.agent ?? findAgent(await menu(zh ? '选择 Agent' : 'Choose an agent', choices, { zh, searchable: mode !== 'plugin' }));
    if (mode === 'plugin') return { zh, agent, plugin: true };

    const scope = options.global ? 'global' : await menu(zh ? '选择安装范围' : 'Choose the installation scope', [
      { value: 'project', label: zh ? '项目级 · 当前项目' : 'Project · this project', hint: destination(agent, false) },
      ...(agent.globalDir ? [{ value: 'global', label: zh ? '全局 · 当前用户' : 'Global · current user', hint: agent.globalDir }] : []),
      { value: 'custom', label: zh ? '自定义技能目录' : 'Custom skills directory' },
    ], { zh });
    return { zh, selected, dest: scope === 'custom' ? undefined : destination(agent, scope === 'global') };
  });
  if (choice.plugin) return installPlugin(dirname(plugins), pluginCommands.get(choice.agent.value), choice.zh);
  if (!choice.dest) {
    const reader = createInterface({ input: stdin, output: stdout });
    try {
      const lines = reader[Symbol.asyncIterator]();
      while (!choice.dest) {
        stdout.write(choice.zh ? '技能目录路径 › ' : 'Path to skills directory › ');
        const { value, done } = await lines.next();
        if (done) throw new Error('Cancelled. / 已取消。');
        choice.dest = value.trim();
      }
    } finally {
      reader.close();
    }
  }
  install(choice.selected, choice.dest, choice.zh);
}

async function lineWizard(options) {
  const reader = createInterface({ input: stdin, output: stdout });
  const lines = reader[Symbol.asyncIterator]();
  async function ask(prompt) {
    stdout.write(prompt);
    const { value, done } = await lines.next();
    if (done) throw new Error('Input closed. Cancelled. / 输入已结束，已取消。');
    return value.trim();
  }
  async function choose(prompt, choices) {
    while (true) {
      const value = await ask(prompt);
      if (choices.includes(value)) return value;
      console.log(choices.join(' / '));
    }
  }
  async function chooseAgent(choices, zh) {
    const keys = new Map([['', choices[0]]]);
    for (const [index, agent] of choices.entries()) {
      const number = String(index + 1);
      console.log(`  ${number.padStart(2)}  ${agent.label}  (${agent.value})`);
      keys.set(number, agent);
      keys.set(agent.value, agent);
    }
    const key = await choose(zh ? '选择 Agent 编号或 ID [1] › ' : 'Choose an agent number or ID [1] › ', [...keys.keys()]);
    return keys.get(key);
  }
  try {
    console.log('PeterFlow');
    const lang = options.lang ?? (await choose('1 English   2 简体中文  [1] › ', ['', '1', '2']) === '2' ? 'zh-CN' : 'en');
    const zh = lang === 'zh-CN';
    const skills = catalog(zh);
    async function pluginChoice() {
      const agent = options.agent ?? await chooseAgent(pluginAgents, zh);
      installPlugin(dirname(plugins), pluginCommands.get(agent.value), zh);
    }
    if (options.plugin) return await pluginChoice();
    let selected;
    let byGroup = false;
    if (!options.dir && !options.global) {
      const modes = ['', '2', '3', '4', 'all'];
      if (!options.agent || pluginCommands.has(options.agent.value)) {
        console.log(zh ? '  1  原生插件 · Codex 或 Claude Code' : '  1  Native plugin · Codex or Claude Code');
        modes.push('1', 'plugin');
      }
      console.log(zh
        ? `  2  独立 Skill · 挑选需要的几项\n  3  独立 Skill · 安装全部 ${skills.length} 项\n  4  按分组安装 · 可多选`
        : `  2  Standalone skills · pick individual skills\n  3  Standalone skills · install all ${skills.length}\n  4  Install by group · pick one or more`);
      const mode = await choose(zh ? '安装方式 [2] › ' : 'Install mode [2] › ', modes);
      if (mode === '1' || mode === 'plugin') return await pluginChoice();
      if (mode === '3' || mode === 'all') selected = skills;
      byGroup = mode === '4';
    }
    if (byGroup) {
      sections.forEach(([id], index) => {
        const members = skills.filter(skill => skill.group === id);
        console.log(`  ${index + 1}  ${members[0].section} (${members.length})  ${members.map(skill => skill.name).join(', ')}`);
      });
    } else if (!selected) showCatalog(skills);
    while (!selected) {
      const prompt = byGroup
        ? (zh ? '输入分组编号或组名，可多选 › ' : 'Enter group numbers or names, separated by spaces or commas › ')
        : (zh ? '输入技能编号、技能名或组名，可多选；全部输入 all › ' : 'Enter skill numbers, skill names or group names (all for everything) › ');
      const raw = await ask(prompt);
      const tokens = raw.split(/[\s,，、]+/).filter(Boolean);
      if (!tokens.length) continue;
      try {
        if (byGroup) {
          const groups = tokens.map(token => sections.find((_, i) => String(i + 1) === token)?.[0] ?? token);
          selected = selectGroups(groups, skills, zh);
        } else if (raw === 'all') {
          selected = skills;
        } else {
          const groups = tokens.filter(token => sections.some(([id]) => id === token));
          const individual = tokens.filter(token => !groups.includes(token));
          selected = selectSkills(individual, skills, zh, { numbered: true, groups });
        }
      } catch (error) {
        console.log(error.message);
      }
    }

    let dest = options.dir;
    if (!dest && (options.agent || options.global)) dest = destination(options.agent ?? defaultAgent, options.global);
    if (!dest) {
      const project = zh ? '当前项目' : 'project';
      const user = zh ? '当前用户' : 'user';
      const locations = [false, true].flatMap(global => [defaultAgent, findAgent('claude-code')].map(agent => ({
        label: `${agent.label} · ${global ? user : project}`, path: destination(agent, global),
      })));
      locations.forEach(({ label, path }, i) => console.log(`  ${i + 1}  ${label}   ${path}`));
      console.log(zh ? '  5  指定其他技能目录' : '  5  Custom skills directory');
      console.log(zh ? '  6  选择其他 Agent' : '  6  Choose another agent');
      const choice = await choose(zh ? '安装位置 [1] › ' : 'Install location [1] › ', ['', '1', '2', '3', '4', '5', '6']);
      if (choice === '5') {
        while (!dest) dest = await ask(zh ? '技能目录路径 › ' : 'Path to skills directory › ');
      } else if (choice === '6') {
        const agent = await chooseAgent(agents, zh);
        const scope = agent.globalDir
          ? await choose(`1 ${project}   2 ${user}  [1] › `, ['', '1', '2'])
          : '1';
        dest = destination(agent, scope === '2');
      } else {
        dest = locations[Number(choice || '1') - 1].path;
      }
    }
    install(selected, dest, zh);
  } finally {
    reader.close();
  }
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      lang: { type: 'string' }, agent: { type: 'string' }, dir: { type: 'string' },
      global: { type: 'boolean' }, all: { type: 'boolean' }, list: { type: 'boolean' },
      'list-agents': { type: 'boolean' },
      plugin: { type: 'boolean' },
      group: { type: 'string', multiple: true, default: [] },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help) return console.log(help);
  if (values.lang !== undefined && !['en', 'zh-CN'].includes(values.lang)) throw new Error('--lang: en | zh-CN');
  if (values['list-agents']) {
    console.log(values.lang === 'zh-CN' ? 'ID\tAgent\t项目目录\t全局目录' : 'ID\tAgent\tProject directory\tGlobal directory');
    for (const agent of agents) console.log([agent.value, agent.label, agent.projectDir, agent.globalDir ?? '—'].join('\t'));
    return;
  }
  if (values.agent !== undefined) values.agent = findAgent(values.agent);
  if (values.agent && values.plugin && !pluginCommands.has(values.agent.value)) {
    throw new Error(`${values.agent.label}: use --all for standalone skills. --plugin supports Codex and Claude Code.`);
  }
  if (values.dir !== undefined && (!values.dir.trim() || values.agent || values.global)) throw new Error('--dir needs a path and cannot be combined with --agent or --global.');
  if (values.all && positionals.length) throw new Error('Use --all or individual skill names.');
  if (values.group.length && (values.plugin || values.all || values.list)) {
    throw new Error('--group cannot be combined with --plugin, --all or --list.');
  }
  if (values.plugin && (values.dir || values.global || values.all || values.list || positionals.length)) {
    throw new Error('--plugin installs one whole edition through the host. Use it with --lang and --agent.');
  }
  const zh = values.lang === 'zh-CN';
  if (values.list) return showCatalog(catalog(zh));
  if (values.plugin && values.lang && values.agent) return installPlugin(dirname(plugins), pluginCommands.get(values.agent.value), zh);
  if (!values.all && !values.group.length && !positionals.length) {
    return stdin.isTTY && stdout.isTTY ? keyboardWizard(values) : lineWizard(values);
  }
  const skills = catalog(zh);
  const selected = values.all ? skills : selectSkills(positionals, skills, zh, { groups: values.group });
  install(selected, values.dir ?? destination(values.agent ?? defaultAgent, values.global), zh);
}

main().catch(error => {
  console.error(`PeterFlow: ${error.message}`);
  process.exitCode = 1;
});
