# Comparison with Tarteel (tarteel.ai), 2026-11-03

Sources actually read: the tarteel.ai/ar page returned metadata only (positioning: "AI Quran memorization"); the feature list below comes from the App Store listing for Tarteel (apps.apple.com, id1391009396) as returned by the fetch tool. Nothing was inspected inside the app itself, so behaviour and quality are not assessed.

| Tarteel feature (per store listing) | Tartil status | Notes |
|--|--|--|
| Memorisation mistake detection (AI, word-level, live) | NOT BUILT, deliberately | Needs a Qur'an-specific speech model with measured accuracy. Tartil's rule: AI output is never a grade or a ruling; recitation is reviewed by a human qari. The existing supervised-AI pipeline (human gate) is the only route; no model is calibrated for this. |
| Live correction (compare what you said to the ayah) | NOT BUILT | Depends on the above. |
| Voice search (find an ayah by reciting) | BUILT (browser speech-to-text, where supported) | Uses the browser's Arabic speech recognition, shows what was heard, user confirms, then runs the normal text search. Unsupported browsers see no button. Not identification of recitation by AI. |
| Hidden verses / peeking mode | BUILT | Review and random test hide real words visually; tap to peek; three modes (all hidden, first word, first letter). The Qur'an text is never altered. |
| Test mode (random start in your memorisation) | BUILT | "اختبار عشوائي" in My Hifz; practice only, does not alter the review schedule. |
| Advanced analytics: streaks and heatmap | PARTIAL | Streak existed; a 17-week activity heatmap is added (active day = a review or quiz). Strong/weak surah analytics exist as the mastery map. No per-ayah weak-spot analytics. |
| Historical mistakes log | NOT BUILT | Would need a table recording self-reported or reviewer-reported errors; mistakes are not detected automatically here. |
| Smart goals / goal planning | NOT BUILT | Needs a goals table and API; spaced-repetition scheduling exists. |
| Unlimited listening, background audio | PARTIAL | Mini-player exists; licensed reciter audio not loaded (owner decision on terms). |
| Adaptive Mushaf (Madani / Indo-Pak, hide ayah markers) | NOT BUILT | Only the Uthmani Hafs text is approved. |
| Premium subscription | NOT APPLICABLE | Pricing is an owner decision. |

Tested: Chromium mocked-API run of the review flow (start hidden, switch mode, peek, show all, rating posted to `/me/hifz/:id/review`), random test, heatmap rendering; axe and overflow sweeps. Voice search was not exercised (no microphone in the sandbox).
