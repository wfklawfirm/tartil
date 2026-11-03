# TARTIL 13.0 - Academy UX: information architecture, design system, accessibility, fix list

Status: analysis + proposal. Written 2026-11-03. Nothing in this document changes `packages/web-vercel/index.html`; every "proposed" item is unbuilt and untested.
Scope: the whole single-file SPA (`packages/web-vercel/index.html`, 1,918 lines, vanilla JS, hash routing), with emphasis on the learning surfaces (`#/academy`, `#/kids`, `#/foundations`, `#/tajweed`, `#/me`).

Status vocabulary: WORKING, PARTIALLY WORKING, UI ONLY, BROKEN, MISSING, BLOCKED, NEEDS SCHOLARLY REVIEW. "not verified" means I did not check it.

How evidence is labelled
- **[code]** = I read or grepped `index.html` for this document.
- **[audit]** = a finding from the seven audit reports in the session scratchpad (`audit/*.md`; Playwright/Chromium at 1500 and 390 px, light and dark, backend mocked with invented data). I did not re-run those; I only cross-checked a sample against the code (marked [code+audit]).
- **[doc]** = an earlier repo document (may be stale; see section 8).

---

## 1. Summary (read this first)

1. The platform has grown from one reader into six learning products (Quran reader, Tajweed library, Foundations, Kids Academy, Human-Formation Academy "أكاديمية التكوين", personal workspace "رحلتي") plus an institution dashboard. They share one header, one bottom nav and one token set, but **have no shared navigation model**: the same destination has up to four names, and three of the six products are reachable on phones only through the "المزيد" sheet [code: `renderNav`, lines 446-462].
2. The proposed model is five top-level destinations: **رحلتي** (my path), **تعلّم** (learn), **تدرّب** (practise), **استكشف** (explore), **حسابي** (account). It is a re-grouping of existing routes; no route has to be deleted and no URL has to break (section 3).
3. The design system is directionally sound (tokens, light/dark, 44 px targets on the main controls, focus ring, reduced-motion) but carries **debt from four stacked token layers, 12 radii, 20+ font sizes and ~10 card/pill/note variants**, and the newest section (`.acx`, the Academy) is styled differently from the rest [audit: system.md].
4. Accessibility: the code has a skip link, `aria-current` on nav, a global `:focus-visible` ring, `prefers-reduced-motion`, `lang="ar" dir="rtl"`, and a prior axe run with 0 violations on 18 route/theme/width combinations [doc: UI_UX_AUDIT.md, 09_VISUAL_QA.md]. It also has **gaps axe cannot see**: no `document.title` per route, no focus move on route change, tab bars that are links without tab semantics, an auth tab bar built from `href="javascript:void 0"`, a "المزيد" sheet with no Esc/outside-click close, and measured contrast failures for tajweed colours and form-field borders (section 6).
5. Nothing in this document is a scholarly or religious claim. Content labels such as "تمهيدي / قيد المراجعة العلمية" are preserved as product requirements, not UX clutter to be removed (section 5.3).

---

## 2. Current navigation (as built)

### 2.1 Surfaces and their entry points [code: lines 359-362, 446-486]

| Surface | Desktop top bar | Phone bottom bar | Phone "المزيد" sheet | Footer | Needs login |
|---|---|---|---|---|---|
| Home `#/` | الرئيسية | الرئيسية | - | yes | no |
| Quran `#/quran`, `#/search` | القرآن, بحث | المصحف, بحث | - | القرآن الكريم, بحث | no |
| Tajweed `#/tajweed[/...]` | التجويد | التجويد | - | yes | no |
| Foundations `#/foundations` | الأسس | - | الأسس: الحروف والحركات | yes | no |
| Kids Academy `#/kids` | الصغار | - | أكاديمية الصغار | yes | no (progress local to the device) |
| Human-Formation Academy `#/academy[/p\|l\|s\|c\|review]` | التكوين | التكوين | أكاديمية التكوين الإنساني | yes | **yes** (`academyView` redirects to `#/auth` without a token, line ~1594) |
| Qiraat `#/qiraat` | القراءات | - | القراءات والإسناد | yes | no |
| Personal workspace `#/me/{today,tasmi,hifz,quiz,map,sanad}` | رحلتي | - | رحلتي | logged-in | yes |
| Planner `#/plan` | - | - | خطتي | - | partly |
| Homework demo `#/demo` | - | - | جولة في الواجبات | - | no |
| Institution dashboard `#/app/<inst>/{overview,tracks,halaqat,homework,recitation,certs,assistant,people,admin}` | لوحتي | - | لوحتي, الواجبات | logged-in | yes |
| Scholar review `#/review[...]` | المراجعة العلمية | - | المراجعة العلمية | - | scholar role |
| Auth `#/auth`, certificate verify `#/verify/<code>`, dev `#/gallery`, 404 | - | - | دخول / تسجيل or حسابي | - | - |

Result: on a phone, **Foundations, Kids, Qiraat, Planner and the personal workspace are two taps deep** and the "المزيد" list order has no logic (Kids before Foundations; demo and planner between them) [audit: home.md item 13].

### 2.2 Naming inconsistencies [code+audit]

| Destination | Names in use |
|---|---|
| Quran | القرآن (top), المصحف (bottom), القرآن الكريم (footer) |
| Institution dashboard | لوحتي (bar), لوحة المؤسسة (footer/cards) |
| Foundations | الأسس (bar), الأساس (home card), الحروف والحركات, الأسس: الحروف والحركات |
| Kids | الصغار (bar), أكاديمية الصغار (sheet, page title) - and the Academy page has a *group* also called "الصغار" |
| Academy | التكوين (bar), أكاديمية التكوين الإنساني (sheet, ECO card), أكاديمية التكوين |

### 2.3 Structural problems

