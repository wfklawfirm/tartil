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
  await db.exec(`INSERT INTO quran_reference_counts (surah, ayah_count) VALUES (1, 7), (2, 286) ON CONFLICT DO NOTHING`);
  app = buildApp({ service: db as never, app: db as never, jwtSecret: 'test-secret-0123456789', rateLimit: { auth: 100000, general: 100000 } });
});
test('search: nothing before approval; Arabic search ignores diacritics and alef forms; English search matches the translation', async () => {
  await db.query(`INSERT INTO quran_editions (code,name,riwayah,script_style,provider,provider_version,licence_ref,attribution_text,source_sha256) VALUES ('ed-s','t','hafs-an-asim','uthmani','tanzil','1.1','x','Tanzil',$1)`, ['a'.repeat(64)]);
  const t1 = 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ', t2 = 'إِنَّ ٱللَّهَ عَلَىٰ كُلِّ شَىْءٍ قَدِيرٌ';
  await db.query(`INSERT INTO quran_ayahs VALUES ('ed-s',1,2,$1,$2),('ed-s',2,20,$3,$4)`, [t1, sha(t1), t2, sha(t2)]);
  assert.equal((await get('/search?q=' + encodeURIComponent('الحمد'))).status, 404);   // unapproved edition is invisible (RLS)
  await db.exec(`UPDATE quran_editions SET religious_approval='APPROVED', approved_by='t' WHERE code='ed-s'`);
  const a = (await get('/search?q=' + encodeURIComponent('الحمد لله'))).body;
  assert.equal(a.total, 1); assert.equal(a.results[0].surah, 1); assert.equal(a.results[0].text, t1);   // stored text returned verbatim
  const b = (await get('/search?q=' + encodeURIComponent('انّ الله'))).body; assert.equal(b.total, 1); assert.equal(b.results[0].surah, 2);
  assert.equal((await get('/search?q=' + encodeURIComponent('كل شيء'))).body.total, 1);   // ى/ي
  assert.equal((await get('/search?q=zz&lang=en')).status, 404);   // no English edition yet
  await db.query(`INSERT INTO translation_editions (code,name,language,translator,provider,provider_version,licence_name,licence_ref,attribution_text,source_sha256) VALUES ('tr-s','t','en','x','p','1','CC','r','Attr',$1)`, ['b'.repeat(64)]);
  await db.query(`INSERT INTO translation_ayahs (edition_code,surah,ayah,text_raw,text_sha256) VALUES ('tr-s',1,2,$1,$2)`, ['Praise be to Allah, Lord of the Worlds.', sha('Praise be to Allah, Lord of the Worlds.')]);
  await db.exec(`UPDATE translation_editions SET religious_approval='APPROVED', approved_by='t' WHERE code='tr-s'`);
  const e = (await get('/search?q=lord+of&lang=en')).body; assert.equal(e.total, 1); assert.equal(e.results[0].ayah, 2); assert.equal(e.attribution, 'Attr');
  assert.equal((await get('/search?q=%25%25&lang=en')).body.total, 0);   // wildcards are literal
  assert.equal((await get('/search?q=a')).status, 400);
});
