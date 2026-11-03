// E2E: academy (packages/web-vercel). Usage: node scripts/e2e_academy.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../packages/web-vercel');

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  const req = createRequire(import.meta.url);
  for (const p of [undefined, '/opt/npm-tools/node_modules', '/usr/lib/node_modules', '/usr/local/lib/node_modules']) {
    try { return req(p ? req.resolve('playwright', { paths: [p] }) : 'playwright'); } catch {}
  }
  throw new Error('playwright غير متاح');
}
const pw = await loadPlaywright();
const chromium = pw.chromium || pw.default?.chromium;

const MIME = { '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

const lessonsDoc = JSON.parse(fs.readFileSync(path.join(ROOT, 'academy-lessons.json'), 'utf8'));
const lessonIds = [], scenarioIds = [];
for (const u of Object.values(lessonsDoc.units)) {
  for (const l of u.lessons || []) lessonIds.push(l.id);
  for (const s of u.scenarios || []) scenarioIds.push(s.id);
}

const fails = [];
const fail = (id, msg) => { fails.push(`${id}: ${msg}`); };
const BANNED = ['درجة', 'نقطة', 'ترتيبك'];
const ALLOWED = /لا درجات[^.\n]*\.?/g;
let pageErrors = [];
let browser;
try {
  browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, locale: 'ar' });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('t', 'e2e-token'); } catch {} });
  await ctx.route('**/api/**', r => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ id: 'u1', display_name: 'متعلّم', roles: [], memberships: [] }) }));
  const page = await ctx.newPage();
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) pageErrors.push('console: ' + m.text()); });

  const scanText = async id => {
    const t = (await page.locator('#app').innerText()).replace(ALLOWED, '');
    for (const w of BANNED) if (t.includes(w)) {
      const i = t.indexOf(w); fail(id, `كلمة محظورة «${w}» … ${t.slice(Math.max(0, i - 25), i + 25).replace(/\s+/g, ' ')}`);
    }
  };
  const hOverflow = async id => {
    const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (o > 0) fail(id, `تمرير أفقي بمقدار ${o}px عند 390`);
  };
  const go = async (hash, waitSel) => {
    if (process.env.E2E_VERBOSE) console.error("->", hash);
    pageErrors = [];
    await page.goto(`${BASE}/index.html#${hash}`);
    await page.evaluate(h => { location.hash = h; }, hash).catch(() => {});
    await page.waitForSelector(waitSel || '#app .acx', { timeout: 8000 });
    await page.waitForTimeout(60);
  };
  const noErrs = id => { if (pageErrors.length) fail(id, 'أخطاء JS: ' + pageErrors.join(' | ')); };

  // (1) home
  await go('/academy', '.pcard');
  const cards = await page.locator('.pcard').count();
  if (cards !== 16) fail('home', `عدد بطاقات البرامج ${cards} بدل 16`);
  noErrs('home'); await scanText('home'); await hOverflow('home');
  const slugs = await page.locator('.pcard').evaluateAll(a => a.map(x => x.getAttribute('href').split('/').pop()));

  // (2) programs
  for (const s of slugs) {
    const id = 'program/' + s;
    try {
      await go('/academy/p/' + s, '.acx h1');
      const t = await page.locator('#app').innerText();
      if (!t.includes('رحلتك خطوة خطوة')) fail(id, 'لا يحتوي «رحلتك خطوة خطوة»');
      noErrs(id); await scanText(id); await hOverflow(id);
    } catch (e) { fail(id, e.message.split('\n')[0]); }
  }

  // (3) lessons: open and walk every step
  for (const l of lessonIds) {
    const id = 'lesson/' + l;
    try {
      await go('/academy/l/' + l, '.acx h1');
      await scanText(id); await hOverflow(id);
      for (let i = 0; i < 40; i++) {
        const next = page.locator('.nav2 button:not(.ghost)').filter({ hasText: 'التالي' });
        if (!(await next.count())) break;
        await next.first().click(); await scanText(id + '#' + (i + 1)); await hOverflow(id + '#' + (i + 1));
      }
      const t = await page.locator('#app').innerText();
      if (!t.includes('ختام الدرس')) fail(id, 'لم يصل إلى «ختام الدرس»');
      noErrs(id);
    } catch (e) { fail(id, e.message.split('\n')[0]); }
  }

  // scenarios
  for (const s of scenarioIds) {
    const id = 'scenario/' + s;
    try {
      await go('/academy/s/' + s, '.acx h3');
      await scanText(id); await hOverflow(id); noErrs(id);
    } catch (e) { fail(id, e.message.split('\n')[0]); }
  }

  // (4) complete one scenario to «للتأمّل»
  {
    const id = 'complete/' + scenarioIds[0];
    try {
      await go('/academy/s/' + scenarioIds[0], '.acx h3');
      let ok = false;
      for (let i = 0; i < 40; i++) {
        if ((await page.locator('#app').innerText()).includes('للتأمّل')) { ok = true; break; }
        const opt = page.locator('button.opt');
        if (!(await opt.count())) break;
        await opt.first().click();
      }
      if (!ok) fail(id, 'لم يصل إلى «للتأمّل»');
      await scanText(id); noErrs(id);
    } catch (e) { fail(id, e.message.split('\n')[0]); }
  }
} catch (e) {
  fail('fatal', e.stack || e.message);
} finally {
  if (browser) await browser.close();
  server.close();
}

console.log(`برامج: 16 متوقعة | دروس: ${lessonIds.length} | سيناريوهات: ${scenarioIds.length}`);
if (fails.length) {
  console.log(`فشل (${fails.length}):`);
  for (const f of fails.slice(0, 60)) console.log(' - ' + f);
  if (fails.length > 60) console.log(` ... و${fails.length - 60} أخرى`);
  process.exit(1);
}
console.log('نجح: كل الفحوص (1-6) سليمة');
process.exit(0);
