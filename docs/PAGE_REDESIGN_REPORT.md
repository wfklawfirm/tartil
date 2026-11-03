# Page redesign report (2026-11-03)

Status key: **Redesigned** = layout rebuilt; **Restyled** = new tokens/components applied by the shared system, layout unchanged; verification column says how it was checked. "Approved" below means design verification only — nothing here is a scholarly approval.

| Route | Before | Done | Checks | Status |
|---|---|---|---|---|
| `#/` | flat hero, 14 equal cards | ornamented hero, continue-reading, 6 path cards, journey, folded feature list | screenshots 360/390/768/1024/1440, axe light+dark, no overflow | Redesigned |
| `#/quran` (index) | grid of surah links | tokens, cards, 44 px targets | screenshots, axe | Restyled |
| `#/quran/<n>` | tools wall above text | cartouche, strip, tool chips, canvas, rosette markers, prev/next | screenshots, axe (tools open), integrity script (2,180 verses identical, numbering correct) | Redesigned |
| `#/search` | plain form | tokens, controls | screenshots, axe | Restyled |
| `#/tajweed[...]` | plain cards | tokens, tabs, cards | screenshots, axe | Restyled |
| `#/qiraat` | plain cards | tokens | screenshots, axe | Restyled |
| `#/auth` | plain form | tokens, 44 px inputs | screenshots, axe | Restyled |
| `#/verify/<code>` | plain card | tokens | not separately screenshotted | Restyled (unverified visually) |
| `#/me/*` | cards/tables | tokens | mocked-API screenshots 360/1440 (empty data), no overflow | Restyled |
| `#/app/<inst>/*` | cards/tables/forms | tokens, tabs | mocked-API screenshots 360/1440 (overview, tracks, people, admin), no overflow | Restyled |
| `#/review/*` | tables/forms | tokens | not rendered (scholar role needs a real account) | Restyled (unverified visually) |
| Certificates (print view) | — | print stylesheet hides chrome | not visually verified | Unverified |

Known gaps against the brief: no dedicated lesson workspace or curriculum timeline (the platform has no such pages — not invented); Meccan/Medinan data is not in the stored source, so the surah header omits it; the audio player is restyled, not rebuilt as a persistent mini-player; tafsir/translation use collapsible panels rather than a desktop side panel; certificate redesign not done.
