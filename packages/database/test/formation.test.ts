import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID as id } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { withContext } from '../src/index.ts';
import { freshDb, seedWorld } from './fixtures.ts';

// Migration 0017: formation engines. Synthetic data only (no real child data).
let db: PGlite; let w: Awaited<ReturnType<typeof seedWorld>>;
let sch: string, ped: string, cp: string, sch2: string, author: string, multi: string;
const as = <T>(userId: string | undefined, institutionId: string | undefined, fn: Parameters<typeof withContext<T>>[2]) =>
  withContext(db as never, { userId, institutionId }, fn);
const rows = async (u: string | undefined, inst: string | undefined, sql: string, p: unknown[] = []) => (await as(u, inst, tx => tx.query(sql, p))).rows;
const mkUser = async (name: string, inst: string, role: string) => {
  const u = id();
  await db.query(`INSERT INTO users (id, display_name, email, password_hash) VALUES ($1,$2,$3,'x')`, [u, name, `${name}@example.test`]);
  await db.query(`INSERT INTO memberships (institution_id, user_id, role) VALUES ($1,$2,$3)`, [inst, u, role]);
  return u;
};

before(async () => {
  db = await freshDb(); w = await seedWorld(db);
  sch = await mkUser('f-sch', w.A, 'scholarly_reviewer'); ped = await mkUser('f-ped', w.B, 'pedagogical_reviewer'); cp = await mkUser('f-cp', w.A, 'child_protection_reviewer');
  sch2 = await mkUser('f-sch2', w.A, 'scholarly_reviewer'); author = await mkUser('f-author', w.A, 'pedagogical_reviewer');
  multi = await mkUser('f-multi', w.A, 'scholarly_reviewer');
  await db.query(`INSERT INTO memberships (institution_id, user_id, role) VALUES ($1,$2,'pedagogical_reviewer')`, [w.A, multi]);
});

// ---------------------------------------------------------------- source records
const newRec = async (comp: string, version = 1) =>
  (await as(author, undefined, tx => tx.query<{ id: string }>(`INSERT INTO source_records (competency_id, version, title, content_md, created_by) VALUES ($1,$2,'t','internal text',$3) RETURNING id`, [comp, version, author]))).rows[0]!.id;
const setStatus = (user: string, rid: string, to: string) => as(user, undefined, tx => tx.query(`UPDATE source_records SET review_status = $2 WHERE id = $1`, [rid, to]));
const review = (user: string, rid: string, role: string, decision: string) => as(user, undefined, tx => tx.query(`INSERT INTO source_record_reviews (record_id, reviewer_id, role, decision) VALUES ($1,$2,$3,$4)`, [rid, user, role, decision]));

test('new reviewer roles exist; the role list otherwise unchanged', async () => {
  const r = (await db.query<{ def: string }>(`SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'memberships_role_check'`)).rows[0]!.def;
  for (const x of ['tenant_admin', 'scholarly_reviewer', 'qari', 'student', 'guardian', 'safeguarding_officer', 'pedagogical_reviewer', 'child_protection_reviewer']) assert.ok(r.includes(x), x);
});

test('source records: only reviewers read/write; learners, teachers, guardians and admins see nothing', async () => {
  const rid = await newRec('K1');
  for (const u of [w.sA1, w.qariA1, w.gA1, w.adminA, w.safeA, w.adminB]) {
    assert.equal((await rows(u, w.A, `SELECT 1 FROM source_records`)).length, 0, 'read');
    await assert.rejects(as(u, w.A, tx => tx.query(`INSERT INTO source_records (competency_id, version, title, content_md, created_by) VALUES ('K2',1,'t','x',$1)`, [u])));
  }
  assert.equal((await rows(sch, undefined, `SELECT 1 FROM source_records WHERE id = $1`, [rid])).length, 1);
  assert.equal((await rows(undefined, undefined, `SELECT 1 FROM source_records`)).length, 0);
  await assert.rejects(as(author, undefined, tx => tx.query(`INSERT INTO source_records (competency_id, version, title, content_md, created_by) VALUES ('K3',1,'t','x',$1)`, [sch])));   // cannot forge created_by
  await assert.rejects(as(author, undefined, tx => tx.query(`INSERT INTO source_records (competency_id, version, title, content_md, created_by, review_status) VALUES ('K3',1,'t','x',$1,'approved')`, [author])));
});

