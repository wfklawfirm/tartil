# Proposed kids backend schema (not applied)
Reuse existing tables first: users, memberships, student_profiles, guardian_links, homework_*, hifz_items, recitation_attempts, study_plans. Proposed additions only if approved:
- `kid_profiles(user_id, band, placement_level, teacher_level_override)`
- `kid_activity_attempts(user_id, activity, item, ok, at)` (replaces the local log)
- `kid_mastery(user_id, item, state, evidence_days)` computed with the same rule as the client
- content tables (`letters`, `sound_variants`, `articulation_points`, `reference_audio`) each carrying source, licence, review status and version; all default to not-cleared.
RLS must follow the project rule: students own rows; teacher by assignment/halaqah; guardian only for a verified linked child; no ranking views. Not applied: it needs the owner's approval because it stores children's learning data.
