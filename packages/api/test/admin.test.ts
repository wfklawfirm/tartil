import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { applyMigrations } from '@tartil/database';
import { buildApp } from '../src/app.ts';

let app: ReturnType<typeof buildApp>;
const PW = 'correct-horse-battery';
const call = async (method: 'GET' | 'POST', url: string, token?: string, payload?: unknown) => {
  const r = await app.inject({ method, url, payload: payload as never, headers: token ? { authorization: `Bearer ${token}` } : {} });
  return { status: r.statusCode, body: r.body ? JSON.parse(r.body) : {} };
};
const user = async (name: string) => {
  const email = `${name}@example.test`;
  const id = (await call('POST', '/auth/register', undefined, { displayName: name, email, password: PW, adultConfirmed: true })).body.id as string;
  const token = (await call('POST', '/auth/login', undefined, { email, password: PW })).body.token as string;
  return { id, email, token };
};
before(async () => {
  const db = new PGlite(); await applyMigrations(db as never);
  app = buildApp({ service: db as never, app: db as never, jwtSecret: 'test-secret-0123456789', rateLimit: { auth: 100000, general: 100000 } });
});

test('institution administration: roster, suspension rules, stats, audit trail; non-admins are refused', async () => {
  const admin = await user('adm'), qari = await user('qar'), stu = await user('stu');
  const inst = (await call('POST', '/institutions', admin.token, { name: 'Dar Admin', slug: 'dar-admin' })).body.id as string;
  await call('POST', `/i/${inst}/members`, admin.token, { email: qari.email, role: 'qari' });
  const sm = (await call('POST', `/i/${inst}/members`, admin.token, { email: stu.email, role: 'student' })).body;
  assert.ok(sm.id);

  const roster = await call('GET', `/i/${inst}/roster`, admin.token);
  assert.equal(roster.status, 200);
  assert.equal(roster.body.members.length, 3);
  assert.ok(roster.body.members.every((m: { displayName: string }) => m.displayName !== '—'));
  assert.equal((await call('GET', `/i/${inst}/roster`, qari.token)).status, 403);
  assert.equal((await call('GET', `/i/${inst}/overview-stats`, stu.token)).status, 403);
  assert.equal((await call('GET', `/i/${inst}/audit-trail`, qari.token)).status, 403);

  // the sole admin can be neither suspended by themself nor left without an admin
  const adminMid = roster.body.members.find((m: { role: string }) => m.role === 'tenant_admin').id as string;
  assert.deepEqual((await call('POST', `/i/${inst}/members/${adminMid}/status`, admin.token, { status: 'suspended' })).body, { error: 'cannot_suspend_self' });

  // suspend then reactivate the student; a suspended member loses access
  assert.equal((await call('POST', `/i/${inst}/members/${sm.id}/status`, admin.token, { status: 'suspended' })).status, 200);
  assert.equal((await call('GET', `/i/${inst}/people`, stu.token)).body.people?.length ?? 0, 0);
  const rosterWhileSuspended = (await call('GET', `/i/${inst}/roster`, admin.token)).body.members as Array<{ userId: string; status: string; displayName: string }>;
  assert.equal(rosterWhileSuspended.find(m => m.userId === stu.id)?.status, 'suspended');
  assert.equal(rosterWhileSuspended.find(m => m.userId === stu.id)?.displayName, 'stu', 'suspended member keeps a visible name');
  assert.equal((await call('POST', `/i/${inst}/members/${sm.id}/status`, qari.token, { status: 'active' })).status, 403);
  assert.equal((await call('POST', `/i/${inst}/members/${sm.id}/status`, admin.token, { status: 'active' })).status, 200);

  const stats = (await call('GET', `/i/${inst}/overview-stats`, admin.token)).body;
  assert.equal(stats.qaris, 1);
  assert.equal(stats.suspended, 0);
  assert.equal(stats.certificates, 0);

  const audit = await call('GET', `/i/${inst}/audit-trail`, admin.token);
  assert.equal(audit.status, 200);
  assert.ok(audit.body.entries.length >= 4);
  assert.ok(audit.body.entries.some((e: { objectType: string }) => e.objectType === 'memberships'));
});

test('a second admin makes suspending the first allowed, and the last admin stays protected', async () => {
  const a1 = await user('adm1'), a2 = await user('adm2');
  const inst = (await call('POST', '/institutions', a1.token, { name: 'Dar Two', slug: 'dar-two' })).body.id as string;
  await call('POST', `/i/${inst}/members`, a1.token, { email: a2.email, role: 'tenant_admin' });
  const members = (await call('GET', `/i/${inst}/roster`, a1.token)).body.members as Array<{ id: string; userId: string }>;
  const m1 = members.find(m => m.userId === a1.id)!, m2 = members.find(m => m.userId === a2.id)!;
  assert.equal((await call('POST', `/i/${inst}/members/${m2.id}/status`, a1.token, { status: 'suspended' })).status, 200);
  // a1 is now the only active admin
  assert.deepEqual((await call('POST', `/i/${inst}/members/${m1.id}/status`, a1.token, { status: 'suspended' })).body, { error: 'cannot_suspend_self' });
  assert.equal((await call('GET', `/i/${inst}/roster`, a2.token)).status, 403);
});
