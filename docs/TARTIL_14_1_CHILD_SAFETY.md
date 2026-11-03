# TARTIL 14.1 - Child safety review of the academy guidance

Snapshot: 2026-11-03, about 23:35 EET (HEAD 69e3559 plus working tree; a parallel stream was rewriting the privacy wording in guides and lessons while I worked, so counts may shift). Reviewed: `docs/human-formation/guides/P01-P24.json`, `lessons/*.json`, `docs/CHILD_SAFETY_AND_ACCESS.md`, `CLAUDE.md`, `PEDAGOGY.md` section 8, and the implementation in `packages/web-vercel/index.html`. Related: `TARTIL_14_1_PROGRESS_PERSISTENCE.md`, `TARTIL_14_1_ACTUAL_PAGE_AUDIT.md`. This is a review, not a legal or clinical opinion; the child-protection reviewer role is unfilled, so every conclusion needs that person's sign-off.

## 1. What the project already guarantees (verified)

- `CLAUDE.md`: a minor's recording requires live guardian consent (DB trigger `enforce_recording_consent`, migration 0001); no unsupervised adult-child contact; no real child data in dev/test.
- `CHILD_SAFETY_AND_ACCESS.md`: guardian-managed access and the consent trigger. It says nothing about the academy notebook, academy progress, or the mentor guide. That is a gap in the document, not in the principle.
- `PEDAGOGY.md` section 8: referral guidance, no data collection, retention policy "not set by the owner".
- The age gate in the web app applies only to accounts that have a `student` membership and is enforced in the UI only.

## 2. What to keep

1. Cooldown handled within adult sight. `guides/P07.json` places the cooldown corner where an adult can see the child. Keep and extend to every program that teaches a calm-down step.
2. "Avoid" lists that forbid absolute confidentiality: P07 lists «وعد بالكتمان المطلق». Keep, and make it a rule in every guide.
3. The child is never asked to apologise to someone who hurt him: P07 `when_to_refer[4]` («لا يُطلب من متعلم يتعرض للأذى أن يعتذر لمن آذاه، ويُنقل الأمر إلى الكبار»). Keep.
4. Immediate child-protection procedure when a child discloses harm or fear: P07 `when_to_refer[0]` («تُتَّبع إجراءات حماية الطفل المعتمدة فورًا ولا يُترك الأمر لاجتهادك»). Keep.
5. Descriptive, non-scoring assessment (appeared / practicing / needs support) and no ranking.
6. Mentors describe situations, not persons; the child decides what to write and show.

## 3. What to correct

### 3.1 No automatic fatwa referral for every question
- Fact: 20 of 24 guides mention الإفتاء (P01-P03, P05-P20 and P23; not P04, P21, P22, P24; scanned today). P07 `how_to_respond[5]` answers «هل غضبي هذا حرام أو جائز؟» entirely by referral ("للمعلم المختص أو لجهة الإفتاء المعتمدة"), and `when_to_refer[3]` sends every question about a ruling, a family matter or a law to the specialist teacher, the fatwa authority or "the appropriate body", telling the mentor "ولا تجيب بنفسك".
- Problem: a 10-year-old asking whether his anger is sinful is usually asking whether he is a bad person. A flat referral reads as dismissal and teaches that questions are a problem; a blanket referral for "family matters" can also send a child with a safety concern away from the adult who should act.
- Keep the rule that the mentor does not issue rulings (CLAUDE.md: no religious authority claims). Change the response pattern to three parts: (a) acknowledge the question and the feeling; (b) give the general, non-ruling frame already in the program (anger is a feeling; what we do with it is what we practise); (c) refer only the ruling part to a named scholar or the family, and say so briefly. Distinguish: a legal/ruling question gets (a)-(c); a question that signals fear, harm or family danger is not a "family matter to refer" but a child-protection matter (section 2, item 4).
- Suggested guide wording: «سؤالك مهم. شعور الغضب نفسه ليس ما نحكم عليه هنا؛ ما نتدرب عليه هو ماذا نفعل حين نغضب. أما الحكم الشرعي في مسألة محددة فنسأل عنه معًا من يُعتمد في الفتوى، وسأكتب سؤالك لنسأل.» Review by a scholarly reviewer before use.

### 3.2 No separating a child from the group without supervision
- `lessons_G3.json` S5-L2 learner text says «ابتعد قليلًا إلى مكان هادئ» with no supervision caveat; scenario S5-S1 has a character who «يذهب إلى غرفته وحده» and another who runs to the hallway.
- Rule: stepping away is allowed only as "to the calm corner in sight of the adult" in a group, and "to a place where a family member is nearby" at home. Never "alone in a closed room" and never out of sight of a responsible adult. Learner text should say «ابتعد قليلًا إلى الركن الهادئ، وأخبر الكبير الذي معك». The guide must state who accompanies the child and what the mentor does when a child leaves the group.

### 3.3 Distinguish a pedagogical exercise from psychotherapy
- The anger, grief and fear programs use reflective prompts that resemble therapy techniques. Add to every guide (and to the parent text) a standard sentence: this is a skills exercise for daily life; it does not diagnose, treat or replace a specialist; persistent or severe distress goes to a qualified professional. P07 `when_to_refer[1]` already covers repeated severe anger, persistent anxiety, long sadness and talk of self-harm; make it a template present in all 24 guides, with the referral path owned by the institution (not the app).
- Do not label children ("angry child", "anxious"), do not ask them to recount trauma, and tell mentors not to probe if a child starts to disclose; they listen, do not promise secrecy, and follow the procedure.

