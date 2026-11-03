# TARTIL 14.1 - Actual page audit: "أضبط غضبي وأصلح" (P07, slug adbut-ghadabi)

Date: 2026-11-03. Auditor: read-only audit agent. Scope: items 1, 10, 11, 13, 16 and 9 (privacy) of the owner's TARTIL 14.1 brief.
Nothing in index.html or the content files was modified. New files: scripts/validate_completeness.py, scripts/validate_completeness_rendered.mjs, this document, docs/TARTIL_14_1_TEST_RESULTS.md.
Method: local static server over packages/web-vercel + Playwright (Chromium), /api mocked as in scripts/e2e_academy.mjs, session token injected. The local index.html was being edited by another agent during the audit (mtime 23:07-23:12); findings are for the files as read at that time.

## 1. Screenshots (full page; learner mode = default, guide mode = localStorage acx_guide=true)

Directory: `/tmp/claude-0/-home-claude/a15fb9d9-e5d4-57e1-b4d4-18cfe5debcdc/scratchpad/shots14/` (all PNG, widths 375 / 390 / 768 / 1440)

| Page | Files |
|---|---|
| Program `#/academy/p/adbut-ghadabi` | learner_program_{375,390,768,1440}.png, guide_program_*.png |
| Lesson `#/academy/l/S1-L1` (ماذا فعلتُ اليوم؟) | learner_lesson_*.png, guide_lesson_*.png |
| Scenario `#/academy/s/S1-S1` (دفتر المساء) | learner_scenario_*.png, guide_scenario_*.png |
| Text dumps at 390 | learner_*_text.txt, guide_*_text.txt; crop_faq_390.png; report.json |

No horizontal overflow at any of the 4 widths, no JS page error, no HTML entity in the rendered text (report.json: overflow 0, entity false for all 24 captures).

### What actually appears, by audience
- **Learner (a 10-12 year old, signed in, no special role):** the program page shows title, tagline, "من 10 إلى 12 سنة", the pill "تقدّمك على هذا الجهاز: 0 من 16", outcomes, four stages with items and a "مهمتك" card each, the capstone, and then, on the same page, "دليل المرشد", "دليل ولي الأمر", "أسئلة شائعة" (6 questions) and "للمرشد وولي الأمر". There is **no role gate**: the adult guide material and the FAQ are rendered to the child by the same code path (acGuideBox, no role test).
- **Guide:** the only difference is the "وضع المرشد" toggle (any user can flip it; it is just localStorage acx_guide). In a lesson it adds about 1,100 characters (guide script, safeguards, activity instructions); on the program page and the scenario nothing changes (identical character counts 3065 / 885).
- **Parent:** has no separate view. "دليل ولي الأمر" is a collapsed block on the same program page, reachable by the child.

## 2. Findings

Status vocabulary: AUDITED (checked, no defect), CONFIRMED (defect reproduced), NOT REPRODUCED (reported but not seen locally), NEEDS OWNER/EDITOR/CODE (action required, not fixed by this audit), FIXED (none; audit-only).

