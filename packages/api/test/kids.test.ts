import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { applyMigrations } from '@tartil/database';
import { buildApp } from '../src/app.ts';

let app: ReturnType<typeof buildApp>; let db: PGlite;
const PW = 'correct-horse-battery';
const call = async (method: 'GET' | 'POST' | 'PUT', url: string, token?: string, payload?: unknown) => {
  const r = await app.inject({ method, url, payload: payload as never, headers: token ? { authorization: `Bearer ${token}` } : {} });
  return { status: r.statusCode, body: r.body ? JSON.parse(r.body) : {} };
};
const user = async (name: string) => {
  const email = `${name}@example.test`;
  const id = (await call('POST', '/auth/register', undefined, { displayName: name, email, password: PW, adultConfirmed: true })).body.id as string;
  return { id, email, token: (await call('POST', '/auth/login', undefined, { email, password: PW, adultConfirmed: true })).body.token as string };
};
before(async () => { db = new PGlite(); await applyMigrations(db as never); app = buildApp({ service: db as never, app: db as never, jwtSecret: 'test-secret-0123456789', rateLimit: { auth: 100000, general: 100000 } }); });
const DAY = 86_400_000;

test('kids academy progress: student syncs own log; mastery needs 4/5 on 2 days; teacher/guardian see only their own children; teacher override; no cross-tenant leak', async () => {
  const admin = await user('k-admin'), qari = await user('k-qari'), qari2 = await user('k-qari2'), kid = await user('k-kid'), kid2 = await user('k-kid2'), par = await user('k-par'), par2 = await user('k-par2'), out = await user('k-out');
  const inst = (await call('POST', '/institutions', admin.token, { name: 'Dar K', slug: 'dar-k' })).body.id as string;
  const other = (await call('POST', '/institutions', out.token, { name: 'Dar Z', slug: 'dar-z' })).body.id as string;
  const b = `/i/${inst}`;
  for (const [u, role] of [[qari, 'qari'], [qari2, 'qari'], [kid, 'student'], [kid2, 'student'], [par, 'guardian'], [par2, 'guardian']] as const) await call('POST', `${b}/members`, admin.token, { email: u.email, role });
  for (const k of [kid, kid2]) await call('POST', `${b}/students`, admin.token, { userId: k.id, isMinor: true });
  for (const [p, k] of [[par, kid], [par2, kid2]] as const) { const l = (await call('POST', `${b}/guardian-links`, admin.token, { guardianUserId: p.id, studentUserId: k.id, relationship: 'parent' })).body.id; await call('POST', `${b}/guardian-links/${l}/verify`, admin.token); }
  await call('POST', `${b}/qari-assignments`, admin.token, { qariUserId: qari.id, studentUserId: kid.id });
  await call('POST', `${b}/qari-assignments`, admin.token, { qariUserId: qari2.id, studentUserId: kid2.id });
  const now = Date.now();
  // 5 attempts on letter 'ب' (4 right) spread over two days -> mastered; letter 'ت' only one day -> not mastered
  const ev = [
    ...[[3, true], [3, true], [2, false], [2, true], [0, true]].map(([d, ok]) => ({ act: 'rec', item: 'ب', ok, t: now - (d as number) * DAY - Math.floor(Math.random() * 1000) })),
    ...[0, 0, 0, 0, 0].map((_, i) => ({ act: 'rec', item: 'ت', ok: true, t: now - i * 1000 - 50 })),
    { act: 'pair', item: 'س|ش', ok: false, t: now - 10 }, { act: 'pair', item: 'س|ش', ok: false, t: now - 20 }];
  assert.equal((await call('POST', `${b}/kids/attempts`, kid.token, { events: ev })).body.stored, ev.length);
  assert.equal((await call('POST', `${b}/kids/attempts`, kid.token, { events: ev })).body.stored, 0);                 // idempotent resync
  assert.equal((await call('POST', `${b}/kids/attempts`, kid.token, { events: [{ act: 'rec', item: 'ا', ok: true, t: now + 5 * DAY }] })).body.rejected, 1); // future event rejected
  assert.equal((await call('POST', `${b}/kids/attempts`, qari.token, { events: ev.slice(0, 1) })).status, 403);       // only a student records
  assert.equal((await call('POST', `${b}/kids/attempts`, kid.token, { events: [{ act: 'rec', item: 'ابتثجحخدذر', ok: true, t: now }] })).status, 400); // item max 8
  const own = (await call('GET', `${b}/kids/progress`, kid.token)).body;
  assert.deepEqual(own.masteredLetters, ['ب']); assert.equal(own.confusions['س|ش'], 2); assert.equal(own.note, 'progress_is_not_a_grade_or_a_rank');
  // who can see
  assert.equal((await call('GET', `${b}/kids/progress?student=${kid.id}`, qari.token)).status, 200);                 // their teacher
  assert.equal((await call('GET', `${b}/kids/progress?student=${kid.id}`, qari2.token)).status, 404);                // another teacher
  assert.equal((await call('GET', `${b}/kids/progress?student=${kid.id}`, par2.token)).status, 404);                 // another child's guardian
  assert.equal((await call('GET', `${b}/kids/progress?student=${kid.id}`, par.token)).status, 200);                  // verified guardian
  assert.equal((await call('GET', `${b}/kids/progress?student=${kid.id}`, kid2.token)).status, 404);                 // a different child
  assert.equal((await call('GET', `/i/${other}/kids/progress?student=${kid.id}`, out.token)).body.attempts ?? 0, 0);   // other tenant sees nothing of this institution's data
  assert.equal((await call('GET', `${b}/kids/overview`, qari.token)).body.students.length, 1);
  assert.equal((await call('GET', `${b}/kids/overview`, qari2.token)).body.students.length, 0);
  // profile + teacher override
  assert.equal((await call('PUT', `${b}/kids/profile`, kid.token, { band: 'a', placementLevel: 'new' })).status, 200);
  assert.equal((await call('PUT', `${b}/kids/profile`, qari.token, { band: 'b' })).status, 403);                      // teachers cannot create/alter the child's own fields
  assert.equal((await call('POST', `${b}/kids/level`, kid.token, { studentUserId: kid.id, level: 'adv' })).status, 403); // the child cannot set the teacher level
  assert.equal((await call('POST', `${b}/kids/level`, qari2.token, { studentUserId: kid.id, level: 'adv' })).status, 404);
  assert.equal((await call('POST', `${b}/kids/level`, qari.token, { studentUserId: kid.id, level: 'adv' })).status, 200);
  const after = (await call('GET', `${b}/kids/progress`, kid.token)).body;
  assert.equal(after.teacherLevel, 'adv'); assert.equal(after.band, 'a');
  assert.equal((await call('PUT', `${b}/kids/profile`, kid.token, { band: 'c' })).status, 200);                       // child's own edit does not erase the teacher level
  assert.equal((await call('GET', `${b}/kids/progress`, kid.token)).body.teacherLevel, 'adv');
});