test('approval trigger: approved only with three distinct role approvals on the current content', async () => {
  const rid = await newRec('K2');
  await assert.rejects(setStatus(sch, rid, 'approved'), /source_record_illegal_transition/);               // draft -> approved
  await setStatus(author, rid, 'under_review');
  await assert.rejects(setStatus(sch, rid, 'approved'), /approval_requires_three_role_approvals/);          // no reviews
  await review(sch, rid, 'scholarly', 'approve');
  await assert.rejects(setStatus(sch, rid, 'approved'), /approval_requires_three_role_approvals/);          // 1 of 3
  await review(ped, rid, 'pedagogical', 'approve');
  await assert.rejects(setStatus(sch, rid, 'approved'), /approval_requires_three_role_approvals/);          // 2 of 3
  await assert.rejects(setStatus(ped, rid, 'approved').then(() => db.query(`UPDATE source_records SET review_status='approved' WHERE id=$1`, [rid])), /approval_requires_three_role_approvals/);   // owner too
  await review(cp, rid, 'child_protection', 'approve');
  await setStatus(sch, rid, 'approved');
  assert.equal((await db.query<{ review_status: string }>(`SELECT review_status FROM source_records WHERE id=$1`, [rid])).rows[0]!.review_status, 'approved');
  await assert.rejects(as(sch, undefined, tx => tx.query(`UPDATE source_records SET content_md = 'edited' WHERE id = $1`, [rid])), /source_record_locked_after_submission/);
  await assert.rejects(db.query(`DELETE FROM source_records WHERE id=$1`, [rid]), /retired_not_deleted/);
  await setStatus(sch, rid, 'retired');
  await assert.rejects(setStatus(sch, rid, 'draft'), /illegal_transition/);
});

test('one person holding two reviewer roles cannot stand in for two reviewers; the author cannot review; a role must be actually held', async () => {
  const rid = await newRec('K3');
  await setStatus(author, rid, 'under_review');
  await review(multi, rid, 'scholarly', 'approve');
  await review(multi, rid, 'pedagogical', 'approve');            // allowed to record, but it is still one person
  await review(cp, rid, 'child_protection', 'approve');
  await assert.rejects(setStatus(sch, rid, 'approved'), /approval_requires_three_role_approvals/);
  await assert.rejects(review(author, rid, 'pedagogical', 'approve'), /author_cannot_review_own_record/);
  await assert.rejects(review(sch, rid, 'child_protection', 'approve'), /(reviewer_lacks_role|row-level security)/);
  await assert.rejects(review(sch, rid, 'scholarly', 'approve').then(() => as(w.qariA1, undefined, tx => tx.query(`INSERT INTO source_record_reviews (record_id, reviewer_id, role, decision) VALUES ($1,$2,'scholarly','approve')`, [rid, w.qariA1]))), /(row-level security|reviewer_lacks_role)/);
  await review(ped, rid, 'pedagogical', 'approve');              // a real second person completes it
  await review(sch2, rid, 'scholarly', 'approve');
  await setStatus(sch, rid, 'approved');
});

test('reject / changes leave review at once; edits invalidate earlier approvals; reviews are immutable; a role that lost its membership no longer counts', async () => {
  const rid = await newRec('K4');
  await assert.rejects(review(sch, rid, 'scholarly', 'approve'), /record_not_under_review/);               // draft cannot be reviewed
  await setStatus(author, rid, 'under_review');
  await review(sch, rid, 'scholarly', 'approve'); await review(ped, rid, 'pedagogical', 'approve');
  await review(cp, rid, 'child_protection', 'changes');
  assert.equal((await db.query<{ review_status: string }>(`SELECT review_status FROM source_records WHERE id=$1`, [rid])).rows[0]!.review_status, 'draft');
  await as(author, undefined, tx => tx.query(`UPDATE source_records SET content_md = 'revised' WHERE id = $1`, [rid]));
  await setStatus(author, rid, 'under_review');
  await assert.rejects(setStatus(sch, rid, 'approved'), /approval_requires_three_role_approvals/);          // old approvals bound to the old text
  await review(sch, rid, 'scholarly', 'approve'); await review(ped, rid, 'pedagogical', 'approve'); await review(cp, rid, 'child_protection', 'approve');
  await db.query(`UPDATE memberships SET status='suspended' WHERE user_id=$1`, [ped]);
  await assert.rejects(setStatus(sch, rid, 'approved'), /approval_requires_three_role_approvals/);
  await db.query(`UPDATE memberships SET status='active' WHERE user_id=$1`, [ped]);
  await setStatus(sch, rid, 'approved');
  await assert.rejects(db.query(`UPDATE source_record_reviews SET decision='approve'`), /immutable/);
  await assert.rejects(db.query(`DELETE FROM source_record_reviews`), /immutable/);
  const rj = await newRec('K4', 2); await setStatus(author, rj, 'under_review'); await review(sch, rj, 'scholarly', 'reject');
  assert.equal((await db.query<{ review_status: string }>(`SELECT review_status FROM source_records WHERE id=$1`, [rj])).rows[0]!.review_status, 'rejected');
  await assert.rejects(newRec('K4', 2), /duplicate key/);
});