| # | Finding | Status | Evidence | Owner of fix |
|---|---|---|---|---|
| F1 | Owner saw "&#x627;"-style codes in Arabic text | **NOT REPRODUCED locally; root cause not established** | No "&#" / "&amp;" in any academy-*.json, index.html, sw.js, docs/human-formation (grep + validate_completeness). The renderer builds DOM with `el()` -> `document.createTextNode`/textContent (index.html, header comment "Rendered with textContent only"); there is no `esc()` function in index.html and no innerHTML on academy text, so a double-escape cannot originate in the current code. Rendered scan of 24 programs, 255 lessons (every step, learner and guide mode), 136 scenarios: 0 entities. | Code owner, after the published bundle is inspected (see F2) |
| F2 | Published copy could not be compared | **BLOCKED** | https://tartil-web.vercel.app/* answers HTTP 302 to vercel.com/sso-api (Vercel Authentication on). WebFetch gets the same redirect. Vercel MCP read-only calls work: latest production deployment is dpl_ArmVLuK6qXgzhfpktG7uZvxswfqV (git master, sha c1d9b556, "formation: Q1-Q6 ... programs P17-P24"), preceded by 5jDrcSy7 (c14e64eb) and 3yaKh1cD (a6af6524). The repo is wfklawfirm/tartil on GitHub; this workspace is not a git repo, so the commit cannot be diffed. I did NOT use `web_fetch_vercel_url` because it creates a temporary share link on the deployment (a sharing change the owner did not ask for). | Owner: either approve a share link or paste the live `academy-guides.json` |
| F3 | "أسئلة شائعة" with questions and no answers | **CONFIRMED as a rendering/affordance defect; data complete** | All 24 guides have 5-6 FAQ items and every one has a non-empty "a" (0 missing). But `.fold summary{display:flex}` removes the browser's disclosure triangle, and there is no chevron/"+" replacement: the six questions render as plain bordered boxes (see crop_faq_390.png) that look like a list of unanswered questions. Answers are in the DOM (`details>p`) and only appear on tap. Same for "افتح دليل المرشد", "دليل ولي الأمر", "للمرشد وولي الأمر". A published build older than the current data may also have lacked "a"; not verifiable (F2). | Code owner (CSS: add marker/chevron, or open the FAQ by default) |
| F4 | Counter "0 من 16" | **CONFIRMED, behaves as coded** | P07 has 16 items (6+4+2+4 across 4 stages). The count is items whose ref is in localStorage key `acx_done`; an item is added only when the learner presses "أنهيتُ الدرس" / "أنهيتُ السيناريو" on that item. Digits are Latin (`dn+' من '+tot`) while the rest of the app uses Arabic-Indic via `ar()`. It looks like a score/progress bar to a learner on first visit ("0 من 16") although the program promises "لا درجات". | Code/UX owner |
| F5 | "(D12)" internal marker visible in the program page | **CONFIRMED** | P07 `guide_notes`: "هذا برنامج تجريبي مقترح (D12) لأعمار ١٠ فما فوق. يُقرأ ما يكتبه الطفل فقط بإذنه." rendered raw inside "للمرشد وولي الأمر" (index.html: `el('p',{},p.guide_notes)`, not passed through acClean; acClean only strips D11, so D12 slips through). Both rendered scan modes flag it. scripts/e2e_academy.mjs INTERNAL regex also only knows D11, so the existing e2e does not catch it. | Content: docs/human-formation/programs.json (P07 guide_notes); Code: run guide_notes through acClean and widen the pattern to \bD\d+\b |
| F6 | Guide says the child's text is readable "بإذنه" | **CONFIRMED inaccurate** | See section 3. No sharing/reading mechanism exists for the notebook. | Content + owner decision |
| F7 | P24 guide has 9 weeks; program says 8 | CONFIRMED | validate_completeness: week_count_mismatch (guide P24 weeks 1-9 vs duration_weeks 8) | Content (guides/P24.json) |
| F8 | 31 lessons for minors have no `parent_note` | CONFIRMED | validate_completeness (e.g. C1-L2, C2-L2, C3-L2, C4-L1, C4-L2). The viewer silently omits the "للأسرة" note. P07 itself: 4 of its lessons lack it (S1-L2, C1-L4, C4-L4, C5-L4). 25 more adult-unit lessons without it are WARN only. | Content |
| F9 | Lessons without vocabulary | WARN | 51 lessons (e.g. K1-L2); the viewer hides the "مفردات" fold, so no empty section is shown. | Content (optional) |
| F10 | Adult guide + FAQ visible to child accounts | CONFIRMED | No role check around acGuideBox; "وضع المرشد" is a free toggle. Not itself a leak of personal data, but contradicts the intent of separate guide/parent audiences. | Owner decision, then code |
| F11 | Academy JSON is publicly fetchable | CONFIRMED (design) | Route is login-gated in the UI (`academyView`: `if(!token)` redirect) but `/academy-*.json` are plain static files; vercel.json only adds noindex + no-store. Content is a draft; no personal data. | Owner awareness |
| F12 | P07 lesson, scenario, program render | AUDITED | Mobile and desktop widths, no overflow, no scoring words, no raw ids (the e2e BANNED/INTERNAL lists pass except D12). | n/a |
| F13 | Dangling references, empty activities, empty scenario nodes, scenario dead ends, unanswered FAQs, entities, placeholders (data) | AUDITED, none | validate_completeness.py: 0 in all those categories across 24 programs / 24 guides / 255 lessons / 136 scenarios / 52 competencies. Intentional blanks "..........." in worksheets are not flagged. | n/a |

## 3. Privacy of "دفتر المتعلم" and "تقدّمك على هذا الجهاز" (code-verified)

