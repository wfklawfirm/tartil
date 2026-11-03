# Kids activity engine
Implemented (client side): activities `rec` (letter -> name), `match` (shape -> same shape), `pair` (look-alike letters), `har` (letter with a mark -> mark name), plus `place` (6-question placement).
Event log: `{t, act, item, ok}` in `localStorage` (last 600 events).
Mastery of a letter: at least 4 correct of its last 5 attempts across at least 2 different days (not click counts).
Recommendation rules, in priority order: repeated look-alike confusion (>=2 recent errors on a pair) -> pair drill on that pair; recent harakat accuracy < 0.6 -> harakat drill; recent recognition accuracy < 0.6 -> shape matching of unmastered letters; >= 8 mastered letters -> syllable challenge; otherwise continue recognition. A teacher override does not exist yet (no server-side record). Thresholds are my heuristics, not validated.
Feedback is positive and never failing: wrong answers say to look again and show the answer. Not implemented: listen & select, watch & repeat (need audio / makharij).
