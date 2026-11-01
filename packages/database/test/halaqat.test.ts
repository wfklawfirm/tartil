import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import type { PGlite } from '@electric-sql/pglite';
import { withContext } from '../src/index.ts';
import { freshDb, seedWorld } from './fixtures.ts';

let db: PGlite; let w: Awaited<ReturnType<typeof seedWorld>>; let H: string; let S: string; let HB: string;
const as = <T>(u: string | undefined, i: string | undefined, fn: Parameters<typeof withContext<T>>[2]) => withContext(db as never, { userId: u, institutionId: i }, fn);
const rows = async (u: string, i: string, sql: string, p: unknown[] = []) => as(u, i, async tx => (await tx.query<Record<string, string>>(sql, p)).rows);
const fails = async (fn: () => Promise<unknown>, re: RegExp) => { await assert.rejects(fn, (e: Error) => re.test(e.message)); };

before(async () => {
  db = await freshDb(); w = await seedWorld(db);
  H = (await as(w.adminA, w.A, tx => tx.query<{ id: string }>(`INSERT INTO halaqat (institution_id,name,qari_user_id) VALUES ($1,'Halaqah 1',$2) RETURNING id`, [w.A, w.qariA1]))).rows[0]!.id;
  await as(w.adminA, w.A, tx => tx.query(`INSERT INTO halaqah_members (institution_id,halaqah_id,student_user_id) VALUES ($1,$2,$3),($1,$2,$4)`, [w.A, H, w.sA1, w.sA3adult]));
  S = (await as(w.qariA1, w.A, tx => tx.query<{ id: string }>(`INSERT INTO halaqah_sessions (institution_id,halaqah_id,starts_at,ends_at) VALUES ($1,$2,now(),now()+interval '1 hour') RETURNING id`, [w.A, H]))).rows[0]!.id;
  HB = (await as(w.adminB, w.B, tx => tx.query<{ id: string }>(`INSERT INTO halaqat (institution_id,name,qari_user_id) VALUES ($1,'B circle',$2) RETURNING id`, [w.B, w.qariB]))).rows[0]!.id;
});

test('a halaqah needs a qari who actually holds the qari role in that institution', async () => {
  await fails(() => as(w.adminA, w.A, tx => tx.query(`INSERT INTO halaqat (institution_id,name,qari_user_id) VALUES ($1,'bad',$2)`, [w.A, w.sA1])), /row-level security/);
  await fails(() => as(w.qariA1, w.A, tx => tx.query(`INSERT INTO halaqat (institution_id,name,qari_user_id) VALUES ($1,'self',$2)`, [w.A, w.qariA1])), /row-level security/);
});

test('halaqah visibility: members, their verified guardian, own qari, admin - and nobody else', async () => {
  const seen = async (u: string, i: string) => (await rows(u, i, `SELECT id FROM halaqat`)).length;
  assert.equal(await seen(w.adminA, w.A), 1); assert.equal(await seen(w.qariA1, w.A), 1); assert.equal(await seen(w.sA1, w.A), 1);
  assert.equal(await seen(w.gA1, w.A), 1);            // verified guardian of member sA1
  assert.equal(await seen(w.qariA2, w.A), 0);         // another qari in the same institution
  assert.equal(await seen(w.sA2, w.A), 0);            // student not in the circle
  assert.equal(await seen(w.gA2unverified, w.A), 0);  // unverified guardian
  assert.equal(await seen(w.adminB, w.B), 1);         // sees only B's circle
  assert.equal((await rows(w.adminB, w.B, `SELECT id FROM halaqat WHERE id=$1`, [H])).length, 0);
  assert.equal((await rows(w.adminA, w.B, `SELECT id FROM halaqat`)).length, 0); // forged context
});

