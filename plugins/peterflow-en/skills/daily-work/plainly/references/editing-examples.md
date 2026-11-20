# Editing English without changing the claim

| When you see | Before | A useful edit |
| --- | --- | --- |
| A long chain of nouns | “Completion of the account access restoration process requires manager approval.” | “A manager must approve restoring access to the account.” |
| An announcement before the news | “We're excited to share a meaningful enhancement to the export experience: you can now download CSV files.” | “You can now download CSV files.” |
| A passive that hides a known actor | “The release was delayed. The release team made the decision on Tuesday.” | “The release team decided on Tuesday to delay the release.” |
| A useful passive | “Three records were deleted overnight. The audit log does not identify who deleted them.” | Keep the unknown actor unknown. |
| Two hedges for one uncertainty | “The cache could potentially reduce reads. We haven't measured it.” | “The cache could reduce reads. We haven't measured it.” |
| An imprecise performance claim | “The pilot was twice as fast: median export time fell from 8 s to 4 s on 20 files.” | “In the 20-file pilot, median export time fell from 8 s to 4 s.” |
| A polite request | “Would you mind sending the draft by Friday? I need it for Monday's review.” | A warmer edit can keep “Could you send the draft by Friday?” Preserve why and when. |
| A technical guarantee | “The client retries once on a timeout.” | Keep “once” and “on a timeout.” “It retries failed requests” changes both conditions. |
| Familiar informal language | “Well, that was my Friday. The fix took five minutes.” | Keep it in a teammate's note when the author wants that wry tone. |

**Restating an answer.** Previous answer: “The rollback restored the binary, but the database schema still reflects the migration.” A reader who asks for plain English can hear: “We're running the old program again. The database still has the new layout.” Whether anything breaks needs separate evidence.

**Editing a release note.** If only the local path has been checked, “Export now keeps your selection order in the local CLI” retains the tested interface. “All exports keep their order” invents coverage. Keep literal flags like `--format csv` when they matter to the reader.
