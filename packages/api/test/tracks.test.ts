import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { applyMigrations } from '@tartil/database';
import { buildApp } from '../src/app.ts';

let app: ReturnType<typeof buildApp>; let appAi: ReturnType<typeof buildApp>;
const PW = 'correct-horse-battery';
type Call = (m: 'GET' | 'POST', url: string, token?: string, payload?: unknown) => Promise<{ status: number; body: any }>;
const mk = (a: () => ReturnType<typeof buildApp>): Call => async (method, url, token, payload) => {
  const r = await a().inject({ method, url, payload: payload as never, headers: token ? { authorization: `Bearer ${token}` } : {} });
  return { status: r.statusCode, body: r.body ? JSON.parse(r.body) : {} };
};
const call = mk(() => app); const callAi = mk(() => appAi);
const user = async (name: string) => {
  const email = `${name}@example.test`;
  const id = (await call('POST', '/auth/register', undefined, { displayName: name, email, password: PW, adultConfirmed: true })).body.id as string;
  const token = (await call('POST', '/auth/login', undefined, { email, password: PW })).body.token as string;
  return { id, email, token };
};
let db: PGlite;
before(async () => {
  db = new PGlite(); await applyMigrations(db as never);
  const base = { service: db as never, app: db as never, jwtSecret: 'test-secret-0123456789', rateLimit: { auth: 100000, general: 100000 } };
  app = buildApp(base);
  appAi = buildApp({ ...base, ai: { name: 'fake-model', suggest: async p => 'draft: ' + p } });
});

test('registration needs the adult confirmation', async () => {
  assert.equal((await call('POST', '/auth/register', undefined, { displayName: 'x', email: 'x@example.test', password: PW })).status, 400);
  assert.equal((await call('POST', '/auth/register', undefined, { displayName: 'x', email: 'x@example.test', password: PW, adultConfirmed: false })).status, 400);
});

test('logout-all and change-password kill older sessions', async () => {
  const u = await user('sess');
  assert.equal((await call('GET', '/me', u.token)).status, 200);
  await new Promise(r => setTimeout(r, 5));
  assert.equal((await call('POST', '/auth/logout-all', u.token)).status, 200);
  assert.deepEqual((await call('GET', '/me', u.token)).body, { error: 'session_revoked' });
  const t2 = (await call('POST', '/auth/login', undefined, { email: u.email, password: PW })).body.token;
  assert.equal((await call('GET', '/me', t2)).status, 200);
  assert.equal((await call('POST', '/auth/change-password', t2, { currentPassword: 'wrong-password', newPassword: 'another-long-pass' })).status, 401);
  const ch = await call('POST', '/auth/change-password', t2, { currentPassword: PW, newPassword: 'another-long-pass' });
  assert.equal(ch.status, 200);
  assert.equal((await call('GET', '/me', t2)).status, 401);
  assert.equal((await call('GET', '/me', ch.body.token)).status, 200);
  assert.equal((await call('POST', '/auth/login', undefined, { email: u.email, password: PW })).status, 401);
  assert.equal((await call('POST', '/auth/login', undefined, { email: u.email, password: 'another-long-pass' })).status, 200);
});

test('tracks -> progress -> passport -> certificate -> public verification; minors withheld', async () => {
  const admin = await user('tadmin'), qari = await user('tqari'), stu = await user('tstu'), kid = await user('tkid');
  const inst = (await call('POST', '/institutions', admin.token, { name: 'Dar T', slug: 'dar-t' })).body.id as string;
  const b = `/i/${inst}`;
  for (const [u, role] of [[qari, 'qari'], [stu, 'student'], [kid, 'student']] as const) await call('POST', `${b}/members`, admin.token, { email: u.email, role });
  await call('POST', `${b}/students`, admin.token, { userId: stu.id, isMinor: false });
  await call('POST', `${b}/students`, admin.token, { userId: kid.id, isMinor: true });
  for (const s of [stu, kid]) await call('POST', `${b}/qari-assignments`, admin.token, { qariUserId: qari.id, studentUserId: s.id });

  const tr = await call('POST', `${b}/tracks`, qari.token, { title: 'Juz Amma', units: [{ title: 'Fatiha', kind: 'memorization', surah: 1, fromAyah: 1, toAyah: 7 }, { title: 'Review', kind: 'review' }] });
  assert.equal(tr.status, 201);
  assert.equal((await call('GET', `${b}/tracks`, stu.token)).body.tracks.length, 0);                 // draft hidden from students
  assert.equal((await call('POST', `${b}/tracks/${tr.body.id}/status`, stu.token, { status: 'published' })).status, 404);
  assert.equal((await call('POST', `${b}/tracks/${tr.body.id}/status`, qari.token, { status: 'published' })).status, 200);
  const tracks = (await call('GET', `${b}/tracks`, stu.token)).body.tracks; assert.equal(tracks[0].units.length, 2);
  const [u1, u2] = tracks[0].units.map((u: { id: string }) => u.id);

  const prog = (u: typeof qari, unit: string, s = stu) => call('POST', `${b}/tracks/${tr.body.id}/progress`, u.token, { unitId: unit, studentUserId: s.id });
  assert.equal((await prog(stu, u1)).status, 403);
  assert.equal((await prog(qari, u1)).status, 201);
  assert.equal((await prog(qari, u1)).status, 409);
  const cert = (u: typeof qari, s = stu) => call('POST', `${b}/certificates`, u.token, { trackId: tr.body.id, studentUserId: s.id });
  assert.equal((await cert(admin)).body.error, 'track_not_complete');
  assert.equal((await prog(qari, u2)).status, 201);
  assert.equal((await cert(qari)).status, 403);
  const c = await cert(admin); assert.equal(c.status, 201);
  const pass = (await call('GET', `${b}/passport`, stu.token)).body;
  assert.equal(pass.tracks[0].done, 2); assert.equal(pass.certificates.length, 1);
  assert.equal((await call('GET', `${b}/passport?studentUserId=${stu.id}`, kid.token)).body.certificates.length, 0);   // another student sees nothing

  const v = await call('GET', `/verify/${c.body.verificationCode}`);
  assert.equal(v.body.valid, true); assert.equal(v.body.holder, 'tstu'); assert.equal(v.body.track, 'Juz Amma');
  assert.equal((await call('GET', `/verify/${'0'.repeat(32)}`)).status, 404);
  for (const u of [u1, u2]) await prog(qari, u, kid);
  const ck = await cert(admin, kid); assert.equal(ck.status, 201);
  assert.equal((await call('GET', `/verify/${ck.body.verificationCode}`)).body.holder, null);          // minor's name withheld
});

