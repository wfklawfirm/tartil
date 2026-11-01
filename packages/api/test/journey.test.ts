import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { applyMigrations } from '@tartil/database';
import { buildApp } from '../src/app.ts';

let app: ReturnType<typeof buildApp>;
const PW = 'correct-horse-battery';
const call = async (method: 'GET' | 'POST', url: string, token?: string, payload?: unknown) => {
  const r = await app.inject({ method, url, payload: payload as never, headers: token ? { authorization: `Bearer ${token}` } : {} });
  return { status: r.statusCode, body: r.body ? JSON.parse(r.body) : {} };
};
const user = async (name: string) => {
  const email = `${name}@example.test`;
  const id = (await call('POST', '/auth/register', undefined, { displayName: name, email, password: PW })).body.id as string;
  const token = (await call('POST', '/auth/login', undefined, { email, password: PW })).body.token as string;
  return { id, email, token };
};
before(async () => { const db = new PGlite(); await applyMigrations(db as never); app = buildApp({ service: db as never, app: db as never, jwtSecret: 'test-secret-0123456789' }); });

test('full journey: onboarding -> minor student -> guardian consent -> recitation -> qari feedback; other tenant sees nothing', async () => {
  const admin = await user('admin'), qari = await user('qari'), child = await user('child'), parent = await user('parent'), other = await user('otheradmin');

  const inst = (await call('POST', '/institutions', admin.token, { name: 'Dar Test', slug: 'dar-test', countryCode: 'lb' })).body.id as string;
  const inst2 = (await call('POST', '/institutions', other.token, { name: 'Dar Other', slug: 'dar-other' })).body.id as string;
  const base = `/i/${inst}`;
  for (const [u, role] of [[qari, 'qari'], [child, 'student'], [parent, 'guardian']] as const) assert.equal((await call('POST', `${base}/members`, admin.token, { email: u.email, role })).status, 201);
  assert.equal((await call('POST', `${base}/students`, admin.token, { userId: child.id, isMinor: true })).status, 201);
  const link = (await call('POST', `${base}/guardian-links`, admin.token, { guardianUserId: parent.id, studentUserId: child.id, relationship: 'parent' })).body.id as string;
  assert.equal((await call('POST', `${base}/qari-assignments`, admin.token, { qariUserId: qari.id, studentUserId: child.id })).status, 201);

  const rec = { editionCode: 'edition-x', riwayah: 'hafs', surah: 1, ayahStart: 1, ayahEnd: 7, audioObjectKey: 'private/child/1.webm' };
  // unverified guardian cannot consent; minor cannot submit without consent
  assert.equal((await call('POST', `${base}/consents`, parent.token, { studentUserId: child.id, purpose: 'audio_recording' })).status, 403);
  assert.deepEqual((await call('POST', `${base}/submissions`, child.token, rec)).body, { error: 'guardian_consent_required' });
  // admin verifies the guardian, guardian consents, child records
  assert.equal((await call('POST', `${base}/guardian-links/${link}/verify`, admin.token)).status, 200);
  const consent = (await call('POST', `${base}/consents`, parent.token, { studentUserId: child.id, purpose: 'audio_recording' })).body.id as string;
  const sub = await call('POST', `${base}/submissions`, child.token, rec);
  assert.equal(sub.status, 201);
  // public URLs are refused as audio keys
  assert.equal((await call('POST', `${base}/submissions`, child.token, { ...rec, audioObjectKey: 'https://cdn.example/a.mp3' })).status, 400);
  // qari sees it and moves the workflow; the child cannot
  assert.equal((await call('GET', `${base}/submissions`, qari.token)).body.submissions.length, 1);
  assert.equal((await call('POST', `${base}/submissions/${sub.body.id}/state`, child.token, { state: 'closed' })).status, 404);
  assert.equal((await call('POST', `${base}/submissions/${sub.body.id}/state`, qari.token, { state: 'feedback_sent' })).status, 200);
  // guardian sees the child's work; revocation blocks further recordings
  assert.equal((await call('GET', `${base}/submissions`, parent.token)).body.submissions.length, 1);
  assert.equal((await call('POST', `${base}/consents/${consent}/revoke`, parent.token)).status, 200);
  assert.equal((await call('POST', `${base}/submissions`, child.token, rec)).status, 409);

  // isolation: the other institution's admin gets nothing / forbidden on our tenant, and the DB hides our rows even with a forged tenant id
  assert.equal((await call('GET', `${base}/students`, other.token)).body.students.length, 0);
  assert.equal((await call('POST', `${base}/members`, other.token, { email: child.email, role: 'student' })).status, 403);
  assert.equal((await call('GET', `/i/${inst2}/students`, admin.token)).body.students.length, 0);
});

test('auth: bad password, missing/forged/expired tokens, weak password, validation', async () => {
  const u = await user('authcase');
  assert.equal((await call('POST', '/auth/login', undefined, { email: u.email, password: 'wrong-wrong-wrong' })).status, 401);
  assert.equal((await call('POST', '/auth/login', undefined, { email: 'nobody@example.test', password: 'whatever-whatever' })).status, 401);
  assert.equal((await call('POST', '/institutions', undefined, { name: 'X', slug: 'xx' })).status, 401);
  assert.equal((await call('POST', '/institutions', u.token + 'tamper', { name: 'Xx', slug: 'xx-1' })).status, 401);
  assert.equal((await call('POST', '/auth/register', undefined, { displayName: 'a', email: 'a@example.test', password: 'short' })).status, 400);
  assert.equal((await call('POST', '/auth/register', undefined, { displayName: 'dup', email: u.email, password: PW })).status, 409);
  const { signToken } = await import('../src/auth.ts');
  const old = signToken(u.id, 'test-secret-0123456789', 60, Date.now() - 3600_000);
  assert.equal((await call('POST', '/institutions', old, { name: 'Xx', slug: 'xx-2' })).status, 401);
});

test('responses never leak SQL or password hashes', async () => {
  const u = await user('leakcase');
  const r = await call('POST', '/i/00000000-0000-4000-8000-000000000000/students', u.token, { userId: u.id, isMinor: false });
  assert.ok([403, 422].includes(r.status)); assert.ok(!JSON.stringify(r.body).match(/INSERT|violates|scrypt/i));
});

test('assertSafeRoles accepts the real app path and rejects a connection that runs as the owner', async () => {
  const { assertSafeRoles } = await import('../src/pg.ts');
  const db = new PGlite(); await applyMigrations(db as never);
  await assertSafeRoles(db as never);
  // simulate a mis-configured deployment: role switching silently ignored => queries run as superuser/owner
  const owner = { ...db, exec: (sql: string) => /SET LOCAL ROLE/.test(sql) ? Promise.resolve() : db.exec(sql), query: db.query.bind(db),
    transaction: <T,>(fn: (tx: never) => Promise<T>) => db.transaction(tx => fn({ exec: (sql: string) => /SET LOCAL ROLE/.test(sql) ? Promise.resolve() : tx.exec(sql), query: tx.query.bind(tx) } as never)) };
  await assert.rejects(assertSafeRoles(owner as never), /unsafe database role/);
});
