import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { freshDb } from './fixtures.ts';

// Generated, gitignored artefact: the test is skipped when it has not been generated on this machine.
const sqlPath = fileURLToPath(new URL('../../../scholarly-assets/extraction-concepts/load_concepts_draft.sql', import.meta.url));

test('generated concept DRAFT load passes DB triggers, is DRAFT-only, invisible to learners and idempotent', { skip: !existsSync(sqlPath) }, async () => {
  const db = await freshDb();
  const sql = readFileSync(sqlPath, 'utf8');
  await db.exec(sql);
  const c1 = (await db.query<{ n: number }>(`SELECT count(*)::int n FROM scholarly_items`)).rows[0]!.n;
  assert.ok(c1 > 0);
  const bad = (await db.query<{ n: number }>(`SELECT count(*)::int n FROM scholarly_items WHERE state <> 'DRAFT' OR licence_cleared OR approved_by IS NOT NULL OR riwayah_scope <> 'unspecified' OR kind <> 'concept'`)).rows[0]!.n;
  assert.equal(bad, 0);
  const frag = (await db.query<{ n: number }>(`SELECT count(*)::int n FROM scholarly_items WHERE body::text LIKE '%"fragment"%'`)).rows[0]!.n;
  assert.equal(frag, 0);
  await db.exec(sql); // idempotent
  assert.equal((await db.query<{ n: number }>(`SELECT count(*)::int n FROM scholarly_items`)).rows[0]!.n, c1);
  // the DB rejects a non-DRAFT insert of the same shape
  await assert.rejects(db.query(`INSERT INTO scholarly_items (kind, title_ar, state) VALUES ('concept','x','PUBLISHED')`), /new_items_start_as_draft_or_extracted/);
});