| # | Problem | Evidence | Status of the thing |
|---|---|---|---|
| N1 | Top bar has 8-10 links at desktop; on phones it is hidden entirely (logo, login, theme only) | code `renderNav`; audit home.md 13 | PARTIALLY WORKING |
| N2 | `#bnav` shows 4 destinations + المزيد, all chosen around the Quran, not around the learner's tasks | code line 456 | WORKING (but weak IA) |
| N3 | "المزيد" sheet: no title, no backdrop, no Esc, no outside click, `aria-expanded` not reset after a link closes it; no current-page marker | code lines 457, 461 (only a click handler on the toggle and on links; no `keydown`/document listener found by grep); audit home.md 12 | PARTIALLY WORKING |
| N4 | Several routes call `renderNav('')`, so no item is highlighted (foundations, kids, plan, demo, auth, gallery, verify) | code lines 476-483 | PARTIALLY WORKING |
| N5 | Academy gated behind login while the home card "افتح الأكاديمية" is shown to guests and silently lands on `#/auth` | code lines 1594 and ECO; audit home.md 6 | PARTIALLY WORKING (guest sees no reason) |
| N6 | `#/tajweed` and `#/tajweed/makharij` render the same screen | audit tajweed.md 14 | WORKING (redundant) |
| N7 | Reviewer gate page `#/academy/review` is visible to any logged-in user (condition is token only) | audit academy-scenario.md 10 (read from code by the auditor) | BROKEN as an access boundary for UX purposes; not a security claim - data scope not verified |
| N8 | Lesson, scenario, competency pages link back with `history.back()` or to the Academy root, not to the parent competency/programme | audit academy-scenario.md 1, 9 | PARTIALLY WORKING |
| N9 | Records of progress live in three places: Kids in device storage (`kst`), Academy completion in `localStorage` key `acx_done`, personal workspace on the server per user | code (`kst`, `acx_*`, `/me/*`); audit | by design; **not unified or explained to the user** |

---

## 3. Proposed navigation: رحلتي / تعلّم / تدرّب / استكشف / حسابي

Principle: organise by **what the person is doing**, not by which product was built first. Guests see the same five; items that need an account are shown with a short reason rather than bouncing to login without explanation.

### 3.1 The five destinations

| Destination | Purpose | Contains (existing routes unless marked NEW) | Guest behaviour |
|---|---|---|---|
| **رحلتي** `#/journey` (NEW landing; today `#/me/today` + `#/plan`) | Continue where I left off: resume reading, today's reviews, current Academy programme, this week's plan | `#/me/today`, `#/plan`, "continue reading" (`store 'last'`), Academy progress (`acx_done`), Kids progress (`kst`) | Shows the three starter paths and "sign in to keep your progress on all devices" |
| **تعلّم** `#/learn` (NEW hub) | Structured teaching, by audience and level | Foundations (`#/foundations`), Tajweed library (`#/tajweed`), Kids Academy (`#/kids`), Human-Formation Academy (`#/academy`), Qiraat intro (`#/qiraat`) | Foundations, Tajweed, Kids, Qiraat open; Academy shows the programme list read-only or explains the sign-in (owner decision O2) |
| **تدرّب** `#/practise` (NEW hub) | Active practice and self-check | Hifz & spaced review (`#/me/hifz`), Tasmi' recitation analysis (`#/me/tasmi`), quizzes (`#/me/quiz`), mastery map (`#/me/map`), Foundations quiz, Kids activities | Quizzes that need no account (Foundations quiz, Kids) open; the rest explain the account requirement |
| **استكشف** | Read and look things up | Quran index and reader (`#/quran`), search (`#/search`), Tajweed explorer (`#/tajweed/explore`, `/makharij`), Qiraat, certificate verification | all open |
| **حسابي** `#/account` (NEW; today `#/auth`, `#/app`, `#/review`) | Identity, institution work, settings | Sign-in/up, my institutions dashboard (`#/app/...`), homework (`#/app/<inst>/homework`), sanad register (`#/me/sanad`), scholar review (role-gated), theme, language/digits preference (if adopted), logout | Sign-in / register |

Notes
- "NEW" means the hub page does not exist today (MISSING). Aliases keep old URLs working; a hub can initially be a plain list page built from the existing `pageHead()` + card helpers.
- Tajweed and Qiraat appear under both تعلّم and استكشف on purpose: one route, two entry points. The breadcrumb always names the section the person came from.
- The Quran reader is the product's centre of gravity. It stays one tap from the bar on phones by putting it under استكشف as the first item **and** showing "continue reading" on رحلتي.

### 3.2 Bottom bar (phones) and top bar (desktop)

| Slot | Phone bottom bar | Desktop top bar |
|---|---|---|
| 1 | رحلتي | رحلتي |
| 2 | تعلّم | تعلّم |
| 3 | تدرّب | تدرّب |
| 4 | استكشف | استكشف |
| 5 | حسابي | حسابي (+ theme button, sign-in button for guests) |

Five items fit the existing `#bnav` layout (it already renders four plus "المزيد"), so "المزيد" and its unmanaged sheet go away. Sub-navigation inside a destination uses one tab-bar component (section 4.3).

### 3.3 Route mapping (old to new)

| Existing route | New home | URL change needed |
|---|---|---|
| `#/` | Home stays; its journey/continue block links to رحلتي | none |
| `#/quran`, `#/quran/<n>[/<a>]`, `#/search[...]` | استكشف | none |
| `#/tajweed[/makharij\|sifat\|ahkam\|mudood\|explore]` | تعلّم (also reachable from استكشف) | none; make `#/tajweed` redirect to `#/tajweed/makharij` or add a real overview |
| `#/foundations` | تعلّم > Foundations | none |
| `#/kids` | تعلّم > Kids | none |
| `#/academy[/p/<slug>\|l/<id>\|s/<id>\|c/<id>]` | تعلّم > Academy | none |
| `#/academy/review[/<id>]` | حسابي > Reviewer tools (role-gated) | add a role check (fix F-07) |
| `#/qiraat` | تعلّم / استكشف | none |
| `#/me/today`, `#/plan` | رحلتي | none |
| `#/me/hifz`, `#/me/tasmi`, `#/me/quiz`, `#/me/map` | تدرّب | none |
| `#/me/sanad` | حسابي (or تعلّم > Qiraat) | none |
| `#/app/<inst>/*` | حسابي > Institution | none |
| `#/review/*` | حسابي > Scholar review (role-gated) | none |
| `#/demo` | تعلّم > "example homework" (rename from «جولة في الواجبات») | none |
| `#/auth`, `#/verify/<code>`, `#/gallery` | حسابي / استكشف / dev-only | none |

