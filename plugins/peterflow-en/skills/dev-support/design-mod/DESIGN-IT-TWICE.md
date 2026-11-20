# Design it twice

Use when a specific interface problem deserves genuinely different designs. Show the constraints, [dependency types](DEEPENING.md) and one real calling example first. Leave room for the shape of the interface to change.

When the host and assignment authorize independent design work, give fresh contexts the same files, real calls, coupling, domain terms and behavior to hide. Otherwise explore the alternatives in the same context and disclose that. Vary the optimization target:

- Minimize the public surface while covering the whole behavior.
- Support different *known* uses and show what flexibility costs each caller.
- Make the most common use easy to get right and identify the exceptional case.
- Where transport dominates, explore ports and adapters at that particular seam.

Each design gives types, operations, parameters, order, errors, hidden knowledge, dependencies and a call for the same scenario. Compare depth, locality, seam placement and test cost. Recommend the design that fits the actual constraint. If combining two ideas, show the resulting interface and call.
