import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { TxLike } from '@tartil/database';

// TARTIL 14.1 item 16: server-side Academy progress (migration 0019). Ids and small structured facts only: no grade, no ranking, no free text.
// The learner's private notebook is NOT here and is never uploaded. Visibility for anyone else = an explicit, revocable share (RLS decides, not this code).
export interface AcademyProgressCtx {
  service: { query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> };
  personal: <T>(req: FastifyRequest, reply: FastifyReply, fn: (tx: TxLike, userId: string) => Promise<T>) => Promise<T | undefined>;
  tenant: <T>(req: FastifyRequest, reply: FastifyReply, fn: (tx: TxLike, userId: string, inst: string) => Promise<T>) => Promise<T | undefined>;
}
const ref = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/);
const payloadSchema = z.record(z.string().regex(/^[a-z][A-Za-z0-9_]{0,31}$/), z.union([z.number().finite(), z.boolean(), ref, z.array(z.union([z.number().finite(), ref])).max(30)]))
  .refine(p => JSON.stringify(p).length <= 4096, 'payload_too_large');
const item = z.object({ kind: z.enum(['lesson', 'scenario', 'session', 'activity']), ref, programId: ref, status: z.enum(['started', 'completed']), payload: payloadSchema.default({}) }).strict();
const putBody = z.object({ items: z.array(item).min(1).max(100) }).strict();
const uuid = z.string().uuid();

interface Row { kind: string; ref: string; programId: string; status: string; payload: Record<string, unknown>; updatedAt: string }
const COLS = `kind, ref, program_id AS "programId", status, payload, updated_at AS "updatedAt"`;

/** Descriptive counts only. Nothing here is a score, rank or judgement; completing an activity is a record of activity, not of a trait. */
export function summarize(rows: Row[], teacherNextStep: Record<string, string>) {
  const byProgram = new Map<string, { sessionsCompleted: number; sessionsStarted: number; lessonsCompleted: number; scenariosCompleted: number; activitiesCompleted: number; assessmentsSubmitted: number; comps: Set<string>; inProgress: string[] }>();
  for (const r of rows) {
    const p = byProgram.get(r.programId) ?? { sessionsCompleted: 0, sessionsStarted: 0, lessonsCompleted: 0, scenariosCompleted: 0, activitiesCompleted: 0, assessmentsSubmitted: 0, comps: new Set<string>(), inProgress: [] };
    byProgram.set(r.programId, p);
    const done = r.status === 'completed';
    if (r.kind === 'session') { if (done) p.sessionsCompleted++; else p.sessionsStarted++; }
    if (r.kind === 'lesson' && done) p.lessonsCompleted++;
    if (r.kind === 'scenario' && done) p.scenariosCompleted++;
    if (r.kind === 'activity' && done) p.activitiesCompleted++;
    if (done && r.payload.assessment === true) p.assessmentsSubmitted++;
    if (Array.isArray(r.payload.competencies)) for (const c of r.payload.competencies) p.comps.add(String(c));
    if (!done) p.inProgress.push(`${r.kind}:${r.ref}`);
  }
  return [...byProgram.entries()].map(([programId, p]) => ({
    programId,
    sessionsAvailable: null as number | null,           // the curriculum lives in the client content; the server does not know how many exist
    sessionsCompleted: p.sessionsCompleted, sessionsStarted: p.sessionsStarted, lessonsCompleted: p.lessonsCompleted, scenariosCompleted: p.scenariosCompleted,
    activitiesCompleted: p.activitiesCompleted, competenciesPracticed: [...p.comps].sort(), assessmentsSubmitted: p.assessmentsSubmitted,
    inProgress: p.inProgress.sort(),
    nextRecommendedStep: teacherNextStep[programId] ?? null,   // only a human teacher's suggestion; the client may derive its own from content and must label it as such
  }));
}

