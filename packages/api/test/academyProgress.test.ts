import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { applyMigrations } from '@tartil/database';
import { buildApp } from '../src/app.ts';

let app: ReturnType<typeof buildApp>; let db: PGlite;
const PW = 'correct-horse-battery';
const call = async (method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, token?: string, payload?: unknown) => {
  const r = await app.inject({ method, url, payload: payload as never, headers: token ? { authorization: `Bearer ${token}` } : {} });
  return { status: r.statusCode, body: r.body ? JSON.parse(r.body) : {}, headers: r.headers };
};
const user = async (name: string) => {
  const email = `${name}@example.test`;
  const id = (await call('POST', '/auth/register', undefined, { displayName: name, email, password: PW, adultConfirmed: true })).body.id as string;
  return { id, email, token: (await call('POST', '/auth/login', undefined, { email, password: PW, adultConfirmed: true })).body.token as string };
};
before(async () => { db = new PGlite(); await applyMigrations(db as never); app = buildApp({ service: db as never, app: db as never, jwtSecret: 'test-secret-0123456789', rateLimit: { auth: 100000, general: 100000 } }); });
const it = (kind: string, ref: string, status: string, payload: unknown = {}) => ({ kind, ref, programId: 'prog.a', status, payload });

test('academy progress API: auth, validation, upsert, idempotence, summary without grades, erase', async () => {
  const stu = await user('ap-stu');
  assert.equal((await call('GET', '/me/academy/progress')).status, 401);
  assert.equal((await call('PUT', '/me/academy/progress', undefined, { items: [it('lesson', 'l1', 'completed')] })).status, 401);
  assert.equal((await call('GET', '/me/academy/progress', stu.token)).body.items.length, 0);
  // validation: shape, free text, size, batch size, unknown keys
  const bad = (items: unknown) => call('PUT', '/me/academy/progress', stu.token, { items });
  assert.equal((await bad([])).status, 400);
  assert.equal((await bad(Array.from({ length: 101 }, (_, i) => it('lesson', `l${i}`, 'started')))).status, 400);
  assert.equal((await bad([it('quiz', 'q', 'started')])).status, 400);
  assert.equal((await bad([it('lesson', 'l 1', 'started')])).status, 400);
  assert.equal((await bad([it('lesson', 'l1', 'started', { note: 'كتبت شيئًا خاصًا' })])).status, 400);   // no free text
  assert.equal((await bad([it('lesson', 'l1', 'started', { grade: { a: 1 } })])).status, 400);
  assert.equal((await bad([{ ...it('lesson', 'l1', 'started'), extra: 1 }])).status, 400);
  assert.equal((await bad([it('lesson', 'l1', 'started', { competencies: Array.from({ length: 31 }, (_, i) => `c${i}`) })])).status, 400);
  assert.equal((await call('GET', '/me/academy/progress', stu.token)).body.items.length, 0);             // nothing partial
  // upsert a batch of 100 + idempotent replay
  const big = Array.from({ length: 100 }, (_, i) => it('activity', `a${i}`, i % 2 ? 'completed' : 'started', i === 1 ? { competencies: ['C1', 'C2'], assessment: true } : {}));
  assert.equal((await bad(big)).status, 200); assert.equal((await bad(big)).status, 200);
  const g = (await call('GET', '/me/academy/progress', stu.token)).body;
  assert.equal(g.items.length, 100);
  assert.equal(g.headers, undefined);
  // summary: separated counts, no score/rank/percent fields
  assert.equal((await bad([it('session', 's1', 'completed'), it('session', 's2', 'started'), it('lesson', 'l1', 'completed'), it('scenario', 'sc1', 'completed')])).status, 200);
  const s = (await call('GET', '/me/academy/progress', stu.token)).body.summary[0];
  assert.equal(s.sessionsCompleted, 1); assert.equal(s.sessionsStarted, 1); assert.equal(s.activitiesCompleted, 50); assert.equal(s.lessonsCompleted, 1); assert.equal(s.scenariosCompleted, 1);
  assert.deepEqual(s.competenciesPracticed, ['C1', 'C2']); assert.equal(s.assessmentsSubmitted, 1); assert.equal(s.sessionsAvailable, null);
  assert.equal(s.nextRecommendedStep, null);
  for (const k of Object.keys(s)) assert.doesNotMatch(k, /score|grade|rank|percent|points|moral|faith/i);
  assert.equal((await call('GET', '/me/academy/progress', stu.token)).headers['cache-control'], 'no-store');
  // completed never regresses to started on replay
  await bad([it('lesson', 'l1', 'started')]);
  assert.equal((await call('GET', '/me/academy/progress', stu.token)).body.items.find((x: { ref: string }) => x.ref === 'l1').status, 'completed');
  // erase: confirmation required, then everything is gone
  assert.equal((await call('DELETE', '/me/academy/progress', stu.token, {})).status, 400);
  const d = await call('DELETE', '/me/academy/progress', stu.token, { confirm: 'DELETE_ALL_MY_ACADEMY_PROGRESS' });
  assert.equal(d.status, 200); assert.equal(d.body.deleted, 104);
  assert.equal((await call('GET', '/me/academy/progress', stu.token)).body.items.length, 0);
});

