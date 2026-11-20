---
name: retro
description: Review a specified development session on explicit request. Trace friction to today's workspace and propose verifiable improvements for the next run.
disable-model-invocation: true
---

# Run a retrospective

Read the requested session's primary material, or this session if none was specified. Identify what the user corrected, which commands ran and what happened. Follow the incident back to today's actual entry point. Prioritize improvements that still address the problem. For each give the evidence, smallest change and a way to verify it.

Choose the relevant lines of inquiry:

- **Navigation.** Retrace the search. Was there a hard-to-find entry point or an undocumented dependency? Link existing material from where a reader would actually look.
- **Automated checks.** Read the normal lint, typecheck, test command and CI wiring. Did the check run and propagate failure? Replay the original fault in an isolated copy if needed. Identify which actual failure a proposed check could prevent.
- **Coding standards.** Prefer an existing mechanical check for reliably detectable violations. Use standards for judgments people must make, such as consistency across files. Verify that the rule applied at the time.
- **Always-loaded instructions.** Move infrequent details to on-demand material and mechanical rules to checks. Leave a short pointer to the applicable source. Look only at instructions relevant to the incident.
- **Tool cost.** Compare actual arguments, volume of output and the information used. Name the narrower query, direct path or reusable result.
- **Ineffective instructions.** Ask what behavior removing the sentence would change. Account for requirements already enforced automatically.
- **Missing information.** Identify the exact observation that would have resolved uncertainty and the minimum access needed to obtain it.

Implementation and review both use confirmed project standards. Implementation reads the rules relevant to the change; review checks the actual diff. Navigation belongs in short repository instructions, judgment in standards, occasional procedure in on-demand docs and a repeatable assignment in a skill. Preserve a lesson only when a future contributor could not reconstruct it from current sources.

Report confirmed improvements by impact. For resolved incidents cite today's evidence. Distinguish a suspected cause from one you verified. Default to chat and use the original topic for a requested record. If a lesson is worth keeping as a team rule, cite the review or session and recommend `maintain-standards draft` for an L2 proposal. It becomes a current rule when the owner adopts it. When asked to implement a tooling improvement, fix the existing tool or its operating instructions.
