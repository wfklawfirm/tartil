import { createHash } from 'node:crypto';
import type { Executor } from './migrate.ts';

export interface EditionMeta { code: string; name: string; riwayah: string; scriptStyle: string; provider: string; providerVersion: string; licenceRef: string; attribution: string; isTestFixture?: boolean }
export interface ImportReport { ayat: number; sourceSha256: string; gaps: { surah: number; expected: number; found: number }[]; complete: boolean }

const LINE = /^(\d{1,3})\|(\d{1,3})\|(.+)$/;
/** Parses Tanzil's pipe format `surah|ayah|text` (comment lines start with '#'). Text is kept BYTE-FOR-BYTE: no trim of inner text, no normalisation.
 *  Throws on any unexpected line so a corrupted/modified file can never be imported silently. */
export function parseTanzil(bytes: Uint8Array): { surah: number; ayah: number; text: string }[] {
  let s = Buffer.from(bytes).toString('utf8');
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  const out: { surah: number; ayah: number; text: string }[] = []; const seen = new Set<string>();
  s.split(/\r?\n/).forEach((line, i) => {
    if (line === '' || line.startsWith('#')) return;
    const m = LINE.exec(line);
    if (!m) throw new Error(`line ${i + 1}: unexpected format`);
    const surah = +m[1]!, ayah = +m[2]!;
    if (surah < 1 || surah > 114 || ayah < 1) throw new Error(`line ${i + 1}: out-of-range ${surah}:${ayah}`);
    const k = `${surah}:${ayah}`; if (seen.has(k)) throw new Error(`line ${i + 1}: duplicate ${k}`); seen.add(k);
    out.push({ surah, ayah, text: m[3]! });
  });
  return out;
}

/** Imports as NOT_APPROVED (religious approval is a separate human act). Fails closed on incompleteness unless explicitly allowed (fixtures). */
export async function importQuranEdition(db: Executor, meta: EditionMeta, fileBytes: Uint8Array, opts: { allowPartial?: boolean } = {}): Promise<ImportReport> {
  const rows = parseTanzil(fileBytes);
  const sourceSha256 = createHash('sha256').update(fileBytes).digest('hex');
  await db.exec('BEGIN');
  try {
    await db.query(`INSERT INTO quran_editions (code,name,riwayah,script_style,provider,provider_version,licence_ref,attribution_text,source_sha256,is_test_fixture) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [meta.code, meta.name, meta.riwayah, meta.scriptStyle, meta.provider, meta.providerVersion, meta.licenceRef, meta.attribution, sourceSha256, meta.isTestFixture ?? false]);
    for (const r of rows) await db.query(`INSERT INTO quran_ayahs VALUES ($1,$2,$3,$4,$5)`, [meta.code, r.surah, r.ayah, r.text, createHash('sha256').update(r.text, 'utf8').digest('hex')]);
    const gaps = (await db.query<{ surah: number; expected: number; found: string }>(`SELECT * FROM app.quran_edition_gaps($1)`, [meta.code])).rows.map(g => ({ surah: g.surah, expected: g.expected, found: Number(g.found) }));
    if (gaps.length && !opts.allowPartial) throw new Error(`edition incomplete: ${gaps.length} surah(s) differ from reference counts (first: ${JSON.stringify(gaps[0])})`);
    await db.exec('COMMIT');
    return { ayat: rows.length, sourceSha256, gaps, complete: gaps.length === 0 };
  } catch (e) { await db.exec('ROLLBACK'); throw e; }
}