// ---------------------------------------------------------------- reflection log
// the child sets their own band through the app path (a teacher/owner cannot touch it: kid_teacher_only)
const kid = (student: string, band: string) => as(student, w.A, tx => tx.query(`INSERT INTO kid_profiles (institution_id, student_user_id, band) VALUES ($1,$2,$3) ON CONFLICT (institution_id, student_user_id) DO UPDATE SET band = $3`, [w.A, student, band]));
const consent = (student: string, by: string, extra = '') => db.query(`INSERT INTO consents (institution_id, student_user_id, granted_by_user_id, purpose ${extra ? ', ' + extra.split('=')[0] : ''}) VALUES ($1,$2,$3,'reflection_journal' ${extra ? ', ' + extra.split('=')[1] : ''})`, [w.A, student, by]);
const reflect = (student: string, body = 'private words', inst = w.A) => as(student, inst, tx => tx.query<{ id: string }>(`INSERT INTO reflection_entries (institution_id, owner_id, body) VALUES ($1,$2,$3) RETURNING id`, [inst, student, body]));

test('reflection: an adult may write; nothing but the owner can ever read it', async () => {
  const e = (await reflect(w.sA3adult)).rows[0]!.id;
  assert.equal((await rows(w.sA3adult, undefined, `SELECT 1 FROM reflection_entries`)).length, 1);   // identity alone is enough for own data
  for (const [u, inst] of [[w.adminA, w.A], [w.safeA, w.A], [w.qariA1, w.A], [w.qariA2, w.A], [w.gA1, w.A], [w.sA1, w.A], [sch, w.A], [cp, w.A], [w.adminB, w.B], [w.xBoth, w.A], [w.xBoth, w.B], [w.adminA, w.B], [undefined, undefined]] as const)
    assert.equal((await rows(u, inst, `SELECT 1 FROM reflection_entries`)).length, 0, `reader ${u}`);
  // owner-only even for the table owner's definer helpers: FORCE RLS
  assert.equal((await db.query<{ f: boolean }>(`SELECT relforcerowsecurity AS f FROM pg_class WHERE relname = 'reflection_entries'`)).rows[0]!.f, true);
  // nobody else can delete; no UPDATE exists at all
  assert.equal((await as(w.adminA, w.A, tx => tx.query(`DELETE FROM reflection_entries WHERE id=$1 RETURNING id`, [e]))).rows.length, 0);
  await assert.rejects(as(w.sA3adult, w.A, tx => tx.query(`UPDATE reflection_entries SET body='x' WHERE id=$1`, [e])), /permission denied/);
  // no grade / score / share column
  const cols = (await db.query<{ column_name: string }>(`SELECT column_name FROM information_schema.columns WHERE table_name='reflection_entries'`)).rows.map(r => r.column_name);
  assert.deepEqual(cols.sort(), ['body', 'created_at', 'id', 'institution_id', 'owner_id', 'prompt_ref'].sort());
  // cannot write as someone else, cannot write without being a student of the institution, cannot write in a forged context
  await assert.rejects(as(w.sA3adult, w.A, tx => tx.query(`INSERT INTO reflection_entries (institution_id, owner_id, body) VALUES ($1,$2,'x')`, [w.A, w.sA1])), /(row-level security|reflection_age_minimum|student_profile_missing)/);
  await assert.rejects(reflect(w.qariA1), /(row-level security|student_profile_missing)/);
  await assert.rejects(as(w.sA3adult, w.B, tx => tx.query(`INSERT INTO reflection_entries (institution_id, owner_id, body) VALUES ($1,$2,'x')`, [w.B, w.sA3adult])), /(row-level security|student_profile_missing)/);
  await assert.rejects(reflect(w.sA3adult, '   '), /check/);
  await assert.rejects(reflect(w.sA3adult, 'x'.repeat(5001)), /check/);
  // the owner deletes
  assert.equal((await as(w.sA3adult, undefined, tx => tx.query(`DELETE FROM reflection_entries WHERE id=$1 RETURNING id`, [e]))).rows.length, 1);
  // the audit log never records these tables
  assert.equal((await db.query(`SELECT 1 FROM audit_logs WHERE object_type IN ('reflection_entries','life_mission_runs','scenario_runs','formative_observations')`)).rows.length, 0);
});

