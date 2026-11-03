import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { applyMigrations } from '@tartil/database';
import { buildApp } from '../src/app.ts';
import { normalizeAr, wordCost, alignWords, analyzeRecitation, type RecitationAIProvider, type Transcription, type ExpectedWord } from '../src/recitation.ts';

const FATIHA = ['بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ', 'ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', 'مَٰلِكِ يَوْمِ ٱلدِّينِ'];
const expected = (): ExpectedWord[] => FATIHA.flatMap((t, i) => t.split(' ').map((w, k) => ({ ayah: i + 1, index: k, text: w })));
const hw = (ws: string[]): Transcription => ({ text: ws.join(' '), durationSec: ws.length * 0.6, words: ws.map((w, i) => ({ word: w, start: i * 0.6, end: i * 0.6 + 0.5 })) });
const plain = ['بسم', 'الله', 'الرحمن', 'الرحيم', 'الحمد', 'لله', 'رب', 'العالمين', 'الرحمن', 'الرحيم', 'مالك', 'يوم', 'الدين'];

test('normalisation: diacritics, alef forms and madd-letter spelling do not create false differences', () => {
  assert.equal(normalizeAr('ٱلرَّحْمَٰنِ'), normalizeAr('الرحمن'));
  assert.equal(wordCost('مَٰلِكِ', 'مالك'), 0);
  assert.equal(wordCost('ٱلْعَٰلَمِينَ', 'العالمين'), 0);
  assert.equal(wordCost('ٱلدِّينِ', 'الجنة'), 1);
  assert.ok(wordCost('ٱلرَّحِيمِ', 'الرحييم') < 1);
});
test('alignment: a perfect recitation matches every word and keeps timestamps', () => {
  const r = analyzeRecitation(expected(), hw(plain), 'fake');
  assert.equal(r.status, 'analyzed'); assert.equal(r.summary.matched, 13); assert.equal(r.summary.omitted + r.summary.substituted + r.summary.extra, 0);
  assert.equal(r.words[3]!.start, 3 * 0.6);
});
test('alignment: omission, substitution and an extra word are located at the right ayah and word', () => {
  const heard = [...plain]; heard.splice(5, 1);                 // omit «لله» (ayah 2, word 1)
  heard[10 - 1] = 'سلطان'; heard.splice(12, 0, 'اللهم');         // substitute «مالك»... and add an extra after the end
  const r = analyzeRecitation(expected(), hw(heard), 'fake');
  const om = r.words.filter(w => w.op === 'omitted'); assert.deepEqual(om.map(w => [w.ayah, w.index]), [[2, 1]]);
  assert.ok(r.summary.extra >= 1);
  assert.ok(r.words.some(w => w.op === 'substituted' || w.op === 'near'));
});
test('alignment: unrelated audio is "insufficient evidence", never an error list', () => {
  const r = analyzeRecitation(expected(), hw(['مرحبا', 'بكم', 'في', 'البرنامج']), 'fake');
  assert.equal(r.status, 'insufficient_evidence'); assert.equal(r.words.length, 0);
  assert.equal(analyzeRecitation(expected(), hw([]), 'fake').status, 'insufficient_evidence');
});
test('alignment result never claims pronunciation or tajweed judgement', () => {
  const r = analyzeRecitation(expected(), hw(plain), 'fake');
  assert.match(r.notAssessed.pronunciation, /not assessed/); assert.match(r.notAssessed.tajweed, /not assessed/);
});
test('alignment is order-sensitive (a skipped ayah is detected as omissions)', () => {
  const heard = plain.slice(0, 4).concat(plain.slice(8));    // skip ayah 2
  const r = alignWords(expected(), hw(heard).words);
  assert.equal(r.words.filter(w => w.op === 'omitted' && w.ayah === 2).length, 4);
});

