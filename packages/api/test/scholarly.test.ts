import { test, before } from 'node:test';
import assert from 'node:assert/strict';
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
  const id = (await call('POST', '/auth/register', undefined, { displayName: name, email, password: PW, adultConfirmed: true })).body.id as string;
  return { id, email, token: (await call('POST', '/auth/login', undefined, { email, password: PW })).body.token as string };
};
before(async () => {
  db = new PGlite(); await applyMigrations(db as never);
  app = buildApp({ service: db as never, app: db as never, jwtSecret: 'test-secret-0123456789', rateLimit: { auth: 100000, general: 100000 } });
});

test('scholarly workspace: only reviewers; guarded workflow; approval recorded; publish blocked until licence cleared; history kept', async () => {
  const admin = await user('sadmin'), scholar = await user('sscholar'), other = await user('sother');
  const inst = (await call('POST', '/institutions', admin.token, { name: 'Dar S', slug: 'dar-s' })).body.id as string;
  assert.equal((await call('POST', `/i/${inst}/members`, admin.token, { email: scholar.email, role: 'scholarly_reviewer' })).status, 201);
  const item = (await db.query<{ id: string }>(`INSERT INTO scholarly_items (kind, title_ar, body, source_unit_ids) VALUES ('concept','مفهوم تجريبي','{"summary":"x"}','{SRC-000001#toc-1.p0001}') RETURNING id`)).rows[0]!.id;

  assert.equal((await call('GET', '/scholarly/items')).status, 401);
  assert.equal((await call('GET', '/scholarly/items', other.token)).status, 403);
  assert.equal((await call('GET', '/scholarly/items', admin.token)).status, 403);            // an institution admin is NOT a scholar
  assert.equal((await call('POST', `/scholarly/items/${item}/transition`, other.token, { to: 'EXTRACTED' })).status, 403);

  const list = await call('GET', '/scholarly/items', scholar.token);
  assert.equal(list.status, 200); assert.equal(list.body.items.length, 1); assert.deepEqual(list.body.counts, [{ state: 'DRAFT', n: 1 }]);

  const t = (to: string, note?: string) => call('POST', `/scholarly/items/${item}/transition`, scholar.token, { to, note });
  assert.equal((await t('APPROVED')).status, 409);                                         // illegal jump
  for (const s of ['EXTRACTED', 'NORMALIZED', 'UNDER_REVIEW']) assert.equal((await t(s)).status, 200, s);
  assert.equal((await t('REJECTED')).status, 400);                                          // rejection needs a reason
  assert.equal((await t('APPROVED', 'مراجعة المصادر')).status, 200);
  const ap = (await db.query<{ approved_by: string; state: string }>(`SELECT approved_by, state FROM scholarly_items WHERE id = $1`, [item])).rows[0]!;
  assert.equal(ap.approved_by, scholar.id); assert.equal(ap.state, 'APPROVED');
  const pub = await t('PUBLISHED');
  assert.equal(pub.status, 409); assert.equal(pub.body.error, 'publication_requires_licence_clearance');
  // learners still cannot see an unpublished item through the public path
  const det = await call('GET', `/scholarly/items/${item}`, scholar.token);
  assert.equal(det.status, 200); assert.equal(det.body.history.length, 4); assert.equal(det.body.history[3].note, 'مراجعة المصادر');
  assert.equal((await call('GET', `/scholarly/items/${item}`, other.token)).status, 403);
  // after the OWNER clears the licence (out-of-band), publication works
  await db.query(`UPDATE scholarly_items SET licence_cleared = true WHERE id = $1`, [item]);
  assert.equal((await t('PUBLISHED')).status, 200);
  assert.equal((await call('GET', '/scholarly/items?state=PUBLISHED', scholar.token)).body.items.length, 1);
});

test('sanad register: self-declared; own entries only; scholar (not the holder) decides; users cannot self-verify', async () => {
  const admin = await user('nadmin'), scholar = await user('nscholar'), holder = await user('nholder'), other = await user('nother');
  const inst = (await call('POST', '/institutions', admin.token, { name: 'Dar N', slug: 'dar-n' })).body.id as string;
  await call('POST', `/i/${inst}/members`, admin.token, { email: scholar.email, role: 'scholarly_reviewer' });
  await call('POST', `/i/${inst}/members`, admin.token, { email: holder.email, role: 'scholarly_reviewer' });   // a scholar who also declares their own sanad
  const add = await call('POST', '/me/sanad', other.token, { riwayah: 'حفص عن عاصم', teacherName: 'الشيخ فلان', yearHijri: 1440, documentNote: 'إجازة مكتوبة' });
  assert.equal(add.status, 201); assert.equal(add.body.status, 'declared');
  assert.equal((await call('POST', '/me/sanad', other.token, { riwayah: 'x', teacherName: 'y' })).status, 400);
  assert.equal((await call('GET', '/me/sanad', holder.token)).body.entries.length, 0);                          // not visible to another user
  assert.equal((await call('GET', '/scholarly/sanad', other.token)).status, 403);
  const q = await call('GET', '/scholarly/sanad', scholar.token);
  assert.equal(q.body.entries.length, 1); assert.equal(q.body.entries[0].holder, 'nother');
  const id = add.body.id as string;
  assert.equal((await call('POST', `/scholarly/sanad/${id}/decide`, other.token, { decision: 'verified', note: 'أنا' })).status, 403);   // cannot self-verify
  assert.equal((await call('POST', `/scholarly/sanad/${id}/decide`, scholar.token, { decision: 'verified', note: '' })).status, 400);       // note required
  assert.equal((await call('POST', `/scholarly/sanad/${id}/decide`, scholar.token, { decision: 'verified', note: 'اطّلعت على الإجازة الأصلية' })).status, 200);
  assert.equal((await call('POST', `/scholarly/sanad/${id}/decide`, scholar.token, { decision: 'rejected', note: 'تغيير' })).status, 404);     // decided once
  const mine = (await call('GET', '/me/sanad', other.token)).body.entries[0];
  assert.equal(mine.status, 'verified'); assert.equal(mine.reviewNote, 'اطّلعت على الإجازة الأصلية');
  // a scholar cannot verify their OWN entry (hidden from their queue, and refused by RLS/CHECK)
  const own = (await call('POST', '/me/sanad', holder.token, { riwayah: 'ورش عن نافع', teacherName: 'الشيخ آخر' })).body.id as string;
  assert.equal((await call('POST', `/scholarly/sanad/${own}/decide`, holder.token, { decision: 'verified', note: 'ذاتي' })).status, 404);
  assert.equal((await db.query<{ status: string }>(`SELECT status FROM sanad_entries WHERE id = $1`, [own])).rows[0]!.status, 'declared');
});
