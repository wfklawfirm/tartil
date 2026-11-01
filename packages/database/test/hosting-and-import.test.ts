import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { applyMigrations, parseTanzil, importQuranEdition } from '../src/index.ts';

test('Supabase-style roles get no privilege on any table or function; every public table has RLS', async () => {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;`);   // what Supabase does by default
  await applyMigrations(db as never);
  const t = (await db.query<{ n: string }>(`SELECT format('%I.%I', schemaname, tablename) n FROM pg_tables WHERE schemaname IN ('public','app')`)).rows;
  assert.ok(t.length >= 12);
  for (const { n } of t) for (const r of ['anon', 'authenticated']) for (const p of ['SELECT', 'INSERT', 'UPDATE', 'DELETE'])
    assert.equal((await db.query<{ h: boolean }>(`SELECT has_table_privilege($1,$2,$3) h`, [r, n, p])).rows[0]!.h, false, `${r} ${p} ${n}`);
  const noRls = (await db.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity`)).rows;
  assert.deepEqual(noRls, []);
  const fn = (await db.query<{ h: boolean }>(`SELECT has_function_privilege('anon','app.is_member(uuid)','EXECUTE') h`)).rows[0]!;
  assert.equal(fn.h, false);
});

const fixture = (lines: string[]) => new TextEncoder().encode(['# FIXTURE - not Quran text', ...lines, ''].join('\n'));
test('importer: strict parse, verbatim text, source hash recorded, fails closed on incomplete edition', async () => {
  assert.throws(() => parseTanzil(fixture(['1|1|A', '1|1|B'])), /duplicate/);
  assert.throws(() => parseTanzil(fixture(['garbage'])), /unexpected format/);
  assert.throws(() => parseTanzil(fixture(['115|1|A'])), /out-of-range/);
  const db = new PGlite(); await applyMigrations(db as never);
  const meta = { code: 'fx-1', name: 'FIXTURE', riwayah: 'hafs-an-asim', scriptStyle: 'uthmani', provider: 'test', providerVersion: '0', licenceRef: 'n/a', attribution: 'n/a', isTestFixture: true };
  await assert.rejects(importQuranEdition(db as never, meta, fixture(['1|1|  keep  inner   spaces '])), /edition incomplete/);
  assert.equal((await db.query('SELECT 1 FROM quran_editions')).rows.length, 0);          // rolled back entirely
  const rep = await importQuranEdition(db as never, meta, fixture(['1|1|  keep  inner   spaces ']), { allowPartial: true });
  assert.equal(rep.complete, false); assert.match(rep.sourceSha256, /^[0-9a-f]{64}$/);
  assert.equal((await db.query<{ text_raw: string }>(`SELECT text_raw FROM quran_ayahs`)).rows[0]!.text_raw, '  keep  inner   spaces ');   // byte-for-byte
  assert.equal((await db.query<{ a: string }>(`SELECT religious_approval a FROM quran_editions`)).rows[0]!.a, 'NOT_APPROVED');
});

test('importer accepts a complete 6236-ayah edition (synthetic placeholders)', async () => {
  const counts = (await new PGlite().query('select 1')).rows; void counts;
  const db = new PGlite(); await applyMigrations(db as never);
  const ref = (await db.query<{ surah: number; ayah_count: number }>(`SELECT surah, ayah_count FROM quran_reference_counts ORDER BY surah`)).rows;
  const lines: string[] = []; for (const r of ref) for (let a = 1; a <= r.ayah_count; a++) lines.push(`${r.surah}|${a}|PLACEHOLDER ${r.surah}:${a}`);
  const rep = await importQuranEdition(db as never, { code: 'fx-full', name: 'FIXTURE', riwayah: 'hafs-an-asim', scriptStyle: 'uthmani', provider: 'test', providerVersion: '0', licenceRef: 'n/a', attribution: 'n/a', isTestFixture: true }, fixture(lines));
  assert.equal(rep.ayat, 6236); assert.equal(rep.complete, true);
});
