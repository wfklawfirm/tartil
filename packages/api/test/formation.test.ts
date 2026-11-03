import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { applyMigrations } from '@tartil/database';
import { buildApp } from '../src/app.ts';

// Formation engines (migration 0017) through the real API + RLS layer. Synthetic data only.
let app: ReturnType<typeof buildApp>; let db: PGlite; let aiCalls = 0;
const PW = 'correct-horse-battery';
type M = 'GET' | 'POST' | 'PUT' | 'DELETE';
const call = async (method: M, url: string, token?: string, payload?: unknown) => {
  const r = await app.inject({ method, url, payload: payload as never, headers: token ? { authorization: `Bearer ${token}` } : {} });
  return { status: r.statusCode, body: r.body ? JSON.parse(r.body) : {}, headers: r.headers };
};
const user = async (name: string) => {
  const email = `${name}@example.test`;
  const id = (await call('POST', '/auth/register', undefined, { displayName: name, email, password: PW, adultConfirmed: true })).body.id as string;
  return { id, email, token: (await call('POST', '/auth/login', undefined, { email, password: PW, adultConfirmed: true })).body.token as string };
};
before(async () => {
  db = new PGlite(); await applyMigrations(db as never);
  app = buildApp({ service: db as never, app: db as never, jwtSecret: 'test-secret-0123456789', rateLimit: { auth: 100000, general: 100000 }, ai: { name: 'spy', suggest: async () => { aiCalls++; return 'x'; } } });
});
const appoint = (u: { id: string }, inst: string, role: string) => db.query(`INSERT INTO memberships (institution_id, user_id, role) VALUES ($1,$2,$3)`, [inst, u.id, role]);   // named reviewers are appointed by the owner, not via the tenant-admin API

test('source records through the API: reviewers only; approval needs three distinct roles; tenant admins cannot appoint reviewer roles', async () => {
  const admin = await user('fa-admin'), author = await user('fa-author'), sch = await user('fa-sch'), ped = await user('fa-ped'), cp = await user('fa-cp'), stu = await user('fa-stu');
  const inst = (await call('POST', '/institutions', admin.token, { name: 'Dar F', slug: 'dar-f' })).body.id as string;
  assert.equal((await call('POST', `/i/${inst}/members`, admin.token, { email: ped.email, role: 'pedagogical_reviewer' })).status, 400);   // not assignable through the tenant API
  await call('POST', `/i/${inst}/members`, admin.token, { email: stu.email, role: 'student' });
  await appoint(author, inst, 'pedagogical_reviewer'); await appoint(sch, inst, 'scholarly_reviewer'); await appoint(ped, inst, 'pedagogical_reviewer'); await appoint(cp, inst, 'child_protection_reviewer');
  assert.equal((await call('GET', '/formation/source-records')).status, 401);
  for (const u of [admin, stu]) { assert.equal((await call('GET', '/formation/source-records', u.token)).body.records.length, 0); assert.equal((await call('POST', '/formation/source-records', u.token, { competencyId: 'K1', version: 1, title: 't', contentMd: 'x' })).status, 403); }
  const id = (await call('POST', '/formation/source-records', author.token, { competencyId: 'K1', version: 1, title: 'SPR-K1', contentMd: 'internal paraphrase' })).body.id as string;
  assert.ok(id);
  assert.equal((await call('POST', '/formation/source-records', author.token, { competencyId: 'k1', version: 1, title: 't', contentMd: 'x' })).status, 400);
  assert.equal((await call('POST', '/formation/source-records', author.token, { competencyId: 'K1', version: 1, title: 't', contentMd: 'x' })).status, 409);
  assert.equal((await call('POST', `/formation/source-records/${id}/status`, author.token, { to: 'approved' })).status, 409);
  assert.equal((await call('POST', `/formation/source-records/${id}/reviews`, sch.token, { role: 'scholarly', decision: 'approve' })).status, 409);   // not under review yet
  assert.equal((await call('POST', `/formation/source-records/${id}/status`, author.token, { to: 'under_review' })).status, 200);
  assert.equal((await call('PUT', `/formation/source-records/${id}`, author.token, { contentMd: 'late edit' })).status, 409);
  assert.equal((await call('POST', `/formation/source-records/${id}/reviews`, author.token, { role: 'pedagogical', decision: 'approve' })).status, 403);   // author
  assert.equal((await call('POST', `/formation/source-records/${id}/reviews`, ped.token, { role: 'scholarly', decision: 'approve' })).status, 403);       // role not held
  assert.equal((await call('POST', `/formation/source-records/${id}/reviews`, sch.token, { role: 'scholarly', decision: 'reject' })).status, 400);        // reject needs a note
  for (const [u, role] of [[sch, 'scholarly'], [ped, 'pedagogical']] as const) assert.equal((await call('POST', `/formation/source-records/${id}/reviews`, u.token, { role, decision: 'approve' })).status, 201);
  assert.equal((await call('POST', `/formation/source-records/${id}/status`, sch.token, { to: 'approved' })).body.error, 'approval_requires_three_role_approvals');
  await call('POST', `/formation/source-records/${id}/reviews`, cp.token, { role: 'child_protection', decision: 'approve' });
  const d = (await call('GET', `/formation/source-records/${id}`, ped.token)).body;
  assert.equal(d.approvalsComplete, true); assert.equal(d.reviews.length, 3);
  assert.equal((await call('POST', `/formation/source-records/${id}/status`, sch.token, { to: 'approved' })).body.reviewStatus, 'approved');
  assert.equal((await call('GET', `/formation/source-records/${id}`, stu.token)).status, 404);
  assert.equal((await call('GET', '/formation/source-records', ped.token)).body.records[0].reviewStatus, 'approved');
});