test('reflection: minimum age 10 (adult, or minor in band c) and a live guardian consent for a minor', async () => {
  await assert.rejects(reflect(w.sA1), /reflection_age_minimum/);                 // minor, no band known
  await kid(w.sA1, 'a'); await assert.rejects(reflect(w.sA1), /reflection_age_minimum/);
  await kid(w.sA1, 'b'); await assert.rejects(reflect(w.sA1), /reflection_age_minimum/);   // 7-10 includes under-10s
  await kid(w.sA1, 'c');
  await assert.rejects(reflect(w.sA1), /guardian_consent_required/);              // band ok, no consent
  await db.query(`INSERT INTO consents (institution_id, student_user_id, granted_by_user_id, purpose) VALUES ($1,$2,$3,'data_processing')`, [w.A, w.sA1, w.gA1]);
  await assert.rejects(reflect(w.sA1), /guardian_consent_required/);              // a generic consent is not enough
  await consent(w.sA1, w.gA1, `expires_at=now() - interval '1 day'`);
  await assert.rejects(reflect(w.sA1), /guardian_consent_required/);              // expired
  // the consent can only be granted by a verified guardian (existing consents policy): an unverified guardian cannot
  await assert.rejects(as(w.gA2unverified, w.A, tx => tx.query(`INSERT INTO consents (institution_id, student_user_id, granted_by_user_id, purpose) VALUES ($1,$2,$3,'reflection_journal')`, [w.A, w.sA2, w.gA2unverified])), /row-level security/);
  const c = (await as(w.gA1, w.A, tx => tx.query<{ id: string }>(`INSERT INTO consents (institution_id, student_user_id, granted_by_user_id, purpose) VALUES ($1,$2,$3,'reflection_journal') RETURNING id`, [w.A, w.sA1, w.gA1]))).rows[0]!.id;
  const e = (await reflect(w.sA1, 'a minor entry')).rows[0]!.id;
  assert.equal((await rows(w.gA1, w.A, `SELECT 1 FROM reflection_entries`)).length, 0);   // the consenting guardian still cannot read it
  assert.equal((await rows(w.qariA1, w.A, `SELECT 1 FROM reflection_entries`)).length, 0);
  await as(w.gA1, w.A, tx => tx.query(`UPDATE consents SET revoked_at = now() WHERE id = $1`, [c]));
  await assert.rejects(reflect(w.sA1), /guardian_consent_required/);              // revoked: no new entries
  assert.equal((await rows(w.sA1, undefined, `SELECT 1 FROM reflection_entries WHERE id=$1`, [e])).length, 1);   // existing ones stay the child's to read/delete
  // unverified guardian link => no entry even if a consent row existed
  await kid(w.sA2, 'c'); await db.query(`INSERT INTO consents (institution_id, student_user_id, granted_by_user_id, purpose) VALUES ($1,$2,$3,'reflection_journal')`, [w.A, w.sA2, w.gA2unverified]);
  await assert.rejects(reflect(w.sA2), /guardian_consent_required/);
  // the owner connection cannot slip a minor's entry in either (the gate reads the child's rows as the child)
  await assert.rejects(db.query(`INSERT INTO reflection_entries (institution_id, owner_id, body) VALUES ($1,$2,'x')`, [w.A, w.sA2]));
});

