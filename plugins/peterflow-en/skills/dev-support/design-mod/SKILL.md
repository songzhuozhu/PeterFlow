---
name: design-mod
description: Design module interfaces, choose seams and improve testability. Use real callers to assess depth and compare interface costs.
---

# Design a module around its callers

Start with one real call. List what its author must know to get a correct result. Good interfaces let callers do useful work with little knowledge and let maintainers change one rule in one place.

| Term | Meaning |
| --- | --- |
| Module | A unit of behavior with an interface and an implementation. A function, class, package or vertical feature can qualify. |
| Interface | Everything a caller must know, including parameters, sequencing, constraints, errors, configuration and performance characteristics. |
| Implementation | What the module does behind its interface. |
| Depth | Useful behavior and test coverage obtained per unit of interface knowledge. Line count measures something else. |
| Seam | A place where behavior can change without editing its consumer. |
| Adapter | A concrete implementation of the interface at a seam. |
| Leverage | Work that one implementation does for multiple callers or tests. |
| Locality | How closely the knowledge, change, defect and verification for one rule live together. |

Use the project's domain language for business behavior. Apply the **deletion test**: mentally inline or delete a layer. If only forwarding disappears, simplify. If several callers now have to reproduce ordering, recovery or pricing logic, the layer hides valuable knowledge.

Call the same external interface from a behavior test and a production consumer. If tests must reach through it to manipulate internals, reconsider the seam. A real production transport and a necessary test double can justify an adapter. With one implementation and no replacement need, a concrete function may be enough.

Look for operations the consumer always calls in a fixed order or values the module could determine for itself. Show the same call before and after the proposed change. For a pure discount calculation, a cart and returned amount may be the whole interface. A payment authorization may need a controllable gateway response at a seam.

Read [deepening by dependency type](DEEPENING.md) when combining shallow modules or planning behavior tests; use [design it twice](DESIGN-IT-TWICE.md) when the user wants competing interfaces for a selected problem. Return the trade-off and concrete call example within the requested design scope.
