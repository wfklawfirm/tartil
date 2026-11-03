// Generates the Supabase Edge Function bundle from the real sources (no copies are maintained by hand).
// Output: edge/dist/{index.ts,app.ts,auth.ts,pg.ts,database.ts,deno.json}
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const root = new URL('../', import.meta.url), out = new URL('./dist/', import.meta.url);
mkdirSync(out, { recursive: true });
const read = p => readFileSync(new URL(p, root), 'utf8');
// The edge variant differs from the Node app ONLY by removing the static-web serving (Vercel hosts the UI) and a no-op hook. Asserted below.
let appSrc = read('api/src/app.ts');
const cut = (re, label) => { const n = appSrc.replace(re, ''); if (n === appSrc) throw new Error('edge build: pattern not found: ' + label); appSrc = n; };
cut(/import \{ readFileSync \} from 'node:fs';\n/, 'readFileSync import');
appSrc = appSrc.replace('; webIndexPath?: string }', ' }');
cut(/  app\.addHook\('onError', async \(\) => \{\}\);\n/, 'onError hook');
cut(/  if \(d\.webIndexPath\) \{[\s\S]*?\n  \}\n/, 'web block');
writeFileSync(new URL('app.ts', out), appSrc);
writeFileSync(new URL('auth.ts', out), read('api/src/auth.ts'));
writeFileSync(new URL('recitation.ts', out), read('api/src/recitation.ts'));
writeFileSync(new URL('pg.ts', out), read('api/src/pg.ts'));
writeFileSync(new URL('database.ts', out), read('database/src/context.ts') + `\nexport interface Executor {\n  exec(sql: string): Promise<unknown>;\n  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;\n}\n`);
writeFileSync(new URL('deno.json', out), JSON.stringify({ imports: { fastify: 'npm:fastify@5.2.1', zod: 'npm:zod@3.25.76', pg: 'npm:pg@8.13.1', '@tartil/database': './database.ts' } }, null, 2));
writeFileSync(new URL('index.ts', out), `// Tartil API on Supabase Edge Functions. DB: the project's own internal SUPABASE_DB_URL (never exposed). JWT secret is derived server-side from a project secret.
import pg from 'pg';
import { createHash } from 'node:crypto';
import { buildApp } from './app.ts';
import { pgDb, assertSafeRoles } from './pg.ts';

const dbUrl = Deno.env.get('SUPABASE_DB_URL');
const root = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const sUrl = Deno.env.get('SUPABASE_URL');
const sh = { authorization: 'Bearer ' + root, apikey: root!, 'content-type': 'application/json' };
const storage = {
  async signUpload(path: string) {
    const r = await fetch(sUrl + '/storage/v1/object/upload/sign/recitations/' + path, { method: 'POST', headers: sh, body: '{}' });
    if (!r.ok) throw new Error('storage_sign_failed');
    return sUrl + '/storage/v1' + (await r.json()).url;
  },
  async signDownload(path: string) {
    const r = await fetch(sUrl + '/storage/v1/object/sign/recitations/' + path, { method: 'POST', headers: sh, body: '{"expiresIn":60}' });
    if (!r.ok) throw new Error('storage_sign_failed');
    return sUrl + '/storage/v1' + (await r.json()).signedURL;
  },
};
const oaKey = Deno.env.get('OPENAI_API_KEY');
const aiModel = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';
const ai = oaKey ? {
  name: 'openai:' + aiModel,
  async suggest(prompt: string) {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { authorization: 'Bearer ' + oaKey, 'content-type': 'application/json' }, signal: AbortSignal.timeout(25000),
      body: JSON.stringify({ model: aiModel, max_tokens: 700, temperature: 0.3, messages: [
        { role: 'system', content: 'You draft short study suggestions for a Quran-learning teacher to review. Never issue religious rulings, grades or ijazah. Never quote or alter Quran text; refer to surah and ayah numbers only. If asked for a ruling or a grade, decline and suggest asking a qualified teacher. Reply in the language of the request.' },
        { role: 'user', content: prompt }] }),
    });
    if (!r.ok) throw new Error('ai_failed');
    const t = (await r.json()).choices?.[0]?.message?.content;
    if (!t) throw new Error('ai_empty');
    return String(t);
  },
} : undefined;
const recitation = oaKey ? {
  name: 'openai:whisper-1',
  capabilities: { transcribe: true, wordTimestamps: true, verseIdentification: false, memorisationAccuracy: true, pronunciation: false as const, tajweed: false as const, calibratedConfidence: false as const },
  async transcribe(audio: Uint8Array, mime: string) {
    const ext = mime.replace('audio/', '') || 'webm';
    const fd = new FormData();
    fd.append('file', new Blob([audio], { type: mime }), 'recitation.' + ext);
    fd.append('model', 'whisper-1'); fd.append('language', 'ar'); fd.append('response_format', 'verbose_json'); fd.append('timestamp_granularities[]', 'word');
    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { authorization: 'Bearer ' + oaKey }, body: fd, signal: AbortSignal.timeout(100000) });
    if (!r.ok) throw new Error('stt_failed_' + r.status);
    const j = await r.json();
    return { text: String(j.text ?? ''), durationSec: Number(j.duration ?? 0), words: (j.words ?? []).map((w: { word: unknown; start: unknown; end: unknown }) => ({ word: String(w.word), start: Number(w.start), end: Number(w.end) })) };
  },
} : undefined;
const j = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
let appPromise: Promise<ReturnType<typeof buildApp>> | null = null;
function getApp() {
  appPromise ??= (async () => {
    if (!dbUrl || !root) throw new Error('missing runtime configuration');
    const db = pgDb(new pg.Pool({ connectionString: dbUrl, max: 3 }));
    await assertSafeRoles(db);                       // refuses to serve if the app path could bypass RLS
    const app = buildApp({ service: db, app: db, storage, ai, recitation, jwtSecret: createHash('sha256').update('tartil-jwt-v1:' + root).digest('hex') });
    await app.ready();
    return app;
  })().catch(e => { appPromise = null; throw e; });
  return appPromise;
}
Deno.serve(async (req: Request) => {
  try {
    const u = new URL(req.url);
    const path = u.pathname.replace(/^\\/(functions\\/v1\\/)?api/, '') || '/';
    const app = await getApp();
    const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text();
    const headers: Record<string, string> = {}; req.headers.forEach((v, k) => { headers[k] = v; });
    delete headers['content-length'];
    const r = await app.inject({ method: req.method as 'GET', url: path + u.search, headers, payload: body });
    const h = new Headers(); for (const [k, v] of Object.entries(r.headers)) if (v !== undefined && k !== 'content-length' && k !== 'transfer-encoding') h.set(k, Array.isArray(v) ? v.join(', ') : String(v));
    return new Response(r.rawPayload, { status: r.statusCode, headers: h });
  } catch (e) {
    console.error('api_error', e instanceof Error ? e.message : String(e));
    return j(503, { error: 'service_unavailable' });
  }
});
`);
console.log('built');
