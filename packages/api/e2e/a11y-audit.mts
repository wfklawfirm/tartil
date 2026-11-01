// Manual accessibility audit (axe-core, WCAG 2 A/AA) over public and signed-in routes, in-process API on PGlite, Chromium.
// Run: npm i axe-core --prefix /tmp/axe; PW_PATH=<playwright module dir> AXE_PATH=/tmp/axe/node_modules/axe-core/axe.min.js npx tsx e2e/a11y-audit.mts
// Not part of `npm test` (needs a browser). Automated rules catch only part of accessibility; manual screen-reader testing is still pending.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { applyMigrations } from '@tartil/database';
import { buildApp } from '../src/app.ts';
const { chromium } = createRequire(import.meta.url)(process.env.PW_PATH!);
const db = new PGlite(); await applyMigrations(db as never);
const app = buildApp({ service: db as never, app: db as never, jwtSecret: 'test-secret-0123456789', rateLimit: { auth: 100000, general: 100000 } });
const html = readFileSync(new URL('../../web-vercel/index.html', import.meta.url), 'utf8');
const axe = readFileSync(process.env.AXE_PATH!, 'utf8');
const PW = 'correct-horse-battery';
await app.inject({ method: 'POST', url: '/auth/register', payload: { displayName: 'Mudir', email: 'm@e.test', password: PW, adultConfirmed: true } });
const tok = JSON.parse((await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'm@e.test', password: PW } })).body).token;
const inst = JSON.parse((await app.inject({ method: 'POST', url: '/institutions', payload: { name: 'Dar', slug: 'dar-a' }, headers: { authorization: 'Bearer ' + tok } })).body).id;
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1000, height: 800 } });
await pg.route('https://tartil.test/**', async r => {
  const u = new URL(r.request().url());
  if (u.pathname.startsWith('/api/')) {
    const x = await app.inject({ method: r.request().method() as never, url: u.pathname.slice(4) + u.search, payload: r.request().postData() ?? undefined, headers: { 'content-type': 'application/json', ...(r.request().headers().authorization ? { authorization: r.request().headers().authorization } : {}) } });
    return r.fulfill({ status: x.statusCode, body: x.body, contentType: 'application/json' });
  }
  return r.fulfill({ status: 200, body: html, contentType: 'text/html' });
});
await pg.addInitScript(t => { try { sessionStorage.setItem('t', t); } catch {} }, tok);
const routes = ['overview', 'tracks', 'halaqat', 'recitation', 'certs', 'assistant', 'people', 'admin'].map(s => `#/app/${inst}/${s}`).concat(['#/me/today', '#/me/hifz', '#/me/quiz', '#/me/map', '#/me/sanad']);
for (const h of routes) {
  await pg.goto('https://tartil.test/' + h); await pg.reload(); await pg.waitForTimeout(1500);
  await pg.evaluate(axe); const res = await pg.evaluate(() => (window as any).axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] }));
  const v = res.violations.map((x: any) => x.id + ' x' + x.nodes.length + ' ' + x.nodes.slice(0, 2).map((n: any) => n.target.join(' ')).join(' | '));
  console.log(h.replace(inst, 'INST'), (await pg.locator('#app').innerText()).slice(0,40).replace(/\n/g,' '), '|', v.length ? '\n  ' + v.join('\n  ') : 'clean');
}
await b.close(); process.exit(0);