### 3.4 No absolute confidentiality
- Fact: the `private_note` text under `life_practice` appears in all 255 lessons. A scan today found no safety exception in any of the 255 (no wording about danger, harm, or telling a trusted adult). In the guides' parent privacy text (`for_parent.privacy`, 21 present) 7 lack any safety exception by a crude regex (P01, P03, P05, P06, P17, P18, P20); P01 reads «ولا يطّلع عليه المعلم ولا غيره».
- Rule: the notebook is private from mentors and parents by default and nobody asks to read it. That is a promise about the system, not about a disclosure. Add to every parent privacy text, every mentor safeguard and the learner `private_note`: «إن كتبتَ شيئًا يخيفك أو يؤذيك أو يؤذي غيرك، فمن حقك ومن الأفضل أن تخبر شخصًا كبيرًا تثق به؛ لن يُغضَب منك». Adults must say the same orally: "I will keep what you tell me private unless someone may be in danger; then I must involve people who can protect you."
- The platform has no way to read the notebook (it is local, section 4), so the safety exception is about what the adult does when a child chooses to say something, not about monitoring.

## 4. Privacy claims versus the actual implementation

Verified in `packages/web-vercel/index.html` (last modified 23:12) and the guides:

| Claim in guides / lessons / UI | Actual implementation | Status |
|---|---|---|
| Notebook stays on this device and is sent to no one («يبقى هذا الدفتر على هذا الجهاز ولا يُرسَل إلى أحد»; UI line "يُحفظ هنا على هذا الجهاز فقط") | Stored in `localStorage` key `acx_ref_<lessonId>` through `acLS.set`; the viewer calls no academy, reflection or progress API (it fetches only the 4 same-origin JSON files and `/me`). | True. |
| «لا يراه أحد» / «لا يراه غيرك» (older lessons, UI suffix) | Keys are not namespaced per user. Anyone using the same browser profile can read them, and logout does not clear them. The parallel stream replaced many such lines with «من يستعمل الجهاز نفسه قد يراه». | Mismatch where the old wording remains; verify no leftover «لا يراه أحد». |
| «يمكنه حذفه متى شاء من زر الحذف» (156 `private_note` entries, 3 lesson safeguards, 2 privacy texts, P07 overview and FAQ; about 166 occurrences) | `index.html` has no delete or clear control for `acx_ref_*`, `acx_done`, `acx_guide` or `acx_seen` (searched: no matching handler; the only delete-like strings concern certificates). The textarea writes on every input event and there is no "clear" button. | MISMATCH unless the UI stream adds the button before release. The older phrase «وله أن يمحوه متى شاء» (16 lessons) was an overstatement of the same kind. |
| «يصلكم ملاحظة وصفية» / a short descriptive note reaches parents (guides P01, P02, P04, P05, P11, P14, P17, P18, P19, P20 mention a descriptive note) | No UI or API exists for formative observations. The table `formative_observations` (migration 0017) is local only, not applied, not wired. | MISMATCH: promise has no implementation. Reword to «قد يشاركك المعلم ملاحظة وصفية قصيرة إن اعتمدت جهتكم ذلك» or implement. |
| «ولا يُسجَّل صوته أو صورته إلا بموافقة ولي أمر حي» | DB trigger exists (0001) for recordings. The academy page records nothing. | True for the platform; irrelevant to this page. |
| Progress and completion («أنجزت») | `acx_done` in localStorage; per-device, lost on a browser change; `0019_academy_progress.sql` plus `academy-progress.ts` exist in the working tree, not applied, not wired. | Not a privacy claim, but no "my progress is saved on my account" statement is safe yet. |
| Mentor and parent guidance is for adults | The guides render inside the child's program page (details elements: guide notes, safeguards, review gate). The "وضع المرشد" toggle on the lesson page shows `guide_script` and `safeguards` to any user; it is a plain localStorage boolean. The files are public static JSON. | Mismatch with the assumption that adults only see them. The child can see them; nothing is secret. |
| Age gate keeps adult material from children | UI-only, only for accounts with a `student` membership; an anonymous visitor and any non-student account are not gated; the JSON files are public. | Do not claim age protection. |

Not verified by me: whether the notebook could leak through a shared device or browser sync (that is how localStorage behaves, not code I tested), and the deployed site (Vercel Auth).

## 5. Required fixes, in order

1. Add the safety exception sentence (section 3.4) to all learner `private_note` texts, all `for_parent.privacy` texts and the guide safeguards. Reword the two guides' claims about a descriptive note.
2. Make the UI honest first: add a delete control and a per-user key (or say "على هذا الجهاز"), or remove every «زر الحذف» claim. Until then treat the 166 occurrences as an open mismatch.
3. Replace the blanket referral wording (section 3.1) in all 20 guides.
4. Add supervised-cooldown wording to S5 lessons and scenarios (section 3.2).
5. Add the "not psychotherapy" standard paragraph to all 24 guides.
6. Hide `guide_script`, `safeguards` and the review data from learner sessions: a role gate in the API plus a build split (see the publication document); do not rely on the toggle.
7. Owner decisions needed: retention policy for any server-side child data, who holds the child-protection reviewer role, and the institution's reporting procedure that the guides refer to. None is set today.

## 6. Out of scope of this review
Recording consent flows, Quran recitation AI, and the kids app (see `CHILD_RECITATION_AI.md` and `CHILD_AND_ADULT_BEGINNER_UX.md`).
