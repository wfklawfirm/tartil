import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID as id } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { withContext } from '../src/index.ts';
import { freshDb, seedWorld } from './fixtures.ts';

// Migration 0020: academy content publication lifecycle. Synthetic users only.
let db: PGlite; let w: Awaited<ReturnType<typeof seedWorld>>;
let author: string, src: string, sch: string, ped: string, cp: string, sch2: string;
const as = <T>(userId: string | undefined, fn: Parameters<typeof withContext<T>>[2]) => withContext(db as never, { userId }, fn);
const mkUser = async (name: string, role: string) => {
  const u = id();
  await db.query(`INSERT INTO users (id, display_name, email, password_hash) VALUES ($1,$2,$3,'x')`, [u, name, `${name}@example.test`]);
  await db.query(`INSERT INTO memberships (institution_id, user_id, role) VALUES ($1,$2,$3)`, [w.A, u, role]);
  return u;
};
let n = 0;
const create = async (kind = 'lesson') => { const ref = `T${++n}-L1`; await as(author, tx => tx.query(`INSERT INTO academy_content_status (content_kind, content_ref, version, created_by) VALUES ($1,$2,1,$3)`, [kind, ref, author])); return ref; };
const move = (u: string, ref: string, to: string, kind = 'lesson') => as(u, tx => tx.query(`UPDATE academy_content_status SET status = $2 WHERE content_kind = $3 AND content_ref = $1 AND version = 1`, [ref, to, kind]));
const stat = async (ref: string) => (await db.query<{ status: string; cycle: number }>(`SELECT status, cycle FROM academy_content_status WHERE content_ref = $1`, [ref])).rows[0]!;
const review = (u: string, ref: string, type: string, decision = 'approved', note: string | null = null, kind = 'lesson') =>
  as(u, tx => tx.query(`INSERT INTO academy_content_reviews (content_kind, content_ref, version, review_type, reviewer_user_id, decision, note) VALUES ($1,$2,1,$3,$4,$5,$6)`, [kind, ref, type, u, decision, note]));
const STAGES: [string, string, string][] = [['source_review', 'source', ''], ['scholarly_review', 'scholarly', ''], ['pedagogical_review', 'pedagogical', ''], ['child_safety_review', 'child_safety', '']];
/** drive an item all the way to approved with four distinct reviewers */
const reviewers = () => ({ source: src, scholarly: sch, pedagogical: ped, child_safety: cp }) as Record<string, string>;
const toApproved = async (ref: string) => {
  await move(author, ref, 'source_review');
  for (const [i, [stage, type]] of STAGES.entries()) {
    await review(reviewers()[type]!, ref, type);
    await move(author, ref, i < 3 ? STAGES[i + 1]![0] : 'approved');
    assert.equal((await stat(ref)).status, i < 3 ? STAGES[i + 1]![0] : 'approved', stage);
  }
};

before(async () => {
  db = await freshDb(); w = await seedWorld(db);
  author = await mkUser('ac-author', 'pedagogical_reviewer'); src = await mkUser('ac-src', 'pedagogical_reviewer');
  sch = await mkUser('ac-sch', 'scholarly_reviewer'); ped = await mkUser('ac-ped', 'pedagogical_reviewer'); cp = await mkUser('ac-cp', 'child_protection_reviewer'); sch2 = await mkUser('ac-sch2', 'scholarly_reviewer');
});

test('full lifecycle with four distinct approvals reaches published; public reads only published', async () => {
  const ref = await create();
  assert.equal((await stat(ref)).status, 'draft');
  assert.equal((await as(undefined, tx => tx.query(`SELECT 1 FROM academy_content_status WHERE content_ref = $1`, [ref]))).rows.length, 0);   // draft hidden from the public
  await toApproved(ref);
  assert.equal((await as(undefined, tx => tx.query(`SELECT 1 FROM academy_content_status WHERE content_ref = $1`, [ref]))).rows.length, 0);   // approved is still not public
  await move(author, ref, 'published');
  assert.equal((await stat(ref)).status, 'published');
  for (const u of [undefined, w.sA1, w.gA1, w.adminA]) assert.equal((await as(u, tx => tx.query(`SELECT 1 FROM academy_content_status WHERE content_ref = $1`, [ref]))).rows.length, 1);
  assert.equal((await as(undefined, tx => tx.query(`SELECT 1 FROM academy_content_reviews`))).rows.length, 0);   // reviews are never public
  await move(author, ref, 'archived');
  assert.equal((await as(undefined, tx => tx.query(`SELECT 1 FROM academy_content_status WHERE content_ref = $1`, [ref]))).rows.length, 0);
  await assert.rejects(move(author, ref, 'draft'), /content_illegal_transition/);   // archived is terminal
});

