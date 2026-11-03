import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { withContext, type TransactionalDb, type TxLike } from '@tartil/database';
import { verifyToken } from './auth.ts';

// Academy content publication lifecycle (migration 0020). Every rule (legal transitions, four distinct approvals, role checks, author exclusion, RLS)
// is enforced by the database; this file only authenticates, validates shape and maps DB refusals to stable error codes.
const kind = z.enum(['program', 'lesson', 'scenario', 'guide']);
const ref = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/);
const version = z.number().int().min(1).max(1000);
const STATUSES = ['draft', 'source_review', 'scholarly_review', 'pedagogical_review', 'child_safety_review', 'approved', 'published', 'needs_revision', 'archived'] as const;

const DB_ERRORS: [string, number][] = [
  ['publication_requires_four_approvals', 409], ['stage_approval_missing', 409], ['content_illegal_transition', 409], ['content_starts_as_draft', 409],
  ['content_not_in_this_review_stage', 409], ['one_review_type_per_reviewer', 409], ['author_cannot_review_own_content', 403], ['reviewer_lacks_role', 403],
  ['content_status_identity_immutable', 409], ['academy_content_is_archived_not_deleted', 403],
];
function mapAcademyError(e: unknown): { status: number; code: string } | null {
  const m = e instanceof Error ? e.message : String(e);
  for (const [code, status] of DB_ERRORS) if (m.includes(code)) return { status, code };
  if (m.includes('row-level security') || m.includes('permission denied')) return { status: 403, code: 'forbidden' };
  if (m.includes('duplicate key')) return { status: 409, code: 'already_exists' };
  return null;
}

const pub = `content_kind AS "kind", content_ref AS "ref", version, status, updated_at AS "updatedAt"`;
const full = `${pub}, cycle, created_by AS "createdBy", updated_by AS "updatedBy", created_at AS "createdAt"`;

export function registerAcademyContent(app: FastifyInstance, d: { app: TransactionalDb; jwtSecret: string }): void {
  const personal = async <T>(req: FastifyRequest, reply: FastifyReply, fn: (tx: TxLike, userId: string) => Promise<T>): Promise<T | undefined> => {
    const h = req.headers.authorization;
    const userId = h?.startsWith('Bearer ') ? verifyToken(h.slice(7), d.jwtSecret) : null;
    if (!userId) { reply.code(401).send({ error: 'unauthenticated' }); return undefined; }
    try { return await withContext(d.app, { userId }, tx => fn(tx, userId)); }
    catch (e) { const m = mapAcademyError(e); if (!m) throw e; reply.code(m.status).send({ error: m.code }); return undefined; }
  };

  const isReviewer = async (tx: TxLike) => (await tx.query<{ ok: boolean }>(`SELECT app.is_formation_reviewer() AS ok`)).rows[0]!.ok;

  // Public: published rows only (RLS also guarantees it; the WHERE is belt and braces). No author or reviewer identity is exposed.
  app.get('/academy/content/status', async req => {
    const q = z.object({ kind: kind.optional() }).parse(req.query);
    const rows = await withContext(d.app, {}, async tx => (await tx.query(`SELECT ${pub} FROM academy_content_status WHERE status = 'published' AND ($1::text IS NULL OR content_kind = $1) ORDER BY content_kind, content_ref, version LIMIT 2000`, [q.kind ?? null])).rows);
    return { items: rows };
  });

  // Reviewers (holders of a formation reviewer role) only; everyone else gets 403 rather than a silently filtered list.
  app.get('/academy/content/status/all', async (req, reply) => {
    const q = z.object({ kind: kind.optional(), status: z.enum(STATUSES).optional() }).parse(req.query);
    const r = await personal(req, reply, async tx => {
      if (!(await isReviewer(tx))) return null;
      return (await tx.query(`SELECT ${full} FROM academy_content_status WHERE ($1::text IS NULL OR content_kind = $1) AND ($2::text IS NULL OR status = $2) ORDER BY content_kind, content_ref, version LIMIT 5000`, [q.kind ?? null, q.status ?? null])).rows;
    });
    if (r === undefined) return;
    return r === null ? reply.code(403).send({ error: 'forbidden' }) : { items: r };
  });

  // Move an item along the lifecycle. `to: 'draft'` on an item that does not exist yet registers version N as a new draft; otherwise the DB validates the move.
  app.post('/academy/content/:kind/:ref/transition', async (req, reply) => {
    const p = z.object({ kind, ref }).parse(req.params);
    const b = z.object({ version, to: z.enum(STATUSES) }).parse(req.body);
    const r = await personal(req, reply, async (tx, u) => {
      if (!(await isReviewer(tx))) return 'forbidden' as const;
      const ex = (await tx.query(`SELECT 1 FROM academy_content_status WHERE content_kind = $1 AND content_ref = $2 AND version = $3`, [p.kind, p.ref, b.version])).rows.length > 0;
      if (!ex) {
        if (b.to !== 'draft') return null;
        return (await tx.query(`INSERT INTO academy_content_status (content_kind, content_ref, version, created_by) VALUES ($1,$2,$3,$4) RETURNING ${pub}`, [p.kind, p.ref, b.version, u])).rows[0];
      }
      return (await tx.query(`UPDATE academy_content_status SET status = $4 WHERE content_kind = $1 AND content_ref = $2 AND version = $3 RETURNING ${pub}`, [p.kind, p.ref, b.version, b.to])).rows[0] ?? null;
    });
    if (r === undefined) return;
    if (r === 'forbidden') return reply.code(403).send({ error: 'forbidden' });
    return r ? { ok: true, item: r } : reply.code(404).send({ error: 'not_found' });
  });

  app.post('/academy/content/:kind/:ref/review', async (req, reply) => {
    const p = z.object({ kind, ref }).parse(req.params);
    const b = z.object({ version, reviewType: z.enum(['source', 'scholarly', 'pedagogical', 'child_safety']), decision: z.enum(['approved', 'needs_revision']), note: z.string().max(4000).optional() }).parse(req.body);
    if (b.decision === 'needs_revision' && !b.note?.trim()) return reply.code(400).send({ error: 'note_required' });
    const r = await personal(req, reply, async (tx, u) => {
      if (!(await isReviewer(tx))) return 'forbidden' as const;
      const ex = (await tx.query(`SELECT 1 FROM academy_content_status WHERE content_kind = $1 AND content_ref = $2 AND version = $3`, [p.kind, p.ref, b.version])).rows.length > 0;
      if (!ex) return null;
      await tx.query(`INSERT INTO academy_content_reviews (content_kind, content_ref, version, review_type, reviewer_user_id, decision, note) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [p.kind, p.ref, b.version, b.reviewType, u, b.decision, b.note?.trim() || null]);
      return (await tx.query(`SELECT ${pub} FROM academy_content_status WHERE content_kind = $1 AND content_ref = $2 AND version = $3`, [p.kind, p.ref, b.version])).rows[0];
    });
    if (r === undefined) return;
    if (r === 'forbidden') return reply.code(403).send({ error: 'forbidden' });
    return r ? reply.code(201).send({ ok: true, item: r }) : reply.code(404).send({ error: 'not_found' });
  });
}