test('reflection log through the API: owner only; minors need age band, verified guardian and consent; export and erase', async () => {
  const admin = await user('fr-admin'), qari = await user('fr-qari'), kid = await user('fr-kid'), par = await user('fr-par'), adult = await user('fr-adult'), out = await user('fr-out');
  const inst = (await call('POST', '/institutions', admin.token, { name: 'Dar R', slug: 'dar-r' })).body.id as string;
  const other = (await call('POST', '/institutions', out.token, { name: 'Dar Q', slug: 'dar-q' })).body.id as string;
  const b = `/i/${inst}`;
  for (const [u, role] of [[qari, 'qari'], [kid, 'student'], [par, 'guardian'], [adult, 'student']] as const) await call('POST', `${b}/members`, admin.token, { email: u.email, role });
  await call('POST', `${b}/students`, admin.token, { userId: kid.id, isMinor: true }); await call('POST', `${b}/students`, admin.token, { userId: adult.id, isMinor: false });
  const l = (await call('POST', `${b}/guardian-links`, admin.token, { guardianUserId: par.id, studentUserId: kid.id, relationship: 'parent' })).body.id;
  await call('POST', `${b}/qari-assignments`, admin.token, { qariUserId: qari.id, studentUserId: kid.id });
  // adult writes; nobody else can read it
  const e = (await call('POST', `${b}/reflections`, adult.token, { body: 'my private words', promptRef: 'r1-p1' }));
  assert.equal(e.status, 201); assert.equal(e.headers['cache-control'], 'no-store');
  assert.equal((await call('GET', '/me/reflections', adult.token)).body.entries.length, 1);
  for (const u of [admin, qari, par, kid, out]) assert.equal((await call('GET', '/me/reflections', u.token)).body.entries.length, 0);
  assert.equal((await call('DELETE', `/me/reflections/${e.body.id}`, admin.token)).status, 404);
  assert.equal((await call('POST', `${b}/reflections`, qari.token, { body: 'x' })).status, 403);
  assert.equal((await call('POST', `/i/${other}/reflections`, adult.token, { body: 'x' })).status, 403);
  assert.equal((await call('POST', `${b}/reflections`, adult.token, { body: '   ' })).status, 400);
  assert.equal((await call('POST', `${b}/reflections`, adult.token, { body: 'x'.repeat(5001) })).status, 400);
  assert.equal((await call('POST', `${b}/reflections`, adult.token, { body: 'x', score: 9, grade: 'A' })).status, 201);   // unknown keys are ignored, never stored
  assert.deepEqual(Object.keys((await call('GET', '/me/reflections', adult.token)).body.entries[0]).sort(), ['body', 'createdAt', 'id', 'institutionId', 'promptRef']);
  // minor: age band, verified guardian, consent
  assert.equal((await call('POST', `${b}/reflections`, kid.token, { body: 'x' })).body.error, 'reflection_age_minimum');
  await call('PUT', `${b}/kids/profile`, kid.token, { band: 'b' });
  assert.equal((await call('POST', `${b}/reflections`, kid.token, { body: 'x' })).body.error, 'reflection_age_minimum');
  await call('PUT', `${b}/kids/profile`, kid.token, { band: 'c' });
  assert.equal((await call('POST', `${b}/reflections`, kid.token, { body: 'x' })).body.error, 'guardian_consent_required');
  await call('POST', `${b}/guardian-links/${l}/verify`, admin.token);
  assert.equal((await call('POST', `${b}/consents`, par.token, { studentUserId: kid.id, purpose: 'data_processing' })).status, 201);
  assert.equal((await call('POST', `${b}/reflections`, kid.token, { body: 'x' })).body.error, 'guardian_consent_required');   // generic consent is not enough
  const c = (await call('POST', `${b}/consents`, par.token, { studentUserId: kid.id, purpose: 'reflection_journal' })).body.id;
  const k = await call('POST', `${b}/reflections`, kid.token, { body: 'a child\'s entry' });
  assert.equal(k.status, 201);
  assert.equal((await call('GET', '/me/reflections', par.token)).body.entries.length, 0);    // not even the consenting guardian
  await call('POST', `${b}/consents/${c}/revoke`, par.token);
  assert.equal((await call('POST', `${b}/reflections`, kid.token, { body: 'x' })).body.error, 'guardian_consent_required');
  // export and erase
  const ex = (await call('GET', '/me/formation/export', kid.token)).body;
  assert.equal(ex.reflections.length, 1); assert.ok(Array.isArray(ex.missions) && Array.isArray(ex.scenarios) && Array.isArray(ex.observationsAboutMe));
  assert.equal((await call('DELETE', '/me/formation/data', kid.token, {})).status, 400);                         // explicit confirmation required
  assert.equal((await call('DELETE', '/me/formation/data', kid.token, { confirm: 'DELETE_ALL_MY_FORMATION_DATA' })).body.deleted.reflections, 1);
  assert.equal((await call('GET', '/me/reflections', kid.token)).body.entries.length, 0);
  assert.equal((await call('GET', '/me/reflections', adult.token)).body.entries.length, 2);                      // someone else's data untouched
  assert.equal((await call('GET', '/me/reflections')).status, 401);
  assert.equal(aiCalls, 0);                                                                                       // no AI path ever touched text
});

