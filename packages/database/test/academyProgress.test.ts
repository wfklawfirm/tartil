import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID as id } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { withContext } from '../src/index.ts';
import { freshDb, seedWorld } from './fixtures.ts';

// Migration 0019: academy progress. Synthetic data only. Always runs as app_user through withContext (never the table owner).
let db: PGlite; let w: Awaited<ReturnType<typeof seedWorld>>;
const as = <T>(userId: string | undefined, fn: Parameters<typeof withContext<T>>[2]) => withContext(db as never, { userId }, fn);
const rows = async (u: string | undefined, sql: string, p: unknown[] = []) => (await as(u, tx => tx.query(sql, p))).rows;
const put = (u: string, ref: string, status = 'started', payload: unknown = {}, kind = 'activity') =>
  as(u, tx => tx.query(`INSERT INTO academy_progress (user_id, kind, ref, program_id, status, payload) VALUES (app.current_user_id(), $1, $2, 'p1', $3, $4::jsonb)`, [kind, ref, status, JSON.stringify(payload)]));
const rejects = async (p: Promise<unknown>, re: RegExp) => assert.rejects(p, (e: Error) => re.test(e.message));
const share = (student: string, viewer: string, scope = 'progress') =>
  as(student, tx => tx.query(`INSERT INTO academy_progress_share (student_user_id, viewer_user_id, scope) VALUES (app.current_user_id(), $1, $2)`, [viewer, scope]));

before(async () => { db = await freshDb(); w = await seedWorld(db); });

