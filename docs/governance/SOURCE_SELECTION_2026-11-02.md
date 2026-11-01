# Source selection (audio, translations, tafsir) — 2026-11-02

Owner instruction 2026-11-02: "research the most important internationally recognised sources and adopt them".
This records the selection **in principle**. Nothing has been downloaded or integrated. A source becomes usable only after the
step in the "Next action" column is done, and licences stay `NOT cleared` until the provider's own access/agreement exists.
Terms below were read on 2026-11-02 from the providers' pages (summaries, not legal advice; re-read before relying on them).

## Findings
| Source | Role | What its published terms say | Fit |
|---|---|---|---|
| **King Fahd Glorious Quran Printing Complex (KFGQPC), Madinah** | Authoritative origin of the Madinah mushaf, fonts, recitation recordings and translations (46 languages) | Font EULA: free to use and distribute, but **may not be sold, modified, translated, reproduced**. Its recordings page says digital copies of recitation recordings are offered **free for apps, websites and broadcast, inside and outside KSA** (no further terms published; "not responsible for technical errors"). | Best authority match for a platform that wants scholarly standing. Needs a **written request / agreement** for audio and translations; use the mushaf font unmodified. |
| **Quran Foundation (Quran.com) API** | Text, translations, audio, reflections through an API | App may charge or show ads; **Quran text must not be modified**; **no caching/storing QF content > 1 week** except through its Content Sync; no prepackaged database or build-time bundle; selling/redistributing content as data needs a signed commercial licence; ML/model training restricted; developer account, minimal OAuth scopes, public privacy policy, breach report within 24 h. | Good for **audio and translations by streaming**; incompatible with our current approach of storing text in our own database (text already comes from Tanzil, so unaffected). |
| **Islamic Network / AlQuran.cloud** | Free keyless API and audio CDN | Text free for non-commercial use, acknowledgement for commercial; **recitations licensed for non-commercial redistribution, reciters keep copyright and may ask for removal**; translations must credit the translator by name; text must not be altered or mixed so it could be mistaken for the Quran. Its own page credits Tanzil and Quran Academy for the text. | Usable for **streaming audio by reference** during evaluation; the commercial status of audio is unclear, so not suitable as the launch source without confirmation. |
| **Tanzil** | Quran text (already adopted, provisional) and translation collection | FAQ: resources "available for non-commercial purposes"; translations' accuracy not guaranteed, translator terms are separate. The terms page could not be read (404), so translation licences are **unverified**. | Text: keep. Translations: per-translation licence check required before use. |

## Decision (in principle)
1. **Text:** keep Tanzil Uthmani/Hafs (already live). Add KFGQPC as the **verification reference** for the scholarly review (compare, never overwrite).
2. **Audio:** stream, do not host copies. Preferred route 1: request KFGQPC's free recitation recordings for use in the platform. Route 2 (evaluation, and fallback): Quran Foundation API (developer account) with its 1-week cache limit. Reciters are chosen by the owner/scholarly reviewer from those the provider has the right to supply; no reciter is named here because none has been verified.
3. **Translations:** choose per language from KFGQPC's translations or Quran Foundation's catalogue; each translation needs its own licence line in `LICENSE_REGISTER.md` and the translator named in the UI. Until then no translation is shown.
4. **Tafsir:** classical works are old, but **editions and digital corpora carry their own rights**; use only a tafsir the provider states the licence for (Quran Foundation or KFGQPC's al-Muyassar), and cite the edition. Not yet verified; nothing integrated.
5. Design rule for any of the above: external content is shown **beside** the verbatim ayah, never merged into it, always with source and edition attribution, and always labelled as not a ruling.

## Next action (needs the owner)
| Item | Who | Action |
|---|---|---|
| KFGQPC audio + translations | Owner (AIJUR FZCO) | Send a written request through qurancomplex.gov.sa asking for free use of recitation recordings and translations in the platform. |
| Quran Foundation | Owner | Create a developer account and accept the developer terms; give the platform's privacy policy URL. |
| Reciters / languages | Owner + scholarly reviewer | Pick reciters and translation languages from what the providers actually supply. |
| Legal read | Counsel | Confirm commercial-use reading of each licence before the public launch. |

## Not done
No file was fetched from any provider, no key was created, nothing was added to the database or UI.
