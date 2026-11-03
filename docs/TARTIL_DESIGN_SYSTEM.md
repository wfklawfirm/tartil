# Tartil design system (V3 pointer)

Authoritative detail: `docs/03_QURANIC_DESIGN_SYSTEM.md` (tokens, type scale, components, theme rules). The app is a single-file vanilla SPA, so "components" are helper functions in `packages/web-vercel/index.html`.

| Brief component | Implementation |
|-----------------|----------------|
| AppHeader / PublicNavigation | `header.top`, `renderNav()` |
| MobileNavigation | `#bnav`, `#more` sheet |
| PageHero | `.hero2` (home), `pageHead()` (inner pages) |
| SectionHeading + DecorativeDivider | `h2.sec` + `divider()` |
| LearningPathCard / ecosystem card | `.ec` cards from `ECO` |
| ProgressCard / learning timeline | passport bars, `timeline()` |
| QuranReader, SurahHeading | `quranRoute`, `.cartouche`, `.mushaf` |
| AudioPlayer | `miniPlayer()` |
| OrnamentBackground | `PATS`, `patUri`, `body[data-page]` layers |
| Reader preview | `readerPreview()` |
| DataTable, EmptyState, dialogs | `table()`, `empty()`, `#more` sheet, `note()` |
| WorkspaceSidebar, CourseCard, LessonLayout, AssessmentLayout | NOT built as such (workspaces use tabbed cards; no lesson player exists) |
| ErrorState | `run()` + `.msg` blocks; no dedicated 404/unauthorized page |

Tokens live in `:root` / `[data-theme]` CSS variables; breakpoints 560/700/800/1023/1180/1500.
