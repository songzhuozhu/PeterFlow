# Deepen around an actual dependency

Map the callers, their shared behavior and the public interface to keep. Identify what knowledge moves into the module.

| Dependency | Verification and seam |
| --- | --- |
| In-process logic or memory | Group related behavior and test through the public interface. A pure calculation can remain a function. |
| A dependency with a local substitute | Use a local database implementation or an in-memory filesystem through the module. State which semantics the substitute covers. The substitution point can stay private. |
| A remote service owned by the team | Define the port at the real transport seam. Put business decisions in the module, with HTTP, RPC or queue adapters for production and an in-memory adapter for tests. |
| An external service outside your control | Inject the behavior actually needed, such as a payment decision. Use meaningful success, rejection and timeout outcomes to test the consumer. |

Identify the production use and actual testing need before adding an adapter. List observable behavior and errors covered by old tests. Exercise them through the new interface before removing tests that only assert obsolete forwarding. A change in implementation order with identical public behavior should leave behavior tests useful.
