import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { applyMigrations } from '@tartil/database';
import { buildApp } from '../src/app.ts';

// Academy publication lifecycle (migration 0020) through the real API + RLS layer. Synthetic users only.
let app: ReturnType<typeof buildApp>; let db: PGlite;
const PW = 'correct-horse-battery';
type M = 'GET' | 'POST';
const call = async (method: M, url: string, token?: string, payload?: unknown) => {
  const r = await app.inject({ method, url, payload: payload as never, headers: token ? { authorization: `Bearer ${token}` } : {} });
  return { status: r.statusCode, body: r.body ? JSON.parse(r.body) : {} };
};
const user = async (name: string, role?: string) => {
  const email = `${name}@example.test`;
  const id = (await call('POST', '/auth/register', undefined, { displayName: name, email, password: PW, adultConfirmed: true })).body.id as string;
  const token = (await call('POST', '/auth/login', undefined, { email, password: PW })).body.token as string;
  if (role) { const inst = (await db.query<{ id: string }>(`INSERT INTO institutions (slug, name) VALUES ($1,$1) RETURNING id`, ['ac-' + name])).rows[0]!.id; await db.query(`INSERT INTO memberships (institution_id, user_id, role) VALUES ($1,$2,$3)`, [inst, id, role]); }
  return { id, token };
};
before(async () => { db = new PGlite(); await applyMigrations(db as never); app = buildApp({ service: db as never, app: db as never, jwtSecret: 'test-secret-0123456789', rateLimit: { auth: 100000, general: 100000 } }); });

test('publication lifecycle through the API', async () => {
  const author = await user('aca-author', 'pedagogical_reviewer'), src = await user('aca-src', 'pedagogical_reviewer'), sch = await user('aca-sch', 'scholarly_reviewer');
  const ped = await user('aca-ped', 'pedagogical_reviewer'), cp = await user('aca-cp', 'child_protection_reviewer'), learner = await user('aca-learner', 'student');
  const T = (u: { token: string }, to: string, ref = 'H1-L1', kind = 'lesson') => call('POST', `/academy/content/${kind}/${ref}/transition`, u.token, { version: 1, to });
  const R = (u: { token: string }, reviewType: string, decision = 'approved', note?: string, ref = 'H1-L1') => call('POST', `/academy/content/lesson/${ref}/review`, u.token, { version: 1, reviewType, decision, note });

  // auth and shape
  assert.equal((await call('POST', '/academy/content/lesson/H1-L1/transition', undefined, { version: 1, to: 'draft' })).status, 401);
  assert.equal((await call('GET', '/academy/content/status/all')).status, 401);
  assert.equal((await T(learner, 'draft')).status, 403);
  assert.equal((await T(author, 'draft', 'bad ref!')).status, 400);
  assert.equal((await T(author, 'draft', 'H1-L1', 'video')).status, 400);
  assert.equal((await T(author, 'published')).status, 404);                       // unknown item cannot be created as anything but draft
  assert.equal((await T(author, 'draft')).status, 200);

  // drafts are invisible to the public and to non-reviewers; visible to reviewers
  assert.equal((await call('GET', '/academy/content/status')).body.items.length, 0);
  assert.equal((await call('GET', '/academy/content/status/all', learner.token)).status, 403);
  assert.equal((await call('GET', '/academy/content/status/all', sch.token)).body.items[0].status, 'draft');

  // gates
  assert.equal((await T(author, 'published')).body.error, 'content_illegal_transition');
  assert.equal((await T(author, 'source_review')).status, 200);
  assert.equal((await T(author, 'scholarly_review')).body.error, 'stage_approval_missing');
  assert.equal((await R(author, 'source')).body.error, 'author_cannot_review_own_content');
  assert.equal((await R(learner, 'source')).status, 403);
  assert.equal((await R(cp, 'source')).body.error, 'reviewer_lacks_role');
  assert.equal((await R(sch, 'scholarly')).body.error, 'content_not_in_this_review_stage');
  assert.equal((await R(src, 'source', 'needs_revision')).body.error, 'note_required');
  assert.equal((await R(src, 'source')).status, 201);
  for (const [u, t, next] of [[sch, 'scholarly', 'pedagogical_review'], [ped, 'pedagogical', 'child_safety_review']] as const) {
    assert.equal((await T(author, t === 'scholarly' ? 'scholarly_review' : 'pedagogical_review')).status, 200);
    assert.equal((await R(u, t)).status, 201);
    assert.equal((await T(author, next)).status, 200);
  }
  assert.equal((await T(author, 'approved')).body.error, 'stage_approval_missing');
  assert.equal((await R(cp, 'child_safety')).status, 201);
  assert.equal((await T(author, 'approved')).body.item.status, 'approved');
  assert.equal((await call('GET', '/academy/content/status')).body.items.length, 0);   // approved is not public
  assert.equal((await T(learner, 'published')).status, 403);
  const pub = await T(sch, 'published');
  assert.equal(pub.body.item.status, 'published');

  // public list: published only, no identities
  const list = (await call('GET', '/academy/content/status')).body.items as Record<string, unknown>[];
  assert.equal(list.length, 1); assert.deepEqual(Object.keys(list[0]!).sort(), ['kind', 'ref', 'status', 'updatedAt', 'version']);
  assert.equal(((await call('GET', '/academy/content/status?kind=guide')).body.items as unknown[]).length, 0);
  assert.equal((await call('GET', '/academy/content/status/all?status=published', sch.token)).body.items.length, 1);
  assert.equal((await call('GET', '/academy/content/status/all?status=nope', sch.token)).status, 400);
});

test('needs_revision via review, and no publish without approvals (API cannot bypass the DB gate)', async () => {
  const author = await user('acb-author', 'pedagogical_reviewer'), src = await user('acb-src', 'pedagogical_reviewer');
  const ref = 'X9-S1';
  const T = (u: { token: string }, to: string) => call('POST', `/academy/content/scenario/${ref}/transition`, u.token, { version: 1, to });
  await T(author, 'draft'); await T(author, 'source_review');
  assert.equal((await T(author, 'published')).status, 409);
  assert.equal((await call('POST', `/academy/content/scenario/${ref}/review`, src.token, { version: 1, reviewType: 'source', decision: 'needs_revision', note: 'provenance unclear' })).body.item.status, 'needs_revision');
  assert.equal((await T(author, 'draft')).body.item.status, 'draft');
  assert.equal((await call('POST', `/academy/content/scenario/NOPE-1/review`, src.token, { version: 1, reviewType: 'source', decision: 'approved' })).status, 404);
  assert.equal(((await call('GET', '/academy/content/status?kind=scenario')).body.items as unknown[]).length, 0);
});