// ---------------------------------------------------------------- life missions
test('life missions: private steps; guardian/teacher see status only; completion is never undone; reflection link is the owner\'s own', async () => {
  const e = (await reflect(w.sA3adult, 'for a mission')).rows[0]!.id;
  const run = (await as(w.sA3adult, w.A, tx => tx.query<{ id: string }>(`INSERT INTO life_mission_runs (institution_id, learner_id, mission_ref, steps_done, reflection_id) VALUES ($1,$2,'u-sabr-1','{0,1}',$3) RETURNING id`, [w.A, w.sA3adult, e]))).rows[0]!.id;
  assert.equal((await rows(w.sA3adult, w.A, `SELECT status FROM life_mission_status`))[0]!.status, 'started');
  await as(w.sA3adult, w.A, tx => tx.query(`UPDATE life_mission_runs SET steps_done='{0,1,2}', completed_at = now() WHERE id=$1`, [run]));
  await as(w.sA3adult, w.A, tx => tx.query(`UPDATE life_mission_runs SET completed_at = NULL WHERE id=$1`, [run]));
  assert.equal((await rows(w.sA3adult, w.A, `SELECT status FROM life_mission_status`))[0]!.status, 'completed');
  // nobody else reads the runs table; status rows follow the teacher/guardian link
  for (const u of [w.adminA, w.safeA, w.qariA1, w.gA1, sch]) assert.equal((await rows(u, w.A, `SELECT 1 FROM life_mission_runs`)).length, 0);
  // make sA1 a mission learner linked to qariA1 and gA1; sA3adult has no link
  await as(w.sA1, w.A, tx => tx.query(`INSERT INTO life_mission_runs (institution_id, learner_id, mission_ref) VALUES ($1,$2,'u-sabr-1')`, [w.A, w.sA1]));
  const st = await rows(w.qariA1, w.A, `SELECT learner_id, status FROM life_mission_status`); assert.deepEqual(st.map(r => (r as { learner_id: string }).learner_id), [w.sA1]);
  assert.deepEqual((await rows(w.gA1, w.A, `SELECT learner_id FROM life_mission_status`)).map(r => (r as { learner_id: string }).learner_id), [w.sA1]);
  assert.equal((await rows(w.gA1, w.A, `SELECT * FROM life_mission_status`))[0] && Object.keys((await rows(w.gA1, w.A, `SELECT * FROM life_mission_status`))[0]!).includes('steps_done'), false);
  for (const [u, inst] of [[w.qariA2, w.A], [w.gA2unverified, w.A], [w.adminA, w.A], [w.gB, w.B], [w.qariB, w.B]] as const) assert.equal((await rows(u, inst, `SELECT 1 FROM life_mission_status WHERE learner_id=$1`, [w.sA1])).length, 0, `status ${u}`);
  await assert.rejects(as(w.qariA1, w.A, tx => tx.query(`INSERT INTO life_mission_status (run_id, institution_id, learner_id, mission_ref, status) VALUES ($1,$2,$3,'x','completed')`, [run, w.A, w.sA3adult])), /permission denied/);
  // a reflection that is not the learner's own cannot be linked
  const other = (await reflect(w.sA3adult, 'other')).rows[0]!.id;
  await assert.rejects(as(w.sA1, w.A, tx => tx.query(`UPDATE life_mission_runs SET reflection_id=$1 WHERE learner_id=$2`, [other, w.sA1])), /foreign key/);
  await assert.rejects(as(w.sA3adult, w.A, tx => tx.query(`INSERT INTO life_mission_runs (institution_id, learner_id, mission_ref) VALUES ($1,$2,'has space')`, [w.A, w.sA3adult])), /check/);
  await assert.rejects(as(w.sA3adult, w.A, tx => tx.query(`INSERT INTO life_mission_runs (institution_id, learner_id, mission_ref, steps_done) VALUES ($1,$2,'u-2','{99}')`, [w.A, w.sA3adult])), /check/);
  // deleting the reflection keeps the run but clears the link; deleting the run removes its status
  await as(w.sA3adult, undefined, tx => tx.query(`DELETE FROM reflection_entries WHERE id=$1`, [e]));
  assert.equal(((await rows(w.sA3adult, undefined, `SELECT reflection_id FROM life_mission_runs WHERE id=$1`, [run]))[0] as { reflection_id: string | null }).reflection_id, null);
  await as(w.sA3adult, undefined, tx => tx.query(`DELETE FROM life_mission_runs WHERE id=$1`, [run]));
  assert.equal((await db.query(`SELECT 1 FROM life_mission_status WHERE run_id=$1`, [run])).rows.length, 0);
});