test('AI assistant: 501 without a model; with one, drafts stay hidden until a human accepts', async () => {
  const admin = await user('aadmin'), qari = await user('aqari'), stu = await user('astu');
  const inst = (await call('POST', '/institutions', admin.token, { name: 'Dar A', slug: 'dar-a' })).body.id as string;
  const b = `/i/${inst}`;
  for (const [u, role] of [[qari, 'qari'], [stu, 'student']] as const) await call('POST', `${b}/members`, admin.token, { email: u.email, role });
  await call('POST', `${b}/students`, admin.token, { userId: stu.id, isMinor: false });
  await call('POST', `${b}/qari-assignments`, admin.token, { qariUserId: qari.id, studentUserId: stu.id });
  assert.equal((await call('GET', `${b}/ai/status`, qari.token)).body.modelConnected, false);
  assert.equal((await call('POST', `${b}/ai-suggestions/generate`, qari.token, { studentUserId: stu.id, prompt: 'تدرب على المد' })).status, 501);
  assert.equal((await callAi('GET', `${b}/ai/status`, qari.token)).body.modelConnected, true);
  const g = await callAi('POST', `${b}/ai-suggestions/generate`, qari.token, { studentUserId: stu.id, prompt: 'تدرب على المد' });
  assert.equal(g.status, 201);
  assert.equal((await callAi('GET', `${b}/ai-suggestions`, stu.token)).body.suggestions.length, 0);
  assert.equal((await callAi('POST', `${b}/ai-suggestions/${g.body.id}/review`, stu.token, { decision: 'accepted' })).status, 404);
  assert.equal((await callAi('POST', `${b}/ai-suggestions/${g.body.id}/review`, qari.token, { decision: 'accepted' })).status, 200);
  assert.equal((await callAi('GET', `${b}/ai-suggestions`, stu.token)).body.suggestions.length, 1);
});

test('halaqah join: window enforced, minor needs a verified guardian, room not guessable', async () => {
  const admin = await user('jadmin'), qari = await user('jqari'), kid = await user('jkid'), par = await user('jpar'), out = await user('jout');
  const inst = (await call('POST', '/institutions', admin.token, { name: 'Dar J', slug: 'dar-j' })).body.id as string;
  const b = `/i/${inst}`;
  for (const [u, role] of [[qari, 'qari'], [kid, 'student'], [par, 'guardian'], [out, 'student']] as const) await call('POST', `${b}/members`, admin.token, { email: u.email, role });
  await call('POST', `${b}/students`, admin.token, { userId: kid.id, isMinor: true });
  await call('POST', `${b}/students`, admin.token, { userId: out.id, isMinor: false });
  const h = (await call('POST', `${b}/halaqat`, admin.token, { name: 'Halaqah J', qariUserId: qari.id })).body.id;
  await call('POST', `${b}/halaqat/${h}/members`, admin.token, { studentUserId: kid.id });
  const now = Date.now();
  const mkS = async (a: number, z: number) => (await call('POST', `${b}/halaqat/${h}/sessions`, qari.token, { startsAt: new Date(now + a).toISOString(), endsAt: new Date(now + z).toISOString() })).body.id as string;
  const open = await mkS(-60_000, 3_600_000), future = await mkS(86_400_000, 90_000_000);
  assert.equal((await call('POST', `${b}/sessions/${future}/join`, qari.token)).body.error, 'session_not_open');
  assert.equal((await call('POST', `${b}/sessions/${open}/join`, kid.token)).body.error, 'guardian_required');
  const link = (await call('POST', `${b}/guardian-links`, admin.token, { guardianUserId: par.id, studentUserId: kid.id, relationship: 'parent' })).body.id;
  await call('POST', `${b}/guardian-links/${link}/verify`, admin.token);
  const j = await call('POST', `${b}/sessions/${open}/join`, kid.token);
  assert.equal(j.status, 200); assert.equal(j.body.recorded, false); assert.match(j.body.url, /^https:\/\/meet\.jit\.si\/tartil-[0-9a-f]{64}$/);
  assert.equal((await call('POST', `${b}/sessions/${open}/join`, out.token)).status, 404);   // not in the circle: session invisible
});
