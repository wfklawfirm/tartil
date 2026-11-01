import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import type { PGlite } from '@electric-sql/pglite';
import { withContext } from '../src/index.ts';
import { freshDb, seedWorld } from './fixtures.ts';

let db: PGlite; let w: Awaited<ReturnType<typeof seedWorld>>; let T: string; let U1: string; let U2: string;
const as = <T>(u: string | undefined, i: string | undefined, fn: Parameters<typeof withContext<T>>[2]) => withContext(db as never, { userId: u, institutionId: i } as never, fn);
const rows = async (u: string, i: string, sql: string, p: unknown[] = []) => as(u, i, async tx => (await tx.query<Record<string, string>>(sql, p)).rows);
const fails = async (fn: () => Promise<unknown>, re: RegExp) => { await assert.rejects(fn, (e: Error) => re.test(e.message)); };

before(async () => {
  db = await freshDb(); w = await seedWorld(db);
  T = (await rows(w.qariA1, w.A, `INSERT INTO learning_tracks (institution_id,title,created_by) VALUES ($1,'Juz Amma',$2) RETURNING id`, [w.A, w.qariA1]))[0].id;
  U1 = (await rows(w.qariA1, w.A, `INSERT INTO track_units (institution_id,track_id,position,title,kind,surah,from_ayah,to_ayah) VALUES ($1,$2,1,'Al-Fatiha','memorization',1,1,7) RETURNING id`, [w.A, T]))[0].id;
  U2 = (await rows(w.qariA1, w.A, `INSERT INTO track_units (institution_id,track_id,position,title,kind) VALUES ($1,$2,2,'Review','review') RETURNING id`, [w.A, T]))[0].id;
});

test('students cannot see draft tracks or create tracks; other tenants see nothing', async () => {
  assert.equal((await rows(w.sA1, w.A, `SELECT id FROM learning_tracks`)).length, 0);
  await fails(() => rows(w.sA1, w.A, `INSERT INTO learning_tracks (institution_id,title,created_by) VALUES ($1,'x',$2)`, [w.A, w.sA1]), /row-level security/);
  await rows(w.adminA, w.A, `UPDATE learning_tracks SET status='published' WHERE id=$1`, [T]);
  assert.equal((await rows(w.sA1, w.A, `SELECT id FROM learning_tracks`)).length, 1);
  assert.equal((await rows(w.sA1, w.A, `SELECT id FROM track_units`)).length, 2);
  assert.equal((await rows(w.adminB, w.B, `SELECT id FROM learning_tracks`)).length, 0);
});

test('only an assigned qari marks progress; the student cannot self-mark', async () => {
  const mark = (u: string, unit: string, s = w.sA1) => rows(u, w.A, `INSERT INTO unit_progress (institution_id,track_id,unit_id,student_user_id,marked_by) VALUES ($1,$2,$3,$4,$5)`, [w.A, T, unit, s, u]);
  await fails(() => mark(w.sA1, U1), /row-level security/);
  await fails(() => mark(w.qariA2, U1), /row-level security/);
  await mark(w.qariA1, U1);
  assert.equal((await rows(w.sA1, w.A, `SELECT id FROM unit_progress`)).length, 1);
  assert.equal((await rows(w.sA2, w.A, `SELECT id FROM unit_progress`)).length, 0);
});

test('certificate only when the whole track is complete, only by admin, and only for a published track', async () => {
  const issue = (u: string) => rows(u, w.A, `INSERT INTO certificates (institution_id,track_id,student_user_id,issued_by) VALUES ($1,$2,$3,$4) RETURNING verification_code`, [w.A, T, w.sA1, u]);
  await fails(() => issue(w.adminA), /track_not_complete/);
  await rows(w.qariA1, w.A, `INSERT INTO unit_progress (institution_id,track_id,unit_id,student_user_id,marked_by) VALUES ($1,$2,$3,$4,$5)`, [w.A, T, U2, w.sA1, w.qariA1]);
  await fails(() => issue(w.qariA1), /row-level security/);
  const c = await issue(w.adminA);
  assert.equal(c[0].verification_code.length, 32);
  assert.equal((await rows(w.sA1, w.A, `SELECT id FROM certificates`)).length, 1);
  assert.equal((await rows(w.sA2, w.A, `SELECT id FROM certificates`)).length, 0);
});

test('AI suggestions are invisible to the student until a human accepts them', async () => {
  const id = (await rows(w.qariA1, w.A, `INSERT INTO ai_suggestions (institution_id,student_user_id,body,source,created_by) VALUES ($1,$2,'تدرّب على المد','test-source',$3) RETURNING id`, [w.A, w.sA1, w.qariA1]))[0].id;
  assert.equal((await rows(w.sA1, w.A, `SELECT id FROM ai_suggestions`)).length, 0);
  await fails(() => rows(w.sA1, w.A, `UPDATE ai_suggestions SET status='accepted', reviewed_by=$2 WHERE id=$1`, [id, w.sA1]).then(r => { if (!r.length) throw new Error('row-level security'); }), /row-level security/);
  await rows(w.qariA1, w.A, `UPDATE ai_suggestions SET status='accepted', reviewed_by=$2, reviewed_at=now() WHERE id=$1`, [id, w.qariA1]);
  assert.equal((await rows(w.sA1, w.A, `SELECT id FROM ai_suggestions`)).length, 1);
});
