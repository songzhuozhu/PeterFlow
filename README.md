<img src="plugins/peterflow-en/assets/icon.png" width="60" height="60" alt="PeterFlow">

# PeterFlow · Workflow skills for coding agents

**English** · [简体中文](README.zh-CN.md) · [Design principles](#design-principles) · [Install](#install) · [Find a skill](#the-22-skills)

I've spent nearly a year vibe coding and trying open-source development workflows. For spec-driven development, I drew on [Spec Kit](https://github.com/github/spec-kit) and [OpenSpec](https://github.com/Fission-AI/OpenSpec) to go from a requirement to a set of tasks. [GSD Core](https://github.com/open-gsd/gsd-core) influenced how I check a phase before moving on. [Compound Engineering](https://github.com/EveryInc/compound-engineering-plugin) showed me how to put a lesson from code review to use on the next change. Several of the engineering and teaching skills here are adaptations of [Matt Pocock's skills](https://github.com/mattpocock/skills).

Thank you to the authors and contributors who shared how they work. I took the practices that worked for me, added what I'd learned along the way, and put them together as PeterFlow. You can install these skills in the agent you already use, including Codex, Claude Code, Cursor, GitHub Copilot, Gemini CLI, OpenCode, Trae, Trae CN, Kimi Code and Qwen Code.

**Why two languages?** I'd like you to open a `SKILL.md` in whichever language you read most comfortably, see what it asks the agent to do, and adapt it to the way you or your team work. If your team already has a code review checklist, for example, you can put its path in `code-review` so the agent knows which rules to consult. [Read the English skill](plugins/peterflow-en/skills/dev-support/code-review/SKILL.md) · [Compare the Chinese version](plugins/peterflow-zh/skills/dev-support/code-review/SKILL.md)

## Design principles

### Match the workflow to the task’s complexity

If you have an idea or people expect different results from the same action, use `spec` to settle the requirements and acceptance scenarios. Start with `plan` when the expected behavior is already clear.

Choose a workflow based on the scope of the change and how hard it will be to verify. For a small fix, a short workflow saves the time and tokens it takes to split up the work and write handoffs. As a feature grows, a missed case can cost more to fix later. That makes it worth building and checking the feature in phases. When tasks have several dependencies, use `analyze` after the breakdown to check for gaps. When a change spans entry points or phases, use `converge` after implementation to compare test results with the acceptance criteria. Choose either check independently.

- **Small tasks** (`plan` → `implement`). When the scope is narrow and the acceptance criteria are clear, agree on the approach in a few lines of chat. Make the change and verify it through the entry point people use.
- **Medium tasks** (`plan` → `tasks` → `analyze` (optional) → `implement` → `converge` (optional)). A small or medium feature within one module can have several behaviors to implement and verify. Settle the design, then break it into tasks. Record what each task delivers and how to check it, and work through the list.
- **Large tasks** (`plan` → `tasks-pro` → `analyze` (optional) → `implement-pro` → `converge` (optional)). `tasks-pro` breaks the plan into phases that can be verified independently and records which phases depend on others. The lead agent uses `implement-pro` to assign implementation, review and testing to separate subagents. Each subagent starts with a fresh context. The lead draws on the current plan and verified results from earlier phases to give it only the goal, relevant materials, permitted changes and acceptance criteria for its assignment.

### Keep standards current

Choose the `maintain-standards` action that fits the change. [Skill reference](plugins/peterflow-en/skills/dev-support/maintain-standards/SKILL.md)

1. **`init` sets up the standards library.** If one already exists, keep its layout and fill any gaps in the index.
2. **`draft` proposes a change.** The agent checks the review finding against the current rule and records the suggested wording, scope and rationale.
3. **`apply` puts a decision into effect.** People decide what to adopt, where it applies and what exceptions to allow. The agent updates the rule and its references. Then `plan` uses it to set acceptance criteria, `implement` to make and verify the change, and `code-review` to check the result.
4. **`check` runs a read-only review.** It compares the rules with each other and with the code, flagging conflicts, outdated guidance and code that breaks a current rule.

The default layout for a new workspace is shown below. Topic and feature filenames are examples. Add those files when there are rules to record.

```text
.peterflow/standards/
├── README.md             # L3 main index · change types and the rules they need
├── general.md            # L0 team rules for design, implementation and review
├── api.md                # L1 APIs · request parameters, response fields and compatibility
├── database.md           # L1 databases · schemas, indexes and migrations
├── errors.md             # L1 errors · codes, propagation and retry conditions
├── testing.md            # L1 testing · regression cases, assertions and acceptance evidence
├── features/
│   ├── README.md         # L3 feature index · affected features and their rules
│   └── document-open.md  # L2 feature rule · opening documents and checking that behavior
├── evidence/
│   └── README.md         # L3 evidence guide · versions checked and what the evidence establishes
├── sources.md            # L3 rule history · why a rule was adopted and what it replaced
├── candidates/
│   └── document-open.md  # L2 proposal · suggested change and supporting evidence
└── backup/               # L3 archive for tracing earlier decisions
```

**Who maintains each level**

- **People maintain L0 and L1.** L0 covers team rules and L1 covers engineering topics. The owner decides the wording, scope and exceptions.
- **People and agents share L2.** For feature rules and proposals, the agent checks the evidence and drafts a change. The owner decides whether to adopt or amend it. The agent writes the adopted wording into the current rules.
- **Agents maintain L3.** Within its authorized scope, the agent updates indexes, checks evidence versions, records sources and archives superseded text.

**How agents find the right rules**

- **Choose a topic from the main index.** Read the applicable sections of the team rules, then follow the topic link for the change. For a database index change, consult `database.md`.
- **Follow the change to the affected feature.** If it also changes how users open documents, follow `features/README.md` to `document-open.md`. For shared code, trace its callers to identify the affected features.
- **Look up supporting material as needed.** Consult evidence and sources to check a fact, proposals when considering a change, and archives when tracing a past decision.

After a session, use `retro` to revisit corrections, commands and results and check whether the same problem could still occur. If an improvement is worth keeping as a team rule, use `maintain-standards draft` to propose it. [Session retrospectives](plugins/peterflow-en/skills/dev-support/retro/SKILL.md)

### Efficient context management

#### Resume a feature with `quickstart`

- Name the feature in the current chat. The agent checks `quickstart.md` against the original task and recent results, updating it only if stale.
- The handoff page shows the agreed decisions, what was verified and the next file or command on one screen. Links lead back to the evidence. [Sync feature progress](plugins/peterflow-en/skills/agent-collab/quickstart/SKILL.md)

#### Hand off work with `context-handoff`

- **Move to a new chat.** Invoke `context-handoff` to send the agreed plan, source locations and stopping point. The receiver acknowledges the handoff and waits for your instructions. [New chat handoffs](plugins/peterflow-en/skills/agent-collab/context-handoff/references/new-chat.md)
- **Split the work.** On the original task list, `tasks-pro` records each phase’s inputs, deliverables, permitted edits and acceptance criteria, with pointers to source material and earlier outputs. [Define phases](plugins/peterflow-en/skills/dev/tasks-pro/SKILL.md)
- **Brief each role.** When delegating with `implement-pro`, the lead can use `context-handoff` to give implementers the goal and files they may edit, reviewers a fixed diff and its requirements and standards, and testers the version to test and its acceptance criteria. [Brief a subagent](plugins/peterflow-en/skills/agent-collab/context-handoff/references/subagent.md)
- **Resume after an interruption.** The lead records each role’s evidence on the original task. If the review still applies and only testing remains, resume there. [Roles and handoffs](plugins/peterflow-en/skills/dev/implement-pro/references/roles.md)

#### Choose review inputs with `code-review`

- **Pin the version.** For a branch, fix the base and target commits. For uncommitted changes, check staged, unstaged and new files in scope. If only the current files are available, review that version.
- **Check standards.** Follow the project index to the rules that apply to the change.
- **Check requirements.** Use the acceptance criteria to trace the change to an affected caller or user entry point. Run a focused check if needed.
- **Report the findings.** If two reviewers split the work, each reads the same version in a separate context. Report standards and behavior separately and identify what was actually tested. [Code review](plugins/peterflow-en/skills/dev-support/code-review/SKILL.md)

## Install

### Install one skill with the skills CLI

Select a skill by its original name from the English source directory. Replace `code-review` with the skill you want. [22 English skills](plugins/peterflow-en/README.md)

```sh
npx skills add songzhuozhu/PeterFlow --skill code-review
```

### Ask your agent to install PeterFlow

Open your usual coding agent in the target project and send it this request.

> Install all the English PeterFlow skills from https://github.com/songzhuozhu/PeterFlow in this project for the agent I’m using. Once installed, show me how to call ask-peter.

For use across projects, change “in this project” to “globally for my user account.” If you only want certain skills, name them, for example, “Install only code-review.”

### Install with npx

You need Node.js 22+. Run the command below to start the wizard. npm 12 restricts Git installs by default. The `--allow-git=root` option allows the specified Git source for this command.

```sh
npx --allow-git=root https://github.com/songzhuozhu/PeterFlow
```

Choose a language and skills, then type to filter the agent list. For standalone skills, choose the scope you want.

- **This project only** — run the command from the project root and select **Project · this project**.
- **All your projects** — run the command from any directory and select **Global · current user**.

If you have a local checkout, run `npx "/absolute/path/to/PeterFlow"`.

Run `npx --allow-git=root https://github.com/songzhuozhu/PeterFlow --list-agents` to see every agent ID and where it installs on your machine. A dash in the global column means PeterFlow offers project installs only for that target.

### Try an installed skill

Start a fresh chat in the target project. If you installed `ask-peter`, select it in the host’s skill picker or, in agents that accept skills by name, ask “Use ask-peter to help me choose a skill for reviewing code.” Codex and Claude Code also support the invocation names below.

| How you installed it | Codex | Claude Code |
| --- | --- | --- |
| Individual skills or a group | `$ask-peter` | `/ask-peter` |
| English native plugin | `$peterflow-en:ask-peter` | `/peterflow-en:ask-peter` |

<details>
<summary>Install paths, language editions and native plugin commands</summary>

Codex, Cursor, GitHub Copilot, Gemini CLI and OpenCode can share one project installation in `.agents/skills/`. Claude Code uses `.claude/skills/`, and Trae and Trae CN share `.trae/skills/`. Global directories vary by agent. See the paths for your machine with `--list-agents` or specify a custom directory with `--dir`. If a selected skill folder already exists, the installer reports the conflict before copying anything. Each skill carries its own references, templates, helpers and license as needed.

Use `--lang zh-CN` for Simplified Chinese. Its plugin is `peterflow-zh` and its writing skill is `shuorenhua`. The other 20 skill names match across editions. Pick one language per standalone skills directory.

To skip the wizard, pass the agent ID and the skills you want. Run the first command from the project root to install code review for Cursor. Run the second from any directory to install the everyday skills for Trae CN across your projects.

```sh
npx --allow-git=root https://github.com/songzhuozhu/PeterFlow --lang en --agent cursor code-review
npx --allow-git=root https://github.com/songzhuozhu/PeterFlow --lang en --agent trae-cn --global --group daily-work
```

Use `--all` for all 22 skills in that language, or repeat `--group` to combine groups. Codex and Claude Code also offer native plugin installs with `--lang en --agent codex --plugin` and `--lang en --agent claude --plugin`, respectively.

To install the English edition with your host’s plugin manager, run the corresponding pair of commands from the checkout.

```sh
# Codex
codex plugin marketplace add .
codex plugin add peterflow-en@peterflow

# Claude Code
claude plugin marketplace add .
claude plugin install peterflow-en@peterflow
```

Keep a checkout registered as a local marketplace at the same path. When installing a native plugin from an npm package, the wizard keeps the marketplace under `~/.peterflow/marketplace/`.

In local macOS tests of the initial release, Codex CLI 0.166.0 and Claude Code 2.1.328 each discovered all 21 skills in each edition installed from the npm tarball.

</details>

### Use PeterFlow in an existing project

Keep your current plan, task list and verification records. The default location for new feature material is `.peterflow/specs/<topic>/`. Use the project’s existing entry point for shared standards. In a new workspace, the default is `.peterflow/standards/`. Create a directory when you have something to put in it.

Multi-agent work requires a host that can provide separate execution contexts. The bundled dependency, review and recovery helpers use Python 3.9+ and its standard library. The recovery journal requires a filesystem that supports private file permissions.

## The 22 skills

[Development workflow (8)](#dev) · [Engineering support (7)](#dev-support) · [Everyday work (3)](#daily-work) · [Working with agents (4)](#agent-collab)

### dev

#### [spec](plugins/peterflow-en/skills/dev/spec/SKILL.md) · Turn an idea into testable requirements

Start with “Keep the draft if sending fails,” then describe what you want over several turns. Bring references if you have them. Once you invite questions, the agent follows up on anything your description and references left open, such as “Should the text still be there after the user closes the page and comes back?” Each agreed answer goes into the same spec.

#### [plan](plugins/peterflow-en/skills/dev/plan/SKILL.md) · Decide what to change and how to check it

“I want to close the editor, come back later and keep writing.” That’s enough to start a plan. The agent looks at where the editor keeps drafts today, identifies what to change and how to test it, and flags decisions for you, such as when to clear a draft. For a small change, a few lines in chat can cover the plan.

#### [tasks](plugins/peterflow-en/skills/dev/tasks/SKILL.md) · Break a plan into steps

When an agreed plan needs several stages of work, turn it into one task list. Each task says what to deliver, what needs to happen first and how to check the result.

#### [implement](plugins/peterflow-en/skills/dev/implement/SKILL.md) · Carry out the plan

Start with a short plan in chat or an existing task list. The agent picks up work that’s ready, makes the change, tries it the way a user would and records the changes and results on the original plan or task.

#### [tasks-pro](plugins/peterflow-en/skills/dev/tasks-pro/SKILL.md) · Split a large change across agents

An agent picking up a phase should be able to start without reading the whole conversation. For each phase, the task list says what to read, which earlier work it needs and which files it can change. It also says how to check the result and what to leave for the next agent. The final phase spells out how to test the pieces together.

#### [implement-pro](plugins/peterflow-en/skills/dev/implement-pro/SKILL.md) · Have separate agents build, review and test

The lead agent picks a phase that’s ready. One agent writes the code, another reviews the change without editing it, and a separate agent runs the tests. The lead decides which findings need a fix and records the changes and results for each phase on the original list.

For example, to verify a document format upgrade, open an old document with comments in the new editor and check that both the text and the comments still appear.

#### [analyze](plugins/peterflow-en/skills/dev/analyze/SKILL.md) · Check for gaps after task breakdown, before implementation (optional)

After `tasks` or `tasks-pro`, use `analyze` if the requirements have several branches or tasks depend on one another. Compare the plan with the task list before starting `implement` or `implement-pro`. For a small change with clear acceptance criteria, go straight to implementation.

Suppose the plan says “clear the draft after sending.” You click Send, it fails, and you close the page. What should you see when you come back? The agent follows that case through the requirements, plan and any existing tasks. It points to conflicting instructions, missing steps or a decision you still need to make. For a small change with just a plan, use it before implementation if a scenario is unclear. If the tasks change, revisit the affected parts.

#### [converge](plugins/peterflow-en/skills/dev/converge/SKILL.md) · Check remaining work after implementation, before closing a phase or feature (optional)

After `implement` or `implement-pro`, use `converge` before closing a phase or feature if the change spans several entry points or phases. Check which goals have evidence and which still need work. For a small change already verified through the user entry point, you can finish directly.

You’ve tested that a draft returns after you accidentally close the page. You still need a separate check that a sent draft stays gone. The agent compares each goal with the current code and actual test results, marks it complete, incomplete, unverified or blocked, and puts any follow-up on the task under its original ID.

### dev-support

#### [feature-retcon](plugins/peterflow-en/skills/dev-support/feature-retcon/SKILL.md) · Follow a changed decision through the project

Suppose the editor used to clear a draft as soon as someone clicked Send. Now you want it to wait for the server to confirm success. The old rule may still be in the requirements, design, task list, code and tests.

You can ask just for a list of what this affects. Once you agree on the scope of the change, the agent updates and checks each affected piece and keeps a record of the file changes. You can resume later or explicitly ask it to restore the files.

#### [code-review](plugins/peterflow-en/skills/dev-support/code-review/SKILL.md) · Check a code change

A review is read-only by default. It gives one conclusion on whether the code follows the project’s rules and another on whether users get the required behavior. For each problem, it points to the code, explains what triggers it and describes the impact.

#### [design-mod](plugins/peterflow-en/skills/dev-support/design-mod/SKILL.md) · Decide what belongs inside a module

Suppose Save and Autosave both build draft filenames. Changing the naming rule means editing both places. The agent compares those two calls with a version where the save module chooses the name. You can see what each caller needs to know and how you’d test the interface.

#### [review-arch](plugins/peterflow-en/skills/dev-support/review-arch/SKILL.md) · Find places worth refactoring

Use this when you want to refactor but haven’t decided where to start. The agent traces an actual operation through the code and looks for places where a different structure would help. An HTML report shows the current and proposed designs side by side. Pick one to work through in detail.

#### [debug-expert](plugins/peterflow-en/skills/dev-support/debug-expert/SKILL.md) · Find the cause of a failure

Dragging a file into the editor works, but clicking it in Recent Files gives “file not found.” The agent reproduces the failure, traces where the two paths first differ and runs experiments to distinguish between plausible causes. You can ask for just the diagnosis. If you ask for a fix, it tests the fix by clicking the file in Recent Files again.

#### [retro](plugins/peterflow-en/skills/dev-support/retro/SKILL.md) · Learn from a development session

Why did the first test miss Recent Files? The agent reviews your corrections from that session, the commands that ran and their output, then checks whether the same problem could still slip through today. If so, it suggests a specific change and a way to check that it catches the problem next time.

#### [maintain-standards](plugins/peterflow-en/skills/dev-support/maintain-standards/SKILL.md) · Maintain the project’s rules

Use `init` to set up standards or connect to the ones you have. A review finding can become a proposed rule with `draft`, which records where the suggestion came from. Once the team adopts it, `apply` updates the rules. Run `check` for a read-only look at conflicting rules, outdated guidance and code that breaks a rule.

### daily-work

These three skills work in an ordinary folder, whether or not you write code.

#### [plainly](plugins/peterflow-en/skills/daily-work/plainly/SKILL.md) · Say it in plain English

Send “Plain English, please” on its own to hear the last answer in simpler terms. You can also name the skill to rewrite a passage for its reader. If only people who signed up for a trial have access, the customer announcement can say, “For now, this feature is open only to people who signed up for the trial.”

#### [research](plugins/peterflow-en/skills/daily-work/research/SKILL.md) · Check what the sources say

Say you’re moving notes from Notion to Obsidian and want to keep the links and attachments. The agent checks what each tool documents, cites the primary sources and identifies anything you still need to try with your own notes.

#### [learn](plugins/peterflow-en/skills/daily-work/learn/SKILL.md) · Learn a little at a time

Start with what you know and what you want to do. The agent teaches one short lesson at a time and uses your questions and exercises to plan the next one. You can also agree on an outline together and have it prepare the whole course at once.

### agent-collab

#### [quickstart](plugins/peterflow-en/skills/agent-collab/quickstart/SKILL.md) · Pick up a feature where you left off

Name the feature you want to catch up on in the current chat. The agent checks its handoff page (`quickstart.md`) against the original tasks and recent results, then tells you where to resume or what you’re waiting for. It updates the page if it’s stale. You can also ask just for a page update.

#### [ask-peter](plugins/peterflow-en/skills/agent-collab/ask-peter/SKILL.md) · Choose a skill

If you’re unsure where to start, say what you want to do and what you already have. The agent recommends a next step, explains why it fits and gives you a request you can paste.

#### [context-handoff](plugins/peterflow-en/skills/agent-collab/context-handoff/SKILL.md) · Move work to a fresh chat

Invoke this skill when you want to switch chats. It sends the new chat the agreed plan, why you chose it, where the relevant files are and what’s unfinished. The new chat acknowledges the handoff and waits for you to tell it where to start. If your host can’t create a chat, it gives you a handoff note to paste yourself.

A lead agent can also use it to brief a subagent on just the part it’s being assigned.

#### [writing-for-agents](plugins/peterflow-en/skills/agent-collab/writing-for-agents/SKILL.md) · Write instructions the next agent can follow

If your team already has a document compatibility guide, add a line to `AGENTS.md` saying “Before changing the document format, read the compatibility guide,” and link to it. Use the same approach in `CLAUDE.md` and skills to spell out when to consult a source and how the agent can tell it’s finished.

---

To contribute a skill improvement, include a request that shows the behavior you want to change and what a good result looks like. Edit the corresponding files under `plugins/peterflow-en/skills/` and `plugins/peterflow-zh/skills/`, then run `npm test` to check the package, terminal installer and helpers. [MIT license](LICENSE) · [Upstream credits](THIRD_PARTY_NOTICES.md)

On a push to `main`, GitHub Actions runs the tests and publishes the changed language tags on the same ClawHub plugin using the repository’s `CLAWHUB_TOKEN`. English uses `en` and the default `latest` tag. Chinese uses `zh`. The workflow compares file hashes before releasing and verifies the SHA-256 of every published file. The English skills are discoverable from the repository. Its Pages workflow builds the Chinese source from the same commit’s skill files, including their licenses and resources. [Choose an installation language](https://songzhuozhu.github.io/PeterFlow/)
