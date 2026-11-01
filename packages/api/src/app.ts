import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { withContext, type Executor, type TransactionalDb, type TxLike } from '@tartil/database';
import { hashPassword, verifyPassword, signToken, verifyToken } from './auth.ts';

/** `service` = privileged owner/service connection (registration, login, bootstrap, email lookup only).
 *  `app` = connection used ONLY through withContext() as the unprivileged app_user role. */
export interface Deps { service: Executor & Pick<TransactionalDb, 'transaction'>; app: TransactionalDb; jwtSecret: string; webIndexPath?: string }
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

export function buildApp(d: Deps) {
  const app = Fastify({ logger: false });
  app.setErrorHandler((err: unknown, _req, reply) => {
    if (err instanceof z.ZodError) return reply.code(400).send({ error: 'validation_failed', issues: err.issues.map(i => ({ path: i.path.join('.'), message: i.message })) });
    const { status, code } = mapError(err); // never leak SQL text
    return reply.code(status).send({ error: code });
  });

  const authUser = (req: FastifyRequest): string => {
    const h = req.headers.authorization;
    const sub = h?.startsWith('Bearer ') ? verifyToken(h.slice(7), d.jwtSecret) : null;
    if (!sub) throw Object.assign(new Error('unauthenticated'), { statusCode: 401 });
    return sub;
  };
  app.addHook('onError', async () => {});
  const tenant = async <T>(req: FastifyRequest, reply: FastifyReply, fn: (tx: TxLike, userId: string, inst: string) => Promise<T>) => {
    let userId: string;
    try { userId = authUser(req); } catch { reply.code(401).send({ error: 'unauthenticated' }); return undefined; }
    const inst = uuid.parse((req.params as { inst: string }).inst);
    return withContext(d.app, { userId, institutionId: inst }, tx => fn(tx, userId, inst));
  };

  app.post('/auth/register', async (req, reply) => {
    const b = z.object({ displayName: z.string().min(1).max(120), email: z.string().email().max(200), password: z.string().min(10).max(200) }).parse(req.body);
    const r = await d.service.query<{ id: string }>(`INSERT INTO users (display_name, email, password_hash) VALUES ($1, lower($2), $3) RETURNING id`, [b.displayName, b.email, await hashPassword(b.password)]);
    return reply.code(201).send({ id: r.rows[0]!.id });
  });
  app.post('/auth/login', async (req, reply) => {
    const b = z.object({ email: z.string().email(), password: z.string().max(200) }).parse(req.body);
    const u = (await d.service.query<{ id: string; password_hash: string | null }>(`SELECT id, password_hash FROM users WHERE email = lower($1)`, [b.email])).rows[0];
    if (!(await verifyPassword(b.password, u?.password_hash ?? null)) || !u) return reply.code(401).send({ error: 'invalid_credentials' });
    return { token: signToken(u.id, d.jwtSecret) };
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
  app.post('/i/:inst/submissions', async (req, reply) => {
    const b = z.object({ editionCode: z.string().min(3).max(64), riwayah: z.string().min(2).max(60), surah: z.number().int().min(1).max(114), ayahStart: z.number().int().min(1), ayahEnd: z.number().int().min(1), audioObjectKey: z.string().min(3).max(300).refine(k => !/^https?:/i.test(k), 'must be a private object key, not a URL') }).parse(req.body);
    const r = await tenant(req, reply, (tx, u, inst) => tx.query(`INSERT INTO recitation_submissions (institution_id, student_user_id, edition_code, riwayah, surah, ayah_start, ayah_end, audio_object_key) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`, [inst, u, b.editionCode, b.riwayah, b.surah, b.ayahStart, b.ayahEnd, b.audioObjectKey]));
    if (r) return reply.code(201).send({ id: (r.rows[0] as { id: string }).id });
  });
  app.get('/i/:inst/submissions', async (req, reply) => {
    const r = await tenant(req, reply, tx => tx.query(`SELECT id, student_user_id AS "studentUserId", surah, ayah_start AS "ayahStart", ayah_end AS "ayahEnd", state, created_at AS "createdAt" FROM recitation_submissions ORDER BY created_at DESC`));
    if (r) return { submissions: r.rows };
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
      return { edition: p.edition, riwayah: ed.rows[0]!.riwayah, attribution: ed.rows[0]!.attribution, surah: p.surah, ayat: a.rows };
    });
    return r ?? reply.code(404).send({ error: 'edition_not_available' });
  });
  if (d.webIndexPath) {
    const html = readFileSync(d.webIndexPath, 'utf8');
    app.get('/', async (_req, reply) => reply.header('content-type', 'text/html; charset=utf-8').header('x-content-type-options', 'nosniff').header('referrer-policy', 'no-referrer')
      .header('content-security-policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none'").send(html));
  }
  app.get('/health', async () => ({ ok: true }));
  return app;
}
