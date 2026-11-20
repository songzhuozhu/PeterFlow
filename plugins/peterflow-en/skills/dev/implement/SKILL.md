---
name: implement
description: Implement and verify a bounded change from an existing plan or ready tasks. Use for small and medium changes, including short plans kept in chat.
---

# Implement and verify

Locate the goal, agreed acceptance and working directory. Read applicable project instructions, current callers and tests. Inspect the worktree and index. Preserve prior work even in a repository without a first commit. Git staging, publishing and commits require their own task scope.

Follow the project's standards entry point to the current clauses cited by the plan (default `.peterflow/standards/`). If the plan omitted a relevant rule or the change reaches another caller, use the main index (L3) to find applicable team rules (L0), topic rules (L1) and adopted rules for the affected feature (L2). Implement their conditions and exceptions and check the corresponding behavior at its user entry point. Pending proposals and archived text are background. If there is no library, continue from the agreed plan.

## Choose the next change

For a small edit, use the short plan. For a task list, honor both phase and task dependencies and confirm that the promised inputs exist. Continue legacy flat lists in place. Check completed items against the code and its evidence. Resolve a circular prose dependency by identifying which task delivers the artifact and which task consumes it for acceptance. A plan that explicitly calls for independent phases needs that execution capability.

Trace the user entry point and reuse existing behavior. Choose the smallest change that covers acceptance and preserves existing callers. Use [the change comparison](references/minimal-change.md) before adding an abstraction, dependency, setting, fallback, documentation or test infrastructure. Respect requested refactors, tests and documentation. When the user narrows scope, adjust the diff. When asked to stop, stop writing and report the state.

## Verify the actual behavior

Follow the project's test convention. For a defect, reproduce the original symptom or obtain an assertion that distinguishes it. For a CLI, run the real CLI and inspect exit status and output. Derive the expected result from a requirement or known example. Check that the target assertion ran. A text change may just need direct inspection.

When fixing a project's routine check, run its normal command against the valid implementation and an isolated copy reproducing the original fault. The original assertion must fail and the command must return failure in that copy.

For reusable evidence, record the working directory, input, expected and actual result, exit status and limitations. Identify the actual code, tests, contract and relevant configuration at execution time with a matching CI run, a snapshot or file digests (e.g. `shasum -a 256` before and after a run). Keep the relevant criteria separate from a task file that will receive progress updates. Rerun only checks affected by changed inputs. Historical results retain their original scope.

## Finish in the original plan

Check every change in your diff against the requirement. Remove only incidental changes you introduced and verify what remains. Record a small change in the original plan or chat. For larger work, update tasks and phases only after their own acceptance holds. Link longer evidence under `verification/` if needed. Append gaps to their original tasks. Explain conflicting decisions before changing user-visible behavior.

Report completed, incomplete, unverified and blocked work, the change entry point, actual tests and Git state. Create design, reference, delivery and contract directories with their first real artifact. Continue with the existing plan and its authorized scope.