### 3.4 Role-based entry (teacher, parent, institution)

The owner brief asks for teacher / parent / institution tracks. What exists today [code, audit]:

| Role | What exists | Status |
|---|---|---|
| Student (adult) | `#/me/*`, `#/plan`, homework under `#/app/<inst>/homework` | PARTIALLY WORKING (checked with mocked data only) |
| Guardian | `#/app` homework child selector (code line ~833: `select aria-label="الطفل"`); Kids page "send my progress" | PARTIALLY WORKING, not verified against real data; no parent workspace [doc: KNOWN_LIMITATIONS 36] |
| Teacher (qari) | `#/app/<inst>/...` sections (tracks, halaqat, homework, recitation) | PARTIALLY WORKING, mocked data only; the audit looked at the overview only |
| Institution admin | `#/app/<inst>/{people,admin,certs}` | PARTIALLY WORKING, same limit |
| Academy guide / parent (Academy guides) | guide boxes inside programme pages (`acGuideBox`) | PARTIALLY WORKING; learner and guide content share one page (audit academy-programs.md 9) |

Proposal: in **حسابي**, show one role-aware panel ("أنا ... متعلّم / وليّ أمر / معلّم / مدير مؤسسة") that only lists what the signed-in memberships actually allow (`ME.memberships` is already available in `route()`). A teacher/parent *home* is a build task, not a UX tweak: MISSING.

### 3.5 What changes for the first-time visitor

1. Home keeps the hero and "continue reading".
2. The nine-card `ECO` grid is replaced by the five destinations with one sentence each (audit home.md 1-4 and 18 describe why the current grid hides status text and is unbalanced).
3. Status labels (تمهيدي / يتطلب حسابًا) become a **separate badge element**, never text buried in a sentence (section 5.3).

---

## 4. Design system: current state

Authoritative short docs: `docs/03_QURANIC_DESIGN_SYSTEM.md`, `docs/TARTIL_DESIGN_SYSTEM.md` (component-to-implementation table). The CSS is inline in `index.html` (about lines 13-355 plus JS-injected `<style>` blocks near lines 421 and 1889) [audit: system.md; code].

### 4.1 What is in good shape

