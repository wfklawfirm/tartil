import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { withContext } from '../src/index.ts';
import { freshDb, seedWorld } from './fixtures.ts';

let db: PGlite; let w: Awaited<ReturnType<typeof seedWorld>>;
before(async () => { db = await freshDb(); w = await seedWorld(db); });
const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');
const edition = (code: string, extra = '') => db.query(
  `INSERT INTO quran_editions (code, name, riwayah, script_style, provider, provider_version, licence_ref, attribution_text, source_sha256 ${extra ? ', ' + extra.split('=')[0] : ''})
   VALUES ($1,'TEST FIXTURE - not Quran text','hafs-an-asim','uthmani','test','0','n/a','n/a',$2 ${extra ? ', ' + extra.split('=')[1] : ''})`, [code, sha(code)]);

test('reference counts sum to 6236 across 114 surahs', async () => {
  const r = (await db.query<{ n: string; s: string }>(`SELECT count(*)::text n, sum(ayah_count)::text s FROM quran_reference_counts`)).rows[0]!;
  assert.deepEqual([r.n, r.s], ['114', '6236']);
});

test('ayah text is verbatim, hash-checked and immutable', async () => {
  await edition('test-fixture-1', 'is_test_fixture=true');
  const t = 'PLACEHOLDER-TEXT-NOT-QURAN';
  await db.query(`INSERT INTO quran_ayahs VALUES ('test-fixture-1',1,1,$1,$2)`, [t, sha(t)]);
  await assert.rejects(db.query(`INSERT INTO quran_ayahs VALUES ('test-fixture-1',1,2,$1,$2)`, [t, sha('different')]), /text_hash_mismatch/);
  await assert.rejects(db.query(`UPDATE quran_ayahs SET text_raw='x'`), /quran_text_is_immutable/);
  await assert.rejects(db.query(`DELETE FROM quran_ayahs`), /quran_text_is_immutable/);
});

test('completeness check reports every surah of an incomplete edition', async () => {
  const gaps = (await db.query(`SELECT * FROM app.quran_edition_gaps('test-fixture-1')`)).rows;
  assert.equal(gaps.length, 114);          // only 1 ayah present => all 114 surahs incomplete
});

test('religious approval requires a named approver; fixtures and unapproved editions are invisible to learners', async () => {
  await assert.rejects(edition('bad-approval', `religious_approval='APPROVED'`), /violates check|check constraint/);
  const seen = await withContext(db as never, { userId: w.sA3adult, institutionId: w.A }, tx => tx.query(`SELECT code FROM quran_editions`));
  assert.equal(seen.rows.length, 0);
  const ay = await withContext(db as never, { userId: w.sA3adult, institutionId: w.A }, tx => tx.query(`SELECT 1 FROM quran_ayahs`));
  assert.equal(ay.rows.length, 0);
});

test('scholarly workflow: legal transitions only, reviewer approval and licence clearance required to publish', async () => {
  const id = (await db.query<{ id: string }>(`INSERT INTO scholarly_items (kind, title_ar, source_unit_ids) VALUES ('tajweed_rule','حكم تجريبي','{SRC-000581#toc-1.p0001}') RETURNING id`)).rows[0]!.id;
  const to = (s: string, extra = '') => db.query(`UPDATE scholarly_items SET state=$2 ${extra} WHERE id=$1`, [id, s]);
  await assert.rejects(to('PUBLISHED'), /illegal_transition/);                       // cannot skip review
  for (const s of ['EXTRACTED', 'NORMALIZED', 'UNDER_REVIEW']) await to(s);
  await assert.rejects(to('APPROVED'), /approval_requires_active_scholarly_reviewer/);
  await assert.rejects(db.query(`UPDATE scholarly_items SET state='APPROVED', approved_by=$2 WHERE id=$1`, [id, w.adminA]), /approval_requires_active_scholarly_reviewer/); // admin != scholar
  const reviewer = randomUUID();
  await db.query(`INSERT INTO users (id, display_name) VALUES ($1,'reviewer')`, [reviewer]);
  await db.query(`INSERT INTO memberships (institution_id, user_id, role) VALUES ($1,$2,'scholarly_reviewer')`, [w.A, reviewer]);
  await db.query(`UPDATE scholarly_items SET state='APPROVED', approved_by=$2 WHERE id=$1`, [id, reviewer]);
  await assert.rejects(to('PUBLISHED'), /publication_requires_licence_clearance/);
  await db.query(`UPDATE scholarly_items SET licence_cleared=true WHERE id=$1`, [id]);
  await to('PUBLISHED');
  const learner = await withContext(db as never, { userId: w.sA3adult, institutionId: w.A }, tx => tx.query(`SELECT id FROM scholarly_items`));
  assert.deepEqual(learner.rows.map(r => (r as { id: string }).id), [id]);
});

test('drafts are invisible to learners; machine output cannot be inserted as approved', async () => {
  await db.query(`INSERT INTO scholarly_items (kind, title_ar) VALUES ('lesson','مسودة')`);
  const learner = await withContext(db as never, { userId: w.sA3adult, institutionId: w.A }, tx => tx.query(`SELECT state FROM scholarly_items`));
  assert.ok(learner.rows.every(r => (r as { state: string }).state === 'PUBLISHED'));
  await assert.rejects(db.query(`INSERT INTO scholarly_items (kind, title_ar, state) VALUES ('lesson','x','PUBLISHED')`), /new_items_start_as_draft_or_extracted/);
});