test('reflection text is never logged (server console stays silent through create/read/delete and a failing write)', async () => {
  const admin = await user('fl-admin'), s = await user('fl-s');
  const inst = (await call('POST', '/institutions', admin.token, { name: 'Dar L', slug: 'dar-l' })).body.id as string;
  await call('POST', `/i/${inst}/members`, admin.token, { email: s.email, role: 'student' }); await call('POST', `/i/${inst}/students`, admin.token, { userId: s.id, isMinor: false });
  const seen: string[] = []; const orig = { log: console.log, error: console.error, warn: console.warn, info: console.info };
  for (const k of Object.keys(orig) as (keyof typeof orig)[]) console[k] = (...a: unknown[]) => { seen.push(a.map(String).join(' ')); };
  try {
    const SECRET = 'SECRET-REFLECTION-TEXT-12345';
    const id = (await call('POST', `/i/${inst}/reflections`, s.token, { body: SECRET })).body.id;
    await call('GET', '/me/reflections', s.token); await call('GET', '/me/formation/export', s.token);
    await call('POST', `/i/${inst}/reflections`, s.token, { body: SECRET, promptRef: 'bad ref with spaces' });   // validation failure
    await call('DELETE', `/me/reflections/${id}`, s.token);
  } finally { Object.assign(console, orig); }
  assert.equal(seen.filter(x => x.includes('SECRET-REFLECTION')).length, 0);
  assert.equal(aiCalls, 0);
});