// ---------- API ----------
let app: ReturnType<typeof buildApp>; let db: PGlite; const PW = 'correct-horse-battery';
let calls = 0;
const fake: RecitationAIProvider = { name: 'fake', capabilities: { transcribe: true, wordTimestamps: true, verseIdentification: false, memorisationAccuracy: true, pronunciation: false, tajweed: false, calibratedConfidence: false },
  async transcribe(audio) { calls++; if (audio.length === 7) throw new Error('boom'); return hw(plain); } };
const call = async (method: 'GET' | 'POST' | 'DELETE', url: string, token?: string, payload?: unknown) => {
  const r = await app.inject({ method, url, payload: payload as never, headers: token ? { authorization: `Bearer ${token}` } : {} });
  return { status: r.statusCode, body: r.body ? JSON.parse(r.body) : {} };
};
const user = async (n: string) => { const email = `${n}@example.test`; await call('POST', '/auth/register', undefined, { displayName: n, email, password: PW, adultConfirmed: true }); return (await call('POST', '/auth/login', undefined, { email, password: PW })).body.token as string; };
before(async () => {
  db = new PGlite(); await applyMigrations(db as never);
  await db.exec(`INSERT INTO quran_reference_counts (surah, ayah_count) VALUES (1, 7) ON CONFLICT DO NOTHING`);
  await db.query(`INSERT INTO quran_editions (code,name,riwayah,script_style,provider,provider_version,licence_ref,attribution_text,source_sha256) VALUES ('ed-r','t','hafs-an-asim','uthmani','tanzil','1.1','x','Tanzil',$1)`, ['a'.repeat(64)]);
  for (let i = 0; i < 4; i++) await db.query(`INSERT INTO quran_ayahs VALUES ('ed-r',1,$1,$2,$3)`, [i + 1, FATIHA[i], createHash('sha256').update(FATIHA[i]!, 'utf8').digest('hex')]);
  await db.exec(`UPDATE quran_editions SET religious_approval='APPROVED', approved_by='t' WHERE code='ed-r'`);
  app = buildApp({ service: db as never, app: db as never, jwtSecret: 'test-secret-0123456789', rateLimit: { auth: 100000, general: 100000 }, recitation: fake } as never);
});
const WEBM = (n = 10) => Buffer.from([0x1a, 0x45, 0xdf, 0xa3, ...new Array(n - 4).fill(1)]).toString('base64');
const body = (o: Record<string, unknown> = {}) => ({ surah: 1, fromAyah: 1, toAyah: 4, mime: 'audio/webm', audioBase64: WEBM(), consentExternalProcessing: true, ...o });

test('API: unauthenticated refused; consent is mandatory; bad mime and bad range rejected', async () => {
  assert.equal((await call('POST', '/me/recitations/analyze', undefined, body())).status, 401);
  const a = await user('tasmia');
  assert.equal((await call('POST', '/me/recitations/analyze', a, body({ consentExternalProcessing: false }))).status, 400);
  assert.equal((await call('POST', '/me/recitations/analyze', a, body({ audioBase64: Buffer.from('PK\u0003\u0004zipzipzip').toString('base64') }))).status, 400);   // sniffed by content
  assert.equal((await call('POST', '/me/recitations/analyze', a, body({ fromAyah: 5, toAyah: 2 }))).status, 400);
  assert.equal((await call('POST', '/me/recitations/analyze', a, body({ audioBase64: '' }))).status, 400);
});