| Area | Status | Basis |
|---|---|---|
| Colour tokens for light and dark (`--bg, --card, --ink, --mute, --accent, --accent2, --gold, --gold2, --goldtx, --ok, --warn, --bad, --line, --soft`) | WORKING | `docs/03_...`; computed contrast of text tokens passes AA in both themes [audit: system.md "التباين المحسوب"] |
| Theme switch auto/light/dark, stored locally | WORKING (the third state's icon is unclear: audit home.md 14) | code line 443 |
| Typography: Amiri Quran (verses), IBM Plex Sans Arabic (UI), Amiri (display) | WORKING with fallbacks; real fonts unverified in the sandbox | docs/09_VISUAL_QA.md |
| Skip link, `aria-current` on nav, global focus ring, reduced-motion, print stylesheet | WORKING | code lines 78-79, 182-185 |
| Ornament library (`orn`, `corners`, `divider`, `pathIcon`, `ayahMarker`, `medallion`) | WORKING (design judgement is the owner's) | docs/04_ORNAMENT_LIBRARY.md |
| 404 and generic error page (`.statepg`) | WORKING [code lines 486-487] - **the page-coverage matrix still says "none"; it is stale** (docs/PAGE_COVERAGE_MATRIX.md) | code |
| Offline queue for homework actions | PARTIALLY WORKING (only two light actions; not tested on a device) | code line 826; KNOWN_LIMITATIONS |

### 4.2 Debt, measured by the system audit [audit: system.md]

| Debt | Size | Consequence |
|---|---|---|
| Token layers: lines 14-15 (old palette) overridden by lines 68-72, with leftover hard-coded old greens in `.hero`, the brand SVG, highlight rgba values | 4 layers | wrong colours appear when a rule was not migrated |
| Dark mode defined three times per variable (`@media dark` + `[data-theme=dark]` + `[data-theme=light]`), and ~25 heading rules repeat "dark = `--ink`" | ~25 rules | every new component must remember to duplicate it |
| Radii | 12 distinct values | cards read as different families |
| Font sizes | 20+ distinct values (12 to 96 px, plus `rem` in two places) | no type scale |
| Page `h1` | 58 / 46 / 34 / 32 px and two fonts across Home / Tajweed / Kids / Academy | Kids looks like a different app |
| Content width caps | 560, 600, 620, 640, 760, 780, 980, 1100, 1180, 1320 | content edge jumps ~44 px between Tajweed and Academy |
| Breakpoints | 560, 600, 700, 800, 1023, 1180, 1500 | between 700 and 800 px: full desktop nav with phone layout; Academy switches at 600 |
| "Card" implementations | `.card .feat .path .act .ec .pcard .item .fact .idea .lesson .rcard` | inconsistent padding, radius, shadow, hover |
| "Pill / tab / chip" implementations | `.chip .pill .ribbon .chipbtn .tabs a .tabs2 a .chips button .modes .gswitch` | inconsistent height (32-40 px, below 44) |
| "Note / message" implementations | `.msg .note .fb .mission .check .tsnote` | warnings look different per page |
| Physical (non-logical) CSS: `.acx .stage{right:0; padding-right}`, `th,td{text-align:right}` | several | breaks if an LTR (English) UI is added |
| Dead CSS (probable): `.hero` v1/v2, `.journey`, `.path(s)`, `.cont`, `.cert`, `.sname`, `--teal` | ~8+ rules | **not verified** by CSS coverage; the auditor says so too |

### 4.3 Components: existing vs missing

| Component (brief) | Exists as | Gap |
|---|---|---|
| AppHeader / PublicNavigation | `header.top`, `renderNav()` | Needs the five-destination model (section 3) |
| MobileNavigation | `#bnav` + `#more` sheet | Replace sheet; add Esc/outside-click/focus return if any sheet remains |
| PageHero / PageHeader | `.hero2` (home), `pageHead()` (some inner pages) | **Not applied** to Foundations, Kids, `#/me`, `#/plan`, `#/qiraat`, `#/search`, Academy uses its own `.ahero` [doc: PAGE_COVERAGE_MATRIX; audit] |
| SectionHeading + divider | `h2.sec`, `divider()`; Academy `h2.sh` / `.ghead` | two styles |
| Card (generic and linked) | many | MISSING as one component |
| Tabs (link tabs) | `.tabs`, `.tabs2` | MISSING: tab semantics, overflow cue, active-into-view (audit kids.md 8, tajweed.md 9) |
| Pill / badge / status badge | `.chip`, `.pill`, `.ribbon` | MISSING: one `StatusBadge` for تمهيدي / مسودة / يتطلب حساب |
| Notice (info/warn/ok/err/draft) | `.msg`, `.note` | MISSING as one component |
| ProgressCard / progress bar | passport bars, `timeline()`, Academy progress bar | no `role="progressbar"` or "step 3 of 6" text (audit academy-lesson.md; kids.md map) |
| LessonLayout | `acLesson` (Academy) | PARTIALLY WORKING: no step counter, guide panel doubles page length, "finished" button weak (audit academy-lesson.md 2-8). The older docs say "no lesson player exists" - **stale**: a lesson page exists |
| ScenarioPlayer | `acScenarioBox/Page` | PARTIALLY WORKING: no progress cue, finish button available before the end (audit academy-scenario.md 1-3) |
| AssessmentLayout (quiz) | `quizTab`, `fdQuiz`, Kids `activity` | multi-click bug in Foundations quiz; no correct/incorrect colour in Kids (audit tajweed.md 3, kids.md 9) |
| DataTable | `table()` | no responsive card variant; clipped on phones (audit kids.md 2) |
| EmptyState with next action | `empty()` | exists; most empty states lack a "what next" action |
| ErrorState / 404 / unauthorised / offline | `.statepg` for 404 + error | unauthorised = silent redirect to auth; offline state page MISSING |
| Dialog / bottom sheet | `#more` | no focus trap, Esc, backdrop |
| Form field with inline error | `field()` + `run()` message box under the button | MISSING: per-field error, show-password, `aria-live` on auth message (audit home.md 7) |
| File input | native `<input type=file>` | styled button MISSING (audit kids.md 3) |
| Digit formatting helper | `ar()` exists | not used consistently (see 5.4) |

### 4.4 Proposed token additions (no code written; values taken from the system audit, **not yet measured on rendered pages**)

| Token | Light | Dark | Replaces |
|---|---|---|---|
| `--head` (semantic heading colour) | `var(--accent2)` | `var(--ink)` | ~25 duplicated dark rules |
| `--field` (input/control border) | #8F8466 (~3.5:1 claimed) | #6E9487 (~4.2:1 claimed) | `#CFC4A8` (1.69:1) / `#3C5E52` (1.93:1) |
| Radii | `--r-xs 6, --r-sm 10, --r-md 14, --r-lg 20, --r-pill 999` | same | 12 values |
| Spacing (4 px grid) | `--s1..s7 = 4,8,12,16,24,32,48` | same | 4-44 px ad hoc |
| Widths | `--w-read 780, --w-page 1100, --w-wide 1180` | same | 10 caps |
| Type scale | `--t-xs 13, --t-sm 15, --t-md 17, --t-lg 20, --t-xl 24, --t-2xl clamp(30,5vw,46), --t-hero clamp(34,5.2vw,58)` | same | 20+ sizes |
| `--tap` | 44px | same | 32-48 |
| Tajweed colours (light) | ghunna #1f7a55, ikhfa #2f6fb0, idg_g #0e7c75, idg_n #7d46b0, iqlab #b25f0f, qalqala #b83a2b, madd #8f6410 | keep current (>= 5.8:1) | current light values (2.86-4.34:1) |
| `--mute` (dark) | #A9B8AE (~6.3:1) | | #C5CDBF (8.5:1, too close to `--ink`) |
| Breakpoints | 600 / 900 / 1180 (CSS cannot use variables in `@media`; document in one block) | | 7 values |

All proposed values are the system auditor's calculations; each must be re-measured in the browser and on gradients before adoption.

---

## 5. Pattern-level UX findings for the learning surfaces

### 5.1 Learner journeys (what is tested vs not)

| Journey | Status | Basis |
|---|---|---|
| Guest: home -> read a surah -> search | WORKING in Chromium with mocked/real-edition data; mobile reader tools push text down (audit quran.md 5) | audit, docs/09 |
| Guest -> Foundations (child or adult) | PARTIALLY WORKING; quiz double-count bug, no score at end (audit tajweed.md 3-4) | audit |
| Guest -> Kids Academy | PARTIALLY WORKING; **activity card titles unreadable** in both themes (audit kids.md 1) | audit |
| Signed-in -> Academy programme -> lesson -> scenario -> competency | PARTIALLY WORKING; renders on all 5 lessons / 3 scenarios sampled; many content/UX issues below | audit |
| Signed-in -> hifz -> review | UI renders; behaviour with real data not verified | audit kids.md |
| Signed-in -> tasmi' recording and analysis | **BLOCKED live**: speech-to-text returned HTTP 429; no microphone test | KNOWN_LIMITATIONS 37 |
| Teacher / parent / institution flows end to end | not verified in a browser against real data | KNOWN_LIMITATIONS 21, 36 |
| Real iPhone / Safari / screen reader | not verified anywhere | docs/09, RESPONSIVE_QA |

### 5.2 Academy-specific structure issues (audits: academy-programs, academy-lesson, academy-scenario)

| Area | Finding | Impact |
|---|---|---|
| Programme list `#/academy` | No path map; 8 child programmes shown in id order, three labelled "8 years"; group labels do not match contents (P13 "16+" sits under "adults"; P14 "18+" under "from 16"); nav label "الصغار" collides with Kids | learner cannot tell where to start |
| Programme graph | `prerequisites`/`next_programs` are inconsistent (P05 not reachable from P02; P06 has no prerequisite or inbound link; P14, P15, P16 have no "what next") | broken sequence |
| Programme page | Raw ids shown ("P13", "T4-L1", "K3-L1") to learners/guides; "level N" labels start at L3/L4 mid-programme; guide and learner content mixed on one page; "after this programme" is plain text | confusing, looks unfinished |
| Gated programmes | P15/P16 say "not opened to the public" yet render in full, with internal notes ("D11 #12", "BLUEPRINT D11 #10") visible | trust and content-governance issue; owner decision O3 |
| Lesson page | Story lines 90-100 characters wide at desktop; guide panel auto-opens and repeats the full timed script on every step; list text flattened into paragraphs; an answer hint appears next to the question; "finish" gives no confirmation or next lesson | reading comfort, pedagogy, flow |
| Scenario page | "Finish" is available before the end; no progress or ending count; feedback tone is uneven (punitive branches) so it hints at a "right answer", contradicting the stated "no single correct answer" | pedagogy; **NEEDS SCHOLARLY/PEDAGOGICAL REVIEW** of wording, not only UX |
| Competency page | letter code (K1) is the first badge; numbered list shows both "1." and "المستوى 1" | clutter |
| Reviewer page | visible to any signed-in user | confusion; see N7 |

Whether the lesson, scenario and programme *content* is correct, age-appropriate or Islamically sound is **out of scope and not verified** here; that is NEEDS SCHOLARLY REVIEW per project rules.

### 5.3 Status and trust labels (requirement, not clutter)

The project rule is that machine-drafted content carries a visible "under review" label. The home audit shows the label is currently *buried* inside card descriptions, repeated six times, and **hidden by a two-line clamp on phones** (audit home.md 1-2). Proposed rule: one `StatusBadge` per card/page with fixed vocabulary:

| Badge | Meaning | Source of truth |
|---|---|---|
| تمهيدي - قيد المراجعة | AI-drafted, not reviewed by a named reviewer | `docs/governance/SCHOLARLY_REVIEW_QUEUE.md`, DB review state |
| يتطلب حسابًا | needs sign-in | route guard |
| بانتظار مراجعة متخصصة | blocked until named reviewers exist (P11, P12, P15, P16) | programme `needs_named_reviewers` (audit notes P11/P12 lack it) |
| محلي على هذا الجهاز | progress stored in this browser only | `kst`, `acx_*`, `store` |

Owner/internal phrases must not reach the learner: "ترخيص الصوت قرار المالك", "بانتظار اعتماد الإدارة العلمية", `D11 #12`, `SPR-K1` (audit kids.md 4, tajweed.md 6, academy-programs.md 3, academy-lesson.md 3).

### 5.4 Numerals and bidi (cross-cutting)

Arabic-Indic and Latin digits are mixed on most pages (Tajweed sums, Academy durations, date formatting, number inputs, "114 surah" vs "٤ آيات"); `ar()` exists but is not applied everywhere; ranges such as "١–٤" or "الأسبوع 1-2" can display reversed in RTL; "٧ آية" is ungrammatical (audit: home 15, kids 6-7, quran 3, tajweed 5, academy-programs 11-12). Proposed single rule (owner decision O4): one digit style per surface type (Quran and lessons: Arabic-Indic; inputs and dashboards: Latin), expressed as one helper, with ranges written as "من ٤ إلى ٦" and wrapped in `<bdi>`.

---

## 6. Accessibility: WCAG 2.2 AA review

Method: code reading + audit contrast arithmetic + prior axe results. **Automated axe passes do not establish AA conformance**; no screen reader, no keyboard-only walkthrough, no real device and no user testing has been done by me or (per the audits) by anyone.

### 6.1 Success-criterion table

| WCAG 2.2 SC | Status | Evidence / gap |
|---|---|---|
| 1.1.1 Non-text content | PARTIALLY WORKING | Ornaments carry `aria-hidden` [doc: 03_...]; arrows "←/↓" are literal text and are read aloud (audit home.md 16); emoji used as icons in places (kids.md, quran.md) |
| 1.3.1 Info and relationships | PARTIALLY WORKING | Tab bars are plain links in a `div` (code: `el('div',{class:'tabs'})`, lines 733, 787, 1272); `acTabs` sets `role="tablist"` on links without `role="tab"` (code line 1470) which is an invalid pattern; progress bars lack `role="progressbar"` (audit kids.md) |
| 1.3.2 Meaningful sequence | PARTIALLY WORKING | `#/plan`: "today" card precedes the page heading (audit kids.md 5) |
| 1.4.1 Use of colour | PARTIALLY WORKING | Kids answers: no non-colour correct/incorrect cue (audit kids.md 9); tajweed colours rely on colour with a legend only |
| 1.4.3 Contrast (min) | **FAILING in places** | Light-theme tajweed colours 2.86-4.34:1 on #FFFCF6 (iqlab 2.86, idg_g 3.04, madd 3.20, ghunna 3.45, idg_n 4.05, qalqala 4.34) [audit system.md; computed, not re-measured]; dark theme passes. Kids activity titles invisible (cream on cream). `--mute` light is 4.87-5.68:1 at 14 px (passes, marginal) |
| 1.4.4 Resize text | not verified | no 200% zoom or OS font-scale test |
| 1.4.10 Reflow | PARTIALLY WORKING | no horizontal page scroll in any audited route at 390 px [audit]; but tables clip inside their wrapper with no cue (kids.md 2) |
| 1.4.11 Non-text contrast | **FAILING** | input/select/textarea border 1.69:1 (light) and 1.93:1 (dark), `button.ghost` border ~1.4:1 [audit system.md] |
| 1.4.12 Text spacing | not verified | |
| 1.4.13 Content on hover/focus | not applicable / not verified | tajweed tooltips are absent on the Highlight path [doc] |
| 2.1.1 Keyboard | not verified | no keyboard-only walkthrough; custom `role="button"` word spans have `tabindex=0` (code line 1312) but no key handler was checked; `#more` has no Esc handling |
| 2.1.2 No keyboard trap | not verified | |
| 2.4.1 Bypass blocks | WORKING | skip link `a.skip` -> `#app` (code lines 79, 358) |
| 2.4.2 Page titled | **FAILING** | one static `<title>` (code line 9); zero assignments to `document.title` (grep: 0 matches), so every hash route has the same title |
| 2.4.3 Focus order | **FAILING / not verified** | `<main id="app" tabindex="-1">` exists but nothing calls `.focus()` (grep: 0 matches), so after a route change keyboard and screen-reader focus stays on the old link |
| 2.4.6 Headings and labels | PARTIALLY WORKING | h1 sizes/levels inconsistent; Kids/me/plan pages have no `pageHead` |
| 2.4.7 Focus visible | WORKING | global `:focus-visible` 3 px gold ring (code line 78); axe found no issue; custom components not individually checked |
| 2.4.11 Focus not obscured (min) (new in 2.2) | **at risk, not verified** | fixed header (`header.top`), fixed bottom nav and mini-player can cover focused elements; audits note the sticky header covering section tops (academy-scenario.md 18); no `scroll-margin-top` / `scroll-padding` found by me |
| 2.5.7 Dragging movements (new) | not applicable (no drag interactions found) | not exhaustively checked |
| 2.5.8 Target size (min 24 px, new) | PASSING at the minimum; below the 44 px house standard | footer links 32 px, `.tabs a` 40 px, `.acx .jump a` ~34 px, some inline links 25 px [audit] |
| 3.1.1 / 3.1.2 Language | PARTIALLY WORKING | `<html lang="ar" dir="rtl">` [code line 2]; Latin snippets (surah-name English, "OpenAI", repo names) not marked; only 9 `dir="ltr"` uses in the file |
| 3.2.x Predictable | PARTIALLY WORKING | the planner generates a plan on load so the "suggest" button seems inert (audit kids.md); auth tab links use `href="javascript:void 0"` |
| 3.3.1 Error identification / 3.3.3 Suggestion | PARTIALLY WORKING | auth errors appear only in a box below the button; no field-level message |
| 3.3.7 Redundant entry (new) | not verified | |
| 3.3.8 Accessible authentication (min) (new) | not verified | auth form uses standard `autocomplete` values (code: `current-password` / `new-password`); no show-password control; paste not checked |
| 4.1.2 Name, role, value | PARTIALLY WORKING | `#more` toggle `aria-expanded` is not reset when a link closes the sheet (code line 461); tab bars lack roles/selected state |
| 4.1.3 Status messages | PARTIALLY WORKING | `role="status"`/`aria-live="polite"` exist on several result boxes (code lines 1307, 1418, 1641) but not on the auth message, search loading, or Academy step changes |
| Motion / reduced motion | WORKING | `prefers-reduced-motion` disables animation globally (code line 184) |
| Prior axe-core run | 0 violations on 18 route x theme x width combinations; 0 on 9 pages + overlays [doc: UI_UX_AUDIT, 09_VISUAL_QA] | the audit run included mocked logged-in pages; it was not re-run for this document |

### 6.2 Accessibility work, grouped

| Group | Items |
|---|---|
| Programmatic (cheap, high value) | route-level `document.title`; move focus to `<main>` (or the page h1) after navigation and announce it; real `role="tablist"/tab/aria-selected` (or `aria-current` on a nav list) for tab bars; replace `javascript:void 0` tab links with buttons; sheet/dialog pattern for any popover (Esc, outside click, return focus, reset `aria-expanded`); `aria-live` on auth and search status; `role="progressbar"` with values; `aria-hidden` on decorative arrows; `<bdi dir="ltr">` around Latin names |
| Contrast / visual | new light tajweed colours + underline/label in legends; `--field` border token; kids card colour inheritance bug; raise dark `--mute` hierarchy |
| Target size | `min-height:44px` for footer links, `.tabs a`, `.jump a`, `.gswitch`, `.fcols a`, small inline links on coarse pointers |
| Verification still owed | keyboard-only pass on every learning route; NVDA/JAWS (Windows), VoiceOver (iOS, macOS), TalkBack; 200% zoom and text-spacing override; real iPhone Safari and Android Chrome; user test with at least one parent and one child-age learner (owner decision: who and how) |

---

## 7. Fix list from the audit reports (prioritised)

IDs are stable for the tracker. "Source" names the audit file. All are **proposals**: nothing below is fixed. Priority: P0 = misleading/unreadable/broken, P1 = significant friction or compliance gap, P2 = polish.

### 7.1 P0

| ID | Fix | Where | Source |
|---|---|---|---|
| F-01 | Kids activity card titles are invisible (button inherits `color:var(--accent-ink)` on `var(--card)`); set `button.card{color:var(--ink)}` + title/small rules | `kidsView.home` `act` | kids.md 1 |
| F-02 | Status text hidden by line-clamp at <=800 px (five cards); replace with a separate badge, remove clamp | `ECO`, `.ec:not(.lead) .small` | home.md 1-2 |
| F-03 | Foundations quiz: debounce/disable after first answer (multi-click inflates score and skips questions); show the actual score at the end | `fdQuiz` | tajweed.md 3-4 |
| F-04 | Internal/owner wording shown to learners: remove "ترخيص الصوت قرار المالك", "بانتظار اعتماد الإدارة العلمية", `D11 #12`, `BLUEPRINT D11 #10`, `SPR-K1`; replace with the prepared plain sentences | tasmi tab, foundations, programme page, lesson guide box | kids.md 4; tajweed.md 6; academy-programs.md 3; academy-lesson.md 3 |
| F-05 | Raw ids shown to users: prerequisites "P13", week focus "T4-L1" etc.; resolve to titles/links or strip | `acProgram`, `acGuideBox`, `academy-guides.json` | academy-programs.md 1-2 |
| F-06 | Gated programmes (P15, P16; P11/P12 inconsistent) render fully while claiming not public; decide hide vs read-only banner | `acProgram` | academy-programs.md 3, 21; owner decision O3 |
| F-07 | Reviewer page `#/academy/review` visible to every signed-in user: require reviewer role (as `#/review` does) and hide the footer link | `academyView`, footer | academy-scenario.md 10 |
| F-08 | Scenario "finished" button available before the ending; uses `history.back()`; show it only at the end and link to the parent competency | `acScenarioPage` | academy-scenario.md 1 |
| F-09 | Tajweed notice grammar error "ولا يُصدر المنصة" -> "ولا تُصدر المنصة"; keep the one-line "does not replace a certified reciter" visible, details folded | `TJ_NOTE`, `tajweedView` | tajweed.md 1-2 |
| F-10 | Light-theme tajweed colours fail contrast; apply the proposed values after measuring | `.tj-*` CSS | system.md 3 |
| F-11 | Form-field and ghost-button borders fail 3:1 | `input,select,textarea,button.ghost` | system.md 4 |
| F-12 | Answer leakage: sentence revealing the answer shown with the question (T6-L2); move behind a reveal | lesson data/`actEl` | academy-lesson.md 5 |

### 7.2 P1

| ID | Fix | Source |
|---|---|---|
| F-13 | Route-level `document.title` and focus management (section 6) | code review (this document) |
| F-14 | Bottom nav -> five destinations; remove `#more` or give it a proper sheet pattern | section 3; home.md 12-13 |
| F-15 | One shared `pageHead` on Foundations, Kids, `#/me`, `#/plan`, `#/qiraat`, `#/search`, Academy; one `h1` size class | kids.md 5, 56; tajweed.md 7; system.md 5 |
| F-16 | One `Tabs` component with tab semantics, overflow fade and active-tab scroll-into-view; apply to `#/me`, `#/tajweed`, `#/foundations`, `#/app`, `.acx .jump` | kids.md 8; tajweed.md 9; programs 18 |
| F-17 | Hifz table clipped on phones: card layout or min-width + scroll cue; nowrap chips | kids.md 2 |
| F-18 | Styled file chooser (native "No file chosen" in English) | kids.md 3 |
| F-19 | Lesson page: cap story measure (~62ch), collapse guide panel by default (one disclosure), show only the current step's script, add "step N of M" and sticky nav, render list text as real lists, put the "finish" action in the nav row with a confirmation and next-lesson link | academy-lesson.md 1-4, 8 |
| F-20 | Academy programme graph: make `next_programs`/`prerequisites` consistent in both directions; add a path map and "ماذا بعد؟" block; relabel groups by age; drop "level N" or define it | academy-programs.md 5-6, 13, 16 |
| F-21 | Programme page: separate learner and guide/parent content (tabs), one draft notice instead of four, per-situation `details` for long guides | academy-programs.md 9, 15, 17 |
| F-22 | Programme content consistency: age ranges of lessons vs programme; stage weight vs weekly rhythm; wording errors ("ولي أمر حي مسجلة") | academy-programs.md 7-8, 10; **content owner/scholar review needed** |
| F-23 | Auth page: show-password, inline errors, `aria-live`, back link, rewrite the password-recovery line, add privacy/terms notice | home.md 7-9 |
| F-24 | Planner: heading before the "today" card; define السبق/السبقي/المنزل; do not auto-build before the button is pressed (or rename the button) | kids.md 5, 86 |
| F-25 | Footer: grouped columns, 44 px links, guest-aware labels ("يتطلب حسابًا"), copyright/privacy/contact row | home.md 6, 10, 19 |
| F-26 | Kids answer feedback: right/wrong styling plus text ("الإجابة الصحيحة: ألف")" | kids.md 9 |
| F-27 | Scenario: progress cue ("القرار 1 من 3"), ending heading, neutral outcome lines, show the fictional note once, scroll to start of feedback, bottom padding for fixed nav | academy-scenario.md 2-6 |
| F-28 | Reader: tool panel close button / bottom sheet on phones; keep panel open when toggling tajweed colour or translation (no full re-render); two-column surah list on narrow screens | quran.md 4-5, rest |
| F-29 | Search: remove the duplicate in-page search on `#/quran` (route to `#/search`), add result highlighting, examples chips, loading state | quran.md 1, 7, 8 |
| F-30 | Digit and range rule + plural helper ("آية/آيتان/آيات"), apply across pages | section 5.4 |

### 7.3 P2 (selected)

| ID | Fix | Source |
|---|---|---|
| F-31 | Collapse token layers; add `--head`, `--field`, radii, spacing, type, width tokens; delete duplicated dark rules and verified-dead CSS | system.md; section 4.4 |
| F-32 | Logical CSS properties in `.acx .stage` and tables | system.md 7 |
| F-33 | Unify breakpoints to 600/900/1180 | system.md 8 |
| F-34 | Merge card/pill/note variants into `.card(.link)`, `.pill`, `.note` | system.md 10 |
| F-35 | Mastery map level colours defined for dark theme (`--lv1..4`) | kids.md |
| F-36 | Heatmap labels/legend; stat cards use `.tsum` scale | kids.md |
| F-37 | Home grid balance (span rules) and logged-in action cards capped at four plus "more" | home.md 3-4 |
| F-38 | Theme button: two states or visible label for "auto" | home.md 14 |
| F-39 | Update stale docs: PAGE_COVERAGE_MATRIX (404 exists), TARTIL_DESIGN_SYSTEM (lesson workspace exists), UI_UX_AUDIT | this document |

---

## 8. Documentation discrepancies found

| Document | Statement | Code/audit says |
|---|---|---|
| `docs/PAGE_COVERAGE_MATRIX.md` | "404 / unauthorized / offline states: none" | 404 and a generic error state exist (`.statepg`, `index.html` lines 486-487); unauthorised is a redirect, offline page is absent |
| `docs/TARTIL_DESIGN_SYSTEM.md` | "LessonLayout ... NOT built; no lesson player exists" | `acLesson` and `acScenarioPage` exist (Academy, `index.html` ~1470-1600) |
| `docs/UI_UX_AUDIT.md` | route inventory lacks `#/kids`, `#/academy`, `#/foundations`, `#/plan`, `#/demo` | these routes exist (`route()`, lines 470-485); the 0-violation axe result predates them |
| `docs/09_VISUAL_QA.md` | "0 axe violations on 9 pages" | does not cover Kids, Academy, Foundations; **not verified** for them |

---

## 9. Owner decisions (not taken here)

| ID | Decision | Options |
|---|---|---|
| O1 | Adopt the five-destination model and these Arabic labels, or different wording | adopt / rename / keep current |
| O2 | Academy gating for guests | keep login-only / read-only preview / open |
| O3 | Gated and not-yet-reviewed programmes (P11, P12, P15, P16): hide, preview with banner, or publish | hide / banner / publish |
| O4 | Digit convention (Arabic-Indic vs Latin) and whether an English (LTR) UI is planned | one rule per surface; LTR yes/no |
| O5 | Whether Kids and Academy become one "learn" experience with age filters or remain two products | merge / keep |
| O6 | Named reviewers for pedagogy and child safety (affects P1 content items and scenario wording) | appoint |
| O7 | Real-device and assistive-technology test budget and participants (including minors, which needs guardian consent) | scope |
| O8 | Visual direction for Kids (distinct playful layer vs one family) | one family with age mode / separate |

---

## 10. Suggested sequencing (build order, effort not estimated)

1. P0 fixes F-01 to F-12 (mostly small, mostly isolated).
2. Accessibility groups in 6.2 "Programmatic" (title, focus, tabs, sheet) together with F-14 (nav) because they touch the same functions (`route`, `renderNav`).
3. `Tabs`, `StatusBadge`, `Notice`, `PageHead` components, then migrate pages (F-15, F-16).
4. Academy structure (F-19 to F-22, F-27) after the owner decides O2/O3/O6.
5. Token consolidation (F-31 to F-34) once the components exist, so the CSS deletion is guarded by screenshots.
6. Verification pass: keyboard, screen readers, real devices, re-run axe on **all** routes including Kids, Academy, Foundations; then update the docs in section 8.

Each step needs the project's usual gate: `npm test` (packages/database) before and after, and a screenshot/axe comparison; none of that was run for this document.

---

## Evidence

Files read
- `/home/claude/quran-global-platform/CLAUDE.md`
- `docs/TARTIL_DESIGN_SYSTEM.md`, `docs/03_QURANIC_DESIGN_SYSTEM.md`, `docs/UI_UX_AUDIT.md`, `docs/PAGE_COVERAGE_MATRIX.md` (printed as `07_ROUTE_AND_ROLE_COVERAGE.md`'s sibling listing; the page-redesign report was read from `07_ROUTE_AND_ROLE_COVERAGE.md`), `docs/RESPONSIVE_QA.md`, `docs/09_VISUAL_QA.md` (first 30 lines), `docs/governance/KNOWN_LIMITATIONS.md` (first 60 lines: items 1-37)
- `packages/web-vercel/index.html`: `renderNav` and `route()` (lines 446-486), `ECO` (492-501), CSS media rules (grep), `meView` (1269-1274), `dashboard` start (743-760), `academyView` (1593-1600), `kidsView` start (1602-1606), auth view (733-742), grep results for `document.title` (0), `.focus(` (0), `keydown`/`Escape` (one `Enter` handler on search only), `role=`/`aria-` usage, `tablist`
- Audit reports (session scratchpad `audit/`): `system.md`, `home.md`, `academy-programs.md`, `academy-lesson.md`, `academy-scenario.md`, `kids.md`, `quran.md`, `tajweed.md`
- Brief: `/tmp/claude-0/-home-claude/a15fb9d9-e5d4-57e1-b4d4-18cfe5debcdc/scratchpad/brief_docs13.md`

Commands run
- `ls`/`wc` on repo and audit directories; `grep -n` and `sed -n` on `index.html` for the items above. No tests were run, nothing was started, nothing was deployed or modified except this file.

Not re-verified by me
- Every browser-level observation (contrast figures, overflow, tap-target sizes, screenshots) comes from the audit reports, not from my own run.

## Open items

1. Re-measure all proposed token values (contrast, including over gradients and translucent layers) in a browser before adoption.
2. Run a CSS coverage pass across all routes to confirm which rules are dead before deleting any.
3. Keyboard-only walkthrough, screen-reader passes (VoiceOver, NVDA, TalkBack) and 200% zoom / text-spacing checks on every learning route: not done.
4. axe-core on `#/kids`, `#/academy*`, `#/foundations`, `#/plan`: not run (existing zero-violation result predates them).
5. Real iPhone Safari and Android verification; real fonts (sandbox blocked web fonts).
6. Logged-in teacher, parent and institution views with real (non-mocked) data and long lists.
7. Audit gaps: Academy lesson player beyond 5 lessons, scenario trees (only first/last choice), Quran reader audio/tafsir (network blocked), Tasmi' result screen (no microphone; live STT blocked by 429), quiz result screens.
8. Content correctness, age-appropriateness and scholarly soundness of Academy, Kids and Tajweed text: NEEDS SCHOLARLY REVIEW; no reviewers appointed (owner decision O6).
9. Update the stale statements listed in section 8.
10. Decide and document the data-continuity story for progress held in device storage vs the server account (N9) before any "رحلتي" unification.