test('trigger: no publishing or approving without the gates; illegal and skipped transitions refused', async () => {
  const ref = await create();
  for (const to of ['published', 'approved', 'scholarly_review', 'child_safety_review']) await assert.rejects(move(author, ref, to), /content_illegal_transition/, to);
  await move(author, ref, 'source_review');
  await assert.rejects(move(author, ref, 'scholarly_review'), /stage_approval_missing/);
  await review(src, ref, 'source'); await move(author, ref, 'scholarly_review');
  await assert.rejects(move(author, ref, 'pedagogical_review'), /stage_approval_missing/);
  // owner-level (service) update is also refused: the gate is in the trigger, not only in app_user's rights
  await assert.rejects(db.query(`UPDATE academy_content_status SET status = 'published' WHERE content_ref = $1`, [ref]), /content_illegal_transition/);
  await assert.rejects(db.query(`UPDATE academy_content_status SET status = 'approved' WHERE content_ref = $1`, [ref]), /content_illegal_transition/);
  // approved without all four even from the last stage: only source and scholarly approved
  const r2 = await create(); await move(author, r2, 'source_review'); await review(src, r2, 'source'); await move(author, r2, 'scholarly_review'); await review(sch, r2, 'scholarly');
  await move(author, r2, 'pedagogical_review'); await move(author, r2, 'child_safety_review').catch(() => undefined);
  assert.notEqual((await stat(r2)).status, 'published');
});

test('trigger: published requires all four approvals even if the row is forced to approved by the owner', async () => {
  const ref = await create();
  await move(author, ref, 'source_review'); await review(src, ref, 'source'); await move(author, ref, 'scholarly_review');
  await db.query(`ALTER TABLE academy_content_status DISABLE TRIGGER academy_status_guard`);   // simulate corrupted state: forced 'approved' with one approval
  await db.query(`UPDATE academy_content_status SET status = 'approved' WHERE content_ref = $1`, [ref]);
  await db.query(`ALTER TABLE academy_content_status ENABLE TRIGGER academy_status_guard`);
  await assert.rejects(move(author, ref, 'published'), /publication_requires_four_approvals/);
  assert.equal((await stat(ref)).status, 'approved');
});

test('reviews: role per type, author excluded, right stage only, distinct reviewers, no forgery, immutable', async () => {
  const ref = await create(); await move(author, ref, 'source_review');
  await assert.rejects(review(author, ref, 'source'), /author_cannot_review_own_content/);
  await assert.rejects(review(cp, ref, 'source'), /row-level security|reviewer_lacks_role/);        // child-protection role cannot give a source review
  await assert.rejects(review(w.sA1, ref, 'source'), /reviewer_lacks_role|row-level security/);                          // learner
  await assert.rejects(review(w.adminA, ref, 'source'), /reviewer_lacks_role|row-level security/);                       // tenant admin
  await assert.rejects(review(sch, ref, 'scholarly'), /content_not_in_this_review_stage/);
  await assert.rejects(as(src, tx => tx.query(`INSERT INTO academy_content_reviews (content_kind, content_ref, version, review_type, reviewer_user_id, decision) VALUES ('lesson',$1,1,'source',$2,'approved')`, [ref, sch])), /row-level security/);   // cannot review in another's name
  await review(src, ref, 'source');
  await move(author, ref, 'scholarly_review');
  await assert.rejects(review(src, ref, 'scholarly'), /reviewer_lacks_role|row-level security/);                         // src holds only the pedagogical role: not scholarly
  const multi = await mkUser('ac-multi', 'scholarly_reviewer');
  await db.query(`INSERT INTO memberships (institution_id, user_id, role) VALUES ($1,$2,'pedagogical_reviewer')`, [w.A, multi]);
  await assert.rejects(db.query(`UPDATE academy_content_reviews SET decision = 'needs_revision'`), /immutable|archived_not_deleted/);
  await assert.rejects(db.query(`DELETE FROM academy_content_reviews`), /archived_not_deleted/);
  await assert.rejects(review(src, ref, 'pedagogical'), /content_not_in_this_review_stage|one_review_type_per_reviewer/);
});

test('one person cannot hold two review types: four distinct reviewers needed', async () => {
  const ref = await create(); await move(author, ref, 'source_review');
  const both = await mkUser('ac-both', 'scholarly_reviewer');
  await review(both, ref, 'source'); await move(author, ref, 'scholarly_review');
  await assert.rejects(review(both, ref, 'scholarly'), /one_review_type_per_reviewer/);
  await review(sch, ref, 'scholarly'); assert.equal((await stat(ref)).status, 'scholarly_review');
});

