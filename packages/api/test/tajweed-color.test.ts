import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../../web-vercel/index.html', import.meta.url), 'utf8');
const start = html.indexOf('/* ---------- tajweed colouring');
const end = html.indexOf('function tajweedNodes');
assert.ok(start > 0 && end > start, 'colouring engine found');
const { tajweedClassify, tajweedJoin } = new Function('el', html.slice(start, end) + ';return { tajweedClassify, tajweedJoin }')(() => null) as { tajweedClassify: (t: string) => Array<{ t: string; cls: string | null }>; tajweedJoin: (x: Array<{ t: string; cls: string | null }>) => Array<{ t: string; cls: string | null }> };
const cls = (t: string) => tajweedClassify(t).filter(x => x.cls).map(x => `${x.cls}:${x.t.replace(/[ً-ٰٟۖ-ۭـ]/g, '')}`);

test('colouring never alters the text (concatenated clusters equal the input)', () => {
  for (const t of ['مِّن رَّبِّهِمْ ۖ وَأُو۟لَـٰٓئِكَ هُمُ ٱلْمُفْلِحُونَ', 'وَمِنَ ٱلنَّاسِ مَن يَقُولُ ءَامَنَّا', '']) assert.equal(tajweedClassify(t).map(x => x.t).join(''), t);
});
test('noon sakinah / tanween / meem sakinah rules on known verses', () => {
  assert.ok(cls('هُدًى مِّن رَّبِّهِمْ').includes('idg_n:ن'));          // 2:5  idgham without ghunna (noon + ra)
  assert.ok(cls('مَن يَقُولُ').includes('idg_g:ن'));                    // 2:8  idgham with ghunna (noon + ya)
  assert.ok(cls('أَنۢبِئْهُم').includes('iqlab:ن'));                    // 2:33 iqlab (small meem on noon)
  assert.ok(cls('هُم بِمُؤْمِنِينَ').includes('ikhfa:م'));              // meem sakinah + ba: ikhfa shafawi
  assert.ok(cls('مِن قَبْلِكَ').includes('ikhfa:ن'));                   // noon + qaf: ikhfa
  assert.ok(cls('أُنزِلَ').includes('ikhfa:ن'));                        // in-word ikhfa
  assert.deepEqual(cls('أَنْعَمْتَ').filter(x => /^(ikhfa|idg|iqlab)/.test(x)), []);   // izhar halqi: no colouring
  assert.deepEqual(cls('دُنْيَا').filter(x => /^(ikhfa|idg|iqlab)/.test(x)), []);      // in-word noon + ya is izhar, never idgham
  assert.ok(cls('وَيْلٌ لِّكُلِّ').some(x => x.startsWith('idg_n')));   // tanween + lam
  assert.ok(cls('إِنِّىٓ').includes('ghunna:ن'));                       // shadda on noon: ghunna
});
test('qalqala on a sukun letter; waqf sign blocks cross-word rules', () => {
  assert.ok(cls('تُبْدُونَ').includes('qalqala:ب'));
  assert.deepEqual(cls('مِّن ۖ رَّبِّهِمْ').filter(x => x.startsWith('idg')), []);
});

test('joiners restore letter joining at coloured boundaries, only where letters connect, and never change the text', () => {
  const ZWJ = '\u200D';
  for (const v of ['هُدًى مِّن رَّبِّهِمْ ۖ وَأُو۟لَـٰٓئِكَ هُمُ ٱلْمُفْلِحُونَ', 'وَمِمَّا رَزَقْنَـٰهُمْ يُنفِقُونَ', 'مَن يَقُولُ ءَامَنَّا']) {
    const j = tajweedJoin(tajweedClassify(v));
    assert.equal(j.map(x => x.t).join('').replaceAll(ZWJ, ''), v);          // removing the joiners gives the original text
    assert.ok(j.some(x => x.t.includes(ZWJ)));
  }
  // dual-joining letter before a coloured letter: joined on both sides of the boundary
  const j = tajweedJoin([{ t: 'بَ', cls: null }, { t: 'نْ', cls: 'ikhfa' }, { t: 'ت', cls: null }]);
  assert.equal(j[0]!.t, 'بَ' + ZWJ); assert.equal(j[1]!.t, ZWJ + 'نْ' + ZWJ); assert.equal(j[2]!.t, ZWJ + 'ت');
  // alef/dal/ra/waw do not connect forward, hamza connects to nothing: no joiner there
  const k = tajweedJoin([{ t: 'دَ', cls: null }, { t: 'نْ', cls: 'ikhfa' }, { t: 'ء', cls: 'madd' }, { t: 'ن', cls: null }]);
  assert.equal(k[0]!.t, 'دَ'); assert.equal(k[1]!.t, 'نْ'); assert.equal(k[2]!.t, 'ء');
});
