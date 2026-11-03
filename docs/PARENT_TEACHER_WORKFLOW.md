# Parent / teacher workflow

**Teacher:** assign (3 steps) -> students get it in واجبي اليوم -> submissions appear in *Awaiting review* (listen to audio if any, see the student's note and an unapproved machine hypothesis if attached) -> Approve / Needs retry (with a note shown to the child) / Excuse -> *Follow-up* tab shows counts (new, in progress, awaiting review, retry, approved, overdue) and parent/student requests (extension / obstacle). Counts only; no rankings.

**Parent (verified guardian only):** pick the child, see today's homework and its status, read the teacher's note, mark done-mode homework done, report an obstacle or request more time. A parent sees only children linked through a *verified, non-revoked* guardian link (RLS `app.is_guardian_of`).

**Isolation proven by tests (API, PGlite, real RLS):** a classmate, another child's guardian, an unrelated teacher, and a user from another institution all get 404 / empty for someone else's homework; students and guardians cannot assign; an unrelated qari cannot assign to the student.

**Not built yet:** push/email notifications (no provider configured: owner decision), in-app voice feedback from the teacher (needs storage + consent design), parent workspace beyond homework (reports, schedule), weekly digest.
