import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { applyMigrations } from '@tartil/database';
import { buildApp } from '../src/app.ts';

let app: ReturnType<typeof buildApp>; let db: PGlite;
const sha = (t: string) => createHash('sha256').update(t, 'utf8').digest('hex');
const get = async (url: string) => { const r = await app.inject({ method: 'GET', url }); return { status: r.statusCode, body: r.body ? JSON.parse(r.body) : {} }; };
before(async () => {
  db = new PGlite(); await applyMigrations(db as never);
  await db.exec(`INSERT INTO quran_reference_counts (surah, ayah_count) VALUES (1, 7) ON CONFLICT DO NOTHING`);
  app = buildApp({ service: db as never, app: db as never, jwtSecret: 'test-secret-0123456789', rateLimit: { auth: 100000, general: 100000 } });
});
const edition = (code: string) => db.query(`INSERT INTO translation_editions (code,name,language,translator,provider,provider_version,licence_name,licence_ref,attribution_text,source_sha256) VALUES ($1,'T','en','Tr','p','1','CC BY-ND 4.0','https://x',$2,$3)`, [code, 'Attribution line', sha('src')]);
const ayah = (code: string, s: number, a: number, t: string, h = sha(t)) => db.query(`INSERT INTO translation_ayahs (edition_code,surah,ayah,text_raw,text_sha256) VALUES ($1,$2,$3,$4,$5)`, [code, s, a, t, h]);

test('translation editions are invisible until approved, then served verbatim with attribution', async () => {
  await edition('tr-test-1'); await ayah('tr-test-1', 1, 1, 'In the name of Allah, “the Gracious”.');
  assert.deepEqual((await get('/translations/editions')).body.editions, []);
  assert.equal((await get('/translations/tr-test-1/1')).status, 404);
  await db.exec(`UPDATE translation_editions SET religious_approval='APPROVED', approved_by='test' WHERE code='tr-test-1'`);
  const ed = (await get('/translations/editions')).body.editions;
  assert.equal(ed.length, 1); assert.equal(ed[0].licenceName, 'CC BY-ND 4.0');
  const r = (await get('/translations/tr-test-1/1')).body;
  assert.equal(r.ayat[0].text, 'In the name of Allah, “the Gracious”.');
  assert.equal(r.attribution, 'Attribution line');
  assert.match(r.note, /not the Quran/);
});
test('approval needs an approver; translation text is immutable, hash-checked and range-checked', async () => {
  await edition('tr-test-2');
  await assert.rejects(db.exec(`UPDATE translation_editions SET religious_approval='APPROVED' WHERE code='tr-test-2'`));
  await assert.rejects(ayah('tr-test-2', 1, 1, 'text', 'f'.repeat(64)), /text_hash_mismatch/);
  await assert.rejects(ayah('tr-test-2', 1, 8, 'beyond the surah'), /translation_ayah_out_of_range/);
  await ayah('tr-test-2', 1, 2, 'ok');
  await assert.rejects(db.exec(`UPDATE translation_ayahs SET text_raw='changed' WHERE edition_code='tr-test-2'`), /immutable/);
  await assert.rejects(db.exec(`DELETE FROM translation_ayahs WHERE edition_code='tr-test-2'`), /immutable/);
});
