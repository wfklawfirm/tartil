import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { applyMigrations, importQuranEdition } from '../src/index.ts';

const dir = new URL('../../../scholarly-assets/quran/raw/', import.meta.url);
test('the committed Tanzil file is byte-identical to its recorded hash and imports as a complete, unapproved Hafs edition', async () => {
  const bytes = readFileSync(new URL('tanzil-quran-uthmani-txt2.txt', dir));
  const want = readFileSync(new URL('SHA256.txt', dir), 'utf8').split(/\s+/)[0];
  assert.equal(createHash('sha256').update(bytes).digest('hex'), want);
  assert.match(bytes.toString('utf8'), /CHANGING IT IS NOT ALLOWED/);          // licence notice must travel with the text
  const db = new PGlite(); await applyMigrations(db as never);
  const rep = await importQuranEdition(db as never, { code: 'tanzil-uthmani-hafs-1.1', name: 'Tanzil Uthmani (Hafs)', riwayah: 'hafs-an-asim', scriptStyle: 'uthmani', provider: 'tanzil', providerVersion: '1.1', licenceRef: 'https://tanzil.net/docs/Text_License', attribution: 'Quran text: Tanzil Project (tanzil.net)' }, bytes);
  assert.equal(rep.ayat, 6236); assert.equal(rep.complete, true);
  const first = (await db.query<{ text_raw: string }>(`SELECT text_raw FROM quran_ayahs WHERE surah=1 AND ayah=1`)).rows[0]!;
  assert.equal(first.text_raw, 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ');           // stored verbatim, no normalisation
  assert.equal((await db.query<{ a: string }>(`SELECT religious_approval a FROM quran_editions`)).rows[0]!.a, 'NOT_APPROVED');
});
