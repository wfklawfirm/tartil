import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { applyMigrations } from '@tartil/database';
import { buildApp, nextReview } from '../src/app.ts';

let app: ReturnType<typeof buildApp>; let db: PGlite;
const PW = 'correct-horse-battery';
const call = async (method: 'GET' | 'POST' | 'DELETE', url: string, token?: string, payload?: unknown) => {
  const r = await app.inject({ method, url, payload: payload as never, headers: token ? { authorization: `Bearer ${token}` } : {} });
  return { status: r.statusCode, body: r.body ? JSON.parse(r.body) : {} };
};
const user = async (name: string) => {
  const email = `${name}@example.test`;
  await call('POST', '/auth/register', undefined, { displayName: name, email, password: PW, adultConfirmed: true });
  return (await call('POST', '/auth/login', undefined, { email, password: PW })).body.token as string;
};
before(async () => {
  db = new PGlite(); await applyMigrations(db as never);
  for (const [s, n] of [[1, 7], [2, 286], [112, 4]]) await db.query(`INSERT INTO quran_reference_counts (surah, ayah_count) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [s, n]);
  app = buildApp({ service: db as never, app: db as never, jwtSecret: 'test-secret-0123456789', rateLimit: { auth: 100000, general: 100000 } });
});

test('scheduler: again resets, good grows, easy grows faster, hard is gentle, ease stays in bounds', () => {
  const s0 = { ease: 2.5, intervalDays: 0, reps: 0, lapses: 0 };
  assert.equal(nextReview(s0, 3).intervalDays, 1);
  const s1 = nextReview(s0, 3), s2 = nextReview(s1, 3);
  assert.equal(s2.intervalDays, 3);
  const s3 = nextReview(s2, 3); assert.equal(s3.intervalDays, 8);
  assert.ok(nextReview(s2, 4).intervalDays > s3.intervalDays);
  const lapse = nextReview(s3, 1); assert.equal(lapse.intervalDays, 0); assert.equal(lapse.reps, 0); assert.equal(lapse.lapses, 1); assert.equal(lapse.dueInMinutes, 10);
  let st = { ...s0 }; for (let i = 0; i < 30; i++) st = nextReview(st, 1); assert.equal(st.ease, 1.3);
  st = { ...s0 }; for (let i = 0; i < 30; i++) st = nextReview(st, 4); assert.equal(st.ease, 3.5);
  assert.ok(nextReview(s3, 2).intervalDays >= 1);
});

test('hifz: add, validate range, review schedules, due list, mastery, isolation between users, unauthenticated refused', async () => {
  const a = await user('hifza'), b = await user('hifzb');
  assert.equal((await call('GET', '/me/hifz')).status, 401);
  assert.equal((await call('POST', '/me/hifz', a, { surah: 112, fromAyah: 1, toAyah: 5 })).status, 422);   // beyond ayah count
  assert.equal((await call('POST', '/me/hifz', a, { surah: 112, fromAyah: 3, toAyah: 2 })).status, 400);
  const add = await call('POST', '/me/hifz', a, { surah: 112, fromAyah: 1, toAyah: 4 });
  assert.equal(add.status, 201);
  assert.equal((await call('POST', '/me/hifz', a, { surah: 112, fromAyah: 1, toAyah: 4 })).status, 409);    // duplicate
  assert.equal((await call('GET', '/me/hifz/due', a)).body.due.length, 1);
  const id = add.body.id as string;
  const rv = await call('POST', `/me/hifz/${id}/review`, a, { rating: 3 });
  assert.equal(rv.body.intervalDays, 1);
  assert.equal((await call('GET', '/me/hifz/due', a)).body.due.length, 0);
  for (let i = 0; i < 3; i++) await call('POST', `/me/hifz/${id}/review`, a, { rating: 4 });
  const items = (await call('GET', '/me/hifz', a)).body.items;
  assert.equal(items[0].status, 'memorized');
  const m = (await call('GET', '/me/mastery', a)).body;
  assert.equal(m.surahs[0].surah, 112); assert.equal(m.surahs[0].memorized, 4); assert.equal(m.surahs[0].ayahCount, 4);
  assert.equal(m.reviewsTotal, 4); assert.ok(m.activeDays.length >= 1);
  // isolation
  assert.deepEqual((await call('GET', '/me/hifz', b)).body.items, []);
  assert.equal((await call('POST', `/me/hifz/${id}/review`, b, { rating: 3 })).status, 404);
  assert.equal((await call('DELETE', `/me/hifz/${id}`, b)).status, 404);
  assert.equal((await call('POST', `/me/hifz/${id}/review`, a, { rating: 9 })).status, 400);
  assert.equal((await call('DELETE', `/me/hifz/${id}`, a)).status, 200);
  assert.deepEqual((await call('GET', '/me/hifz', a)).body.items, []);
});

test('quiz attempts: saved per user, best score in mastery, bad input refused, no leakage', async () => {
  const a = await user('quiza'), b = await user('quizb');
  assert.equal((await call('POST', '/me/quiz-attempts', a, { quizKey: 'makharij', score: 7, total: 10 })).status, 201);
  assert.equal((await call('POST', '/me/quiz-attempts', a, { quizKey: 'makharij', score: 9, total: 10 })).status, 201);
  assert.equal((await call('POST', '/me/quiz-attempts', a, { quizKey: 'makharij', score: 11, total: 10 })).status, 400);
  assert.equal((await call('POST', '/me/quiz-attempts', a, { quizKey: 'Bad Key!', score: 1, total: 2 })).status, 400);
  const q = (await call('GET', '/me/mastery', a)).body.quizzes;
  assert.deepEqual(q, [{ quizKey: 'makharij', best: 90, attempts: 2 }]);
  assert.deepEqual((await call('GET', '/me/mastery', b)).body.quizzes, []);
});
