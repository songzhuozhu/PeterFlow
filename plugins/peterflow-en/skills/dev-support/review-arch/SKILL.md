---
name: review-arch
description: On request, inspect a codebase or subsystem for architectural improvements, produce a before/after HTML report and explore the candidate the user selects.
disable-model-invocation: true
---

# Review a codebase's architecture

Start in the requested subsystem. For an open-ended review, use a short history sample such as `git log -n 30 --oneline --name-only` to select a starting point. In a repository without history, start from an actual entry point and test. Churn helps choose where to read. The recommendation itself needs evidence in the code.

Read the project glossary and relevant architecture decisions. Trace a real call or change. Look for caller-visible steps repeated across files, rules that must change in lockstep and tests that exercise pieces but miss errors in the real path. If an independent exploration is authorized, share the scope, terms and decisions. The same review works in one context.

Use `design-mod` when installed, or apply these tests directly:

- Depth compares behavior obtained with knowledge required at the interface.
- A seam allows behavior to be replaced. An adapter earns its place when at least two real uses need different behavior.
- Mentally delete a layer. Check whether needless forwarding disappears or several callers inherit the same complexity. Identify the leverage for callers and the locality of future changes.

Write a standalone English HTML report in the system temporary directory using a unique `architecture-review-<timestamp>.html` name. Follow [the report guide](HTML-REPORT.md). Each candidate includes real paths and calls, the problem, proposed direction, before/after diagrams, practical benefits and confidence. Identify an affected ADR and the evidence that could justify reopening it. Recommend one candidate first with a reason. When evidence is insufficient, report the actual scope and findings. Open the report if supported and give its path.

Ask which candidate to explore. For the selected one, trace constraints, dependencies, seam placement, hidden behavior and which tests should move to the public interface. Discuss one consequential decision at a time. Reuse optional design or domain-modeling guidance if available. Update a glossary only with confirmed terminology and authorization. Ask whether to record a long-lived reason for rejecting a candidate as an ADR. Compare alternative interfaces on the same real call, including the smallest surface, known variants and the common case. Implementation follows the user's separate scope.