test('needs_revision decision pulls the item out of review, voids earlier approvals (new cycle), and requires a note', async () => {
  const ref = await create(); await move(author, ref, 'source_review'); await review(src, ref, 'source'); await move(author, ref, 'scholarly_review');
  await assert.rejects(review(sch, ref, 'scholarly', 'needs_revision'), /check|note/i);   // note required by CHECK
  await review(sch, ref, 'scholarly', 'needs_revision', 'cite the source for claim 2');
  assert.deepEqual(await stat(ref), { status: 'needs_revision', cycle: 1 });
  await assert.rejects(move(author, ref, 'source_review'), /content_illegal_transition/);
  await move(author, ref, 'draft'); assert.deepEqual(await stat(ref), { status: 'draft', cycle: 2 });
  await move(author, ref, 'source_review');
  await assert.rejects(move(author, ref, 'scholarly_review'), /stage_approval_missing/);   // the cycle-1 source approval no longer counts
  await review(src, ref, 'source'); await move(author, ref, 'scholarly_review');
  // a published item can be pulled back
  const r2 = await create(); await toApproved(r2); await move(author, r2, 'published'); await move(author, r2, 'needs_revision');
  assert.equal((await as(undefined, tx => tx.query(`SELECT 1 FROM academy_content_status WHERE content_ref = $1`, [r2]))).rows.length, 0);
});

test('a reviewer who later loses the role (or is only the author) cannot carry an approval to publication', async () => {
  const ref = await create(); await toApproved(ref);
  await db.query(`UPDATE memberships SET status = 'suspended' WHERE user_id = $1`, [cp]);
  await assert.rejects(move(author, ref, 'published'), /publication_requires_four_approvals|content_illegal_transition|row-level/);
  await db.query(`UPDATE memberships SET status = 'active' WHERE user_id = $1`, [cp]);
});

test('RLS and grants: only reviewers write; app_user cannot delete, forge created_by, or rewrite identity/cycle; kinds are validated', async () => {
  const ref = await create();
  for (const u of [w.sA1, w.qariA1, w.gA1, w.adminA, w.safeA, undefined]) {
    await assert.rejects(as(u, tx => tx.query(`INSERT INTO academy_content_status (content_kind, content_ref, version, created_by) VALUES ('lesson','ZZ-1',1,$1)`, [u ?? id()])));
    assert.equal((await as(u, tx => tx.query(`SELECT 1 FROM academy_content_status WHERE content_ref = $1`, [ref]))).rows.length, 0);
    assert.equal((await as(u, tx => tx.query(`UPDATE academy_content_status SET status = 'archived' WHERE content_ref = $1 RETURNING 1`, [ref]))).rows.length, 0);
  }
  await assert.rejects(as(author, tx => tx.query(`INSERT INTO academy_content_status (content_kind, content_ref, version, created_by) VALUES ('lesson','ZZ-2',1,$1)`, [sch])), /row-level security/);
  await assert.rejects(as(author, tx => tx.query(`INSERT INTO academy_content_status (content_kind, content_ref, version, created_by, status) VALUES ('lesson','ZZ-3',1,$1,'published')`, [author])), /permission denied/);
  await assert.rejects(as(author, tx => tx.query(`INSERT INTO academy_content_status (content_kind, content_ref, version, created_by) VALUES ('video','ZZ-4',1,$1)`, [author])), /check/i);
  await assert.rejects(as(author, tx => tx.query(`INSERT INTO academy_content_status (content_kind, content_ref, version, created_by) VALUES ('lesson','bad ref!',1,$1)`, [author])), /check/i);
  await assert.rejects(as(author, tx => tx.query(`DELETE FROM academy_content_status WHERE content_ref = $1`, [ref])), /permission denied/);
  await assert.rejects(as(author, tx => tx.query(`UPDATE academy_content_status SET cycle = 9 WHERE content_ref = $1`, [ref])), /permission denied/);
  await assert.rejects(as(author, tx => tx.query(`UPDATE academy_content_status SET created_by = $2 WHERE content_ref = $1`, [ref, sch])), /permission denied/);
  await assert.rejects(as(author, tx => tx.query(`UPDATE academy_content_status SET status = 'published' WHERE content_ref = $1`, [ref])), /content_illegal_transition/);
  await assert.rejects(db.query(`DELETE FROM academy_content_status WHERE content_ref = $1`, [ref]), /archived_not_deleted/);   // not even the owner
  const r = (await db.query<{ rolsuper: boolean; rolbypassrls: boolean }>(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'app_user'`)).rows[0]!;
  assert.equal(r.rolsuper, false); assert.equal(r.rolbypassrls, false);
  assert.equal((await as(sch, tx => tx.query(`SELECT 1 FROM academy_content_status WHERE content_ref = $1`, [ref]))).rows.length, 1);   // reviewers see drafts
});
