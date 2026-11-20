---
name: debug-expert
description: Diagnose errors, intermittent failures and performance regressions from a reproducible signal. Confirm the mechanism, fix within scope and rerun the original scenario.
---

# Debug from the original symptom

Follow the project's navigation, decisions, glossary and relevant rules. Keep credentials in the environment and present only redacted observations. Use the six steps below and explain any step that the case does not need.

1. **Build a feedback loop.** Reuse a failing test, actual API/CLI/UI path, redacted replay or minimal driver. Run the reported scenario and record entry point, conditions, input, expected and actual error or timing. Fix influential seeds, time, environment and data where appropriate. For intermittent behavior measure failures per attempts; for performance measure the same load and establish a baseline. For manual sign-in use a temporary copy of the [Bash](scripts/hitl-loop.template.sh) or [PowerShell](scripts/hitl-loop.template.ps1) template, with task-specific steps. Ask the operator only for redacted observations. Without a failure signal, trace read-only to obtain it and identify missing evidence.
2. **Minimize the reproduction.** Preserve the original scenario. If one entry point works and another fails on the same input, replay both. Compare inputs, state and results at corresponding calls to find the first difference, then test whether it causes the reported failure. Vary one condition at a time and retain each condition needed to reproduce the symptom, including repeated calls in the same process.
3. **Predict.** For a hard failure rank three to five evidence-backed explanations. Before each experiment state which observation would distinguish one cause from the alternatives.
4. **Discriminate.** Change one variable. Use a breakpoint, scoped temporary marker, profile or bisection where it helps answer the question. Compare the prediction with observation. Explain the trigger, mechanism and competing explanation ruled out. Stop after diagnosis and remove temporary instrumentation if the user requested only a diagnosis.
5. **Fix and rerun.** When authorized, capture the failure through the actual call chain in an existing or nearby regression test. Observe failure for the original reason before fixing it, then success with the same assertion. Confirm injected faults actually affected the isolated copy. Where automation is unavailable, document the repeatable original check. Rerun the full, unminimized user scenario with the same data and sequence. For flakes report both counts; for performance report comparable measurements.
6. **Deliver.** Remove only temporary instrumentation and drivers you added. Report evidence of the cause, smallest sufficient change, regression and original-scenario results, and remaining limits. Keep progress in the original record. Include the cause in a commit or PR only if that action was authorized.