test('life missions, scenarios and observations through the API; guardian/teacher see status only and only for one named learner', async () => {
  const admin = await user('fm-admin'), qari = await user('fm-qari'), qari2 = await user('fm-qari2'), kid = await user('fm-kid'), kid2 = await user('fm-kid2'), par = await user('fm-par'), par2 = await user('fm-par2'), out = await user('fm-out');
  const inst = (await call('POST', '/institutions', admin.token, { name: 'Dar M', slug: 'dar-m' })).body.id as string;
  const b = `/i/${inst}`;
  for (const [u, role] of [[qari, 'qari'], [qari2, 'qari'], [kid, 'student'], [kid2, 'student'], [par, 'guardian'], [par2, 'guardian']] as const) await call('POST', `${b}/members`, admin.token, { email: u.email, role });
  for (const k of [kid, kid2]) await call('POST', `${b}/students`, admin.token, { userId: k.id, isMinor: true });
  for (const [p, k] of [[par, kid], [par2, kid2]] as const) { const l = (await call('POST', `${b}/guardian-links`, admin.token, { guardianUserId: p.id, studentUserId: k.id, relationship: 'parent' })).body.id; await call('POST', `${b}/guardian-links/${l}/verify`, admin.token); }
  await call('POST', `${b}/qari-assignments`, admin.token, { qariUserId: qari.id, studentUserId: kid.id });
  await call('POST', `${b}/qari-assignments`, admin.token, { qariUserId: qari2.id, studentUserId: kid2.id });
  // missions
  const m = await call('PUT', `${b}/missions/u-sabr-1`, kid.token, { stepsDone: [2, 0, 1, 1] });
  assert.equal(m.status, 200);
  assert.deepEqual((await call('GET', '/me/missions', kid.token)).body.missions[0].stepsDone, [0, 1, 2]);
  assert.equal((await call('PUT', `${b}/missions/u-sabr-1`, kid.token, { complete: true })).body.id, m.body.id);   // upsert, same run
  assert.equal((await call('PUT', `${b}/missions/u-sabr-1`, kid.token, { stepsDone: [0] })).status, 200);
  assert.equal((await call('GET', `${b}/missions/status?learnerId=${kid.id}`, kid.token)).body.missions[0].status, 'completed');
  assert.equal((await call('PUT', `${b}/missions/has space`, kid.token, {})).status, 400);
  assert.equal((await call('PUT', `${b}/missions/u-sabr-1`, qari.token, { complete: true })).status, 403);   // only a student writes
  assert.equal((await call('PUT', `${b}/missions/u-x`, kid.token, { reflectionId: '00000000-0000-4000-8000-000000000000' })).status, 422);
  const st = (await call('GET', `${b}/missions/status?learnerId=${kid.id}`, par.token)).body;
  assert.deepEqual(Object.keys(st.missions[0]).sort(), ['missionRef', 'status', 'updatedAt']); assert.equal(st.note, 'status_only');
  assert.equal((await call('GET', `${b}/missions/status?learnerId=${kid.id}`, qari.token)).body.missions.length, 1);
  for (const u of [qari2, par2, admin, kid2]) assert.equal((await call('GET', `${b}/missions/status?learnerId=${kid.id}`, u.token)).body.missions.length, 0);
  assert.equal((await call('GET', `${b}/missions/status`, qari.token)).status, 400);                            // no "all learners" form
  for (const u of [qari, par, admin]) assert.equal((await call('GET', '/me/missions', u.token)).body.missions.length, 0);
  // scenarios
  const sc = await call('POST', `${b}/scenarios`, kid.token, { scenarioRef: 'sc-1', nodes: ['n1', 'n3', 'n4'] });
  assert.equal(sc.status, 201);
  assert.equal((await call('POST', `${b}/scenarios`, kid.token, { scenarioRef: 'sc-1', nodes: ['free text here'] })).status, 400);
  assert.deepEqual((await call('GET', '/me/scenarios', kid.token)).body.runs[0].nodes, ['n1', 'n3', 'n4']);
  assert.equal(Object.keys((await call('GET', '/me/scenarios', kid.token)).body.runs[0]).some(k => /score|grade|rank/.test(k)), false);
  for (const u of [qari, par, admin, out]) assert.equal((await call('GET', '/me/scenarios', u.token)).body.runs.length, 0);
  // observations
  const o = await call('POST', `${b}/observations`, qari.token, { learnerId: kid.id, authorRole: 'qari', competencyId: 'R1', level: 2, status: 'practicing', note: 'waited for her turn' });
  assert.equal(o.status, 201);
  assert.equal((await call('POST', `${b}/observations`, par.token, { learnerId: kid.id, authorRole: 'guardian', competencyId: 'R1', level: 1, status: 'appeared', note: 'at home too' })).status, 201);
  assert.equal((await call('POST', `${b}/observations`, qari2.token, { learnerId: kid.id, authorRole: 'qari', competencyId: 'R1', level: 2, status: 'appeared', note: 'x' })).status, 403);
  assert.equal((await call('POST', `${b}/observations`, qari.token, { learnerId: kid.id, authorRole: 'qari', competencyId: 'R1', level: 6, status: 'appeared', note: 'x' })).status, 400);
  assert.equal((await call('POST', `${b}/observations`, qari.token, { learnerId: kid.id, authorRole: 'qari', competencyId: 'R1', level: 2, status: 'score_9', note: 'x' })).status, 400);
  for (const u of [kid, qari, par]) assert.equal((await call('GET', `${b}/observations?learnerId=${kid.id}`, u.token)).body.observations.length, 2);
  for (const u of [qari2, par2, admin, kid2, out]) assert.equal((await call('GET', `${b}/observations?learnerId=${kid.id}`, u.token)).body.observations.length, 0);
  assert.equal((await call('GET', `${b}/observations`, qari.token)).status, 400);                               // learner required: no multi-child listing
  assert.equal((await call('PUT', `${b}/observations/${o.body.id}`, kid.token, { note: 'rewritten' })).status, 404);
  assert.equal((await call('PUT', `${b}/observations/${o.body.id}`, qari.token, { status: 'appeared' })).status, 200);
  assert.equal((await call('DELETE', `${b}/observations/${o.body.id}`, par.token)).status, 404);
  // export shows the learner what was written about them; erase leaves other people's observations alone
  assert.equal((await call('GET', '/me/formation/export', kid.token)).body.observationsAboutMe.length, 2);
  const del = (await call('DELETE', '/me/formation/data', kid.token, { confirm: 'DELETE_ALL_MY_FORMATION_DATA' })).body;
  assert.deepEqual(del.deleted, { missions: 1, scenarios: 1, reflections: 0 });
  assert.equal((await call('GET', `${b}/observations?learnerId=${kid.id}`, qari.token)).body.observations.length, 2);
  assert.equal((await call('GET', `${b}/missions/status?learnerId=${kid.id}`, par.token)).body.missions.length, 0);   // status projection went with the runs
});

test('there is no route that compares, ranks, lists or aggregates several learners', async () => {
  const routes = app.printRoutes({ commonPrefix: false });
  const formation = routes.split('\n').filter(l => /formation|reflection|mission|scenario|observation/.test(l)).join('\n');
  assert.ok(formation.length > 100);
  assert.ok(!/(compar|rank|leaderboard|aggregate|cohort|stats|summary|overview|top|average|class)/i.test(formation.replace(/formation/g, '')), formation);
  // every read of another person's formative data requires an explicit learner
  for (const p of ['/i/x/observations', '/i/x/missions/status']) {
    const r = await call('GET', p.replace('/x/', '/00000000-0000-4000-8000-000000000000/'));
    assert.equal(r.status, 400, p);   // validation precedes auth: a learnerId is mandatory (400 even before any identity is considered)
  }
});
