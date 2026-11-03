# UI/UX audit (2026-11-03)

Scope: the single-file client `packages/web-vercel/index.html` (vanilla JS SPA, hash routing). Method: route inventory read from `route()`, `dashboard()`, `meView()`, `tajweedView()`; Playwright screenshots at 360, 390, 768, 1024, 1440 px (public routes) with a horizontal-overflow and console-error check; axe-core (WCAG 2.0/2.1/2.2 A+AA rules). The Vercel site is behind Vercel Authentication, so everything was run locally with the live API. Before images: `docs/design-screens/before/`, after: `docs/design-screens/after/`.

## Route inventory (from the code)
`#/` · `#/quran` · `#/quran/<n>[/<ayah>]` · `#/search[/<q>/<lang>]` · `#/tajweed[/makharij|sifat|ahkam|mudood|explore]` · `#/qiraat` · `#/auth` · `#/verify/<code>` · `#/me[/today|hifz|quiz|map|sanad]` (login) · `#/app[/<inst>/overview|tracks|halaqat|recitation|certs|assistant|people|admin]` (login) · `#/review[/items|sanad]` (scholar role).

## Findings and fixes
| Page | Original problem | Priority | Fix |
|---|---|---|---|
| Reader (`#/quran/<n>`) | On a phone, 8 controls + audio panel + tafsir panel sat before the first verse (two screens of tools above the text); no surah header; plain `﴿٣﴾` text as verse marker; surah name in a flat box | P0 | Surah header (cartouche), one slim strip (previous/select/next), three collapsed tool chips (recitation, tafsir, view & search) that open one panel at a time, reading canvas with frame, rosette verse markers, next/previous surah buttons |
| Reader, WebKit | Letters detached / odd gaps with tajweed colouring and justification | P0 | Colour painted with the CSS Custom Highlight API over one text node (fallback: spans with joiners); start alignment where inter-word justification is unsupported |
| Home | Flat gradient hero, 14 equal cards (information overload), no continue-reading, no sense of progression | P1 | Ornamented hero, continue-reading card from the stored position, six path cards with one action each, four-step journey, the remaining capabilities folded into one disclosure |
| Navigation | Top pill strip scrolled sideways on phones; no active-page semantics | P1 | Bottom navigation on phones (4 destinations + "more" menu, safe-area aware), `aria-current`, skip link |
| All pages | Targets below 44 px (small buttons, selects); inconsistent radii and colours; no visible focus ring | P1 | 44 px targets (coarse/narrow screens), shared tokens, gold focus ring |
| All pages | No manual night mode; dark mode followed the system only | P2 | Auto / light / dark switch (stored per browser); night palette per brief |
| Tajweed colours | Blue/purple classes low-contrast on the dark background | P2 | Lighter tints in night mode |
| Motion | None defined | P3 | Short fade-ups, all disabled under `prefers-reduced-motion` |
| Print | Header/tools printed with the text | P3 | Print stylesheet hides chrome |

Not found: horizontal overflow or console errors on any inspected route/width; axe violations (before: not measured for dark mode; after: none in 18 route/width/theme combinations).

## Not covered by this audit
Logged-in views were rendered with a mocked API (empty lists, no real data), so their layout was checked but not their behaviour with long or large data. No real Safari, screen reader or physical device was used.
