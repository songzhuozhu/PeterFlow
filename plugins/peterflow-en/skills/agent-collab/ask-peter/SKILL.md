---
name: ask-peter
description: Choose the next PeterFlow skill or workflow from the goal, materials already available and current sticking point.
disable-model-invocation: true
---

# Ask Peter

When invoked, give the user one concrete next move and a request they can paste. Start from what they want to deliver, what already exists and where they are stuck. Ask one clarifying question only if the answer changes the route.

Use [the routes](ROUTES.md) to shortlist candidates. Before promising a particular behavior, sequence or shortcut, open the candidate's PeterFlow `SKILL.md` in the package the user specified. For standalone installs, look under `<skills-dir>/<name>/SKILL.md`. In the native plugin, use `skills/<group>/<name>/SKILL.md` from the edition root (`plugins/peterflow-en/` in the source). A similarly named skill from another project can behave differently.

When installed alone, the routes still identify a direction. Say which details remain unverified if you cannot read the candidate. Confirm installation only after seeing the installed copy. Some hosts hide explicit-only skills from automatic discovery.

Name the best next step, why it fits this user's facts and one copyable prompt. Use the installed invocation shown by the host, including the edition namespace for a bundled plugin (for example, `$peterflow-en:converge` in Codex or `/peterflow-en:converge` in Claude Code). Give a longer sequence only when asked for a workflow. If a plain edit suffices, say so. A recommendation grants no authority to start work, create agents or hand off a chat.
