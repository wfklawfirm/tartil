import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import type { PGlite } from '@electric-sql/pglite';
import { withContext, applyMigrations } from '../src/index.ts';
import { freshDb, seedWorld, sub } from './fixtures.ts';

let db: PGlite; let w: Awaited<ReturnType<typeof seedWorld>>;
before(async () => { db = await freshDb(); w = await seedWorld(db); });
const as = <T>(userId: string | undefined, institutionId: string | undefined, fn: Parameters<typeof withContext<T>>[2]) =>
  withContext(db as never, { userId, institutionId }, fn);
const ids = async (userId: string | undefined, inst: string | undefined, table: string, col = 'user_id') =>
  as(userId, inst, async tx => (await tx.query<Record<string, string>>(`SELECT ${col} AS v FROM ${table}`)).rows.map(r => r.v));

test('app_user is unprivileged: not superuser, no BYPASSRLS, owns nothing', async () => {
  const r = (await db.query<{ rolsuper: boolean; rolbypassrls: boolean }>(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname='app_user'`)).rows[0]!;
  assert.equal(r.rolsuper, false); assert.equal(r.rolbypassrls, false);
  const owned = (await db.query(`SELECT 1 FROM pg_tables WHERE schemaname='public' AND tableowner='app_user'`)).rows;
  assert.equal(owned.length, 0);
});

test('migrations are idempotent and checksum-protected', async () => {
  assert.deepEqual(await applyMigrations(db as never), []);
});

test('no identity context => nothing visible anywhere', async () => {
  for (const t of ['institutions', 'memberships', 'student_profiles', 'guardian_links', 'qari_assignments', 'consents', 'recitation_submissions', 'audit_logs'])
    assert.equal((await as(undefined, undefined, tx => tx.query(`SELECT 1 FROM ${t}`))).rows.length, 0, t);
});

test('forged institution context (user is not a member) => nothing visible', async () => {
  for (const t of ['institutions', 'memberships', 'student_profiles', 'guardian_links', 'qari_assignments'])
    assert.equal((await as(w.gB, w.A, tx => tx.query(`SELECT 1 FROM ${t}`))).rows.length, 0, `forged ${t}`);
});

test('tenant admin sees only own institution', async () => {
  assert.deepEqual((await ids(w.adminA, w.A, 'student_profiles')).sort(), [w.sA1, w.sA2, w.sA3adult].sort());
  assert.deepEqual((await ids(w.adminB, w.B, 'student_profiles')).sort(), [w.sB1, w.sB2adult, w.xBoth].sort());
});

test('tenant admin cannot write into another institution', async () => {
  await assert.rejects(as(w.adminA, w.A, tx => tx.query(`INSERT INTO student_profiles (institution_id, user_id, is_minor) VALUES ($1,$2,true)`, [w.B, w.gA1])), /row-level security/);
  await assert.rejects(as(w.adminA, w.B, tx => tx.query(`INSERT INTO student_profiles (institution_id, user_id, is_minor) VALUES ($1,$2,true)`, [w.B, w.gA1])), /row-level security/);
});

test('qari sees only assigned students', async () => {
  assert.deepEqual(await ids(w.qariA1, w.A, 'student_profiles'), [w.sA1]);
  assert.deepEqual(await ids(w.qariA2, w.A, 'student_profiles'), [w.sA2]);
});

test('guardian sees only verified-linked child; unverified link sees nothing', async () => {
  assert.deepEqual(await ids(w.gA1, w.A, 'student_profiles'), [w.sA1]);
  assert.deepEqual(await ids(w.gA2unverified, w.A, 'student_profiles'), []);
});

test('student sees only self', async () => {
  assert.deepEqual(await ids(w.sA1, w.A, 'student_profiles'), [w.sA1]);
});

test('one person, two institutions: role in A grants nothing in B', async () => {
  assert.deepEqual(await ids(w.xBoth, w.A, 'student_profiles'), [w.sA1]);       // qari of sA1 in A
  assert.deepEqual(await ids(w.xBoth, w.B, 'student_profiles'), [w.xBoth]);     // only self as student in B
});

test('users table: no email/password exposure; visibility limited to related people', async () => {
  await assert.rejects(as(w.qariA1, w.A, tx => tx.query(`SELECT email FROM users`)), /permission denied/);
  await assert.rejects(as(w.qariA1, w.A, tx => tx.query(`SELECT password_hash FROM users`)), /permission denied/);
  const seen = (await ids(w.qariA1, w.A, 'users', 'id')).sort();
  assert.deepEqual(seen, [w.qariA1, w.sA1].sort());
});

test('minor recording requires live guardian consent; revoke/expiry/unrevoke handled', async () => {
  const s = sub(w.A, w.sA1);
  await assert.rejects(as(w.sA1, w.A, tx => tx.query(s.sql, s.params)), /guardian_consent_required/);
  // minors cannot consent for themselves; unrelated guardian cannot consent for another child
  await assert.rejects(as(w.sA1, w.A, tx => tx.query(`INSERT INTO consents (institution_id, student_user_id, granted_by_user_id, purpose) VALUES ($1,$2,$2,'audio_recording')`, [w.A, w.sA1])), /row-level security/);
  await assert.rejects(as(w.gA1, w.A, tx => tx.query(`INSERT INTO consents (institution_id, student_user_id, granted_by_user_id, purpose) VALUES ($1,$2,$3,'audio_recording')`, [w.A, w.sA2, w.gA1])), /row-level security/);
  await assert.rejects(as(w.gA2unverified, w.A, tx => tx.query(`INSERT INTO consents (institution_id, student_user_id, granted_by_user_id, purpose) VALUES ($1,$2,$3,'audio_recording')`, [w.A, w.sA2, w.gA2unverified])), /row-level security/);
  // verified guardian grants -> submission works and is linked to the consent
  const consentId = (await as(w.gA1, w.A, tx => tx.query<{ id: string }>(`INSERT INTO consents (institution_id, student_user_id, granted_by_user_id, purpose) VALUES ($1,$2,$3,'audio_recording') RETURNING id`, [w.A, w.sA1, w.gA1]))).rows[0]!.id;
  const ok = (await as(w.sA1, w.A, tx => tx.query<{ consent_id: string }>(s.sql, s.params))).rows[0]!;
  assert.equal(ok.consent_id, consentId);
  // revoke -> blocked again; cannot un-revoke
  await as(w.gA1, w.A, tx => tx.query(`UPDATE consents SET revoked_at = now() WHERE id = $1`, [consentId]));
  await assert.rejects(as(w.sA1, w.A, tx => tx.query(s.sql, s.params)), /guardian_consent_required/);
  await assert.rejects(as(w.gA1, w.A, tx => tx.query(`UPDATE consents SET revoked_at = NULL WHERE id = $1`, [consentId])), /revoked_consent_is_final/);
  // expired consent does not count
  await db.query(`INSERT INTO consents (institution_id, student_user_id, granted_by_user_id, purpose, granted_at, expires_at) VALUES ($1,$2,$3,'audio_recording', now() - interval '2 days', now() - interval '1 day')`, [w.A, w.sA1, w.gA1]);
  await assert.rejects(as(w.sA1, w.A, tx => tx.query(s.sql, s.params)), /guardian_consent_required/);
});

test('consents are not readable by qaris; guardians/students/admin only', async () => {
  assert.equal((await ids(w.qariA1, w.A, 'consents', 'id')).length, 0);
  assert.ok((await ids(w.gA1, w.A, 'consents', 'id')).length >= 1);
  assert.equal((await ids(w.gB, w.B, 'consents', 'id')).length, 0); // other tenant
});

test('adult student may record without guardian consent', async () => {
  const s = sub(w.A, w.sA3adult);
  const r = await as(w.sA3adult, w.A, tx => tx.query(s.sql, s.params));
  assert.equal(r.rows.length, 1);
});

test('recitation submission visibility and qari-only state updates', async () => {
  // sA1 has a submission from the previous test (inserted while consent was live)
  assert.equal((await ids(w.qariA1, w.A, 'recitation_submissions', 'student_user_id')).every(x => x === w.sA1), true);
  assert.equal((await ids(w.qariA2, w.A, 'recitation_submissions', 'student_user_id')).length, 0);
  assert.equal((await ids(w.gA1, w.A, 'recitation_submissions', 'student_user_id')).length >= 1, true);
  assert.equal((await ids(w.qariB, w.B, 'recitation_submissions', 'student_user_id')).length, 0);
  const upd = (u: string) => as(u, w.A, tx => tx.query(`UPDATE recitation_submissions SET state='under_review' WHERE student_user_id=$1 RETURNING id`, [w.sA1]));
  assert.ok((await upd(w.qariA1)).rows.length >= 1);
  assert.equal((await upd(w.qariA2)).rows.length, 0);   // not assigned
  assert.equal((await upd(w.sA1)).rows.length, 0);      // student cannot change workflow state
  await assert.rejects(as(w.qariA1, w.A, tx => tx.query(`UPDATE recitation_submissions SET audio_object_key='x'`)), /permission denied/);
});

test('cross-tenant foreign keys are impossible even for the owner', async () => {
  const cB = (await db.query<{ id: string }>(`INSERT INTO consents (institution_id, student_user_id, granted_by_user_id, purpose) VALUES ($1,$2,$3,'audio_recording') RETURNING id`, [w.B, w.sB1, w.gB])).rows[0]!.id;
  await assert.rejects(db.query(`INSERT INTO recitation_submissions (institution_id, student_user_id, consent_id, edition_code, riwayah, surah, ayah_start, ayah_end, audio_object_key)
     VALUES ($1,$2,$3,'e','hafs',1,1,2,'k')`, [w.A, w.sA3adult, cB]), /foreign key|violates/);
});

test('audit log: written automatically, readable only by admin/safeguarding, immutable for everyone', async () => {
  assert.ok((await ids(w.adminA, w.A, 'audit_logs', 'object_type')).includes('consents'));
  assert.ok((await ids(w.safeA, w.A, 'audit_logs', 'id')).length > 0);
  assert.equal((await ids(w.qariA1, w.A, 'audit_logs', 'id')).length, 0);
  assert.equal((await ids(w.adminB, w.B, 'audit_logs', 'institution_id')).every(x => x === w.B), true);
  await assert.rejects(db.query(`UPDATE audit_logs SET action='x'`), /audit_logs_are_immutable/);
  await assert.rejects(db.query(`DELETE FROM audit_logs`), /audit_logs_are_immutable/);
});
