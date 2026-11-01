import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { z } from 'zod';
import { withContext, type Executor, type TransactionalDb, type TxLike } from '@tartil/database';
import { hashPassword, verifyPassword, signToken, verifyToken } from './auth.ts';

/** `service` = privileged owner/service connection (registration, login, bootstrap, email lookup only).
 *  `app` = connection used ONLY through withContext() as the unprivileged app_user role. */
export interface Deps { service: Executor & Pick<TransactionalDb, 'transaction'>; app: TransactionalDb; jwtSecret: string }
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
  app.get('/health', async () => ({ ok: true }));
  return app;
}
