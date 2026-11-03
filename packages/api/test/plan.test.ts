import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { applyMigrations } from '@tartil/database';
import { buildApp } from '../src/app.ts';

let app: ReturnType<typeof buildApp>; let db: PGlite;
const PW = 'correct-horse-battery';
const call = async (method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, token?: string, payload?: unknown) => {
  const r = await app.inject({ method, url, payload: payload as never, headers: token ? { authorization: `Bearer ${token}` } : {} });
  return { status: r.statusCode, body: r.body ? JSON.parse(r.body) : {} };
};
const user = async (name: string) => {
  const email = `${name}@example.test`;
  const id = (await call('POST', '/auth/register', undefined, { displayName: name, email, password: PW, adultConfirmed: true })).body.id as string;
  return { id, email, token: (await call('POST', '/auth/login', undefined, { email, password: PW, adultConfirmed: true })).body.token as string };
};
before(async () => { db = new PGlite(); await applyMigrations(db as never); app = buildApp({ service: db as never, app: db as never, jwtSecret: 'test-secret-0123456789', rateLimit: { auth: 100000, general: 100000 } }); });
const P = { goal: 'new', dir: 'down', surah: 114, mins: 20, days: 5, size: 3 };

test('study plan: private by default, shared only by the student, teacher approves; owner cannot approve; edits reset approval; isolation', async () => {
  const admin = await user('p-admin'), qari = await user('p-qari'), stu = await user('p-stu'), stu2 = await user('p-stu2'), qari2 = await user('p-qari2'), out = await user('p-out');
  const inst = (await call('POST', '/institutions', admin.token, { name: 'Dar P', slug: 'dar-p' })).body.id as string;
  const b = `/i/${inst}`;
  for (const [u, role] of [[qari, 'qari'], [qari2, 'qari'], [stu, 'student'], [stu2, 'student']] as const) await call('POST', `${b}/members`, admin.token, { email: u.email, role });
  for (const u of [stu, stu2]) await call('POST', `${b}/students`, admin.token, { userId: u.id, isMinor: false });
  await call('POST', `${b}/qari-assignments`, admin.token, { qariUserId: qari.id, studentUserId: stu.id });
  // validation + private save
  assert.equal((await call('PUT', '/me/plan', stu.token, { payload: { ...P, mins: 1 } })).status, 400);
  assert.equal((await call('PUT', '/me/plan', stu.token, { payload: { ...P, extra: 1 } })).status, 400);   // strict: no free-form data
  assert.equal((await call('PUT', '/me/plan', undefined, { payload: P })).status, 401);
  assert.equal((await call('PUT', '/me/plan', stu.token, { title: 'خطتي للفجر', payload: P })).status, 200);
  assert.equal((await call('GET', '/me/plan', stu.token)).body.plan.status, 'private');
  assert.equal((await call('GET', '/me/plan', out.token)).body.plan, null);                                  // nobody else sees it
  assert.equal((await call('GET', `${b}/plans`, qari.token)).body.plans.length, 0);                          // private is invisible to the teacher
  // sharing: only a student member of that institution
  await call('PUT', '/me/plan', out.token, { payload: P });
  assert.equal((await call('POST', `${b}/plans/share`, out.token)).status, 403);
  assert.equal((await call('GET', '/me/plan', out.token)).body.plan.status, 'private');
  assert.equal((await call('POST', `${b}/plans/share`, stu.token)).status, 200);
  const list = (await call('GET', `${b}/plans`, qari.token)).body.plans;
  assert.equal(list.length, 1); assert.equal(list[0].status, 'shared');
  assert.equal((await call('GET', `${b}/plans`, qari2.token)).body.plans.length, 0);                         // not their student
  // the owner cannot approve (route is institution-scoped; the guard trigger decides)
  const pid = list[0].id as string;
  assert.equal((await call('POST', `${b}/plans/${pid}/review`, stu.token, { decision: 'approved' })).status, 403); // the owner can see it but the guard trigger refuses her approval
  assert.equal((await call('POST', `${b}/plans/${pid}/review`, qari2.token, { decision: 'approved' })).status, 404);
  assert.equal((await call('POST', `${b}/plans/${pid}/review`, qari.token, { decision: 'approved', note: 'بارك الله فيك' })).status, 200);
  assert.equal((await call('GET', '/me/plan', stu.token)).body.plan.status, 'approved');
  assert.equal((await call('GET', '/me/plan', stu.token)).body.plan.teacherNote, 'بارك الله فيك');
  // editing an approved plan sends it back for re-approval and clears the old decision
  assert.equal((await call('PUT', '/me/plan', stu.token, { payload: { ...P, mins: 30 } })).status, 200);
  const after = (await call('GET', '/me/plan', stu.token)).body.plan;
  assert.equal(after.status, 'shared'); assert.equal(after.teacherNote, null);
  // the teacher cannot change content, only decide
  assert.equal((await call('POST', `${b}/plans/${pid}/review`, qari.token, { decision: 'changes_requested', note: 'قلّل' })).status, 200);
  assert.equal((await call('GET', '/me/plan', stu.token)).body.plan.status, 'changes_requested');
  // deletion is the owner's
  assert.equal((await call('DELETE', '/me/plan', stu.token)).body.deleted, 1);
  assert.equal((await call('GET', `${b}/plans`, qari.token)).body.plans.length, 0);
});
