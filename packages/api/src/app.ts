import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { withContext, type Executor, type TransactionalDb, type TxLike } from '@tartil/database';
import { hashPassword, verifyPassword, signToken, verifyToken, verifyTokenFull } from './auth.ts';

/** `service` = privileged owner/service connection (registration, login, bootstrap, email lookup only).
 *  `app` = connection used ONLY through withContext() as the unprivileged app_user role. */
export interface Deps { service: Executor & Pick<TransactionalDb, 'transaction'>; app: TransactionalDb; jwtSecret: string; webIndexPath?: string; rateLimit?: { auth: number; general: number }; ai?: { suggest(prompt: string): Promise<string>; name: string }; storage?: { signUpload(path: string): Promise<string>; signDownload(path: string): Promise<string> } }
const uuid = z.string().uuid();
const ROLES = ['tenant_admin', 'scholarly_reviewer', 'qari', 'student', 'guardian', 'safeguarding_officer'] as const;

function mapError(e: unknown): { status: number; code: string } {
  const m = e instanceof Error ? e.message : String(e);
  if (m.includes('guardian_consent_required')) return { status: 409, code: 'guardian_consent_required' };
  if (m.includes('revoked_consent_is_final')) return { status: 409, code: 'revoked_consent_is_final' };
  if (m.includes('row-level security') || m.includes('permission denied')) return { status: 403, code: 'forbidden' };
  if (m.includes('duplicate key')) return { status: 409, code: 'already_exists' };
  if (m.includes('foreign key')) return { status: 422, code: 'invalid_reference' };
  return { status: 500, code: 'internal_error' };
}

