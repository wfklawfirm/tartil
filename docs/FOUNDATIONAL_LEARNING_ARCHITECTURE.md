# Foundational learning architecture (TARTIL 5.1)

Status: **draft curriculum, not scholarly-approved**. Nothing here is a ruling, grade or ijazah.

## Ladder
Letters -> letter forms (isolated / initial / medial / final) -> harakat (fatha, damma, kasra, sukun, shadda, tanween) -> syllables (letter + haraka) -> reading words -> Quranic reading -> tajweed readiness. Each step is a small unit; progress is never forced linear for adults who already know part of the ladder (they can jump to the self-test).

## What exists today (tested)
- `#/foundations` (public, no account): modes *kids / adult / I-know-some*, tabs letters, forms, harakat, syllables, a 10-question self-quiz (name-of-letter, name-of-haraka). Progress mode lives in `localStorage` only (this device).
- The 28 letter names, 4 positional forms (with the 6 non-joining letters shown with 2 forms) and 8 haraka names are plain Arabic-script facts, not Quran text. No Quran text is altered or generated.

## What is deliberately NOT built
- **Audio.** The prompt requires human-reviewed recordings. None exist and none are generated: no TTS, no browser speech synthesis. The UI says so. Blocked on: recordings by a qualified human, reviewed, licensed (owner decision).
- Makharij 3D / articulation visuals, reading-word lessons from the Quran, Quranic-reading drills, tajweed-readiness gate: need scholar-approved content (owner decision on a scholarly reviewer).
- Server-side foundations progress: not stored; a learner's device-only state is honest and privacy-minimal. Teachers assign foundations work through the Homework system (kinds `reading`, `makharij`, `listening`, `tajweed`).

## Design rules enforced
- Adult mode: quiet, compact, respectful copy. The label «أمي» never appears anywhere (checked by grep in QA).
- Kids mode: large cards, one question at a time, encouraging but never comparative text.
- No rankings, streak-shaming or public leaderboards.
