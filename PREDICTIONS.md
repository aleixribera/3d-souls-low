# Predictions

Open predictions, one line each: `date | pass | the call | what it should move, and by how much | how to check it`.
The director grades and deletes them at each review.

- 2026-11-20 | review | Backlog cut from 41k to 4k by the new plan | no pass restores a deleted line in the next two weeks | `git log -p --since=2026-11-20 -- BACKLOG.md` shows no line taken back from `88f1abd`
- 2026-11-20 | review | Plan items 1-3 before the tracks | main green and items 1-3 done by the 2026-11-27 review, in 6 passes or fewer | CI on main; `STATE.md`; pass count in the log
- 2026-11-20 | review | Boss rebuilt through the system with video-to-motion (PLAN 5) | the same 5-judge fight panel moves Boss from 2 to 3+ and Feel from 1.5 to 3+ on the Captain | `docs/scorecard/panel/` lineup with a Captain frame from after item 5
