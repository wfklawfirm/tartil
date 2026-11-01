import { randomUUID as id } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { applyMigrations } from '../src/index.ts';

export async function freshDb() {
  const db = new PGlite();
  await applyMigrations(db as never);
  return db;
}

/** Two institutions with distinct people. Seeded as the table owner (bypasses RLS) - never done by the app. */
export async function seedWorld(db: PGlite) {
  const w = {
    A: id(), B: id(),
    adminA: id(), safeA: id(), qariA1: id(), qariA2: id(), sA1: id(), sA2: id(), sA3adult: id(), gA1: id(), gA2unverified: id(),
    adminB: id(), qariB: id(), sB1: id(), sB2adult: id(), gB: id(),
    xBoth: id(), // qari in A, adult student in B
  };
  await db.query(`INSERT INTO institutions (id, slug, name) VALUES ($1,'inst-a','Institution A'), ($2,'inst-b','Institution B')`, [w.A, w.B]);
  const names: [string, string][] = Object.entries(w).filter(([k]) => k !== 'A' && k !== 'B').map(([k, v]) => [v as string, k]);
  for (const [uid, name] of names) await db.query(`INSERT INTO users (id, display_name, email, password_hash) VALUES ($1,$2,$3,'x')`, [uid, name, `${name}@example.test`]);
  const mem = async (inst: string, user: string, role: string) => db.query(`INSERT INTO memberships (institution_id, user_id, role) VALUES ($1,$2,$3)`, [inst, user, role]);
  await mem(w.A, w.adminA, 'tenant_admin'); await mem(w.A, w.safeA, 'safeguarding_officer');
  await mem(w.A, w.qariA1, 'qari'); await mem(w.A, w.qariA2, 'qari'); await mem(w.A, w.xBoth, 'qari');
  for (const s of [w.sA1, w.sA2, w.sA3adult]) await mem(w.A, s, 'student');
  await mem(w.A, w.gA1, 'guardian'); await mem(w.A, w.gA2unverified, 'guardian');
  await mem(w.B, w.adminB, 'tenant_admin'); await mem(w.B, w.qariB, 'qari'); await mem(w.B, w.sB1, 'student'); await mem(w.B, w.sB2adult, 'student');
  await mem(w.B, w.gB, 'guardian'); await mem(w.B, w.xBoth, 'student');
  const prof = (inst: string, u: string, minor: boolean) => db.query(`INSERT INTO student_profiles (institution_id, user_id, is_minor) VALUES ($1,$2,$3)`, [inst, u, minor]);
  await prof(w.A, w.sA1, true); await prof(w.A, w.sA2, true); await prof(w.A, w.sA3adult, false);
  await prof(w.B, w.sB1, true); await prof(w.B, w.sB2adult, false); await prof(w.B, w.xBoth, false);
  await db.query(`INSERT INTO guardian_links (institution_id, guardian_user_id, student_user_id, relationship, verified_at) VALUES ($1,$2,$3,'parent', now())`, [w.A, w.gA1, w.sA1]);
  await db.query(`INSERT INTO guardian_links (institution_id, guardian_user_id, student_user_id, relationship) VALUES ($1,$2,$3,'parent')`, [w.A, w.gA2unverified, w.sA2]);
  await db.query(`INSERT INTO guardian_links (institution_id, guardian_user_id, student_user_id, relationship, verified_at) VALUES ($1,$2,$3,'parent', now())`, [w.B, w.gB, w.sB1]);
  await db.query(`INSERT INTO qari_assignments (institution_id, qari_user_id, student_user_id) VALUES ($1,$2,$3), ($1,$4,$5), ($1,$6,$3)`, [w.A, w.qariA1, w.sA1, w.qariA2, w.sA2, w.xBoth]);
  await db.query(`INSERT INTO qari_assignments (institution_id, qari_user_id, student_user_id) VALUES ($1,$2,$3)`, [w.B, w.qariB, w.sB1]);
  return w;
}
export const sub = (inst: string, student: string) => ({
  sql: `INSERT INTO recitation_submissions (institution_id, student_user_id, edition_code, riwayah, surah, ayah_start, ayah_end, audio_object_key)
        VALUES ($1,$2,'test-edition','hafs',1,1,7,'private/obj/1') RETURNING id, consent_id`,
  params: [inst, student],
});
