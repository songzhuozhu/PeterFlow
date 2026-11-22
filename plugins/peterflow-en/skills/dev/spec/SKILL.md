---
name: spec
description: Turn a feature idea or draft into testable requirements. Let the user describe it over several turns, with optional references. When they explicitly invite questions, probe the details and record agreed rules and scenarios in the same spec.
---

# Specify a feature

Start with the problem the user wants to solve. Update an existing spec in place, preserving its terminology and IDs. When a separate spec is useful, follow the project's location convention. PeterFlow defaults to `.peterflow/specs/<topic>/spec.md`. A discussion or small request can stay in chat or in an existing short plan.

## Let the user describe the feature

The user can start with a single idea or bring references. Read the parts that relate to what they are describing and distinguish existing commitments from the change they want. Their description alone is enough to begin.

Let the user tell the story in their own order over as many turns as they need. When useful, briefly reflect a new goal, scenario or correction so they can build on it. Add clear requirements to the same working draft and mark ambiguities as open. Give the user room to continue without interviewing them or asking after every turn whether they are ready. **Switch when the user explicitly invites questions**, for example “You can ask questions now” or “Ask me about the details I've missed.” That invitation can come in the first message. A detailed description or a pause alone does not signal it.

## Probe the details when invited

Revisit the whole conversation, including corrections and any references. Carry forward answers the user already gave. For facts about current behavior, check the relevant project docs, code or tests when available. Ask about choices that would change scope, business rules or acceptance.

- Give two plausible results for the same input. A filter matches 73 records and the page shows 20. Which records should “export current results” include? If an adopted product rule settles this, cite it. If the rule is open, explain what exporting 20 or 73 would mean for the user. Give a recommendation and its basis when the evidence supports one.
- Start with choices that determine which later questions apply. Ask independent questions together, wait for the answers, then follow the chosen branch. If the available information settles the behavior, say what is already clear.
- As each decision lands, update the affected rule, term and acceptance scenario in the same spec and retire the corresponding open item. If the spec lives in chat, update that draft in place. A decision to export all matches becomes “Given 73 matching records, exporting from page two produces a file containing all 73 matches.” Record remaining decisions against the outcomes they affect. Keep recommendations and assumptions labeled as such.
- When a term carries multiple meanings, use an example that distinguishes them and agree on the term and its scope. Define feature-specific terms in the spec. Cite canonical entries in the project's glossary or decision records. When maintaining those records is in scope, write shared definitions or consequential trade-offs back to their established home.

## Make the spec testable

State the goal and scope. Order scenarios by the outcomes users need first and describe the rules that govern each one. For each key requirement, give a starting condition, an action and an observable result that distinguishes a pass from a failure. Include exceptions that change the result. Use any agreed success measures. If the goal is only “faster,” ask what would count as fast enough during the invited interview. Leave the threshold open if the user asks for a draft directly. Carry forward explicit technical constraints and leave implementation choices to planning.

When the user asks for a draft directly or the invited interview is complete, walk the same inputs through the spec. If reasonable readers could still predict different outcomes, mark the decision open with its impact. For a new document, adapt the [feature spec template](assets/spec.md). Identify what is ready for `plan` and what still depends on a user decision.
