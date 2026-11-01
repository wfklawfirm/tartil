import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { applyMigrations } from '@tartil/database';
import { buildApp } from '../src/app.ts';

let app: ReturnType<typeof buildApp>; let db: PGlite;
const PW = 'correct-horse-battery';
const call = async (method: 'GET' | 'POST', url: string, token?: string, payload?: unknown) => {
  const r = await app.inject({ method, url, payload: payload as never, headers: token ? { authorization: `Bearer ${token}` } : {} });
  return { status: r.statusCode, body: r.body ? JSON.parse(r.body) : {} };
};
const user = async (name: string) => {
  const email = `${name}@example.test`;
  const id = (await call('POST', '/auth/register', undefined, { displayName: name, email, password: PW })).body.id as string;
  return { id, email, token: (await call('POST', '/auth/login', undefined, { email, password: PW })).body.token as string };
};
before(async () => { db = new PGlite(); await applyMigrations(db as never); app = buildApp({ service: db as never, app: db as never, jwtSecret: 'test-secret-0123456789', rateLimit: { auth: 100000, general: 100000 } }); });

test('halaqah journey over HTTP: circle, members, session, attendance, qari assessment, visibility', async () => {
  const admin = await user('h-admin'), qari = await user('h-qari'), qari2 = await user('h-qari2'), kid = await user('h-kid'), kid2 = await user('h-kid2'), parent = await user('h-parent'), outsider = await user('h-out');
  const inst = (await call('POST', '/institutions', admin.token, { name: 'Dar H', slug: 'dar-h' })).body.id as string;
  const other = (await call('POST', '/institutions', outsider.token, { name: 'Dar O', slug: 'dar-o' })).body.id as string;
  const b = `/i/${inst}`;
  for (const [u, role] of [[qari, 'qari'], [qari2, 'qari'], [kid, 'student'], [kid2, 'student'], [parent, 'guardian']] as const) await call('POST', `${b}/members`, admin.token, { email: u.email, role });
  for (const k of [kid, kid2]) await call('POST', `${b}/students`, admin.token, { userId: k.id, isMinor: true });
  const link = (await call('POST', `${b}/guardian-links`, admin.token, { guardianUserId: parent.id, studentUserId: kid.id, relationship: 'parent' })).body.id;
  await call('POST', `${b}/guardian-links/${link}/verify`, admin.token);
  await call('POST', `${b}/qari-assignments`, admin.token, { qariUserId: qari.id, studentUserId: kid.id });

  // /me shows memberships
  const me = await call('GET', '/me', kid.token); assert.equal(me.status, 200); assert.equal(me.body.memberships[0].role, 'student');
  // only an admin creates a circle, and its qari must be a qari
  assert.equal((await call('POST', `${b}/halaqat`, qari.token, { name: 'self-made', qariUserId: qari.id })).status, 403);
  assert.equal((await call('POST', `${b}/halaqat`, admin.token, { name: 'bad qari', qariUserId: kid.id })).status, 403);
  const h = (await call('POST', `${b}/halaqat`, admin.token, { name: 'حلقة الفجر', qariUserId: qari.id })).body.id as string;
  assert.equal((await call('POST', `${b}/halaqat/${h}/members`, admin.token, { studentUserId: kid.id })).status, 201);
  const s = (await call('POST', `${b}/halaqat/${h}/sessions`, qari.token, { startsAt: '2026-11-02T05:00:00Z', endsAt: '2026-11-02T06:00:00Z', topic: 'الفاتحة' })).body.id as string;
  assert.ok(s);
  // attendance: right qari ok; wrong qari / non-member rejected
  assert.equal((await call('POST', `${b}/sessions/${s}/attendance`, qari2.token, { studentUserId: kid.id, status: 'present' })).status, 404); // another qari cannot even see the session
  assert.equal((await call('POST', `${b}/sessions/${s}/attendance`, qari.token, { studentUserId: kid2.id, status: 'present' })).status, 422);
  assert.equal((await call('POST', `${b}/sessions/${s}/attendance`, qari.token, { studentUserId: kid.id, status: 'late' })).status, 201);
  assert.equal((await call('POST', `${b}/sessions/${s}/attendance`, qari.token, { studentUserId: kid.id, status: 'present' })).status, 201); // correction (upsert)
  assert.equal((await call('GET', `${b}/sessions/${s}/attendance`, parent.token)).body.attendance[0].status, 'present');
  assert.equal((await call('GET', `${b}/sessions/${s}/attendance`, kid2.token)).body.attendance.length, 0);
  // assessments
  const a = { studentUserId: kid.id, surah: 1, ayahStart: 1, ayahEnd: 7, makharij: 3, fluency: 4, note: 'ممتاز' };
  assert.equal((await call('POST', `${b}/assessments`, qari2.token, a)).status, 403);
  assert.equal((await call('POST', `${b}/assessments`, kid.token, a)).status, 403);
  assert.equal((await call('POST', `${b}/assessments`, qari.token, { ...a, makharij: 9 })).status, 400);
  assert.equal((await call('POST', `${b}/assessments`, qari.token, { studentUserId: kid.id, surah: 1, ayahStart: 1, ayahEnd: 7 })).status, 400);
  assert.equal((await call('POST', `${b}/assessments`, qari.token, a)).status, 201);
  assert.equal((await call('GET', `${b}/assessments`, parent.token)).body.assessments.length, 1);
  assert.equal((await call('GET', `${b}/assessments`, kid2.token)).body.assessments.length, 0);
  // other tenant sees nothing and cannot write
  assert.equal((await call('GET', `${b}/halaqat`, outsider.token)).body.halaqat.length, 0);
  assert.equal((await call('GET', `/i/${other}/halaqat`, admin.token)).body.halaqat.length, 0);
  assert.equal((await call('GET', `${b}/halaqat`, kid2.token)).body.halaqat.length, 0);
  assert.equal((await call('GET', `${b}/halaqat`, kid.token)).body.halaqat.length, 1);
});

