import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { applyMigrations } from '@tartil/database';
import { buildApp } from '../src/app.ts';

let app: ReturnType<typeof buildApp>; let db: PGlite;
const PW = 'correct-horse-battery';
const call = async (method: 'GET' | 'POST' | 'DELETE', url: string, token?: string, payload?: unknown) => {
  const r = await app.inject({ method, url, payload: payload as never, headers: token ? { authorization: `Bearer ${token}` } : {} });
  return { status: r.statusCode, body: r.body ? JSON.parse(r.body) : {} };
};
const user = async (name: string) => {
  const email = `${name}@example.test`;
  const id = (await call('POST', '/auth/register', undefined, { displayName: name, email, password: PW, adultConfirmed: true })).body.id as string;
  return { id, email, token: (await call('POST', '/auth/login', undefined, { email, password: PW, adultConfirmed: true })).body.token as string };
};
before(async () => { db = new PGlite(); await applyMigrations(db as never); app = buildApp({ service: db as never, app: db as never, jwtSecret: 'test-secret-0123456789', rateLimit: { auth: 100000, general: 100000 } }); });

test('homework journey: teacher assigns -> child views/starts/submits (audio w/ guardian consent) -> teacher approves -> progress; isolation holds', async () => {
  const admin = await user('w-admin'), qari = await user('w-qari'), qari2 = await user('w-qari2'), kid = await user('w-kid'), kid2 = await user('w-kid2'), parent = await user('w-parent'), parent2 = await user('w-parent2'), outsider = await user('w-out');
  const inst = (await call('POST', '/institutions', admin.token, { name: 'Dar W', slug: 'dar-w' })).body.id as string;
  const other = (await call('POST', '/institutions', outsider.token, { name: 'Dar X', slug: 'dar-x' })).body.id as string;
  const b = `/i/${inst}`;
  for (const [u, role] of [[qari, 'qari'], [qari2, 'qari'], [kid, 'student'], [kid2, 'student'], [parent, 'guardian'], [parent2, 'guardian']] as const) await call('POST', `${b}/members`, admin.token, { email: u.email, role });
  for (const k of [kid, kid2]) await call('POST', `${b}/students`, admin.token, { userId: k.id, isMinor: true });
  for (const [p, k] of [[parent, kid], [parent2, kid2]] as const) {
    const l = (await call('POST', `${b}/guardian-links`, admin.token, { guardianUserId: p.id, studentUserId: k.id, relationship: 'parent' })).body.id;
    await call('POST', `${b}/guardian-links/${l}/verify`, admin.token);
  }
  const h = (await call('POST', `${b}/halaqat`, admin.token, { name: 'حلقة الواجبات', qariUserId: qari.id })).body.id as string;
  await call('POST', `${b}/halaqat/${h}/members`, admin.token, { studentUserId: kid.id });
  await call('POST', `${b}/halaqat/${h}/members`, admin.token, { studentUserId: kid2.id });

  // --- who may assign ---
  const hw = { kind: 'memorization', title: 'احفظ الفاتحة', surah: 1, fromAyah: 1, toAyah: 7, repeatCount: 5, submissionMode: 'audio', halaqahId: h };
  assert.equal((await call('POST', `${b}/homework`, kid.token, hw)).status, 403);        // students cannot assign
  assert.equal((await call('POST', `${b}/homework`, parent.token, hw)).status, 403);     // guardians cannot assign
  assert.equal((await call('POST', `${b}/homework`, qari.token, { ...hw, toAyah: 99 })).status, 400);  // beyond the surah
  assert.equal((await call('POST', `${b}/homework`, qari.token, { kind: 'memorization', title: 'no passage', halaqahId: h })).status, 400);
  assert.equal((await call('POST', `${b}/homework`, qari.token, { ...hw, halaqahId: undefined })).status, 400); // no recipients
  const made = await call('POST', `${b}/homework`, qari.token, hw);
  assert.equal(made.status, 201); assert.equal(made.body.recipients, 2);
  // another qari (not this halaqah's, not assigned) cannot assign to these students
  assert.equal((await call('POST', `${b}/homework`, qari2.token, { ...hw, halaqahId: undefined, studentUserIds: [kid.id] })).status, 403);

  // --- visibility ---
  const mine = (await call('GET', `${b}/homework/mine`, kid.token)).body.homework as { id: string; status: string; studentUserId: string }[];
  assert.equal(mine.length, 1); assert.equal(mine[0]!.status, 'assigned'); assert.equal(mine[0]!.studentUserId, kid.id);
  const rid = mine[0]!.id;
  assert.equal((await call('GET', `${b}/homework/${rid}`, kid2.token)).status, 404);         // a classmate cannot read it
  assert.equal((await call('GET', `${b}/homework/${rid}`, parent2.token)).status, 404);      // another child's guardian cannot
  assert.equal((await call('GET', `${b}/homework/${rid}`, outsider.token)).status, 404);     // outsider: nothing visible, nothing leaked
  assert.equal((await call('GET', `${b}/homework/${rid}`, qari2.token)).status, 404);        // unrelated teacher cannot
  assert.equal((await call('GET', `${b}/homework/${rid}`, parent.token)).status, 200);       // own child's guardian can
  assert.equal((await call('GET', `${b}/homework/mine?student=${kid.id}`, parent.token)).body.homework.length, 1);
  assert.equal((await call('GET', `${b}/homework/mine?student=${kid.id}`, parent2.token)).body.homework.length, 0);
  assert.equal((await call('GET', `/i/${other}/homework/mine`, kid.token)).body.homework.length, 0);   // another tenant: nothing

  // --- state machine ---
  assert.equal((await call('POST', `${b}/homework/${rid}/view`, kid.token)).status, 200);
  assert.equal((await call('GET', `${b}/homework/${rid}`, kid.token)).body.item.status, 'viewed');
  assert.equal((await call('POST', `${b}/homework/${rid}/start`, kid.token)).status, 200);
  // audio-mode homework cannot be marked done without a recording
  assert.equal((await call('POST', `${b}/homework/${rid}/submit`, kid.token, { kind: 'done' })).status, 400);
  assert.equal((await call('POST', `${b}/homework/${rid}/submit`, kid.token, { kind: 'audio' })).status, 400);
  // a student cannot approve their own work, nor skip the review
  assert.equal((await call('POST', `${b}/homework/${rid}/review`, kid.token, { decision: 'approved' })).status, 409);   // nothing awaiting review yet

  // minors' recording: blocked until the guardian grants consent (DB trigger), then the guardian-managed device may record for the child
  const rec = { editionCode: 'ed-w', riwayah: 'hafs-an-asim', surah: 1, ayahStart: 1, ayahEnd: 7, audioObjectKey: 'w/test.webm' };
  assert.equal((await call('POST', `${b}/submissions`, kid.token, rec)).status, 409);
  assert.equal((await call('POST', `${b}/consents`, parent.token, { studentUserId: kid.id, purpose: 'audio_recording' })).status, 201);
  const sub = (await call('POST', `${b}/submissions`, kid.token, rec)).body.id as string; assert.ok(sub);
  assert.equal((await call('POST', `${b}/homework/${rid}/submit`, kid2.token, { kind: 'audio', recitationSubmissionId: sub })).status, 404); // not theirs
  const sres = await call('POST', `${b}/homework/${rid}/submit`, kid.token, { kind: 'audio', recitationSubmissionId: sub, note: 'قرأت خمس مرات' });
  assert.equal(sres.status, 201); assert.equal(sres.body.status, 'pending_review');
  assert.equal((await call('POST', `${b}/homework/${rid}/submit`, kid.token, { kind: 'audio', recitationSubmissionId: sub })).status, 409); // already awaiting review
  // the halaqah's qari (not individually assigned) can open the audio and sees it in the queue; others cannot
  assert.equal((await call('GET', `${b}/submissions`, qari.token)).body.submissions.length, 1);
  assert.equal((await call('GET', `${b}/submissions`, qari2.token)).body.submissions.length, 0);
  const q = (await call('GET', `${b}/homework/review-queue`, qari.token)).body.queue as { id: string }[];
  assert.equal(q.length, 1); assert.equal(q[0]!.id, rid);
  assert.equal((await call('GET', `${b}/homework/review-queue`, qari2.token)).body.queue.length, 0);
  assert.equal((await call('GET', `${b}/homework/review-queue`, kid.token)).body.queue.length, 0);

  assert.equal((await call('POST', `${b}/homework/${rid}/review`, kid.token, { decision: 'approved' })).status, 403);   // a student can never approve their own work (DB guard)
  // teacher: retry first (allowed), child resubmits, then approve
  assert.equal((await call('POST', `${b}/homework/${rid}/review`, qari2.token, { decision: 'approved' })).status, 404);
  assert.equal((await call('POST', `${b}/homework/${rid}/review`, qari.token, { decision: 'needs_retry', note: 'أعد الآية الثالثة' })).status, 200);
  const after = (await call('GET', `${b}/homework/${rid}`, parent.token)).body;
  assert.equal(after.item.status, 'needs_retry'); assert.equal(after.item.teacherNote, 'أعد الآية الثالثة'); assert.equal(after.reviews.length, 1);
  assert.equal((await call('POST', `${b}/homework/${rid}/start`, kid.token)).status, 200);
  assert.equal((await call('POST', `${b}/homework/${rid}/submit`, kid.token, { kind: 'audio', recitationSubmissionId: sub })).status, 201);
  // approving something that is not awaiting review is rejected by the guard
  assert.equal((await call('POST', `${b}/homework/${rid}/review`, qari.token, { decision: 'approved', note: 'أحسنت' })).status, 200);
  assert.equal((await call('POST', `${b}/homework/${rid}/review`, qari.token, { decision: 'approved' })).status, 409);
  assert.equal((await call('POST', `${b}/homework/${rid}/start`, kid.token)).status, 409);       // closed to the student
  assert.equal((await call('POST', `${b}/homework/${rid}/complete`, kid.token)).status, 409);    // student cannot complete an approved item
  assert.equal((await call('POST', `${b}/homework/${rid}/complete`, qari.token)).status, 200);

  // progress: counts only, labelled completion != mastery; classmate unaffected
  const pr = (await call('GET', `${b}/homework/progress/${kid.id}`, qari.token)).body;
  assert.deepEqual(pr.byStatus, [{ status: 'completed', n: 1 }]); assert.equal(pr.note, 'completion_is_not_mastery');
  const other2 = (await call('GET', `${b}/homework/mine`, kid2.token)).body.homework as { status: string }[];
  assert.equal(other2[0]!.status, 'assigned');
});