const BASMALA_SKELETON = 'بسماللهالرحمنالرحيم';
const skeleton = (t: string) => t.normalize('NFKD').replace(/[\u0671]/g, '\u0627').replace(/[^\u0621-\u063a\u0641-\u064a]/g, '');
/** Display-only: drop the 4-word basmala some editions prepend to ayah 1 (not part of the ayah; surah 1 and 9 excluded). Never touches stored text. */
export function stripBasmalaPrefix(text: string, surah: number): string {
  if (surah === 1 || surah === 9) return text;
  const w = text.split(' ');
  return w.length > 4 && skeleton(w.slice(0, 4).join('')).replace(/[\u0649]/g, '\u064a') === BASMALA_SKELETON ? w.slice(4).join(' ').trim() : text;
}
/** Spaced-review scheduler (SM-2 style). rating: 1 again, 2 hard, 3 good, 4 easy. Pure and unit-tested. */
export function nextReview(st: { ease: number; intervalDays: number; reps: number; lapses: number }, rating: number): { ease: number; intervalDays: number; reps: number; lapses: number; dueInMinutes: number } {
  const clamp = (x: number) => Math.min(3.5, Math.max(1.3, Math.round(x * 100) / 100));
  if (rating <= 1) return { ease: clamp(st.ease - 0.2), intervalDays: 0, reps: 0, lapses: st.lapses + 1, dueInMinutes: 10 };
  let days: number, ease = st.ease;
  if (rating === 2) { days = Math.max(1, Math.round(Math.max(st.intervalDays, 1) * 1.2)); ease -= 0.15; }
  else {
    days = st.reps === 0 ? 1 : st.reps === 1 ? 3 : Math.max(st.intervalDays + 1, Math.round(st.intervalDays * st.ease));
    if (rating === 4) { days = Math.max(days + 1, Math.round(days * 1.3)); ease += 0.15; }
  }
  return { ease: clamp(ease), intervalDays: days, reps: st.reps + 1, lapses: st.lapses, dueInMinutes: days * 1440 };
}
export function buildApp(d: Deps) {
  const app = Fastify({ logger: false });
  // Accept `content-type: application/json` with an EMPTY body (action endpoints like verify/revoke), reject malformed JSON with 400.
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    try { done(null, body ? JSON.parse(body as string) : undefined); } catch { done(Object.assign(new Error('invalid_json'), { statusCode: 400 }), undefined); }
  });
  app.setErrorHandler((err: unknown, _req, reply) => {
    if (err instanceof z.ZodError) return reply.code(400).send({ error: 'validation_failed', issues: err.issues.map(i => ({ path: i.path.join('.'), message: i.message })) });
    const sc = (err as { statusCode?: number } | null)?.statusCode;
    if (typeof sc === 'number' && sc >= 400 && sc < 500) return reply.code(sc).send({ error: sc === 413 ? 'payload_too_large' : 'bad_request' }); // framework-level client errors stay 4xx
    const { status, code } = mapError(err); // never leak SQL text to clients
    if (status === 500) console.error('internal_error', err instanceof Error ? `${err.name}: ${err.message}`.slice(0, 300) : 'non-error thrown'); // server-side log only
    return reply.code(status).send({ error: code });
  });

  const authUser = (req: FastifyRequest): string => {
    const h = req.headers.authorization;
    const sub = h?.startsWith('Bearer ') ? verifyToken(h.slice(7), d.jwtSecret) : null;
    if (!sub) throw Object.assign(new Error('unauthenticated'), { statusCode: 401 });
    return sub;
  };
  app.addHook('onError', async () => {});
  // Best-effort in-memory rate limit (per process/isolate; not a distributed limiter). Strict on credential endpoints.
  // Credential endpoints: shared counter in the database (works across serverless instances). Other routes: best-effort per-process limit.
  const hits = new Map<string, { n: number; reset: number }>();
  app.addHook('onRequest', async (req, reply) => {
    const ip = String(req.headers['x-forwarded-for'] ?? req.ip ?? 'unknown').split(',')[0]!.trim().slice(0, 64);
    const now = Date.now();
    if (req.url.startsWith('/auth/')) {
      const r = await d.service.query<{ n: number }>(
        `INSERT INTO rate_limits (bucket, window_start, n) VALUES ($1, date_trunc('minute', now()), 1)
         ON CONFLICT (bucket, window_start) DO UPDATE SET n = rate_limits.n + 1 RETURNING n`, ['auth:' + ip]);
      if (Math.random() < 0.02) await d.service.query(`DELETE FROM rate_limits WHERE window_start < now() - interval '1 hour'`);
      if ((r.rows[0]?.n ?? 0) > (d.rateLimit?.auth ?? 10)) return reply.code(429).header('retry-after', '60').send({ error: 'rate_limited' });
      return;
    }
    const limit = d.rateLimit?.general ?? 240, key = 'g:' + ip;
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    const h = hits.get(key);
    if (!h || h.reset < now) { hits.set(key, { n: 1, reset: now + 60_000 }); return; }
    if (++h.n > limit) return reply.code(429).header('retry-after', '60').send({ error: 'rate_limited' });
  });
  // Session revocation: a token issued before users.sessions_valid_after is dead (logout-all, password change).
  const sessionAlive = async (sub: string, issuedMs: number) => {
    const r = await d.service.query<{ ms: string }>(`SELECT (extract(epoch from sessions_valid_after) * 1000)::bigint AS ms FROM users WHERE id = $1`, [sub]);
    return r.rows[0] !== undefined && issuedMs >= Number(r.rows[0].ms);
  };
  app.addHook('onRequest', async (req, reply) => {
    const h = req.headers.authorization;
    if (!h?.startsWith('Bearer ') || req.url.startsWith('/auth/login') || req.url.startsWith('/auth/register')) return;
    const t = verifyTokenFull(h.slice(7), d.jwtSecret);
    if (t && !(await sessionAlive(t.sub, t.issuedMs))) return reply.code(401).send({ error: 'session_revoked' });
  });
  const tenant = async <T>(req: FastifyRequest, reply: FastifyReply, fn: (tx: TxLike, userId: string, inst: string) => Promise<T>) => {
    let userId: string;
    try { userId = authUser(req); } catch { reply.code(401).send({ error: 'unauthenticated' }); return undefined; }
    const inst = uuid.parse((req.params as { inst: string }).inst);
    return withContext(d.app, { userId, institutionId: inst }, tx => fn(tx, userId, inst));
  };

  app.post('/auth/register', async (req, reply) => {
    const b = z.object({ displayName: z.string().min(1).max(120), email: z.string().email().max(200), password: z.string().min(10).max(200), adultConfirmed: z.literal(true) }).parse(req.body);
    const r = await d.service.query<{ id: string }>(`INSERT INTO users (display_name, email, password_hash) VALUES ($1, lower($2), $3) RETURNING id`, [b.displayName, b.email, await hashPassword(b.password)]);
    return reply.code(201).send({ id: r.rows[0]!.id });
  });
  app.post('/auth/login', async (req, reply) => {
    const b = z.object({ email: z.string().email(), password: z.string().max(200) }).parse(req.body);
    const u = (await d.service.query<{ id: string; password_hash: string | null }>(`SELECT id, password_hash FROM users WHERE email = lower($1)`, [b.email])).rows[0];
    if (!(await verifyPassword(b.password, u?.password_hash ?? null)) || !u) return reply.code(401).send({ error: 'invalid_credentials' });
    return { token: signToken(u.id, d.jwtSecret) };
  });
  app.post('/auth/logout-all', async (req, reply) => {
    let userId: string; try { userId = authUser(req); } catch { return reply.code(401).send({ error: 'unauthenticated' }); }
    await d.service.query(`UPDATE users SET sessions_valid_after = to_timestamp($2::double precision / 1000) WHERE id = $1`, [userId, Date.now()]);
    return { ok: true };
  });
  app.post('/auth/change-password', async (req, reply) => {
    let userId: string; try { userId = authUser(req); } catch { return reply.code(401).send({ error: 'unauthenticated' }); }
    const b = z.object({ currentPassword: z.string().max(200), newPassword: z.string().min(10).max(200) }).parse(req.body);
    const u = (await d.service.query<{ password_hash: string | null }>(`SELECT password_hash FROM users WHERE id = $1`, [userId])).rows[0];
    if (!(await verifyPassword(b.currentPassword, u?.password_hash ?? null))) return reply.code(401).send({ error: 'invalid_credentials' });
    await d.service.query(`UPDATE users SET password_hash = $2, sessions_valid_after = to_timestamp($3::double precision / 1000) WHERE id = $1`, [userId, await hashPassword(b.newPassword), Date.now()]);
    return { token: signToken(userId, d.jwtSecret, 3600, Date.now() + 2) };   // every older session is now dead; this one continues
  });
  app.post('/institutions', async (req, reply) => {
    let userId: string; try { userId = authUser(req); } catch { return reply.code(401).send({ error: 'unauthenticated' }); }
    const b = z.object({ name: z.string().min(2).max(200), slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}$/), countryCode: z.string().length(2).optional() }).parse(req.body);
    const id = await d.service.transaction(async tx => {
      const i = await tx.query<{ id: string }>(`INSERT INTO institutions (name, slug, country_code) VALUES ($1,$2,$3) RETURNING id`, [b.name, b.slug, b.countryCode?.toUpperCase() ?? null]);
      await tx.query(`INSERT INTO memberships (institution_id, user_id, role) VALUES ($1,$2,'tenant_admin')`, [i.rows[0]!.id, userId]);
      return i.rows[0]!.id;
    });
    return reply.code(201).send({ id });
  });

  app.post('/i/:inst/members', async (req, reply) => {
    const b = z.object({ email: z.string().email(), role: z.enum(ROLES) }).parse(req.body);
    const uid = (await d.service.query<{ id: string }>(`SELECT id FROM users WHERE email = lower($1)`, [b.email])).rows[0]?.id; // email never readable by app_user
    if (!uid) return reply.code(404).send({ error: 'user_not_found' });
    const r = await tenant(req, reply, (tx, _u, inst) => tx.query(`INSERT INTO memberships (institution_id, user_id, role) VALUES ($1,$2,$3) RETURNING id`, [inst, uid, b.role]));
    if (r) return reply.code(201).send({ id: (r.rows[0] as { id: string }).id, userId: uid });
  });
  app.post('/i/:inst/students', async (req, reply) => {
    const b = z.object({ userId: uuid, isMinor: z.boolean(), riwayahProfile: z.string().max(60).default('unspecified') }).parse(req.body);
    const r = await tenant(req, reply, (tx, _u, inst) => tx.query(`INSERT INTO student_profiles (institution_id, user_id, is_minor, riwayah_profile) VALUES ($1,$2,$3,$4) RETURNING id`, [inst, b.userId, b.isMinor, b.riwayahProfile]));
    if (r) return reply.code(201).send({ id: (r.rows[0] as { id: string }).id });
  });
  app.get('/i/:inst/students', async (req, reply) => {
    const r = await tenant(req, reply, tx => tx.query(`SELECT user_id AS "userId", is_minor AS "isMinor", riwayah_profile AS "riwayahProfile" FROM student_profiles ORDER BY created_at`));
    if (r) return { students: r.rows };
  });
  app.post('/i/:inst/guardian-links', async (req, reply) => {
    const b = z.object({ guardianUserId: uuid, studentUserId: uuid, relationship: z.string().min(2).max(40) }).parse(req.body);
    const r = await tenant(req, reply, (tx, _u, inst) => tx.query(`INSERT INTO guardian_links (institution_id, guardian_user_id, student_user_id, relationship) VALUES ($1,$2,$3,$4) RETURNING id`, [inst, b.guardianUserId, b.studentUserId, b.relationship]));
    if (r) return reply.code(201).send({ id: (r.rows[0] as { id: string }).id, verified: false });
  });
  app.post('/i/:inst/guardian-links/:id/verify', async (req, reply) => {
    const id = uuid.parse((req.params as { id: string }).id);
    const r = await tenant(req, reply, tx => tx.query(`UPDATE guardian_links SET verified_at = now() WHERE id = $1 AND verified_at IS NULL RETURNING id`, [id]));
    if (r) return r.rows.length ? { verified: true } : reply.code(404).send({ error: 'not_found_or_already_verified' });
  });
  app.post('/i/:inst/qari-assignments', async (req, reply) => {
    const b = z.object({ qariUserId: uuid, studentUserId: uuid }).parse(req.body);
    const r = await tenant(req, reply, (tx, _u, inst) => tx.query(`INSERT INTO qari_assignments (institution_id, qari_user_id, student_user_id) VALUES ($1,$2,$3) RETURNING id`, [inst, b.qariUserId, b.studentUserId]));
    if (r) return reply.code(201).send({ id: (r.rows[0] as { id: string }).id });
  });
  app.post('/i/:inst/consents', async (req, reply) => {
    const b = z.object({ studentUserId: uuid, purpose: z.enum(['audio_recording', 'live_session_recording', 'ai_analysis', 'data_processing']), expiresAt: z.string().datetime().optional() }).parse(req.body);
    const r = await tenant(req, reply, (tx, u, inst) => tx.query(`INSERT INTO consents (institution_id, student_user_id, granted_by_user_id, purpose, expires_at) VALUES ($1,$2,$3,$4,$5) RETURNING id`, [inst, b.studentUserId, u, b.purpose, b.expiresAt ?? null]));
    if (r) return reply.code(201).send({ id: (r.rows[0] as { id: string }).id });
  });
  app.post('/i/:inst/consents/:id/revoke', async (req, reply) => {
    const id = uuid.parse((req.params as { id: string }).id);
    const r = await tenant(req, reply, tx => tx.query(`UPDATE consents SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL RETURNING id`, [id]));
    if (r) return r.rows.length ? { revoked: true } : reply.code(404).send({ error: 'not_found_or_already_revoked' });
  });
  app.get('/i/:inst/guardian-links', async (req, reply) => {
    const r = await tenant(req, reply, tx => tx.query(`SELECT id, guardian_user_id AS "guardianUserId", student_user_id AS "studentUserId", relationship, verified_at AS "verifiedAt" FROM guardian_links ORDER BY created_at DESC`));
    if (r) return { links: r.rows };
  });
  app.get('/i/:inst/consents', async (req, reply) => {
    const r = await tenant(req, reply, tx => tx.query(`SELECT id, student_user_id AS "studentUserId", purpose, granted_at AS "grantedAt", expires_at AS "expiresAt", revoked_at AS "revokedAt" FROM consents ORDER BY granted_at DESC`));
    if (r) return { consents: r.rows };
  });
  app.post('/i/:inst/submissions', async (req, reply) => {
    const b = z.object({ editionCode: z.string().min(3).max(64), riwayah: z.string().min(2).max(60), surah: z.number().int().min(1).max(114), ayahStart: z.number().int().min(1), ayahEnd: z.number().int().min(1), audioObjectKey: z.string().min(3).max(300).refine(k => !/^https?:/i.test(k), 'must be a private object key, not a URL') }).parse(req.body);
    const r = await tenant(req, reply, (tx, u, inst) => tx.query(`INSERT INTO recitation_submissions (institution_id, student_user_id, edition_code, riwayah, surah, ayah_start, ayah_end, audio_object_key) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`, [inst, u, b.editionCode, b.riwayah, b.surah, b.ayahStart, b.ayahEnd, b.audioObjectKey]));
    if (r) return reply.code(201).send({ id: (r.rows[0] as { id: string }).id });
  });
  app.get('/i/:inst/submissions', async (req, reply) => {
    const r = await tenant(req, reply, tx => tx.query(`SELECT id, student_user_id AS "studentUserId", surah, ayah_start AS "ayahStart", ayah_end AS "ayahEnd", state, created_at AS "createdAt" FROM recitation_submissions ORDER BY created_at DESC`));
    if (r) return { submissions: r.rows };
  });
  // Audio lives in a PRIVATE bucket; paths are derived server-side (never client-chosen). Authorisation = what RLS lets the caller see.
  const audioPath = (inst: string, student: string, sid: string) => `${inst}/${student}/${sid}.webm`;
  app.post('/i/:inst/submissions/:id/upload-url', async (req, reply) => {
    const id = uuid.parse((req.params as { id: string }).id);
    if (!d.storage) return reply.code(501).send({ error: 'storage_not_configured' });
    const r = await tenant(req, reply, async (tx, u, inst) => ({ u, inst, rows: (await tx.query<{ student_user_id: string }>(`SELECT student_user_id FROM recitation_submissions WHERE id = $1`, [id])).rows }));
    if (!r) return;
    const row = r.rows[0];
    if (!row) return reply.code(404).send({ error: 'not_found' });
    if (row.student_user_id !== r.u) return reply.code(403).send({ error: 'forbidden' });
    return { uploadUrl: await d.storage.signUpload(audioPath(r.inst, row.student_user_id, id)), contentType: 'audio/webm', maxBytes: 10485760 };
  });
  app.get('/i/:inst/submissions/:id/audio-url', async (req, reply) => {
    const id = uuid.parse((req.params as { id: string }).id);
    if (!d.storage) return reply.code(501).send({ error: 'storage_not_configured' });
    const r = await tenant(req, reply, async (tx, _u, inst) => ({ inst, rows: (await tx.query<{ student_user_id: string }>(`SELECT student_user_id FROM recitation_submissions WHERE id = $1`, [id])).rows }));
    if (!r) return;
    const row = r.rows[0];
    if (!row) return reply.code(404).send({ error: 'not_found' });
    return { url: await d.storage.signDownload(audioPath(r.inst, row.student_user_id, id)), expiresInSeconds: 60 };
  });
  app.post('/i/:inst/submissions/:id/state', async (req, reply) => {
    const id = uuid.parse((req.params as { id: string }).id);
    const b = z.object({ state: z.enum(['under_review', 'feedback_sent', 'reassessment_requested', 'closed']) }).parse(req.body);
    const r = await tenant(req, reply, tx => tx.query(`UPDATE recitation_submissions SET state = $2 WHERE id = $1 RETURNING id`, [id, b.state]));
    if (r) return r.rows.length ? { ok: true } : reply.code(404).send({ error: 'not_found' });
  });

  // ---- who am I (service path: reads only the caller's own memberships; no tenant data) ----
  app.get('/me', async (req, reply) => {
    let userId: string; try { userId = authUser(req); } catch { return reply.code(401).send({ error: 'unauthenticated' }); }
    const u = (await d.service.query<{ id: string; display_name: string }>(`SELECT id, display_name FROM users WHERE id = $1`, [userId])).rows[0];
    if (!u) return reply.code(401).send({ error: 'unauthenticated' });
    const m = await d.service.query(`SELECT i.id AS "institutionId", i.name, i.slug, m.role FROM memberships m JOIN institutions i ON i.id = m.institution_id WHERE m.user_id = $1 AND m.status = 'active' AND i.status = 'active' ORDER BY i.name, m.role`, [userId]);
    return { id: u.id, displayName: u.display_name, memberships: m.rows };
  });

  // ---- personal learner space: hifz (spaced review), quiz attempts, mastery map. Owned by the user; RLS user_id = current user. ----
  const personal = async <T>(req: FastifyRequest, reply: FastifyReply, fn: (tx: TxLike, userId: string) => Promise<T>): Promise<T | undefined> => {
    let userId: string; try { userId = authUser(req); } catch { reply.code(401).send({ error: 'unauthenticated' }); return undefined; }
    return withContext(d.app, { userId }, tx => fn(tx, userId));
  };
  app.get('/me/hifz', async (req, reply) => {
    const r = await personal(req, reply, tx => tx.query(`SELECT id, surah, from_ayah AS "fromAyah", to_ayah AS "toAyah", status, interval_days AS "intervalDays", reps, lapses, due_at AS "dueAt", last_reviewed_at AS "lastReviewedAt" FROM hifz_items ORDER BY surah, from_ayah`));
    if (r) return { items: r.rows, now: new Date().toISOString() };
  });
  app.post('/me/hifz', async (req, reply) => {
    const b = z.object({ surah: z.number().int().min(1).max(114), fromAyah: z.number().int().min(1), toAyah: z.number().int().min(1) }).parse(req.body);
    if (b.toAyah < b.fromAyah) return reply.code(400).send({ error: 'bad_range' });
    const r = await personal(req, reply, async tx => {
      const c = (await tx.query<{ ayah_count: number }>(`SELECT ayah_count FROM quran_reference_counts WHERE surah = $1`, [b.surah])).rows[0];
      if (!c || b.toAyah > c.ayah_count) return null;
      return (await tx.query<{ id: string }>(`INSERT INTO hifz_items (user_id, surah, from_ayah, to_ayah) VALUES (app.current_user_id(), $1, $2, $3) RETURNING id`, [b.surah, b.fromAyah, b.toAyah])).rows[0]!.id;
    });
    if (r === null) return reply.code(422).send({ error: 'ayah_out_of_range' });
    if (r) return reply.code(201).send({ id: r });
  });
  app.delete('/me/hifz/:id', async (req, reply) => {
    const id = uuid.parse((req.params as { id: string }).id);
    const r = await personal(req, reply, tx => tx.query(`DELETE FROM hifz_items WHERE id = $1 RETURNING id`, [id]));
    if (r) return r.rows.length ? { ok: true } : reply.code(404).send({ error: 'not_found' });
  });
  app.get('/me/hifz/due', async (req, reply) => {
    const r = await personal(req, reply, tx => tx.query(`SELECT id, surah, from_ayah AS "fromAyah", to_ayah AS "toAyah", status, interval_days AS "intervalDays", reps, due_at AS "dueAt" FROM hifz_items WHERE due_at <= now() ORDER BY due_at LIMIT 50`));
    if (r) return { due: r.rows };
  });
  app.post('/me/hifz/:id/review', async (req, reply) => {
    const id = uuid.parse((req.params as { id: string }).id);
    const b = z.object({ rating: z.number().int().min(1).max(4) }).parse(req.body);
    const r = await personal(req, reply, async tx => {
      const it = (await tx.query<{ ease: string; interval_days: number; reps: number; lapses: number }>(`SELECT ease, interval_days, reps, lapses FROM hifz_items WHERE id = $1 FOR UPDATE`, [id])).rows[0];
      if (!it) return null;
      const n = nextReview({ ease: Number(it.ease), intervalDays: it.interval_days, reps: it.reps, lapses: it.lapses }, b.rating);
      await tx.query(`UPDATE hifz_items SET ease=$2, interval_days=$3, reps=$4, lapses=$5, status=$6, due_at = now() + ($7 || ' minutes')::interval, last_reviewed_at = now() WHERE id = $1`,
        [id, n.ease, n.intervalDays, n.reps, n.lapses, n.intervalDays >= 7 ? 'memorized' : 'learning', String(n.dueInMinutes)]);
      await tx.query(`INSERT INTO hifz_reviews (user_id, item_id, rating, interval_after) VALUES (app.current_user_id(), $1, $2, $3)`, [id, b.rating, n.intervalDays]);
      return n;
    });
    if (r === null) return reply.code(404).send({ error: 'not_found' });
    if (r) return { intervalDays: r.intervalDays, dueInMinutes: r.dueInMinutes };
  });
  app.post('/me/quiz-attempts', async (req, reply) => {
    const b = z.object({ quizKey: z.string().regex(/^[a-z0-9_-]{1,60}$/), score: z.number().int().min(0), total: z.number().int().min(1).max(200) }).parse(req.body);
    if (b.score > b.total) return reply.code(400).send({ error: 'bad_score' });
    const r = await personal(req, reply, tx => tx.query(`INSERT INTO quiz_attempts (user_id, quiz_key, score, total) VALUES (app.current_user_id(), $1, $2, $3) RETURNING id`, [b.quizKey, b.score, b.total]));
    if (r) return reply.code(201).send({ id: r.rows[0]!.id });
  });
  app.get('/me/mastery', async (req, reply) => {
    const r = await personal(req, reply, async tx => {
      const surahs = await tx.query(`SELECT i.surah, rc.ayah_count AS "ayahCount", count(DISTINCT a) FILTER (WHERE i.status = 'memorized')::int AS memorized, count(DISTINCT a)::int AS started
        FROM hifz_items i JOIN quran_reference_counts rc ON rc.surah = i.surah
        CROSS JOIN LATERAL generate_series(i.from_ayah, i.to_ayah) a GROUP BY i.surah, rc.ayah_count ORDER BY i.surah`);
      const quizzes = await tx.query(`SELECT quiz_key AS "quizKey", max(round(100.0 * score / total))::int AS best, count(*)::int AS attempts FROM quiz_attempts GROUP BY quiz_key ORDER BY quiz_key`);
      const days = await tx.query<{ d: string }>(`SELECT DISTINCT to_char(x::date, 'YYYY-MM-DD') AS d FROM (SELECT reviewed_at AS x FROM hifz_reviews UNION ALL SELECT taken_at FROM quiz_attempts) t ORDER BY d DESC LIMIT 400`);
      const tot = (await tx.query<{ n: number }>(`SELECT count(*)::int AS n FROM hifz_reviews`)).rows[0]!.n;
      return { surahs: surahs.rows, quizzes: quizzes.rows, activeDays: days.rows.map(x => x.d), reviewsTotal: tot };
    });
    if (r) return r;
  });

  // ---- scholarly review workspace: only active scholarly_reviewers; the DB trigger enforces legal transitions, approver identity and licence clearance ----
  app.get('/scholarly/items', async (req, reply) => {
    const q = z.object({ state: z.string().max(30).optional(), kind: z.string().max(30).optional() }).parse(req.query);
    const r = await personal(req, reply, async tx => {
      if (!(await tx.query<{ ok: boolean }>(`SELECT app.is_scholar() AS ok`)).rows[0]!.ok) return null;
      const items = await tx.query(`SELECT id, kind, title_ar AS "titleAr", title_en AS "titleEn", state, riwayah_scope AS "riwayahScope", licence_cleared AS "licenceCleared", approved_at AS "approvedAt", array_length(source_unit_ids, 1) AS "sources"
        FROM scholarly_items WHERE ($1::text IS NULL OR state = $1) AND ($2::text IS NULL OR kind = $2) ORDER BY state, kind, title_ar LIMIT 500`, [q.state ?? null, q.kind ?? null]);
      const counts = await tx.query(`SELECT state, count(*)::int AS n FROM scholarly_items GROUP BY state ORDER BY state`);
      return { items: items.rows, counts: counts.rows };
    });
    if (r === null) return reply.code(403).send({ error: 'forbidden' });
    if (r) return r;
  });
  app.get('/scholarly/items/:id', async (req, reply) => {
    const id = uuid.parse((req.params as { id: string }).id);
    const r = await personal(req, reply, async tx => {
      if (!(await tx.query<{ ok: boolean }>(`SELECT app.is_scholar() AS ok`)).rows[0]!.ok) return 'forbidden' as const;
      const it = (await tx.query(`SELECT id, kind, title_ar AS "titleAr", title_en AS "titleEn", body, source_unit_ids AS "sourceUnitIds", riwayah_scope AS "riwayahScope", state, licence_cleared AS "licenceCleared", approved_at AS "approvedAt" FROM scholarly_items WHERE id = $1`, [id])).rows[0];
      if (!it) return 'not_found' as const;
      const hist = await tx.query(`SELECT r.from_state AS "fromState", r.to_state AS "toState", r.note, r.created_at AS "createdAt", u.display_name AS reviewer FROM scholarly_reviews r LEFT JOIN users u ON u.id = r.reviewer_user_id WHERE r.item_id = $1 ORDER BY r.created_at`, [id]);
      return { item: it, history: hist.rows };
    });
    if (r === 'forbidden') return reply.code(403).send({ error: 'forbidden' });
    if (r === 'not_found') return reply.code(404).send({ error: 'not_found' });
    if (r) return r;
  });
  app.post('/scholarly/items/:id/transition', async (req, reply) => {
    const id = uuid.parse((req.params as { id: string }).id);
    const b = z.object({ to: z.enum(['EXTRACTED', 'NORMALIZED', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED', 'REVISION_REQUIRED', 'ARCHIVED']), note: z.string().max(4000).optional() }).parse(req.body);
    if ((b.to === 'REJECTED' || b.to === 'REVISION_REQUIRED') && !b.note?.trim()) return reply.code(400).send({ error: 'note_required' });
    const r = await personal(req, reply, async (tx, u) => {
      if (!(await tx.query<{ ok: boolean }>(`SELECT app.is_scholar() AS ok`)).rows[0]!.ok) return { code: 403, error: 'forbidden' };
      const cur = (await tx.query<{ state: string }>(`SELECT state FROM scholarly_items WHERE id = $1 FOR UPDATE`, [id])).rows[0];
      if (!cur) return { code: 404, error: 'not_found' };
      try {
        await tx.exec('SAVEPOINT tr');
        await tx.query(`UPDATE scholarly_items SET state = $2, approved_by = CASE WHEN $2 = 'APPROVED' THEN $3::uuid ELSE approved_by END WHERE id = $1`, [id, b.to, u]);
      } catch (e) {
        await tx.exec('ROLLBACK TO SAVEPOINT tr');
        const m = e instanceof Error ? e.message : '';
        const code = m.match(/illegal_transition|publication_requires_licence_clearance|approval_requires_active_scholarly_reviewer/)?.[0];
        if (code) return { code: 409, error: code };
        throw e;
      }
      await tx.query(`INSERT INTO scholarly_reviews (item_id, reviewer_user_id, from_state, to_state, note) VALUES ($1, $2, $3, $4, $5)`, [id, u, cur.state, b.to, b.note?.trim() || null]);
      return { code: 200, state: b.to };
    });
    if (!r) return;
    if (r.code !== 200) return reply.code(r.code).send({ error: (r as { error: string }).error });
    return { ok: true, state: (r as { state: string }).state };
  });

  // ---- sanad register (self-declared; verified only by a scholarly reviewer other than the holder; never an ijazah issued by the platform) ----
  app.get('/me/sanad', async (req, reply) => {
    const r = await personal(req, reply, tx => tx.query(`SELECT e.id, e.riwayah, e.teacher_name AS "teacherName", e.year_hijri AS "yearHijri", e.document_note AS "documentNote", e.status, e.review_note AS "reviewNote", e.reviewed_at AS "reviewedAt", e.created_at AS "createdAt" FROM sanad_entries e WHERE e.user_id = app.current_user_id() ORDER BY e.created_at`));
    if (r) return { entries: r.rows, note: 'Self-declared record. The platform does not issue ijazah; "verified" means a scholarly reviewer examined the documents you presented.' };
  });
  app.post('/me/sanad', async (req, reply) => {
    const b = z.object({ riwayah: z.string().min(2).max(60), teacherName: z.string().min(2).max(200), yearHijri: z.number().int().min(1).max(1600).optional(), documentNote: z.string().max(1000).optional() }).parse(req.body);
    const r = await personal(req, reply, tx => tx.query(`INSERT INTO sanad_entries (user_id, riwayah, teacher_name, year_hijri, document_note) VALUES (app.current_user_id(), $1, $2, $3, $4) RETURNING id`, [b.riwayah, b.teacherName, b.yearHijri ?? null, b.documentNote ?? null]));
    if (r) return reply.code(201).send({ id: (r.rows[0] as { id: string }).id, status: 'declared' });
  });
  app.get('/scholarly/sanad', async (req, reply) => {
    const q = z.object({ status: z.enum(['declared', 'verified', 'rejected']).default('declared') }).parse(req.query);
    const r = await personal(req, reply, async tx => {
      if (!(await tx.query<{ ok: boolean }>(`SELECT app.is_scholar() AS ok`)).rows[0]!.ok) return null;
      return tx.query(`SELECT e.id, e.user_id AS "userId", e.riwayah, e.teacher_name AS "teacherName", e.year_hijri AS "yearHijri", e.document_note AS "documentNote", e.status, e.review_note AS "reviewNote", e.created_at AS "createdAt"
        FROM sanad_entries e WHERE e.status = $1 AND e.user_id <> app.current_user_id() ORDER BY e.created_at LIMIT 200`, [q.status]);
    });
    if (r === null) return reply.code(403).send({ error: 'forbidden' });
    if (r) {   // display names come from the service path (name only, never email); the reviewer needs them to identify the holder
      const ids = [...new Set((r.rows as Array<{ userId: string }>).map(x => x.userId))];
      const names = new Map((ids.length ? (await d.service.query<{ id: string; display_name: string }>(`SELECT id, display_name FROM users WHERE id = ANY($1::uuid[])`, [ids])).rows : []).map(x => [x.id, x.display_name]));
      return { entries: (r.rows as Array<{ userId: string }>).map(({ userId, ...x }) => ({ ...x, holder: names.get(userId) ?? '—' })) };
    }
  });
  app.post('/scholarly/sanad/:id/decide', async (req, reply) => {
    const id = uuid.parse((req.params as { id: string }).id);
    const b = z.object({ decision: z.enum(['verified', 'rejected']), note: z.string().min(3).max(2000) }).parse(req.body);
    const r = await personal(req, reply, async (tx, u) => {
      if (!(await tx.query<{ ok: boolean }>(`SELECT app.is_scholar() AS ok`)).rows[0]!.ok) return 'forbidden' as const;
      const x = await tx.query(`UPDATE sanad_entries SET status = $2, reviewed_by = $3, reviewed_at = now(), review_note = $4 WHERE id = $1 AND status = 'declared' RETURNING id`, [id, b.decision, u, b.note]);
      return x.rows.length ? 'ok' as const : 'not_found' as const;
    });
    if (r === 'forbidden') return reply.code(403).send({ error: 'forbidden' });
    if (r === 'not_found') return reply.code(404).send({ error: 'not_found_or_already_decided' });
    if (r) return { ok: true };
  });

  // ---- learning tracks, progress, passport, certificates ----
  const unitSchema = z.object({ title: z.string().min(1).max(200), kind: z.enum(['recitation', 'memorization', 'tajweed', 'review']), surah: z.number().int().min(1).max(114).optional(), fromAyah: z.number().int().min(1).optional(), toAyah: z.number().int().min(1).optional() });
  app.post('/i/:inst/tracks', async (req, reply) => {
    const b = z.object({ title: z.string().min(1).max(200), description: z.string().max(2000).optional(), units: z.array(unitSchema).max(200).default([]) }).parse(req.body);
    const id = await tenant(req, reply, async (tx, u, inst) => {
      const t = (await tx.query<{ id: string }>(`INSERT INTO learning_tracks (institution_id, title, description, created_by) VALUES ($1,$2,$3,$4) RETURNING id`, [inst, b.title, b.description ?? null, u])).rows[0]!.id;
      let pos = 1;
      for (const x of b.units) await tx.query(`INSERT INTO track_units (institution_id, track_id, position, title, kind, surah, from_ayah, to_ayah) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [inst, t, pos++, x.title, x.kind, x.surah ?? null, x.fromAyah ?? null, x.toAyah ?? null]);
      return t;
    });
    if (id) return reply.code(201).send({ id });
  });
  app.get('/i/:inst/tracks', async (req, reply) => {
    const r = await tenant(req, reply, async tx => {
      const t = await tx.query(`SELECT id, title, description, status FROM learning_tracks ORDER BY created_at`);
      const u = await tx.query(`SELECT id, track_id AS "trackId", position, title, kind, surah, from_ayah AS "fromAyah", to_ayah AS "toAyah" FROM track_units ORDER BY track_id, position`);
      return { tracks: (t.rows as Array<{ id: string }>).map(x => ({ ...x, units: (u.rows as Array<{ trackId: string }>).filter(y => y.trackId === x.id) })) };
    });
    if (r) return r;
  });
  app.post('/i/:inst/tracks/:tid/status', async (req, reply) => {
    const tid = uuid.parse((req.params as { tid: string }).tid);
    const b = z.object({ status: z.enum(['draft', 'published', 'archived']) }).parse(req.body);
    const r = await tenant(req, reply, tx => tx.query(`UPDATE learning_tracks SET status = $2 WHERE id = $1 RETURNING id`, [tid, b.status]));
    if (r) return r.rows.length ? { ok: true } : reply.code(404).send({ error: 'not_found' });
  });
  app.post('/i/:inst/tracks/:tid/progress', async (req, reply) => {
    const tid = uuid.parse((req.params as { tid: string }).tid);
    const b = z.object({ unitId: uuid, studentUserId: uuid, note: z.string().max(1000).optional() }).parse(req.body);
    const r = await tenant(req, reply, (tx, u, inst) => tx.query(`INSERT INTO unit_progress (institution_id, track_id, unit_id, student_user_id, marked_by, note) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, [inst, tid, b.unitId, b.studentUserId, u, b.note ?? null]));
    if (r) return reply.code(201).send({ id: (r.rows[0] as { id: string }).id });
  });
  // Learning passport: per-track progress for one student + certificates. Visibility is whatever RLS allows the caller to see.
  app.get('/i/:inst/passport', async (req, reply) => {
    const q = z.object({ studentUserId: uuid.optional() }).parse(req.query);
    const r = await tenant(req, reply, async (tx, u) => {
      const sid = q.studentUserId ?? u;
      const tr = await tx.query(`SELECT t.id, t.title, (SELECT count(*) FROM track_units x WHERE x.track_id = t.id)::int AS total,
          (SELECT count(*) FROM unit_progress p WHERE p.track_id = t.id AND p.student_user_id = $1)::int AS done
        FROM learning_tracks t WHERE t.status = 'published' ORDER BY t.created_at`, [sid]);
      const ce = await tx.query(`SELECT c.id, c.track_id AS "trackId", c.issued_at AS "issuedAt", c.verification_code AS "verificationCode", c.revoked_at AS "revokedAt" FROM certificates c WHERE c.student_user_id = $1 ORDER BY c.issued_at`, [sid]);
      const sub = await tx.query(`SELECT state, count(*)::int AS n FROM recitation_submissions WHERE student_user_id = $1 GROUP BY state`, [sid]);
      return { studentUserId: sid, tracks: tr.rows, certificates: ce.rows, submissionsByState: sub.rows };
    });
    if (r) return r;
  });
  app.post('/i/:inst/certificates', async (req, reply) => {
    const b = z.object({ trackId: uuid, studentUserId: uuid }).parse(req.body);
    const r = await tenant(req, reply, async (tx, u, inst) => {
      try { return await tx.query(`INSERT INTO certificates (institution_id, track_id, student_user_id, issued_by) VALUES ($1,$2,$3,$4) RETURNING id, verification_code AS "verificationCode"`, [inst, b.trackId, b.studentUserId, u]); }
      catch (e) { const m = e instanceof Error ? e.message : ''; if (m.includes('track_not_complete') || m.includes('track_not_published') || m.includes('track_empty')) return { conflict: m.match(/track_[a-z_]+/)![0] }; throw e; }
    });
    if (!r) return;
    if ('conflict' in r) return reply.code(409).send({ error: r.conflict });
    return reply.code(201).send(r.rows[0]);
  });
  app.get('/i/:inst/certificates', async (req, reply) => {
    const r = await tenant(req, reply, tx => tx.query(`SELECT id, track_id AS "trackId", student_user_id AS "studentUserId", issued_at AS "issuedAt", verification_code AS "verificationCode", revoked_at AS "revokedAt" FROM certificates ORDER BY issued_at DESC`));
    if (r) return { certificates: r.rows };
  });
  // Public verification by unguessable code. Shows no personal data of minors; a certificate is a course-completion record, never an ijazah.
  app.get('/verify/:code', async (req, reply) => {
    const code = z.string().regex(/^[0-9a-f]{32}$/).parse((req.params as { code: string }).code);
    const c = (await d.service.query<{ title: string; inst: string; issued_at: string; revoked_at: string | null; name: string; minor: boolean | null }>(
      `SELECT t.title, i.name AS inst, c.issued_at, c.revoked_at, u.display_name AS name,
              (SELECT sp.is_minor FROM student_profiles sp WHERE sp.institution_id = c.institution_id AND sp.user_id = c.student_user_id) AS minor
       FROM certificates c JOIN learning_tracks t ON t.id = c.track_id JOIN institutions i ON i.id = c.institution_id JOIN users u ON u.id = c.student_user_id
       WHERE c.verification_code = $1`, [code])).rows[0];
    if (!c) return reply.code(404).send({ valid: false });
    return { valid: c.revoked_at === null, revoked: c.revoked_at !== null, track: c.title, institution: c.inst, issuedAt: c.issued_at, holder: c.minor === false ? c.name : null,
      note: 'Course-completion record issued by the institution. Not an ijazah and not a religious ruling.' };
  });

  // ---- supervised AI assistant: drafts only; nothing reaches a student until a human accepts it ----
  app.get('/i/:inst/ai/status', async (req, reply) => {
    const r = await tenant(req, reply, async () => true);
    if (r) return { modelConnected: Boolean(d.ai), model: d.ai?.name ?? null, note: 'Suggestions are drafts for a qari/admin to accept or reject. They are never a ruling, a grade or an ijazah.' };
  });
  app.post('/i/:inst/ai-suggestions/generate', async (req, reply) => {
    const b = z.object({ studentUserId: uuid, prompt: z.string().min(3).max(2000) }).parse(req.body);
    if (!d.ai) { const ok = await tenant(req, reply, async () => true); if (ok) return reply.code(501).send({ error: 'model_not_connected' }); return; }
    const ai = d.ai;
    const text = await ai.suggest(b.prompt).catch(() => null);
    if (!text) return reply.code(502).send({ error: 'model_failed' });
    const r = await tenant(req, reply, (tx, u, inst) => tx.query(`INSERT INTO ai_suggestions (institution_id, student_user_id, body, source, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING id`, [inst, b.studentUserId, text.slice(0, 4000), 'model:' + ai.name, u]));
    if (r) return reply.code(201).send({ id: (r.rows[0] as { id: string }).id, status: 'pending' });
  });
  app.get('/i/:inst/ai-suggestions', async (req, reply) => {
    const r = await tenant(req, reply, tx => tx.query(`SELECT id, student_user_id AS "studentUserId", body, source, status, created_at AS "createdAt" FROM ai_suggestions ORDER BY created_at DESC LIMIT 200`));
    if (r) return { suggestions: r.rows };
  });
  app.post('/i/:inst/ai-suggestions/:id/review', async (req, reply) => {
    const id = uuid.parse((req.params as { id: string }).id);
    const b = z.object({ decision: z.enum(['accepted', 'rejected']) }).parse(req.body);
    const r = await tenant(req, reply, (tx, u) => tx.query(`UPDATE ai_suggestions SET status = $2, reviewed_by = $3, reviewed_at = now() WHERE id = $1 AND status = 'pending' RETURNING id`, [id, b.decision, u]));
    if (r) return r.rows.length ? { ok: true } : reply.code(404).send({ error: 'not_found_or_already_reviewed' });
  });

  // ---- live halaqah join: unguessable Jitsi room per session, NOT recorded by us; minors need a verified guardian ----
  app.post('/i/:inst/sessions/:sid/join', async (req, reply) => {
    const sid = uuid.parse((req.params as { sid: string }).sid);
    const r = await tenant(req, reply, async (tx, u) => {
      const s = (await tx.query<{ room_token: string; starts_at: string; ends_at: string }>(`SELECT room_token, starts_at, ends_at FROM halaqah_sessions WHERE id = $1`, [sid])).rows[0];
      if (!s) return { code: 404, error: 'not_found' };
      const now = Date.now();
      if (now < Date.parse(s.starts_at) - 15 * 60_000 || now > Date.parse(s.ends_at) + 15 * 60_000) return { code: 409, error: 'session_not_open' };
      const mem = (await tx.query<{ minor: boolean; guard: boolean }>(`SELECT app.is_minor($1) AS minor, app.has_verified_guardian($1) AS guard`, [u])).rows[0]!;
      const isStudent = (await tx.query(`SELECT 1 FROM halaqah_members m JOIN halaqah_sessions x ON x.halaqah_id = m.halaqah_id WHERE x.id = $1 AND m.student_user_id = $2`, [sid, u])).rows.length > 0;
      if (isStudent && mem.minor && !mem.guard) return { code: 409, error: 'guardian_required' };
      return { code: 200, url: 'https://meet.jit.si/tartil-' + s.room_token };
    });
    if (!r) return;
    if (r.code !== 200) return reply.code(r.code).send({ error: r.error });
    return { url: r.url, recorded: false, note: 'External video room (Jitsi). The platform does not record it. A qari must be present; no private adult-child sessions.' };
  });

  // ---- people & upcoming sessions (what the caller may see is decided by RLS, not here) ----
  app.get('/i/:inst/people', async (req, reply) => {
    // Members (admin sees all, others only themselves) plus the people the caller is allowed to see through assignments/links. RLS filters every branch.
    const r = await tenant(req, reply, tx => tx.query(`SELECT x.user_id AS "userId", x.role, coalesce(u.display_name, '—') AS "displayName" FROM (
        SELECT user_id, role::text AS role FROM memberships WHERE status = 'active'
        UNION SELECT user_id, 'student' FROM student_profiles
        UNION SELECT qari_user_id, 'qari' FROM qari_assignments WHERE active
        UNION SELECT guardian_user_id, 'guardian' FROM guardian_links WHERE revoked_at IS NULL) x
      LEFT JOIN users u ON u.id = x.user_id ORDER BY x.role, u.display_name`));
    if (r) return { people: r.rows };
  });
  // ---- institution administration: roster, suspension, headline numbers, audit trail ----
  app.get('/i/:inst/roster', async (req, reply) => {
    const r = await tenant(req, reply, async (tx, u, inst) => {
      if (!(await tx.query(`SELECT 1 FROM memberships WHERE institution_id = $1 AND user_id = $2 AND role = 'tenant_admin' AND status = 'active'`, [inst, u])).rows.length) return null;
      return tx.query<{ id: string; userId: string; role: string; status: string; createdAt: string }>(`SELECT m.id, m.user_id AS "userId", m.role, m.status, m.created_at AS "createdAt"
        FROM memberships m WHERE m.institution_id = $1 ORDER BY m.role, m.created_at`, [inst]);
    });
    if (r === undefined) return;
    if (r === null) return reply.code(403).send({ error: 'admin_only' });
    // display names come through the service path: RLS hides users whose membership is suspended, and an admin still has to see who they suspended
    const names = new Map((await d.service.query<{ id: string; display_name: string }>(`SELECT id, display_name FROM users WHERE id = ANY($1::uuid[])`, [[...new Set(r.rows.map(x => x.userId))]])).rows.map(x => [x.id, x.display_name]));
    return { members: r.rows.map(x => ({ ...x, displayName: names.get(x.userId) ?? '—' })) };
  });
  app.post('/i/:inst/members/:mid/status', async (req, reply) => {
    const mid = uuid.parse((req.params as { mid: string }).mid);
    const b = z.object({ status: z.enum(['active', 'suspended']) }).parse(req.body);
    const r = await tenant(req, reply, async (tx, u, inst) => {
      if (!(await tx.query(`SELECT 1 FROM memberships WHERE institution_id = $1 AND user_id = $2 AND role = 'tenant_admin' AND status = 'active'`, [inst, u])).rows.length) return 'admin_only';
      const m = (await tx.query<{ user_id: string; role: string; status: string }>(`SELECT user_id, role, status FROM memberships WHERE id = $1 AND institution_id = $2`, [mid, inst])).rows[0];
      if (!m) return 'not_found';
      if (b.status === 'suspended' && m.role === 'tenant_admin') {
        if (m.user_id === u) return 'cannot_suspend_self';
        const others = (await tx.query<{ n: string }>(`SELECT count(*)::text AS n FROM memberships WHERE institution_id = $1 AND role = 'tenant_admin' AND status = 'active' AND id <> $2`, [inst, mid])).rows[0]!.n;
        if (Number(others) < 1) return 'last_admin';
      }
      await tx.query(`UPDATE memberships SET status = $1 WHERE id = $2 AND institution_id = $3`, [b.status, mid, inst]);
      return 'ok';
    });
    if (r === undefined) return;
    if (r === 'ok') return { ok: true };
    return reply.code(r === 'admin_only' ? 403 : r === 'not_found' ? 404 : 409).send({ error: r });
  });
  app.get('/i/:inst/overview-stats', async (req, reply) => {
    const r = await tenant(req, reply, async (tx, u, inst) => {
      if (!(await tx.query(`SELECT 1 FROM memberships WHERE institution_id = $1 AND user_id = $2 AND role = 'tenant_admin' AND status = 'active'`, [inst, u])).rows.length) return null;
      const c = async (sql: string) => Number((await tx.query<{ n: string }>(sql, [inst])).rows[0]!.n);
      return {
        students: await c(`SELECT count(*)::text AS n FROM student_profiles WHERE institution_id = $1`),
        qaris: await c(`SELECT count(*)::text AS n FROM memberships WHERE institution_id = $1 AND role = 'qari' AND status = 'active'`),
        suspended: await c(`SELECT count(*)::text AS n FROM memberships WHERE institution_id = $1 AND status = 'suspended'`),
        halaqat: await c(`SELECT count(*)::text AS n FROM halaqat WHERE institution_id = $1`),
        tracksPublished: await c(`SELECT count(*)::text AS n FROM learning_tracks WHERE institution_id = $1 AND status = 'published'`),
        tracksDraft: await c(`SELECT count(*)::text AS n FROM learning_tracks WHERE institution_id = $1 AND status = 'draft'`),
        submissionsOpen: await c(`SELECT count(*)::text AS n FROM recitation_submissions WHERE institution_id = $1 AND state IN ('submitted','under_review','reassessment_requested')`),
        assessments: await c(`SELECT count(*)::text AS n FROM assessments WHERE institution_id = $1`),
        certificates: await c(`SELECT count(*)::text AS n FROM certificates WHERE institution_id = $1`),
      };
    });
    if (r === undefined) return;
    if (r === null) return reply.code(403).send({ error: 'admin_only' });
    return r;
  });
  app.get('/i/:inst/audit-trail', async (req, reply) => {
    const r = await tenant(req, reply, async (tx, u, inst) => {
      if (!(await tx.query(`SELECT 1 FROM memberships WHERE institution_id = $1 AND user_id = $2 AND role IN ('tenant_admin','safeguarding_officer') AND status = 'active'`, [inst, u])).rows.length) return null;
      return tx.query(`SELECT id, actor_user_id AS "actorUserId", action, object_type AS "objectType", created_at AS "createdAt" FROM audit_logs WHERE institution_id = $1 ORDER BY id DESC LIMIT 100`, [inst]);
    });
    if (r === undefined) return;
    if (r === null) return reply.code(403).send({ error: 'admin_only' });
    return { entries: r.rows };
  });
  app.get('/i/:inst/sessions-upcoming', async (req, reply) => {
    const r = await tenant(req, reply, tx => tx.query(`SELECT s.id, s.halaqah_id AS "halaqahId", h.name AS "halaqah", s.starts_at AS "startsAt", s.ends_at AS "endsAt", s.topic FROM halaqah_sessions s JOIN halaqat h ON h.id = s.halaqah_id WHERE s.ends_at > now() - interval '15 minutes' ORDER BY s.starts_at LIMIT 20`));
    if (r) return { sessions: r.rows };
  });

  // ---- halaqat / sessions / attendance ----
  app.post('/i/:inst/halaqat', async (req, reply) => {
    const b = z.object({ name: z.string().min(2).max(200), qariUserId: uuid }).parse(req.body);
    const r = await tenant(req, reply, (tx, _u, inst) => tx.query(`INSERT INTO halaqat (institution_id, name, qari_user_id) VALUES ($1,$2,$3) RETURNING id`, [inst, b.name, b.qariUserId]));
    if (r) return reply.code(201).send({ id: (r.rows[0] as { id: string }).id });
  });
  app.get('/i/:inst/halaqat', async (req, reply) => {
    const r = await tenant(req, reply, tx => tx.query(`SELECT id, name, qari_user_id AS "qariUserId", status FROM halaqat ORDER BY created_at`));
    if (r) return { halaqat: r.rows };
  });
  app.post('/i/:inst/halaqat/:hid/members', async (req, reply) => {
    const hid = uuid.parse((req.params as { hid: string }).hid);
    const b = z.object({ studentUserId: uuid }).parse(req.body);
    const r = await tenant(req, reply, (tx, _u, inst) => tx.query(`INSERT INTO halaqah_members (institution_id, halaqah_id, student_user_id) VALUES ($1,$2,$3) RETURNING id`, [inst, hid, b.studentUserId]));
    if (r) return reply.code(201).send({ id: (r.rows[0] as { id: string }).id });
  });
  app.get('/i/:inst/halaqat/:hid/members', async (req, reply) => {
    const hid = uuid.parse((req.params as { hid: string }).hid);
    const r = await tenant(req, reply, tx => tx.query(`SELECT student_user_id AS "studentUserId" FROM halaqah_members WHERE halaqah_id = $1`, [hid]));
    if (r) return { members: r.rows };
  });
  app.post('/i/:inst/halaqat/:hid/sessions', async (req, reply) => {
    const hid = uuid.parse((req.params as { hid: string }).hid);
    const b = z.object({ startsAt: z.string().datetime(), endsAt: z.string().datetime(), topic: z.string().max(300).optional() }).parse(req.body);
    const r = await tenant(req, reply, (tx, _u, inst) => tx.query(`INSERT INTO halaqah_sessions (institution_id, halaqah_id, starts_at, ends_at, topic) VALUES ($1,$2,$3,$4,$5) RETURNING id`, [inst, hid, b.startsAt, b.endsAt, b.topic ?? null]));
    if (r) return reply.code(201).send({ id: (r.rows[0] as { id: string }).id });
  });
  app.get('/i/:inst/halaqat/:hid/sessions', async (req, reply) => {
    const hid = uuid.parse((req.params as { hid: string }).hid);
    const r = await tenant(req, reply, tx => tx.query(`SELECT id, starts_at AS "startsAt", ends_at AS "endsAt", topic FROM halaqah_sessions WHERE halaqah_id = $1 ORDER BY starts_at DESC`, [hid]));
    if (r) return { sessions: r.rows };
  });
  app.post('/i/:inst/sessions/:sid/attendance', async (req, reply) => {
    const sid = uuid.parse((req.params as { sid: string }).sid);
    const b = z.object({ studentUserId: uuid, status: z.enum(['present', 'absent', 'late', 'excused']) }).parse(req.body);
    const r = await tenant(req, reply, (tx, u, inst) => tx.query(
      `INSERT INTO attendance (institution_id, session_id, halaqah_id, student_user_id, status, marked_by)
       SELECT $1, s.id, s.halaqah_id, $3, $4, $5 FROM halaqah_sessions s WHERE s.id = $2
       ON CONFLICT (session_id, student_user_id) DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by, marked_at = now() RETURNING id`, [inst, sid, b.studentUserId, b.status, u]));
    if (r) return r.rows.length ? reply.code(201).send({ id: (r.rows[0] as { id: string }).id }) : reply.code(404).send({ error: 'not_found' });
  });
  app.get('/i/:inst/sessions/:sid/attendance', async (req, reply) => {
    const sid = uuid.parse((req.params as { sid: string }).sid);
    const r = await tenant(req, reply, tx => tx.query(`SELECT student_user_id AS "studentUserId", status, marked_at AS "markedAt" FROM attendance WHERE session_id = $1`, [sid]));
    if (r) return { attendance: r.rows };
  });

  // ---- human qari assessments (append-only; observation levels 1-4; not a ruling or ijazah) ----
  app.post('/i/:inst/assessments', async (req, reply) => {
    const lvl = z.number().int().min(1).max(4).optional();
    const b = z.object({ studentUserId: uuid, submissionId: uuid.optional(), surah: z.number().int().min(1).max(114), ayahStart: z.number().int().min(1), ayahEnd: z.number().int().min(1),
      makharij: lvl, sifat: lvl, ahkamTajweed: lvl, fluency: lvl, memorisation: lvl, note: z.string().max(4000).optional() })
      .refine(v => [v.makharij, v.sifat, v.ahkamTajweed, v.fluency, v.memorisation].some(x => x !== undefined), 'at least one dimension is required').parse(req.body);
    const r = await tenant(req, reply, (tx, u, inst) => tx.query(
      `INSERT INTO assessments (institution_id, student_user_id, assessor_user_id, submission_id, surah, ayah_start, ayah_end, makharij, sifat, ahkam_tajweed, fluency, memorisation, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [inst, b.studentUserId, u, b.submissionId ?? null, b.surah, b.ayahStart, b.ayahEnd, b.makharij ?? null, b.sifat ?? null, b.ahkamTajweed ?? null, b.fluency ?? null, b.memorisation ?? null, b.note ?? null]));
    if (r) return reply.code(201).send({ id: (r.rows[0] as { id: string }).id });
  });
  app.get('/i/:inst/assessments', async (req, reply) => {
    const r = await tenant(req, reply, tx => tx.query(`SELECT id, student_user_id AS "studentUserId", assessor_user_id AS "assessorUserId", surah, ayah_start AS "ayahStart", ayah_end AS "ayahEnd", makharij, sifat, ahkam_tajweed AS "ahkamTajweed", fluency, memorisation, note, created_at AS "createdAt" FROM assessments ORDER BY created_at DESC`));
    if (r) return { assessments: r.rows };
  });

  // ---- Quran Core read API: nothing is served until a human has APPROVED an edition (enforced by RLS, not by this code) ----
  app.get('/quran/reference', async () => {
    const r = await withContext(d.app, {}, tx => tx.query(`SELECT surah, ayah_count AS "ayahCount" FROM quran_reference_counts ORDER BY surah`));
    return { surahs: r.rows };
  });
  app.get('/quran/editions', async () => {
    const r = await withContext(d.app, {}, tx => tx.query(`SELECT code, name, riwayah, script_style AS "scriptStyle", provider, provider_version AS "providerVersion", attribution_text AS "attribution" FROM quran_editions ORDER BY code`));
    return { editions: r.rows };
  });
  app.get('/quran/:edition/:surah', async (req, reply) => {
    const p = z.object({ edition: z.string().min(3).max(64), surah: z.coerce.number().int().min(1).max(114) }).parse(req.params);
    const r = await withContext(d.app, {}, async tx => {
      const ed = await tx.query<{ attribution: string; riwayah: string }>(`SELECT attribution_text AS attribution, riwayah FROM quran_editions WHERE code = $1`, [p.edition]);
      if (!ed.rows.length) return null;
      const a = await tx.query(`SELECT ayah, text_raw AS text FROM quran_ayahs WHERE edition_code = $1 AND surah = $2 ORDER BY ayah`, [p.edition, p.surah]);
      const ayat = (a.rows as { ayah: number; text: string }[]).map(x => ({ ayah: x.ayah, text: x.ayah === 1 ? stripBasmalaPrefix(x.text, p.surah) : x.text }));
      return { edition: p.edition, riwayah: ed.rows[0]!.riwayah, attribution: ed.rows[0]!.attribution, surah: p.surah, ayat, note: 'Stored text is verbatim; the basmala prefix some sources put before ayah 1 is removed for display only.' };
    });
    return r ?? reply.code(404).send({ error: 'edition_not_available' });
  });
  if (d.webIndexPath) {
    const html = readFileSync(d.webIndexPath, 'utf8');
    app.get('/', async (_req, reply) => reply.header('content-type', 'text/html; charset=utf-8').header('x-content-type-options', 'nosniff').header('referrer-policy', 'no-referrer')
      .header('content-security-policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none'").send(html));
  }
  // ---- translations of the meanings: separate from the Quran text, approved editions only (RLS), always with attribution ----
  app.get('/translations/editions', async () => {
    const r = await withContext(d.app, {}, tx => tx.query(`SELECT code, name, language, translator, provider, provider_version AS "providerVersion", licence_name AS "licenceName", licence_ref AS "licenceRef", attribution_text AS "attribution" FROM translation_editions ORDER BY language, code`));
    return { editions: r.rows };
  });
  app.get('/translations/:edition/:surah', async (req, reply) => {
    const p = z.object({ edition: z.string().min(3).max(64), surah: z.coerce.number().int().min(1).max(114) }).parse(req.params);
    const r = await withContext(d.app, {}, async tx => {
      const ed = await tx.query<{ attribution: string; language: string; translator: string }>(`SELECT attribution_text AS attribution, language, translator FROM translation_editions WHERE code = $1`, [p.edition]);
      if (!ed.rows.length) return null;
      const a = await tx.query<{ ayah: number; text: string }>(`SELECT ayah, text_raw AS text FROM translation_ayahs WHERE edition_code = $1 AND surah = $2 ORDER BY ayah`, [p.edition, p.surah]);
      return { edition: p.edition, language: ed.rows[0]!.language, translator: ed.rows[0]!.translator, attribution: ed.rows[0]!.attribution, surah: p.surah, ayat: a.rows, note: 'A human translation of the meanings. It is not the Quran and not a ruling; the Arabic text alone is the Quran.' };
    });
    return r ?? reply.code(404).send({ error: 'edition_not_available' });
  });
  // ---- whole-Quran search: Arabic (diacritics/alef/ya/ta-marbuta insensitive) or English (translation); read-only over approved editions (RLS) ----
  const NORM_SQL = `regexp_replace(regexp_replace(regexp_replace(regexp_replace(text_raw, '[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]', '', 'g'), '[\u0622\u0623\u0625\u0671]', '\u0627', 'g'), '\u0649', '\u064A', 'g'), '\u0629', '\u0647', 'g')`;
  const normAr = (t: string) => t.normalize('NFC').replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '').replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627').replace(/\u0649/g, '\u064A').replace(/\u0629/g, '\u0647').replace(/\s+/g, ' ').trim();
  app.get('/search', async (req, reply) => {
    const q = z.object({ q: z.string().trim().min(2).max(60), lang: z.enum(['ar', 'en']).default('ar') }).parse(req.query);
    const r = await withContext(d.app, {}, async tx => {
      if (q.lang === 'ar') {
        const ed = (await tx.query<{ code: string }>(`SELECT code FROM quran_editions ORDER BY code LIMIT 1`)).rows[0];
        if (!ed) return null;
        const needle = normAr(q.q);
        if (needle.length < 2) return { total: 0, results: [] };
        const rows = (await tx.query<{ surah: number; ayah: number; text: string }>(`SELECT surah, ayah, text_raw AS text FROM quran_ayahs WHERE edition_code = $1 AND strpos(${NORM_SQL}, $2) > 0 ORDER BY surah, ayah`, [ed.code, needle])).rows;
        return { edition: ed.code, total: rows.length, results: rows.slice(0, 50).map(x => ({ surah: x.surah, ayah: x.ayah, text: x.ayah === 1 ? stripBasmalaPrefix(x.text, x.surah) : x.text })) };
      }
      const ed = (await tx.query<{ code: string; attribution: string }>(`SELECT code, attribution_text AS attribution FROM translation_editions WHERE language = 'en' ORDER BY code LIMIT 1`)).rows[0];
      if (!ed) return null;
      const like = '%' + q.q.replace(/[\\%_]/g, m => '\\' + m) + '%';
      const rows = (await tx.query<{ surah: number; ayah: number; text: string }>(`SELECT surah, ayah, text_raw AS text FROM translation_ayahs WHERE edition_code = $1 AND text_raw ILIKE $2 ORDER BY surah, ayah`, [ed.code, like])).rows;
      return { edition: ed.code, attribution: ed.attribution, total: rows.length, results: rows.slice(0, 50) };
    });
    return r ?? reply.code(404).send({ error: 'edition_not_available' });
  });
  app.get('/health', async () => ({ ok: true }));
  return app;
}