// ---------------------------------------------------------------- scenario runs
test('scenario runs: owner-only node ids, no score, no one else reads, no aggregate surface', async () => {
  const r = (await as(w.sA3adult, w.A, tx => tx.query<{ id: string }>(`INSERT INTO scenario_runs (institution_id, learner_id, scenario_ref, chosen_nodes) VALUES ($1,$2,'sc-1','{n1,n3,n4}') RETURNING id`, [w.A, w.sA3adult]))).rows[0]!.id;
  for (const [u, inst] of [[w.adminA, w.A], [w.safeA, w.A], [w.qariA1, w.A], [w.gA1, w.A], [sch, w.A], [w.adminB, w.B]] as const) assert.equal((await rows(u, inst, `SELECT 1 FROM scenario_runs`)).length, 0);
  assert.equal((await as(w.adminA, w.A, tx => tx.query(`DELETE FROM scenario_runs WHERE id=$1 RETURNING id`, [r]))).rows.length, 0);
  await assert.rejects(as(w.sA3adult, w.A, tx => tx.query(`INSERT INTO scenario_runs (institution_id, learner_id, scenario_ref, chosen_nodes) VALUES ($1,$2,'sc-1','{"free text with spaces"}')`, [w.A, w.sA3adult])), /check/);
  await assert.rejects(as(w.sA3adult, w.A, tx => tx.query(`INSERT INTO scenario_runs (institution_id, learner_id, scenario_ref, chosen_nodes) VALUES ($1,$2,'sc-1','{}')`, [w.A, w.sA3adult])), /check/);
  await assert.rejects(as(w.sA3adult, w.A, tx => tx.query(`UPDATE scenario_runs SET chosen_nodes='{x}' WHERE id=$1`, [r])), /permission denied/);
  await assert.rejects(as(w.qariA1, w.A, tx => tx.query(`INSERT INTO scenario_runs (institution_id, learner_id, scenario_ref, chosen_nodes) VALUES ($1,$2,'sc-1','{n1}')`, [w.A, w.qariA1])), /row-level security/);
  assert.equal((await as(w.sA3adult, undefined, tx => tx.query(`DELETE FROM scenario_runs WHERE id=$1 RETURNING id`, [r]))).rows.length, 1);
});

// ---------------------------------------------------------------- formative observations
const observe = (user: string, learner: string, role: string, inst = w.A) =>
  as(user, inst, tx => tx.query<{ id: string }>(`INSERT INTO formative_observations (institution_id, learner_id, author_id, author_role, competency_id, level, status, note) VALUES ($1,$2,$3,$4,'R1',2,'practicing','listened to a sibling without interrupting') RETURNING id`, [inst, learner, user, role]));

