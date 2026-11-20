---
name: code-review
description: Review a commit range, uncommitted changes or current files for both project standards and required behavior. Report findings read-only by default.
---

# Review code against two sources

Fix the input before drawing conclusions. Use the requested scope and project navigation. Ask about a comparison only when alternative baselines change the answer.

- **Commits or branches.** Resolve both references to SHAs. Use `git diff A B` for a comparison of two versions, or `git diff A...B` for changes since the merge base. Record the actual relation and paths. An empty diff is a valid result.
- **Uncommitted work.** Inspect `git status --short --untracked-files=all`, the staged and unstaged diffs separately, and relevant untracked files. For a staged-only review read the index (`git show :path`). For the complete change read the effective working copy.
- **Current files.** A missing HEAD or baseline still permits a current-state review. Identify what you read and avoid attributing an introduction date. When handing off or reusing evidence, freeze applicable file content or digests.

**Standards.** Use the user's or project's current entry point (default `.peterflow/standards/`). Follow the main index (L3) to the applicable team rules (L0) and engineering topics (L1). If product behavior changes, trace actual callers and consult the adopted L2 rule through the feature index. Account for its scope and exceptions. Cite the governing clause, code location, trigger and consequence of each violation. Proposals, archived rules, style preferences and isolated test results do not establish policy.

**Requirements.** Take the observable result from the user's goal, specification or acceptance criteria. Trace from the diff through real callers. Use a discriminating input to identify omissions, regressions, scope expansion and boundary errors. Run a focused check when it can settle the finding. Distinguish static observations from executed checks. An agreed future feature is outside this review.

One reviewer can cover both dimensions. When two reviewers are useful and authorized, give each a separate context with the same frozen code and the sources for their assignment. Both work read-only. Reconcile differences in input version before combining conclusions.

Report each dimension separately, its evidence and coverage gaps. A shared finding can carry both bases. Each confirmed issue has a location, trigger, consequence and correction. When asked to fix it, preserve the finding and rerun the triggering case on the changed input. Identify closed, remaining and new findings. Save a report only when requested.
