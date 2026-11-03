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
| `#/verify/<code>` | plain table | printable certificate frame (original ornament, no seal), print button | mocked-API screenshots 390/1440, axe | Redesigned |
| `#/me/*` | cards/tables | tokens | mocked-API screenshots 360/1440 (empty data), no overflow | Restyled |
| `#/app/<inst>/*` | cards/tables/forms | tokens, tabs; **tracks: curriculum timeline** (numbered rosettes, kind, range); **passport: progress bars**; **certificates: ornamental frame** | mocked-API screenshots 360/390/1440, axe, no overflow | Restyled / tracks, certs redesigned |
| `#/review/*` | tables/forms | tokens | mocked-API render 390 (empty queue), axe | Restyled |
| Certificates (list in passport, public verify page) | plain box | frame with four corner motifs, star, serif title; print stylesheet prints only the certificate; no seal, signature or accreditation added | mocked-API screenshots, axe | Redesigned |

Added after the first report: **audio mini-player** (fixed bar: reciter, current ayah, previous/pause/next, close; sits above the bottom navigation and the page reserves room for it; playback still stops when leaving the reader, as before), **desktop side panel** (from 1180 px the open tool panel docks beside the text, sticky), curriculum timeline, certificate frame, passport progress bars.

Known gaps against the brief: no dedicated lesson workspace (the platform has no lesson pages; units are progress records, so the timeline is the curriculum view); Meccan/Medinan data is not in the stored source, so the surah header omits it rather than copy it from memory; per-unit completion marks are not shown because the passport API returns only counts.
