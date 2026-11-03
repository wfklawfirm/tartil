import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import type { PGlite } from '@electric-sql/pglite';
import { withContext } from '../src/index.ts';
import { freshDb, seedWorld } from './fixtures.ts';

let db: PGlite; let w: Awaited<ReturnType<typeof seedWorld>>;
const as = <T>(u: string | undefined, i: string | undefined, fn: Parameters<typeof withContext<T>>[2]) => withContext(db as never, { userId: u, institutionId: i } as never, fn);
const fails = async (fn: () => Promise<unknown>, re: RegExp) => { await assert.rejects(fn, (e: Error) => re.test(e.message)); };
before(async () => { db = await freshDb(); w = await seedWorld(db); });

test('a tenant admin cannot grant reviewer roles (to themselves or others); the owner/service path still can', async () => {
  await fails(() => as(w.adminA, w.A, tx => tx.query(`INSERT INTO memberships (institution_id, user_id, role) VALUES ($1,$2,'scholarly_reviewer')`, [w.A, w.adminA])), /reviewer_roles_are_appointed_by_the_owner|row-level security/);
  await fails(() => as(w.adminA, w.A, tx => tx.query(`UPDATE memberships SET role = 'child_protection_reviewer' WHERE institution_id = $1 AND user_id = $2`, [w.A, w.qariA2])), /reviewer_roles_are_appointed_by_the_owner|row-level security/);
  await db.query(`INSERT INTO memberships (institution_id, user_id, role) VALUES ($1,$2,'pedagogical_reviewer')`, [w.A, w.safeA]);   // owner/service session
  assert.equal((await db.query(`SELECT 1 FROM memberships WHERE user_id = $1 AND role = 'pedagogical_reviewer'`, [w.safeA])).rows.length, 1);
});
test('a tenant admin cannot lower is_minor (it would remove the guardian-consent requirement); raising it is allowed', async () => {
  await fails(() => as(w.adminA, w.A, tx => tx.query(`UPDATE student_profiles SET is_minor = false WHERE institution_id = $1 AND user_id = $2`, [w.A, w.sA1])), /minor_flag_cannot_be_lowered_here|row-level security/);
  assert.equal((await db.query<{ is_minor: boolean }>(`SELECT is_minor FROM student_profiles WHERE user_id = $1`, [w.sA1])).rows[0]!.is_minor, true);
  await as(w.adminA, w.A, tx => tx.query(`UPDATE student_profiles SET is_minor = true WHERE institution_id = $1 AND user_id = $2`, [w.A, w.sA3adult]));
  await db.query(`UPDATE student_profiles SET is_minor = false WHERE user_id = $1`, [w.sA3adult]);                                                    // owner/service can correct it
});
test('a student cannot write the teacher note or review timestamp on their own homework; the teacher can', async () => {
  const a = (await db.query<{ id: string }>(`INSERT INTO homework_assignments (institution_id, created_by, kind, title) VALUES ($1,$2,'custom','تمرين') RETURNING id`, [w.A, w.qariA1])).rows[0]!.id;
  const r = (await db.query<{ id: string }>(`INSERT INTO homework_recipients (institution_id, assignment_id, student_user_id) VALUES ($1,$2,$3) RETURNING id`, [w.A, a, w.sA1])).rows[0]!.id;
  await fails(() => as(w.sA1, w.A, tx => tx.query(`UPDATE homework_recipients SET teacher_note = 'ممتاز', reviewed_at = now() WHERE id = $1`, [r])), /homework_review_fields_teacher_only/);
  await as(w.sA1, w.A, tx => tx.query(`UPDATE homework_recipients SET viewed_at = now() WHERE id = $1`, [r]));                                       // other fields unaffected
  await as(w.qariA1, w.A, tx => tx.query(`UPDATE homework_recipients SET teacher_note = 'أحسنت', reviewed_at = now() WHERE id = $1`, [r]));
  assert.equal((await db.query<{ teacher_note: string }>(`SELECT teacher_note FROM homework_recipients WHERE id = $1`, [r])).rows[0]!.teacher_note, 'أحسنت');
});