test('formative observations: only the learner, the author, the verified guardian and linked teachers; never admin/other teachers/other tenants', async () => {
  const o = (await observe(w.qariA1, w.sA1, 'qari')).rows[0]!.id;          // sA1: assigned qariA1 (and xBoth), verified guardian gA1
  const g = (await observe(w.gA1, w.sA1, 'guardian')).rows[0]!.id;
  for (const u of [w.sA1, w.qariA1, w.gA1, w.xBoth]) assert.equal((await rows(u, w.A, `SELECT 1 FROM formative_observations`)).length, 2, `sees ${u}`);   // xBoth is a second linked teacher
  for (const [u, inst] of [[w.adminA, w.A], [w.safeA, w.A], [w.qariA2, w.A], [w.gA2unverified, w.A], [w.sA2, w.A], [w.sA3adult, w.A], [sch, w.A], [cp, w.A], [w.adminB, w.B], [w.qariB, w.B], [w.gB, w.B], [w.xBoth, w.B], [undefined, undefined]] as const)
    assert.equal((await rows(u, inst, `SELECT 1 FROM formative_observations`)).length, 0, `blocked ${u}`);
  assert.equal((await rows(w.qariA1, w.B, `SELECT 1 FROM formative_observations`)).length, 1);   // an author always reads their own notes; others still need the live link in context
  // who may write
  await assert.rejects(observe(w.qariA2, w.sA1, 'qari'), /row-level security/);              // not linked
  await assert.rejects(observe(w.gA2unverified, w.sA2, 'guardian'), /row-level security/);    // unverified guardian
  await assert.rejects(observe(w.gA1, w.sA2, 'guardian'), /row-level security/);              // another child
  await assert.rejects(observe(w.adminA, w.sA1, 'qari'), /row-level security/);
  await assert.rejects(observe(w.sA1, w.sA1, 'qari'), /(row-level security|check)/);
  await assert.rejects(observe(w.qariA1, w.sA1, 'guardian'), /row-level security/);           // role spoofing
  await assert.rejects(as(w.qariA1, w.A, tx => tx.query(`INSERT INTO formative_observations (institution_id, learner_id, author_id, author_role, competency_id, level, status, note) VALUES ($1,$2,$3,'qari','R1',2,'score_9','x')`, [w.A, w.sA1, w.qariA1])), /check/);
  await assert.rejects(as(w.qariA1, w.A, tx => tx.query(`INSERT INTO formative_observations (institution_id, learner_id, author_id, author_role, competency_id, level, status, note) VALUES ($1,$2,$3,'qari','r1',2,'appeared','x')`, [w.A, w.sA1, w.qariA1])), /check/);
  // edit/delete: author only (the learner and the other adult cannot rewrite what the teacher wrote)
  await as(w.qariA1, w.A, tx => tx.query(`UPDATE formative_observations SET status='appeared', note='now independent' WHERE id=$1`, [o]));
  for (const u of [w.sA1, w.gA1, w.xBoth, w.adminA]) {
    assert.equal((await as(u, w.A, tx => tx.query(`UPDATE formative_observations SET note='x' WHERE id=$1 RETURNING id`, [o]))).rows.length, 0);
    assert.equal((await as(u, w.A, tx => tx.query(`DELETE FROM formative_observations WHERE id=$1 RETURNING id`, [o]))).rows.length, 0);
  }
  await assert.rejects(as(w.qariA1, w.A, tx => tx.query(`UPDATE formative_observations SET learner_id=$2 WHERE id=$1`, [o, w.sA2])), /permission denied/);
  assert.equal((await as(w.gA1, w.A, tx => tx.query(`DELETE FROM formative_observations WHERE id=$1 RETURNING id`, [g]))).rows.length, 1);
});

// ---------------------------------------------------------------- no comparison / ranking / aggregation surface
test('no view, function or column anywhere compares, ranks, scores or aggregates learners', async () => {
  const learnerTables = ['reflection_entries', 'life_mission_runs', 'life_mission_status', 'scenario_runs', 'formative_observations'];
  // 1. no view or materialized view touches these tables
  const views = (await db.query<{ n: string; d: string }>(`SELECT c.relname AS n, pg_get_viewdef(c.oid) AS d FROM pg_class c JOIN pg_namespace s ON s.oid = c.relnamespace WHERE c.relkind IN ('v','m') AND s.nspname IN ('public','app')`)).rows;
  for (const v of views) for (const t of learnerTables) assert.ok(!v.d.includes(t), `${v.n} reads ${t}`);
  // 2. only the known guard/projection functions mention them; no SQL function exposes rows of many learners
  const fns = (await db.query<{ n: string; src: string }>(`SELECT p.proname AS n, p.prosrc AS src FROM pg_proc p JOIN pg_namespace s ON s.oid = p.pronamespace WHERE s.nspname IN ('public','app')`)).rows;
  const allowed = new Set(['reflection_gate', 'life_mission_project']);
  for (const f of fns) for (const t of learnerTables) if (f.src.includes(t)) assert.ok(allowed.has(f.n), `unexpected function ${f.n} reads ${t}`);
  // 3. no score/grade/rank-like column on any of them
  const cols = (await db.query<{ table_name: string; column_name: string }>(`SELECT table_name, column_name FROM information_schema.columns WHERE table_name = ANY($1)`, [learnerTables])).rows;
  for (const c of cols) assert.ok(!/score|grade|rank|points|mark|rating|percent/i.test(c.column_name), `${c.table_name}.${c.column_name}`);
  // 4. no aggregate-by-learner function in the app schema at all
  for (const f of fns) assert.ok(!/(leaderboard|rank|compare|cohort|aggregate)/i.test(f.n), f.n);
  // 5. app_user holds no privilege on any table other than SELECT-through-RLS of those it already has; nothing can be written to the status projection
  const g = (await db.query<{ privilege_type: string }>(`SELECT privilege_type FROM information_schema.role_table_grants WHERE grantee='app_user' AND table_name='life_mission_status'`)).rows;
  assert.deepEqual(g.map(x => x.privilege_type), ['SELECT']);
});