| Question | Answer (evidence) |
|---|---|
| Where is it stored? | Browser `localStorage` only. Keys: `acx_done` (object of finished item refs), `acx_ref_<lessonId>` (the notebook text, one per lesson, raw text, unencrypted), `acx_guide`, `acx_seen`. Written by `acLS.set` in index.html. The academy code contains no `api()` call and no fetch other than the four static JSON files. |
| Who can access? | Whoever uses the same browser profile on that device. Keys are **not scoped to a user id**, so two accounts (or a child and a parent) on one device see and overwrite the same notebook and progress. `setToken(null)` (logout) clears only sessionStorage; the notebook and progress survive logout and "إنهاء كل الجلسات". |
| Sent to an AI provider? | No: not by the academy code. The server has an OpenAI-backed provider (packages/edge/dist/index.ts), but no academy request is made at all, and nothing in the notebook path reaches it. |
| Server table? | A server design exists and is **not wired to the web UI**: migration 0017 `reflection_entries` (RLS: owner-only SELECT/DELETE, no UPDATE, FORCE RLS, 1-5000 chars, insert needs an active student membership) with API `POST /i/:inst/reflections`, `GET /me/reflections`, `DELETE /me/reflections/:id`, plus export/erase of own data in app.ts (~l.1164-1176). index.html contains 0 references to "/reflections". So today no notebook text reaches the database. |
| Deletion | Server: owner can delete (if it were used). Browser: no "delete my notebook / reset progress" control; the learner can only empty a textarea per lesson or clear site data. |
| Retention | No retention or expiry rule exists in either place (localStorage persists until the user clears it; the table has no TTL). |

### Interface and guide wording compared with the facts

| Wording (where) | Verdict |
|---|---|
| "🔒 ... (يُحفظ هنا على هذا الجهاز فقط، ولا يراه أحد)" (lesson, life-practice step) | Accurate for the server and other people; incomplete: anyone with the device/profile can see it; survives logout; shared by all accounts on the device. |
| "تقدّمك على هذا الجهاز: 0 من 16" | Accurate (device-only, localStorage). |
| "ورقة خاصة بالمتعلم يملكها ولا تُرسل لأحد" (capstone) | Accurate for a paper sheet; the app has no capstone input at all. |
| "لا يُجمع ولا يُقرأ" (about 250 lesson/guide sentences) | Accurate: nothing is collected. |
| "له أن يمحوه متى شاء" (20 lesson strings: "السجل الخاص بالمتعلم ... وله أن يمحوه متى شاء") | Partly: he can blank a textarea; there is no erase-all control. |
| "لا يراه أحد إلا إن اخترتُ أنا" / "لا يقرؤه أحد إلا إن اخترتُ" / "ما يكتبه ... لا يُقرأ إلا بإذنه" / "لا يقرؤه المرشد ولا الأهل بغير إذنه" (lesson key idea; P07 FAQ "من يرى ما يكتبه المتعلم؟" and "هو وحده، إلا إذا اختار أن يشاركه"; P07 guide overview; guide_notes) | **Inaccurate/misleading**: implies a permission-based sharing feature. There is none; the only "sharing" is the child physically showing his screen. State it as: "stays on this device; if you want to show it, show it yourself". |
| "ولا يُحلَّل" / "لا يُجمع ولا يُحلَّل" | Accurate today (no analysis). It becomes inaccurate if reflection sync or AI feedback is ever added without changing the text. |
| "ولا يراه أحد" without "على هذا الجهاز" (other lessons/programs: "هذا السجل خاص بك ولا يراه أحد") | Accurate regarding servers, silent about device sharing. |
| Guide for parents "يبقى معه ولا يُجمع" | Accurate. |
| Another page (not academy): "أرسل تقدّمي إلى معلّمي ... يراه معلّمك ووليّ أمرك" (Kids view) | Different feature (kids server sync, explicit button); not the academy notebook. Do not conflate. |

## 4. What needs fixing and who owns it

- Code owner (index.html, being edited by another agent): F3 FAQ/summary affordance; F5 acClean for guide_notes + pattern \bD\d+\b; F4 progress pill wording/digits; F10 role gate for guide/parent blocks; privacy: scope localStorage keys by user id and clear/offer deletion on logout; add "حذف دفتري" control; update e2e INTERNAL regex.
- Content (docs/human-formation, then `python3 -I scripts/build_academy.py`): F5 programs.json P07 guide_notes; F6 reword "بإذنه" sentences in guides/P07.json and lesson key ideas; F7 guides/P24.json; F8 parent_note for 31 minor lessons.
- Owner decisions: wire the notebook to the server table (needs guardian consent purpose reflection_journal for minors, retention period) or keep device-only and say so; share link or live JSON so the published bundle can be compared (F2).

## 5. Not established (stated plainly)
- Why the owner saw "&#x627;" remains **unproven**. Not produced by this repo's current code or data. Candidates (unverified): an older deployed bundle/data; the text viewed through a surface that HTML-escapes plain text (copy/preview/translation layer); a service-worker-cached older shell (sw.js caches "/" under cache name tartil-v1 with network-first, so unlikely).
- The live site's current JSON/FAQ content was not read.
- Rendered checks used a mocked /api and a synthetic token, not real accounts.