test('homework: mark-done mode, no-review shortcut, retry-disabled, requests, templates, batch, summary, overdue', async () => {
  const admin = await user('x-admin'), qari = await user('x-qari'), kid = await user('x-kid'), parent = await user('x-parent');
  const inst = (await call('POST', '/institutions', admin.token, { name: 'Dar Xx', slug: 'dar-xx' })).body.id as string;
  const b = `/i/${inst}`;
  for (const [u, role] of [[qari, 'qari'], [kid, 'student'], [parent, 'guardian']] as const) await call('POST', `${b}/members`, admin.token, { email: u.email, role });
  await call('POST', `${b}/students`, admin.token, { userId: kid.id, isMinor: true });
  const l = (await call('POST', `${b}/guardian-links`, admin.token, { guardianUserId: parent.id, studentUserId: kid.id, relationship: 'parent' })).body.id;
  await call('POST', `${b}/guardian-links/${l}/verify`, admin.token);
  await call('POST', `${b}/qari-assignments`, admin.token, { qariUserId: qari.id, studentUserId: kid.id });

  // no-review listening task: the student can finish it, nothing is graded
  const a1 = await call('POST', `${b}/homework`, qari.token, { kind: 'listening', title: 'استمع للفاتحة', requiresReview: false, studentUserIds: [kid.id] });
  assert.equal(a1.status, 201);
  const r1 = (await call('GET', `${b}/homework/mine`, kid.token)).body.homework[0].id as string;
  assert.equal((await call('POST', `${b}/homework/${r1}/submit`, parent.token, { kind: 'done' })).status, 201);   // guardian-managed completion for the child
  assert.equal((await call('GET', `${b}/homework/${r1}`, kid.token)).body.item.status, 'completed');

  // review-required task cannot be self-completed, retry can be disabled
  const a2 = (await call('POST', `${b}/homework`, qari.token, { kind: 'reading', title: 'اقرأ الحروف', allowRetry: false, dueAt: '2020-01-01T00:00:00Z', studentUserIds: [kid.id] })).body.id as string;
  const r2 = ((await call('GET', `${b}/homework/mine`, kid.token)).body.homework as { id: string; title: string; overdue: boolean }[]).find(x => x.title === 'اقرأ الحروف')!;
  assert.equal(r2.overdue, true);
  assert.equal((await call('POST', `${b}/homework/${r2.id}/request`, parent.token, { kind: 'extension', note: 'مرض' })).status, 201);
  assert.equal((await call('GET', `${b}/homework-requests`, qari.token)).body.requests.length, 1);
  assert.equal((await call('GET', `${b}/homework-requests`, kid.token)).body.requests.length, 0);
  assert.equal((await call('GET', `${b}/homework/summary`, qari.token)).body.overdue, 1);
  assert.equal((await call('POST', `${b}/homework/assignments/${a2}/extend`, qari.token, { dueAt: '2099-01-01T00:00:00Z' })).status, 200);
  assert.equal((await call('GET', `${b}/homework/summary`, qari.token)).body.overdue, 0);
  assert.equal((await call('POST', `${b}/homework/${r2.id}/submit`, kid.token, { kind: 'done' })).body.status, 'pending_review');
  assert.equal((await call('POST', `${b}/homework/${r2.id}/review`, qari.token, { decision: 'needs_retry' })).status, 409); // retry disabled
  assert.equal((await call('POST', `${b}/homework/assignments/${a2}/approve-pending`, kid.token)).body.approved ?? 0, 0);   // a student's batch approves nothing
  assert.equal((await call('GET', `${b}/homework/${r2.id}`, kid.token)).body.item.status, 'pending_review');
  assert.equal((await call('POST', `${b}/homework/assignments/${a2}/approve-pending`, qari.token)).body.approved, 1);
  assert.equal((await call('GET', `${b}/homework/${r2.id}`, kid.token)).body.item.status, 'approved');

  // templates are private to their owner
  assert.equal((await call('POST', `${b}/homework-templates`, qari.token, { name: 'مراجعة يومية', payload: { kind: 'revision', surah: 1, fromAyah: 1, toAyah: 7, repeatCount: 3, estMinutes: 10, submissionMode: 'mark_done', requiresReview: true, allowRetry: true } })).status, 201);
  assert.equal((await call('GET', `${b}/homework-templates`, qari.token)).body.templates.length, 1);
  assert.equal((await call('GET', `${b}/homework-templates`, admin.token)).body.templates.length, 0);
  assert.equal((await call('POST', `${b}/homework-templates`, kid.token, { name: 'xx', payload: { kind: 'revision', surah: 1, fromAyah: 1, toAyah: 7 } })).status, 403);
});