export function registerAcademyProgress(app: FastifyInstance, c: AcademyProgressCtx) {
  const noStore = (reply: FastifyReply) => reply.header('cache-control', 'no-store');
  const feedbackFor = async (tx: TxLike, student: string) => {
    const fb = (await tx.query<{ id: string; programId: string; note: string | null; nextStepRef: string | null; createdAt: string }>(
      `SELECT id, program_id AS "programId", note, next_step_ref AS "nextStepRef", created_at AS "createdAt" FROM academy_teacher_feedback WHERE student_user_id = $1 ORDER BY created_at DESC LIMIT 200`, [student])).rows;
    const next: Record<string, string> = {};
    for (const f of fb) if (f.nextStepRef && !(f.programId in next)) next[f.programId] = f.nextStepRef;   // newest first
    return { fb, next };
  };

  app.get('/me/academy/progress', async (req, reply) => {
    const r = await c.personal(req, reply, async (tx, u) => {
      const items = (await tx.query<Row>(`SELECT ${COLS} FROM academy_progress WHERE user_id = $1 ORDER BY program_id, kind, ref`, [u])).rows;
      const { fb, next } = await feedbackFor(tx, u);
      const shares = (await tx.query(`SELECT viewer_user_id AS "viewerUserId", scope, granted_at AS "grantedAt" FROM academy_progress_share WHERE student_user_id = $1 AND revoked_at IS NULL ORDER BY granted_at`, [u])).rows;
      return { items, summary: summarize(items, next), teacherFeedback: fb, shares };
    });
    if (r) return noStore(reply).send({ ...r, note: 'Descriptive record of activity. No grades or ranking; completing an activity is not proof of a trait. Your private notebook is not stored here.' });
  });

  // The general per-IP limiter (onRequest hook in app.ts) covers this route like every other non-auth route; the body is bounded here (<=100 items x <=4KB).
  app.put('/me/academy/progress', { bodyLimit: 600 * 1024 }, async (req, reply) => {
    const b = putBody.parse(req.body);
    const n = await c.personal(req, reply, async (tx, u) => {
      for (const i of b.items) await tx.query(
        `INSERT INTO academy_progress (user_id, kind, ref, program_id, status, payload) VALUES ($1,$2,$3,$4,$5,$6::jsonb)
         ON CONFLICT (user_id, kind, ref) DO UPDATE SET program_id = EXCLUDED.program_id, status = EXCLUDED.status, payload = EXCLUDED.payload
         WHERE academy_progress.status <> 'completed' OR EXCLUDED.status = 'completed'`, [u, i.kind, i.ref, i.programId, i.status, JSON.stringify(i.payload)]);
      return b.items.length;
    });
    if (n !== undefined) return { ok: true, upserted: n };
  });

  // Right to erasure: removes every progress row and revokes every share. Feedback written by teachers is their own record and is not deleted here.
  app.delete('/me/academy/progress', async (req, reply) => {
    z.object({ confirm: z.literal('DELETE_ALL_MY_ACADEMY_PROGRESS') }).strict().parse(req.body);
    const r = await c.personal(req, reply, async (tx, u) => ({
      deleted: (await tx.query(`DELETE FROM academy_progress WHERE user_id = $1 RETURNING ref`, [u])).rows.length,
      sharesRevoked: (await tx.query(`UPDATE academy_progress_share SET revoked_at = now() WHERE student_user_id = $1 AND revoked_at IS NULL RETURNING id`, [u])).rows.length,
    }));
    if (r) return { ok: true, ...r, note: 'teacher_feedback_is_the_authors_record_and_is_not_deleted_here' };
  });

  app.post('/me/academy/progress/share', async (req, reply) => {
    const b = z.object({ viewerEmail: z.string().email().max(200), scope: z.enum(['progress', 'progress_feedback']).default('progress') }).strict().parse(req.body);
    const viewer = (await c.service.query<{ id: string }>(`SELECT id FROM users WHERE email = lower($1)`, [b.viewerEmail])).rows[0]?.id;
    const notEligible = () => reply.code(404).send({ error: 'viewer_not_eligible' });   // same answer for unknown email and ineligible user: no account enumeration
    if (!viewer) { if (await c.personal(req, reply, async () => true)) return notEligible(); return; }
    const r = await c.personal(req, reply, async (tx, u) => {
      if (!(await tx.query<{ ok: boolean }>(`SELECT app.academy_viewer_eligible($1, $2) AS ok`, [u, viewer])).rows[0]?.ok) return null;
      // idempotent: re-granting changes the scope of the active share instead of duplicating it
      const upd = await tx.query(`UPDATE academy_progress_share SET scope = $3 WHERE student_user_id = $1 AND viewer_user_id = $2 AND revoked_at IS NULL RETURNING id`, [u, viewer, b.scope]);
      if (upd.rows.length) return { viewerUserId: viewer };
      await tx.query(`INSERT INTO academy_progress_share (student_user_id, viewer_user_id, scope) VALUES ($1,$2,$3)`, [u, viewer, b.scope]);
      return { viewerUserId: viewer };
    });
    if (r === undefined) return;
    return r ? reply.code(201).send({ ok: true, ...r, scope: b.scope }) : notEligible();
  });
  const revoke = async (req: FastifyRequest, reply: FastifyReply, viewerId: string) => {
    const r = await c.personal(req, reply, (tx, u) => tx.query(`UPDATE academy_progress_share SET revoked_at = now() WHERE student_user_id = $1 AND viewer_user_id = $2 AND revoked_at IS NULL RETURNING id`, [u, viewerId]));
    if (r) return r.rows.length ? { ok: true } : reply.code(404).send({ error: 'no_active_share' });
  };
  app.delete('/me/academy/progress/share/:viewerId', async (req, reply) => revoke(req, reply, uuid.parse((req.params as { viewerId: string }).viewerId)));
  app.delete('/me/academy/progress/share', async (req, reply) => revoke(req, reply, z.object({ viewerUserId: uuid }).strict().parse(req.body).viewerUserId));

  // Viewer side: only with the student's active share (RLS) AND membership in this institution. Everything else answers 404 (no existence leak).
  app.get('/i/:inst/academy/students/:id/progress', async (req, reply) => {
    const sid = uuid.parse((req.params as { id: string }).id);
    const r = await c.tenant(req, reply, async (tx, _u, inst) => {
      const ok = (await tx.query<{ ok: boolean; scope: string | null }>(`SELECT app.academy_student_in($1, $2) AS ok, app.academy_share_scope($1) AS scope`, [sid, inst])).rows[0];
      if (!ok?.ok || !ok.scope) return null;
      const items = (await tx.query<Row>(`SELECT ${COLS} FROM academy_progress WHERE user_id = $1 ORDER BY program_id, kind, ref`, [sid])).rows;
      const { fb, next } = await feedbackFor(tx, sid);
      return { scope: ok.scope, items, summary: summarize(items, next), teacherFeedback: fb };
    });
    if (r === undefined) return;
    return r ? noStore(reply).send(r) : reply.code(404).send({ error: 'not_found' });
  });
  app.post('/i/:inst/academy/students/:id/feedback', async (req, reply) => {
    const sid = uuid.parse((req.params as { id: string }).id);
    const b = z.object({ programId: ref, note: z.string().trim().min(1).max(500).optional(), nextStepRef: ref.optional() }).strict().refine(x => x.note !== undefined || x.nextStepRef !== undefined, 'note_or_next_step_required').parse(req.body);
    const r = await c.tenant(req, reply, async (tx, u, inst) => {
      const ok = (await tx.query<{ ok: boolean; scope: string | null }>(`SELECT app.academy_student_in($1, $2) AS ok, app.academy_share_scope($1) AS scope`, [sid, inst])).rows[0];
      if (!ok?.ok || ok.scope !== 'progress_feedback') return null;
      await tx.query(`INSERT INTO academy_teacher_feedback (student_user_id, author_user_id, program_id, note, next_step_ref) VALUES ($1,$2,$3,$4,$5)`, [sid, u, b.programId, b.note ?? null, b.nextStepRef ?? null]);
      return true;
    });
    if (r === undefined) return;
    return r ? reply.code(201).send({ ok: true }) : reply.code(404).send({ error: 'not_found' });
  });
}
