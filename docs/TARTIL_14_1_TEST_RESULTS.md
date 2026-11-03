# TARTIL 14.1 - Test results (audit run, 2026-11-03)

| Check | Command | Result |
|---|---|---|
| Screenshots P07 program / lesson S1-L1 / scenario S1-S1, learner and guide mode, 375/390/768/1440 full page | Playwright script (scratchpad shoot.mjs, static server + mocked /api) | 24 PNG captured, 0 JS page errors, 0 horizontal overflow, 0 HTML entities in rendered text |
| Completeness gate (data) | `python3 -I scripts/validate_completeness.py` | **FAIL (exit 1), 33 findings**: life_practice_no_parent_note 31 (lessons for minors), internal_marker 1 (P07 guide_notes "(D12)"), week_count_mismatch 1 (guide P24: 9 weeks vs 8). WARN (not failing): lesson_no_vocabulary 51, parent_note missing in 25 adult-unit lessons. Passing categories: dangling refs, unanswered FAQ (0 of 143 items), empty guide/parent sections, activities without content (0 of 716), scenario dead ends/unreachable nodes/missing feedback, assessments (formative, stage check, mission), entities, placeholders. |
| Completeness gate (rendered) | `node scripts/validate_completeness_rendered.mjs` (24 programs, 255 lessons every step, 136 scenarios; learner and guide mode; 375px; all `<details>` expanded) | **FAIL (exit 1), 2 findings**, both the same "(D12)" on program P07 (one per mode). No entities, no "undefined/NaN/[object", no empty details/lists/headings, no overflow, no raw ids, no JS errors. Duration about 76 s. |
| Published site comparison | curl + WebFetch on tartil-web.vercel.app/academy-*.json | **Blocked** by Vercel Authentication (302 to vercel.com/sso-api). Vercel MCP read-only: production = dpl_ArmVLuK6qXgzhfpktG7uZvxswfqV (sha c1d9b556). Content not read. |
| Existing e2e / npm test | not run (another agent is editing index.html; audit only) | not run |

Gate design notes: reviewer-only fields (source_basis, source_record, grounding, review_*, competency record/anchors/safeguard text) are exempt from the internal-marker check because they are shown only on #/academy/review; worksheet blanks "..........." are intentional and not placeholders; empty prerequisites/next_programs are legitimate. The gate should be wired into the release checklist after the findings above are fixed; until then it correctly fails.

Gaps: the gate checks structure and visible text, not pedagogical or scholarly quality; real accounts and the live bundle were not tested.