test('role safety: app_user is non-owner, non-superuser, no BYPASSRLS; tables have FORCE RLS', async () => {
  const r = (await db.query<{ rolsuper: boolean; rolbypassrls: boolean }>(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'app_user'`)).rows[0]!;
  assert.equal(r.rolsuper, false); assert.equal(r.rolbypassrls, false);
  const t = (await db.query<{ relname: string; relforcerowsecurity: boolean; relrowsecurity: boolean }>(`SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname IN ('academy_progress','academy_progress_share','academy_teacher_feedback')`)).rows;
  assert.equal(t.length, 3); for (const x of t) { assert.ok(x.relrowsecurity); assert.ok(x.relforcerowsecurity); }
  assert.equal((await db.query(`SELECT 1 FROM pg_tables WHERE tablename LIKE 'academy_%' AND tableowner = 'app_user'`)).rows.length, 0);
});

test('a learner reads/writes only their own rows; anonymous and other users see nothing and cannot write as someone else', async () => {
  await put(w.sA1, 'act-1', 'completed', { competencies: ['C1'] });
  assert.equal((await rows(w.sA1, `SELECT 1 FROM academy_progress`)).length, 1);
  assert.equal((await rows(w.sA2, `SELECT 1 FROM academy_progress`)).length, 0);
  assert.equal((await rows(w.sB1, `SELECT 1 FROM academy_progress`)).length, 0);                      // another institution's student
  assert.equal((await rows(undefined, `SELECT 1 FROM academy_progress`)).length, 0);
  await rejects(as(w.sA2, tx => tx.query(`INSERT INTO academy_progress (user_id, kind, ref, program_id, status) VALUES ($1,'activity','x','p1','started')`, [w.sA1])), /row-level security/);
  assert.equal((await as(w.sA2, tx => tx.query(`UPDATE academy_progress SET status = 'started' WHERE user_id = $1 RETURNING ref`, [w.sA1]))).rows.length, 0);
  assert.equal((await as(w.sA2, tx => tx.query(`DELETE FROM academy_progress WHERE user_id = $1 RETURNING ref`, [w.sA1]))).rows.length, 0);
  assert.equal((await rows(w.sA1, `SELECT 1 FROM academy_progress`)).length, 1);
});

test('teacher, guardian, admin and safeguarding officer see nothing without an explicit share', async () => {
  for (const v of [w.qariA1, w.gA1, w.adminA, w.safeA, w.xBoth]) assert.equal((await rows(v, `SELECT 1 FROM academy_progress WHERE user_id = $1`, [w.sA1])).length, 0, 'viewer sees data without share');
});

test('constraints: unique(user,kind,ref), kind/status/ref shape, status never regresses, user_id immutable', async () => {
  await rejects(put(w.sA1, 'act-1'), /duplicate key/);
  await rejects(put(w.sA1, 'bad kind', 'started', {}, 'activity'), /check/);
  await rejects(put(w.sA1, 'ok', 'finished'), /check/);
  await rejects(put(w.sA1, 'ok', 'started', {}, 'quiz'), /check/);
  await as(w.sA1, tx => tx.query(`UPDATE academy_progress SET status = 'started' WHERE ref = 'act-1'`));
  assert.equal((await rows(w.sA1, `SELECT status FROM academy_progress WHERE ref = 'act-1'`))[0]!.status, 'completed');
  await rejects(as(w.sA1, tx => tx.query(`UPDATE academy_progress SET user_id = $1 WHERE ref = 'act-1'`, [w.sA2])), /permission denied/);
});

test('payload: size <= 4KB, flat identifiers only, no free text / notebook content', async () => {
  await put(w.sA1, 'ok-payload', 'completed', { competencies: ['C1', 'C2'], assessment: true, score_free: 3, level: 'beginner' });
  await rejects(put(w.sA1, 'big', 'started', { competencies: Array.from({ length: 31 }, (_, i) => `c${i}`) }), /academy_progress_payload_ok/);
  await rejects(put(w.sA1, 'big2', 'started', { a: 'x'.repeat(64), b: 'y'.repeat(64), c: 'z'.repeat(64), ...Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`k${i}`, Array.from({ length: 30 }, () => 'abcdefghij12345678901234567890')])) }), /academy_progress_payload_ok/);
  await rejects(put(w.sA1, 'note1', 'started', { note: 'I felt sad today' }), /academy_progress_payload_ok/);         // spaces: not an identifier
  await rejects(put(w.sA1, 'note2', 'started', { note: 'ملاحظتي الخاصة' }), /academy_progress_payload_ok/);             // Arabic prose
  await rejects(put(w.sA1, 'note3', 'started', { note: 'x'.repeat(65) }), /academy_progress_payload_ok/);               // longer than an id
  await rejects(put(w.sA1, 'nest', 'started', { a: { b: 1 } }), /academy_progress_payload_ok/);
  await rejects(put(w.sA1, 'arr', 'started', ['a']), /academy_progress_payload_ok/);
  await rejects(put(w.sA1, 'key', 'started', { 'Bad Key': 1 }), /academy_progress_payload_ok/);
  await rejects(put(w.sA1, 'nul', 'started', { a: null }), /academy_progress_payload_ok/);
  // the 4KB limit itself, with an otherwise valid shape (many short keys)
  const many = Object.fromEntries(Array.from({ length: 400 }, (_, i) => [`k${i}`, 1234567]));
  assert.ok(JSON.stringify(many).length > 4096);
  await rejects(put(w.sA1, 'many', 'started', many), /academy_progress_payload_ok/);
});

test('row budget per learner (2000)', async () => {
  await db.query(`INSERT INTO academy_progress (user_id, kind, ref, program_id, status) SELECT $1, 'activity', 'bulk-' || g, 'p1', 'started' FROM generate_series(1, 1990) g`, [w.sA3adult]);
  await put(w.sA3adult, 'last-1');
  await rejects(db.query(`SELECT 1`).then(async () => { for (let i = 0; i < 12; i++) await put(w.sA3adult, `over-${i}`); }), /academy_progress_budget_exceeded/);
});

test('sharing: only an eligible viewer (shares an active institution, viewing role); self and cross-tenant refused', async () => {
  await rejects(share(w.sA1, w.sA1), /check|row-level security/);                 // self
  await rejects(share(w.sA1, w.qariB), /row-level security/);                     // other institution
  await rejects(share(w.sA1, w.sA2), /row-level security/);                       // a fellow student is not a viewing role
  await rejects(as(w.qariA1, tx => tx.query(`INSERT INTO academy_progress_share (student_user_id, viewer_user_id) VALUES ($1,$2)`, [w.sA1, w.qariA1])), /row-level security/); // viewer cannot grant for the student
  await share(w.sA1, w.qariA1);
  await rejects(share(w.sA1, w.qariA1), /duplicate key/);                         // one active share per viewer
});

test('an authorised viewer reads exactly that student; not other students, not other viewers; read-only', async () => {
  await put(w.sA2, 'act-s2', 'completed');
  const seen = await rows(w.qariA1, `SELECT user_id FROM academy_progress`);
  assert.ok(seen.length >= 2); assert.ok(seen.every(r => (r as { user_id: string }).user_id === w.sA1));
  assert.equal((await rows(w.qariA2, `SELECT 1 FROM academy_progress WHERE user_id = $1`, [w.sA1])).length, 0);   // another teacher
  assert.equal((await rows(w.gA1, `SELECT 1 FROM academy_progress WHERE user_id = $1`, [w.sA1])).length, 0);
  assert.equal((await rows(w.qariB, `SELECT 1 FROM academy_progress WHERE user_id = $1`, [w.sA1])).length, 0);
  assert.equal((await as(w.qariA1, tx => tx.query(`UPDATE academy_progress SET status = 'started' WHERE user_id = $1 RETURNING ref`, [w.sA1]))).rows.length, 0);
  assert.equal((await as(w.qariA1, tx => tx.query(`DELETE FROM academy_progress WHERE user_id = $1 RETURNING ref`, [w.sA1]))).rows.length, 0);
  await rejects(as(w.qariA1, tx => tx.query(`INSERT INTO academy_progress (user_id, kind, ref, program_id, status) VALUES ($1,'activity','forged','p1','completed')`, [w.sA1])), /row-level security/);
  // the share row is visible to both parties and to nobody else
  assert.equal((await rows(w.qariA1, `SELECT 1 FROM academy_progress_share`)).length, 1);
  assert.equal((await rows(w.sA1, `SELECT 1 FROM academy_progress_share`)).length, 1);
  assert.equal((await rows(w.qariA2, `SELECT 1 FROM academy_progress_share`)).length, 0);
  // a viewer cannot revoke/alter the share
  assert.equal((await as(w.qariA1, tx => tx.query(`UPDATE academy_progress_share SET revoked_at = now() RETURNING id`))).rows.length, 0);
});

test('feedback: only with scope progress_feedback; visible to the student and author; cannot be forged by the student', async () => {
  const f = (u: string, student: string) => as(u, tx => tx.query(`INSERT INTO academy_teacher_feedback (student_user_id, author_user_id, program_id, note, next_step_ref) VALUES ($1, app.current_user_id(), 'p1', 'ملاحظة قصيرة', 'lesson-2')`, [student]));
  await rejects(f(w.qariA1, w.sA1), /row-level security/);                         // scope is 'progress' only
  await as(w.sA1, tx => tx.query(`UPDATE academy_progress_share SET scope = 'progress_feedback' WHERE viewer_user_id = $1`, [w.qariA1]));
  await f(w.qariA1, w.sA1);
  await rejects(f(w.sA1, w.sA1), /row-level security/);                            // student cannot write teacher feedback
  await rejects(f(w.qariA2, w.sA1), /row-level security/);
  assert.equal((await rows(w.sA1, `SELECT 1 FROM academy_teacher_feedback`)).length, 1);
  assert.equal((await rows(w.qariA1, `SELECT 1 FROM academy_teacher_feedback`)).length, 1);
  assert.equal((await rows(w.qariA2, `SELECT 1 FROM academy_teacher_feedback`)).length, 0);
  await rejects(as(w.qariA1, tx => tx.query(`UPDATE academy_teacher_feedback SET note = 'x'`)), /permission denied/);
  await rejects(as(w.qariA1, tx => tx.query(`INSERT INTO academy_teacher_feedback (student_user_id, author_user_id, program_id) VALUES ($1, app.current_user_id(), 'p1')`, [w.sA1])), /check/);   // empty feedback
});

test('revocation takes effect immediately; re-grant creates a new row; a viewer who leaves the institution loses access', async () => {
  await as(w.sA1, tx => tx.query(`UPDATE academy_progress_share SET revoked_at = now() WHERE viewer_user_id = $1 AND revoked_at IS NULL`, [w.qariA1]));
  assert.equal((await rows(w.qariA1, `SELECT 1 FROM academy_progress WHERE user_id = $1`, [w.sA1])).length, 0);
  assert.equal((await rows(w.qariA1, `SELECT 1 FROM academy_teacher_feedback`)).length, 1);        // the teacher's own authored feedback stays theirs
  await share(w.sA1, w.qariA1);
  assert.ok((await rows(w.qariA1, `SELECT 1 FROM academy_progress WHERE user_id = $1`, [w.sA1])).length > 0);
  assert.equal((await db.query(`SELECT 1 FROM academy_progress_share WHERE student_user_id = $1 AND viewer_user_id = $2`, [w.sA1, w.qariA1])).rows.length, 2);
  await db.query(`UPDATE memberships SET status = 'suspended' WHERE user_id = $1 AND institution_id = $2`, [w.qariA1, w.A]);
  assert.equal((await rows(w.qariA1, `SELECT 1 FROM academy_progress WHERE user_id = $1`, [w.sA1])).length, 0);
  await db.query(`UPDATE memberships SET status = 'active' WHERE user_id = $1 AND institution_id = $2`, [w.qariA1, w.A]);
});

test('a share in institution A does not expose a user who is also a student elsewhere to institution B viewers; delete removes own rows only', async () => {
  await put(w.xBoth, 'x-act', 'completed');
  await share(w.xBoth, w.qariB);                                                   // xBoth is a student in B: B's qari is eligible
  assert.equal((await rows(w.qariB, `SELECT 1 FROM academy_progress WHERE user_id = $1`, [w.xBoth])).length, 1);
  assert.equal((await rows(w.qariA1, `SELECT 1 FROM academy_progress WHERE user_id = $1`, [w.xBoth])).length, 0);
  const del = await as(w.sA1, tx => tx.query(`DELETE FROM academy_progress RETURNING ref`));
  assert.ok(del.rows.length >= 2);
  assert.equal((await rows(w.sA1, `SELECT 1 FROM academy_progress`)).length, 0);
  assert.equal((await rows(w.xBoth, `SELECT 1 FROM academy_progress`)).length, 1);
  assert.equal((await rows(w.sA2, `SELECT 1 FROM academy_progress`)).length, 1);
});

test('the viewer cannot see data of users that are not their students via helper functions', async () => {
  assert.equal((await rows(w.qariA1, `SELECT app.academy_share_scope($1) AS s`, [w.sA2]))[0]!.s, null);
  assert.equal((await rows(w.qariA2, `SELECT app.academy_student_in($1, $2) AS ok`, [w.sA2, w.B]))[0]!.ok, false);   // not in context B
  void id;
});