test('Quran read API serves nothing until a human approves an edition; then verbatim text with attribution', async () => {
  const txt = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';
  await db.query(`INSERT INTO quran_editions (code,name,riwayah,script_style,provider,provider_version,licence_ref,attribution_text,source_sha256) VALUES ('ed-test-1','t','hafs-an-asim','uthmani','tanzil','1.1','x','Quran text: Tanzil Project (tanzil.net)',$1)`, ['a'.repeat(64)]);
  await db.query(`INSERT INTO quran_ayahs VALUES ('ed-test-1',1,1,$1,$2)`, [txt, createHash('sha256').update(txt).digest('hex')]);
  assert.equal((await call('GET', '/quran/editions')).body.editions.length, 0);
  assert.equal((await call('GET', '/quran/ed-test-1/1')).status, 404);
  assert.equal((await call('GET', '/quran/reference')).body.surahs.length, 114);
  await db.query(`UPDATE quran_editions SET religious_approval='APPROVED', approved_by='reviewer (test)' WHERE code='ed-test-1'`);
  assert.equal((await call('GET', '/quran/editions')).body.editions.length, 1);
  const r = await call('GET', '/quran/ed-test-1/1');
  assert.equal(r.status, 200); assert.equal(r.body.ayat[0].text, txt); assert.match(r.body.attribution, /Tanzil/);
  assert.equal((await call('GET', '/quran/ed-test-1/999')).status, 400);
});

test('web client is served with a restrictive CSP when configured', async () => {
  const { fileURLToPath } = await import('node:url');
  const a2 = buildApp({ service: db as never, app: db as never, jwtSecret: 'test-secret-0123456789', rateLimit: { auth: 100000, general: 100000 }, webIndexPath: fileURLToPath(new URL('../../web/index.html', import.meta.url)) });
  const r = await a2.inject({ method: 'GET', url: '/' });
  assert.equal(r.statusCode, 200); assert.match(r.headers['content-type'] as string, /text\/html/); assert.match(r.headers['content-security-policy'] as string, /frame-ancestors 'none'/); assert.match(r.body, /dir="rtl"/);
});

test('action endpoints accept an empty JSON body; malformed JSON is a 400, not a 500', async () => {
  const u = await user('emptybody');
  const raw = (url: string, payload?: string, headers: Record<string, string> = {}) => app.inject({ method: 'POST', url, payload, headers: { 'content-type': 'application/json', authorization: `Bearer ${u.token}`, ...headers } });
  const inst = (await call('POST', '/institutions', u.token, { name: 'Dar E', slug: 'dar-e' })).body.id as string;
  assert.equal((await raw(`/i/${inst}/guardian-links/00000000-0000-4000-8000-000000000000/verify`)).statusCode, 404); // reaches the handler (was 500)
  assert.equal((await raw('/institutions', '{not json')).statusCode, 400);
  assert.equal((await raw('/institutions', '')).statusCode, 400); // body required by the schema => validation, not a crash
});
