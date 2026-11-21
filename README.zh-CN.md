<img src="plugins/peterflow-zh/assets/icon.png" width="60" height="60" alt="PeterFlow">

# PeterFlow · 给编程 Agent 用的工作流 Skills

[English](README.md) · **简体中文** · [三条设计哲学](#三条设计哲学) · [安装](#安装) · [按需选 Skill](#全部-21-个-skill)

我做 vibe coding 快一年了。这段时间，我试过不少开源开发工作流。做规格驱动开发时，我借鉴了 [Spec Kit](https://github.com/github/spec-kit) 和 [OpenSpec](https://github.com/Fission-AI/OpenSpec) 写需求、拆任务的做法。[GSD Core](https://github.com/open-gsd/gsd-core) 给了我分阶段验收的思路，[Compound Engineering](https://github.com/EveryInc/compound-engineering-plugin) 让我看到，一次代码评审里学到的东西，也可以整理出来，留给下次开发用。PeterFlow 里也有几项工程和教学 Skill 直接改编自 [Matt Pocock 的 Skills](https://github.com/mattpocock/skills)。

谢谢这些项目的作者和贡献者，愿意把自己的工作方法公开给大家。我把其中用得顺手的做法和自己的经验整理成了 PeterFlow。你可以把这些 Skill 装进平时用的 Agent，包括 Codex、Claude Code、Cursor、GitHub Copilot、Gemini CLI、OpenCode、Trae / Trae CN、Kimi Code 和 Qwen Code 等。

**为什么做中英两版？** 我希望你能选自己读起来顺的语言，打开一份 `SKILL.md`，看看它到底让 Agent 做什么，再按自己或团队的习惯改。比如，团队有自己的代码评审清单，就可以把清单的位置写进 `code-review`，让 Agent 评审时知道该看哪份规则。[读中文版](plugins/peterflow-zh/skills/dev-support/code-review/SKILL.md) · [对照英文版](plugins/peterflow-en/skills/dev-support/code-review/SKILL.md)

## 三条设计哲学

### 按任务复杂度选工作流

选择工作流时，主要看改动范围有多大、验证起来有多难。小改动走短流程，能省下拆任务和交接的时间与 token。功能越大，漏掉一个场景后返工的代价往往越高，也就越值得分阶段实施和验收。任务之间依赖多时，可在拆完任务后用 `analyze` 查漏。改动涉及多个入口或阶段时，可在实现后用 `converge` 对照测试结果逐项核对验收条件。两步可以独立选用。

- **轻量任务**（`plan` → `implement`）。改动范围小，验收条件清楚。在对话里用几句话定下改法，直接实现，再从实际入口验证。
- **中等任务**（`plan` → `tasks` → `analyze`（可选）→ `implement` → `converge`（可选））。在一个独立模块内开发中小功能，需要分别实现和验证几项行为。先定好方案，再拆成一份任务清单，写清每项要交付什么、怎么验，按清单逐项完成。
- **大型任务**（`plan` → `tasks-pro` → `analyze`（可选）→ `implement-pro` → `converge`（可选））。`tasks-pro` 把计划拆成能独立验收的阶段，理清各阶段的依赖。主 Agent 用 `implement-pro` 派工，让不同的子 Agent 分别负责实施、评审和测试。每个子 Agent 都从干净的上下文开始。主 Agent 根据当前计划和已核实的前序结果，只给它这一步的目标、必要材料、可改范围和验收要求，让它拿到任务就能开工。

### 持续维护工作区规范

用 `maintain-standards` 维护项目约定，按需要选一个动作。[Skill 用法](plugins/peterflow-zh/skills/dev-support/maintain-standards/SKILL.md)

1. **`init` 建库或接入。** 已有规范沿用原目录，补齐阅读入口。
2. **`draft` 起草候选。** Agent 对照评审意见和现行条款，写清建议改什么、适用范围和依据。
3. **`apply` 写回决定。** 人决定是否采纳、适用范围和例外。Agent 按决定更新条款和引用，供 `plan` 定验收条件、`implement` 实现并验证、`code-review` 核对改动。
4. **`check` 只读核查。** 对照规范和代码，指出条款之间的冲突、过时的说明，或实现偏离现行规则的地方。

新工作区的默认布局如下。专题和功能文件名是示例，有相应条款时再建。

```text
.peterflow/standards/
├── README.md             # L3 总索引 · 按改动类型指向适用规范
├── general.md            # L0 团队通则 · 设计、实现和评审共用的约定
├── api.md                # L1 接口 · 请求参数、响应字段、兼容性
├── database.md           # L1 数据库 · 表结构、索引、迁移
├── errors.md             # L1 错误处理 · 错误码、错误传递和重试条件
├── testing.md            # L1 测试 · 回归用例、断言和验收证据
├── features/
│   ├── README.md         # L3 功能索引 · 按受影响的功能指向具体条款
│   └── document-open.md  # L2 功能规范 · 文档打开行为和验收条件
├── evidence/
│   └── README.md         # L3 查证指引 · 证据对应的版本及其能证明的行为
├── sources.md            # L3 条款沿革 · 采纳依据和替代关系
├── candidates/
│   └── document-open.md  # L2 候选 · 拟议中的改动及其依据
└── backup/               # L3 历史归档 · 追溯旧决定时查阅
```

**分级维护**

- **L0、L1 由人维护。** L0 是团队通则，L1 是工程专题。负责人决定规则的内容、适用范围和例外。
- **L2 由人和 Agent 共管。** 对于功能规范和候选条款，Agent 核对依据、起草修改，负责人决定是否采纳或调整。采纳后由 Agent 写回现行规范。
- **L3 由 Agent 维护。** 在授权范围内更新索引、核实证据版本、记录来源和归档旧文。

**精准路由**

- **从总索引选专题。** 只读通则中适用的章节，再按改动类型选专题。只调整数据库索引时，查 `database.md`。
- **按影响范围查功能规范。** 如果改动还影响打开文档的行为，就沿 `features/README.md` 找到 `document-open.md`。改公共代码时，沿实际调用方确定受影响的功能。
- **按需追溯。** 核实事实时查证据和来源，处理提案时读候选，追溯历史时查备份。

一次开发结束后，可用 `retro` 回看会话中的纠正、命令和结果，核实同样的问题今天是否还会发生。值得长期采用的改进，再交给 `maintain-standards draft` 起草候选。[会话复盘](plugins/peterflow-zh/skills/dev-support/retro/SKILL.md)

### 高效的上下文管理

#### `quickstart` 找回进度

- 在当前会话点名要接手的功能。Agent 对照原任务和最近的验证结果核对 `quickstart.md`，过时才更新。
- 接手页用一屏写清已定事项、验证进度，以及下一步从哪个文件或命令开始。详细证据链接到原处。[同步功能进度](plugins/peterflow-zh/skills/agent-collab/quickstart/SKILL.md)

#### `context-handoff` 交接任务

- **换会话。** 点名调用 `context-handoff`，把已定方案、资料位置和中断点交给新会话。对方确认收到后等你给指令。[新会话交接](plugins/peterflow-zh/skills/agent-collab/context-handoff/references/new-chat.md)
- **拆任务。** `tasks-pro` 在原清单里写清各阶段的输入、交付物、可改范围和验收条件，标明资料和前序产物的位置。[拆分阶段](plugins/peterflow-zh/skills/dev/tasks-pro/SKILL.md)
- **按角色派工。** `implement-pro` 调度时，主 Agent 可用 `context-handoff` 准备说明。实施者看目标和可改文件，评审者看固定版本的改动、需求和规范，测试者看待测版本和验收条件。[子 Agent 同步](plugins/peterflow-zh/skills/agent-collab/context-handoff/references/subagent.md)
- **中断后接续。** 主 Agent 把各角色回报的证据记回原任务。原评审仍有效、只缺测试时，就从测试接着做。[角色与交接说明](plugins/peterflow-zh/skills/dev/implement-pro/references/roles.md)

#### `code-review` 选准评审依据

- **定版本。** 审分支时固定基线和目标提交。审未提交改动时，核对指定路径里的暂存、未暂存和新增文件。只有当前文件可查，就只评现状。
- **查规范。** 沿项目索引读适用于本次改动的条款。
- **核需求。** 对照验收条件，从改动处追到调用方或用户入口，必要时跑一次针对性检查。
- **给结论。** 若由两人分头评审，各自在独立上下文里看同一版代码。分别报告规范和需求结论，注明哪些行为实际测过。[代码评审](plugins/peterflow-zh/skills/dev-support/code-review/SKILL.md)

## 安装

### 用 skills CLI 安装单项

从原仓库生成的中文发布源按名称选择 Skill。把 `code-review` 换成需要的名称即可。[21 项中文目录](plugins/peterflow-zh/README.md)

```sh
npx skills add https://songzhuozhu.github.io/PeterFlow/ --skill code-review
```

### 让 Agent 安装

在目标项目里打开你常用的编程 Agent，把下面这句话发给它。

> 请从 https://github.com/songzhuozhu/PeterFlow 把 PeterFlow 中文版的全部 Skill 安装到当前项目，供当前 Agent 使用。装好后告诉我怎么调用 ask-peter。

想在所有项目里用，把“当前项目”改成“当前用户的全局目录”。只需要部分 Skill 时，可以直接点名，例如“只装 code-review”。

### 自己用 npx 安装

需要 Node.js 22+。运行下面的命令启动安装向导。npm 12 默认限制从 Git 仓库安装，`--allow-git=root` 只为本次命令允许指定的 Git 来源。

```sh
npx --allow-git=root https://github.com/songzhuozhu/PeterFlow
```

选择语言和 Skill 后，输入 Agent 名称筛选。安装独立 Skill 时，按使用场景选择范围。

- **只在当前项目用**：在项目根目录运行命令，选择「项目级 · 当前项目」。
- **在所有项目用**：在任意目录运行命令，选择「全局 · 当前用户」。

如果已有本地源码，运行 `npx "/PeterFlow 源码目录的绝对路径"` 即可。

想查自己的 Agent 对应哪个 ID、会装到哪里，运行 `npx --allow-git=root https://github.com/songzhuozhu/PeterFlow --list-agents`。清单里的「—」表示安装器只提供项目级安装。

### 试用刚装好的 Skill

安装后在目标项目新开会话。如果选装了 `ask-peter`，从宿主的技能菜单选它，或在支持按名称调用的 Agent 里说“请用 ask-peter 帮我选一个评审代码的 Skill”。Codex 和 Claude Code 也可以用下面的调用名。

| 安装方式 | Codex | Claude Code |
| --- | --- | --- |
| 单项或分组安装 | `$ask-peter` | `/ask-peter` |
| 中文版原生插件 | `$peterflow-zh:ask-peter` | `/peterflow-zh:ask-peter` |

<details>
<summary>安装目录、英文版与原生插件命令</summary>

Codex、Cursor、GitHub Copilot、Gemini CLI 和 OpenCode 等可以共用项目里的 `.agents/skills/`，同一语言装一份即可。Claude Code 使用 `.claude/skills/`，Trae 和 Trae CN 共用 `.trae/skills/`。全局目录因宿主而异，可用 `--list-agents` 查看本机路径。自定义位置用 `--dir` 指定。目标已有同名 Skill 时，安装器在复制前报告冲突。每项自带所需脚本、模板和许可。

英文版使用 `--lang en`，插件名为 `peterflow-en`。英文写作 Skill 叫 `plainly`，其余 20 项与中文版同名。独立安装时，同一目录选择一种语言。

跳过向导时，把 Agent ID 和想装的内容写进命令。例如，在项目根目录运行第一条，就能给 Cursor 装上代码评审。在任意目录运行第二条，就能给当前用户的 Trae CN 装上整组日常 Skill。

```sh
npx --allow-git=root https://github.com/songzhuozhu/PeterFlow --lang zh-CN --agent cursor code-review
npx --allow-git=root https://github.com/songzhuozhu/PeterFlow --lang zh-CN --agent trae-cn --global --group daily-work
```

用 `--all` 装齐这一语言的 21 个 Skill，重复传入 `--group` 可以合装多组。Codex 和 Claude Code 另有原生插件安装方式，参数分别是 `--lang zh-CN --agent codex --plugin` 和 `--lang zh-CN --agent claude --plugin`。

也可从源码目录注册插件市场，再用对应宿主安装中文版插件。

```sh
# Codex
codex plugin marketplace add .
codex plugin add peterflow-zh@peterflow

# Claude Code
claude plugin marketplace add .
claude plugin install peterflow-zh@peterflow
```

直接注册本地仓库时，请保留该目录。从 npm 压缩包安装原生插件时，向导会将市场文件保存在 `~/.peterflow/marketplace/`。

初版曾在 macOS 上从实际 npm 压缩包试装。Codex CLI 0.166.0 和 Claude Code 2.1.328 均识别出每种语言的 21 项 Skill。

</details>

### 用在已有项目里

沿用仓库已有的计划、任务和验收记录。新功能资料默认放在 `.peterflow/specs/<主题>/`。共享规范优先沿用项目现有入口，新工作区默认用 `.peterflow/standards/`。需要写材料时再建相应目录。

多 Agent 分工需要宿主能提供独立的执行上下文。随包的依赖检查、评审回执和文件恢复工具使用 Python 3.9+ 标准库，恢复日志需要文件系统支持私有权限。

## 全部 21 个 Skill

[开发主线（7 项）](#dev) · [工程辅助（7 项）](#dev-support) · [日常工作（3 项）](#daily-work) · [与 Agent 协作（4 项）](#agent-collab)

### dev

#### [plan](plugins/peterflow-zh/skills/dev/plan/SKILL.md) · 先定怎么改、怎么验

“我想关掉编辑器再打开，还能接着写。”Agent 会先看现在的代码把草稿存在哪儿，再列出要改的地方和检查办法。像“什么时候该清掉草稿”这样还没定的事，会提出来让你决定。小改动在对话里商量好就够了。

#### [tasks](plugins/peterflow-zh/skills/dev/tasks/SKILL.md) · 把方案拆成能动手的几步

把定好的方案拆成一张分阶段的任务清单。每项写清要交付什么、得等哪一步做完、怎么检查结果。

#### [implement](plugins/peterflow-zh/skills/dev/implement/SKILL.md) · 照着计划动手

可以直接从几句话的计划开始，也可以接着已有清单做。Agent 从具备条件的任务开始改，改完从用户平时用的入口试一遍，把改了什么、实际测到什么记回原处。

#### [tasks-pro](plugins/peterflow-zh/skills/dev/tasks-pro/SKILL.md) · 把大任务拆给几个 Agent

这张清单要让没看过前面对话的 Agent 也能开工。每个阶段都写清先读什么、要等上一步交来什么、能改哪些文件。做完怎么验、要给下一位留下什么，也记在同一处。最后一项写明各部分接起来后怎么验。

#### [implement-pro](plugins/peterflow-zh/skills/dev/implement-pro/SKILL.md) · 让不同的 Agent 分别实现、评审和测试

主 Agent 从清单里挑一个可以开工的阶段，让一个 Agent 写代码，另一个只读评审，再由独立的 Agent 跑测试。主 Agent 决定哪些问题要修，把每个阶段的改动和验证结果记回原清单。

比如升级文档格式，最后要用新版编辑器打开一份带批注的旧文档，看看正文和批注还能不能一起读到。

#### [analyze](plugins/peterflow-zh/skills/dev/analyze/SKILL.md) · 拆完任务、开始实现前，按需检查遗漏

用 `tasks` 或 `tasks-pro` 拆完任务后，如果需求分支多、任务间有依赖，可以先用 `analyze` 对照方案和任务清单查漏，再进入 `implement` 或 `implement-pro`。任务简单、验收清楚时可以直接实现。

假设方案只写了“发送后清除草稿”。用户点了发送，发送失败，又关了页面，下次打开该看到什么？Agent 会顺着这个例子读需求、方案和已有任务，指出哪两处说法对不上、哪一步漏了，或者哪个决定还得你来做。轻量任务如果只有一份方案，也可以在实现前用它核对拿不准的场景。任务调整后，可以只复查受影响的部分。

#### [converge](plugins/peterflow-zh/skills/dev/converge/SKILL.md) · 实现后，按需核对阶段或功能还差哪些验收

用 `implement` 或 `implement-pro` 完成本阶段的实现后，如果改动跨多个入口或阶段，可以在收尾前用 `converge` 逐项核对哪些目标已经验过、哪些还要补做。小改动已从用户入口验清时，可以直接收尾。

如果只试过“误关页面能找回草稿”，“发送成功后草稿不会再出现”就还没验过。Agent 会对照原目标、当前代码和实际测试结果，逐项标出已完成、未完成、未验证或受阻。要补的工作记回原任务，沿用原编号。

### dev-support

#### [feature-retcon](plugins/peterflow-zh/skills/dev-support/feature-retcon/SKILL.md) · 做到一半改了决定

比如，原来点“发送”就清空草稿，现在要等服务器确认成功才清。需求里一句话变了，设计、任务、代码和测试里可能还留着旧做法。

可以先让 Agent 找出哪些地方受影响。你定下这次要改的范围后，它会逐处更新、逐处检查，并记录文件改动。这样可以分几次做，也能在你明确要求时恢复文件。

#### [code-review](plugins/peterflow-zh/skills/dev-support/code-review/SKILL.md) · 检查一版代码改得对不对

评审默认只读。代码是否符合项目规范、用户用起来是否符合需求，这两项各给一个结论。发现问题时，Agent 会指出是哪段代码、什么操作会触发、会造成什么影响。

#### [design-mod](plugins/peterflow-zh/skills/dev-support/design-mod/SKILL.md) · 决定一个模块该管什么

手动保存和自动保存都要自己拼草稿文件名，改个命名规则就得动两处。让 Agent 看看这两处实际怎么调用，再比较把命名留给调用方和交给保存模块各会怎样。你可以看到每种写法要让调用方做多少事，新接口该怎么测。

#### [review-arch](plugins/peterflow-zh/skills/dev-support/review-arch/SKILL.md) · 找值得重构的地方

准备整理一块代码，还没定先改哪儿时用它。Agent 会从一次真实操作开始，顺着调用找出值得改的地方，在 HTML 报告里并排画出现在的结构和建议的改法。你挑中一处，再一起讨论细节。

#### [debug-expert](plugins/peterflow-zh/skills/dev-support/debug-expert/SKILL.md) · 查清故障为什么发生

同一个文件，拖进窗口能打开，从“最近打开”点进去却报文件不存在。遇到这种问题，Agent 会先重现故障，找出两次操作从哪一步开始不同，再用实验区分几个说得通的原因。你可以只让它查原因。让它修复时，它还会从原来报错的入口再试一次。

#### [retro](plugins/peterflow-zh/skills/dev-support/retro/SKILL.md) · 回看一次开发，下次少踩同一个坑

为什么第一次测试漏掉了“最近打开”？它会翻看那次会话中你纠正过什么、Agent 用了哪些命令、结果怎样，再核对同样的问题今天还会不会漏。如果确实还会漏，它会建议改哪一步，以及怎么确认下次能发现这个问题。

#### [maintain-standards](plugins/peterflow-zh/skills/dev-support/maintain-standards/SKILL.md) · 维护团队的项目规范

用 `init` 建立规范库，或接入项目已有的规范。评审里提到的改法，用 `draft` 写成草案并记下出处，团队采纳后再用 `apply` 写进正式条款。日后用 `check` 做只读检查，看看规则之间有没有冲突、哪些说法已过时、代码有没有偏离规则。

### daily-work

这三项在普通工作目录里就能用，也适合平时不写代码的人。

#### [shuorenhua](plugins/peterflow-zh/skills/daily-work/shuorenhua/SKILL.md) · 把话讲明白

单独发“说人话”，Agent 就换个直白的说法重讲上一条回复。也可以点名让它改文字。比如只有报名试用的人开通了，给客户的公告就写“目前只对报名试用的用户开放”。

#### [research](plugins/peterflow-zh/skills/daily-work/research/SKILL.md) · 把一件事查准

比如要把笔记从 Notion 搬到 Obsidian，可以请它分别查两边对链接和附件的说明。它会给出官方文档等一手出处，说明哪些行为有据可查，哪些还得拿自己的笔记试一下。

#### [learn](plugins/peterflow-zh/skills/daily-work/learn/SKILL.md) · 从你会的地方开始学

告诉它你会什么、想学会什么。它一次教一小节，根据你的练习和提问安排下一课。想一次拿到整套课件，也可以先一起定好学习路线。

### agent-collab

#### [quickstart](plugins/peterflow-zh/skills/agent-collab/quickstart/SKILL.md) · 找回一个功能的进度

在当前会话里点名要同步的功能。Agent 会把这个功能的接手页（`quickstart.md`）和原任务、最近的结果对一遍，告诉你下一步从哪里继续，或还在等什么。接手页过时了就更新。你也可以只让它更新这页。

#### [ask-peter](plugins/peterflow-zh/skills/agent-collab/ask-peter/SKILL.md) · 帮你选 Skill

拿不准用哪个时，说说你想做什么、手头已经有什么。它会推荐下一步，解释为什么适合，再给你一句能直接发给 Agent 的请求。

#### [context-handoff](plugins/peterflow-zh/skills/agent-collab/context-handoff/SKILL.md) · 换个会话接着做

点名调用它，当前 Agent 会把定下的方案、选择的理由、资料位置和没做完的事交给新会话。新会话先确认收到，等你告诉它从哪里开始。工具无法新建会话时，它会给你一份可以自己粘过去的交接说明。

主 Agent 给子 Agent 派工时，也可以用它整理这一步需要知道的事。

#### [writing-for-agents](plugins/peterflow-zh/skills/agent-collab/writing-for-agents/SKILL.md) · 写给以后接手的 Agent

团队已经有文档兼容性说明，就在 `AGENTS.md` 里写“改文档格式前，先读兼容性说明”，并链接到原文。用它写项目指引、`CLAUDE.md` 或 Skill 时，写清什么时候该看哪份资料、做到哪一步算完成。

---

欢迎用一个实际案例改进 Skill，比如“一条会触发错误行为的请求，以及你希望看到的结果”。中英文实现分别在 `plugins/peterflow-zh/skills/` 和 `plugins/peterflow-en/skills/`。改动后运行 `npm test` 可检查安装包、终端向导和随包脚本。[MIT 许可](LICENSE) · [上游来源与致谢](THIRD_PARTY_NOTICES.md)

推送到 `main` 后，GitHub Actions 先运行测试，再使用原仓库的 `CLAWHUB_TOKEN` 更新同一 ClawHub 插件的语言标签。英文版使用 `en` 和默认标签 `latest`，中文版使用 `zh`。工作流按文件内容判断变更，并逐项比对发布文件的 SHA-256。英文单项从原仓库发现。中文文件由同一仓库的 Pages 工作流发布，保留原名、许可证和配套文件。[选择语言安装](https://songzhuozhu.github.io/PeterFlow/)