test('API: analysis is persisted for the owner only, audio is not stored, provider failure saves nothing, listing and deletion are owner-scoped', async () => {
  const a = await user('tasmib'), b = await user('tasmic');
  const ok = await call('POST', '/me/recitations/analyze', a, body());
  assert.equal(ok.status, 201); assert.equal(ok.body.result.status, 'analyzed'); assert.equal(ok.body.result.summary.matched, 13);
  assert.equal(ok.body.result.words.length, 13); assert.match(ok.body.result.notAssessed.tajweed, /not assessed/);
  const col = await db.query(`SELECT audio_retained, result::text AS r FROM recitation_attempts`); assert.equal((col.rows[0] as { audio_retained: boolean }).audio_retained, false);
  assert.ok(!(col.rows[0] as { r: string }).r.includes(WEBM()));
  const before = (await call('GET', '/me/recitations', a)).body.attempts.length;
  assert.equal((await call('POST', '/me/recitations/analyze', a, body({ audioBase64: WEBM(7) }))).status, 502);
  assert.equal((await call('GET', '/me/recitations', a)).body.attempts.length, before);        // failure is not recorded as a result
  assert.equal((await call('GET', '/me/recitations', b)).body.attempts.length, 0);               // isolation
  assert.equal((await call('GET', '/me/recitations/' + ok.body.id, b)).status, 404);
  assert.equal((await call('DELETE', '/me/recitations/' + ok.body.id, b)).status, 404);
  assert.equal((await call('GET', '/me/recitations/' + ok.body.id, a)).body.result.summary.expectedWords, 13);
  assert.equal((await call('DELETE', '/me/recitations/' + ok.body.id, a)).status, 200);
  assert.equal((await call('POST', '/me/recitations/analyze', a, body({ surah: 1, fromAyah: 1, toAyah: 7 }))).status, 404);   // passage not in the approved text
});
test('API: a minor (student profile or kid profile) cannot send a recording to the external provider from the personal path', async () => {
  const m = await user('minor1'); const uid = (await db.query<{ id: string }>(`SELECT id FROM users WHERE email = 'minor1@example.test'`)).rows[0]!.id;
  const inst = (await db.query<{ id: string }>(`INSERT INTO institutions (name, slug) VALUES ('Dar M','dar-m') RETURNING id`)).rows[0]!.id;
  await db.query(`INSERT INTO memberships (institution_id, user_id, role) VALUES ($1,$2,'student')`, [inst, uid]);
  await db.query(`INSERT INTO student_profiles (institution_id, user_id, is_minor) VALUES ($1,$2,true)`, [inst, uid]);
  const before = calls;
  assert.equal((await call('POST', '/me/recitations/analyze', m, body())).status, 403);
  assert.equal(calls, before);                                                                          // the provider was never called
  const k = await user('kid1'); const kid = (await db.query<{ id: string }>(`SELECT id FROM users WHERE email = 'kid1@example.test'`)).rows[0]!.id;
  await db.query(`INSERT INTO memberships (institution_id, user_id, role) VALUES ($1,$2,'student')`, [inst, kid]);
  await db.query(`INSERT INTO student_profiles (institution_id, user_id, is_minor) VALUES ($1,$2,false)`, [inst, kid]);
  await db.query(`INSERT INTO kid_profiles (institution_id, student_user_id, band) VALUES ($1,$2,'a')`, [inst, kid]);
  assert.equal((await call('POST', '/me/recitations/analyze', k, body())).status, 403);
  assert.equal(calls, before);
});
test('API: without a configured provider the endpoint says so (501), it never fabricates an analysis', async () => {
  const bare = buildApp({ service: db as never, app: db as never, jwtSecret: 'test-secret-0123456789', rateLimit: { auth: 100000, general: 100000 } });
  const email = 'bare@example.test'; await bare.inject({ method: 'POST', url: '/auth/register', payload: { displayName: 'b', email, password: PW, adultConfirmed: true } });
  const tok = JSON.parse((await bare.inject({ method: 'POST', url: '/auth/login', payload: { email, password: PW } })).body).token;
  const r = await bare.inject({ method: 'POST', url: '/me/recitations/analyze', payload: body() as never, headers: { authorization: 'Bearer ' + tok } });
  assert.equal(r.statusCode, 501);
  assert.equal(JSON.parse((await bare.inject({ method: 'GET', url: '/me/recitations/capabilities', headers: { authorization: 'Bearer ' + tok } })).body).available, false);
});