test('academy progress API: isolation, explicit share, viewer access, feedback + next step, revoke, erase revokes shares', async () => {
  const admin = await user('ap2-admin'), qari = await user('ap2-qari'), qari2 = await user('ap2-qari2'), stu = await user('ap2-stu'), stu2 = await user('ap2-stu2'), out = await user('ap2-out'), outQari = await user('ap2-outqari');
  const inst = (await call('POST', '/institutions', admin.token, { name: 'Dar AP', slug: 'dar-ap' })).body.id as string;
  const inst2 = (await call('POST', '/institutions', (await user('ap2-admin2')).token, { name: 'Dar AP2', slug: 'dar-ap2' })).body.id as string;
  const b = `/i/${inst}`;
  for (const [u, role] of [[qari, 'qari'], [qari2, 'qari'], [stu, 'student'], [stu2, 'student']] as const) await call('POST', `${b}/members`, admin.token, { email: u.email, role });
  const admin2 = await user('ap2-admin2b'); void admin2;
  await call('POST', `/i/${inst2}/members`, (await call('POST', '/auth/login', undefined, { email: 'ap2-admin2@example.test', password: PW })).body.token, { email: outQari.email, role: 'qari' });
  await call('PUT', '/me/academy/progress', stu.token, { items: [it('activity', 'a1', 'completed', { competencies: ['C3'] })] });
  await call('PUT', '/me/academy/progress', stu2.token, { items: [it('activity', 'z1', 'completed')] });
  const view = (u: { token: string }, sid: string, i = inst) => call('GET', `/i/${i}/academy/students/${sid}/progress`, u.token);
  // no share: 404 for everybody, including the teacher and the admin; no existence leak
  for (const v of [qari, admin, qari2, out]) assert.equal((await view(v, stu.id)).status, 404);
  assert.equal((await call('GET', `${b}/academy/students/${stu.id}/progress`)).status, 401);
  // another user's data is invisible through /me
  assert.equal((await call('GET', '/me/academy/progress', stu2.token)).body.items.length, 1);
  // sharing: unknown email and ineligible viewers get the same answer
  const sh = (u: { token: string }, viewerEmail: string, scope?: string) => call('POST', '/me/academy/progress/share', u.token, { viewerEmail, ...(scope ? { scope } : {}) });
  assert.equal((await sh(stu, 'nobody@example.test')).status, 404);
  assert.equal((await sh(stu, outQari.email)).status, 404);                    // other institution
  assert.equal((await sh(stu, stu2.email)).status, 404);                       // fellow student
  assert.equal((await sh(stu, qari.email, 'everything')).status, 400);
  assert.equal((await call('POST', '/me/academy/progress/share', undefined, { viewerEmail: qari.email })).status, 401);
  assert.equal((await sh(stu, qari.email)).status, 201);
  assert.equal((await sh(stu, qari.email)).status, 201);                       // idempotent
  assert.equal((await call('GET', '/me/academy/progress', stu.token)).body.shares.length, 1);
  // viewer sees exactly that student, scoped to the institution
  const v = await view(qari, stu.id);
  assert.equal(v.status, 200); assert.equal(v.body.items.length, 1); assert.equal(v.body.scope, 'progress');
  assert.equal((await view(qari, stu2.id)).status, 404);                       // not shared
  assert.equal((await view(qari2, stu.id)).status, 404);                       // another teacher
  assert.equal((await view(admin, stu.id)).status, 404);                       // admin has no implicit access
  assert.equal((await view(qari, stu.id, inst2)).status, 404);                 // wrong institution context (not a member)
  assert.equal((await call('PUT', `${b}/academy/students/${stu.id}/progress`, qari.token, { items: [it('activity', 'x', 'completed')] })).status, 404); // read-only
  // feedback needs the explicit feedback scope
  const fb = (u: { token: string }, body: unknown) => call('POST', `${b}/academy/students/${stu.id}/feedback`, u.token, body);
  assert.equal((await fb(qari, { programId: 'prog.a', note: 'جيد' })).status, 404);
  assert.equal((await sh(stu, qari.email, 'progress_feedback')).status, 201);
  assert.equal((await fb(qari, { programId: 'prog.a' })).status, 400);        // empty
  assert.equal((await fb(qari, { programId: 'prog.a', note: 'x'.repeat(501) })).status, 400);
  assert.equal((await fb(qari2, { programId: 'prog.a', note: 'لا' })).status, 404);
  assert.equal((await fb(stu, { programId: 'prog.a', note: 'self' })).status, 404);
  assert.equal((await fb(qari, { programId: 'prog.a', note: 'أحسنت المواظبة', nextStepRef: 'lesson-2' })).status, 201);
  const mine = (await call('GET', '/me/academy/progress', stu.token)).body;
  assert.equal(mine.teacherFeedback.length, 1); assert.equal(mine.summary[0].nextRecommendedStep, 'lesson-2');
  assert.equal((await view(qari, stu.id)).body.summary[0].nextRecommendedStep, 'lesson-2');
  // revoke (path form), immediate effect; second revoke 404; body form also works
  assert.equal((await call('DELETE', `/me/academy/progress/share/${qari.id}`, stu.token)).status, 200);
  assert.equal((await view(qari, stu.id)).status, 404);
  assert.equal((await call('DELETE', `/me/academy/progress/share/${qari.id}`, stu.token)).status, 404);
  assert.equal((await call('DELETE', '/me/academy/progress/share/not-a-uuid', stu.token)).status, 400);
  await sh(stu, qari.email);
  assert.equal((await call('DELETE', '/me/academy/progress/share', stu.token, { viewerUserId: qari.id })).status, 200);
  // erase-all also revokes every share; teacher's feedback is not deleted
  await sh(stu, qari.email);
  const d = await call('DELETE', '/me/academy/progress', stu.token, { confirm: 'DELETE_ALL_MY_ACADEMY_PROGRESS' });
  assert.equal(d.body.deleted, 1); assert.equal(d.body.sharesRevoked, 1);
  assert.equal((await view(qari, stu.id)).status, 404);
  assert.equal((await call('GET', '/me/academy/progress', stu.token)).body.teacherFeedback.length, 1);
  assert.equal((await call('GET', '/me/academy/progress', stu2.token)).body.items.length, 1);          // untouched
});

test('academy progress API: general rate limiter applies to the new routes', async () => {
  const limited = buildApp({ service: db as never, app: db as never, jwtSecret: 'test-secret-0123456789', rateLimit: { auth: 100000, general: 3 } });
  const u = await user('ap3-rl');
  const codes: number[] = [];
  for (let i = 0; i < 6; i++) codes.push((await limited.inject({ method: 'GET', url: '/me/academy/progress', headers: { authorization: `Bearer ${u.token}`, 'x-forwarded-for': '203.0.113.9' } })).statusCode);
  assert.ok(codes.includes(429), String(codes));
});
