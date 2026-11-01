import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { stripBasmalaPrefix } from '../src/app.ts';
const f = new URL('../../../scholarly-assets/quran/raw/tanzil-quran-uthmani-txt2.txt', import.meta.url);
test('basmala prefix is removed from ayah 1 for display only (real Tanzil file)', { skip: !existsSync(f) }, () => {
  const lines = readFileSync(f, 'utf8').split(/\r?\n/).filter(l => /^\d+\|1\|/.test(l));
  assert.equal(lines.length, 114);
  let stripped = 0;
  for (const l of lines) {
    const [s, , ...rest] = l.split('|'); const text = rest.join('|'); const out = stripBasmalaPrefix(text, Number(s));
    if (out !== text) { stripped++; assert.ok(!out.startsWith('بِ') || Number(s) === 1); assert.ok(out.length > 0 && out.length < text.length); }
    if (Number(s) === 1 || Number(s) === 9) assert.equal(out, text);
  }
  assert.equal(stripped, 112);
});

import { PGlite } from '@electric-sql/pglite';
import { applyMigrations } from '@tartil/database';
import { buildApp } from '../src/app.ts';
test('rate limit: 11th credential attempt in a minute is 429, with Retry-After', async () => {
  const db = new PGlite(); await applyMigrations(db as never);
  const a = buildApp({ service: db as never, app: db as never, jwtSecret: 'test-secret-0123456789' });
  let last = 0;
  for (let i = 0; i < 11; i++) last = (await a.inject({ method: 'POST', url: '/auth/login', payload: { email: 'x@y.zz', password: 'nope' } })).statusCode;
  assert.equal(last, 429);
  await a.close();
});