test('only the halaqah qari (or admin) marks attendance, only for members, in their own name', async () => {
  const mark = (u: string, student: string, by = u) => as(u, w.A, tx => tx.query(`INSERT INTO attendance (institution_id,session_id,halaqah_id,student_user_id,status,marked_by) VALUES ($1,$2,$3,$4,'present',$5)`, [w.A, S, H, student, by]));
  await fails(() => mark(w.qariA2, w.sA1), /row-level security/);       // not this halaqah's qari
  await fails(() => mark(w.sA1, w.sA1), /row-level security/);          // student cannot self-mark
  await fails(() => mark(w.qariA1, w.sA1, w.qariA2), /row-level security/); // cannot mark in someone else's name
  await fails(() => mark(w.qariA1, w.sA2), /foreign key/);              // sA2 is not a member
  await mark(w.qariA1, w.sA1);
  await fails(() => mark(w.qariA1, w.sA1), /duplicate key/);
  assert.equal((await rows(w.sA1, w.A, `SELECT 1 FROM attendance`)).length, 1);
  assert.equal((await rows(w.gA1, w.A, `SELECT 1 FROM attendance`)).length, 1);
  assert.equal((await rows(w.sA3adult, w.A, `SELECT 1 FROM attendance`)).length, 0); // a classmate cannot see it
  assert.equal((await rows(w.qariA2, w.A, `SELECT 1 FROM attendance`)).length, 0);
});

test('attendance of another institution cannot be created or read across tenants', async () => {
  await fails(() => as(w.qariB, w.B, tx => tx.query(`INSERT INTO attendance (institution_id,session_id,halaqah_id,student_user_id,status,marked_by) VALUES ($1,$2,$3,$4,'present',$5)`, [w.B, S, H, w.sA1, w.qariB])), /row-level security|foreign key/);
  assert.equal((await rows(w.adminB, w.B, `SELECT 1 FROM attendance`)).length, 0);
  assert.equal((await rows(w.qariB, w.B, `SELECT 1 FROM halaqah_sessions`)).length, 0);
  assert.ok(HB);
});

test('assessments: only the ASSIGNED qari, in their own name; visible to student/guardian/assigned qari; immutable; never machine-authored', async () => {
  const ins = (u: string, student: string, by = u, extra = '') => as(u, w.A, tx => tx.query(`INSERT INTO assessments (institution_id,student_user_id,assessor_user_id,surah,ayah_start,ayah_end,makharij,note ${extra}) VALUES ($1,$2,$3,1,1,7,3,'good') RETURNING id`, [w.A, student, by]));
  await fails(() => ins(w.qariA2, w.sA1), /row-level security/);            // qariA2 is not sA1's qari
  await fails(() => ins(w.qariA1, w.sA1, w.qariA2), /row-level security/);   // forged assessor
  await fails(() => ins(w.sA1, w.sA1), /row-level security/);                // student cannot grade self
  await fails(() => ins(w.adminA, w.sA1), /row-level security/);             // even admins cannot author a qari's assessment
  await fails(() => as(w.qariA1, w.A, tx => tx.query(`INSERT INTO assessments (institution_id,student_user_id,assessor_user_id,assessor_kind,surah,ayah_start,ayah_end,fluency) VALUES ($1,$2,$3,'ai',1,1,7,4)`, [w.A, w.sA1, w.qariA1])), /check/i);
  await fails(() => as(w.qariA1, w.A, tx => tx.query(`INSERT INTO assessments (institution_id,student_user_id,assessor_user_id,surah,ayah_start,ayah_end) VALUES ($1,$2,$3,1,1,7)`, [w.A, w.sA1, w.qariA1])), /check/i); // no scored dimension
  const id = (await ins(w.qariA1, w.sA1)).rows[0] as { id: string };
  assert.ok(id.id);
  assert.equal((await rows(w.sA1, w.A, `SELECT 1 FROM assessments`)).length, 1);
  assert.equal((await rows(w.gA1, w.A, `SELECT 1 FROM assessments`)).length, 1);
  assert.equal((await rows(w.gA2unverified, w.A, `SELECT 1 FROM assessments`)).length, 0);
  assert.equal((await rows(w.sA2, w.A, `SELECT 1 FROM assessments`)).length, 0);
  assert.equal((await rows(w.qariA2, w.A, `SELECT 1 FROM assessments`)).length, 0);
  assert.equal((await rows(w.adminB, w.B, `SELECT 1 FROM assessments`)).length, 0);
  await fails(() => as(w.qariA1, w.A, tx => tx.query(`UPDATE assessments SET makharij=1`)), /permission denied/);
  await fails(() => as(w.qariA1, w.A, tx => tx.query(`DELETE FROM assessments`)), /permission denied/);
});

test('attendance and assessments are audited', async () => {
  const a = await rows(w.adminA, w.A, `SELECT DISTINCT object_type FROM audit_logs`);
  const kinds = a.map(r => r.object_type);
  for (const k of ['halaqat', 'halaqah_members', 'attendance', 'assessments']) assert.ok(kinds.includes(k), k);
});
