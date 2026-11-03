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
// لغة التقييم الموجَّهة للمتعلم فقط (لا «درجة الحرارة» ولا «نقطة» بمعنى فكرة، ولا الأسئلة التي جوابها نفي)
const BANNED = ['درجتك', 'درجاتك', 'نقاطك', 'ترتيبك بين', 'ترتيبك في الصف', 'حصلت على \\d+ نقطة', 'لوحة المتصدرين'];
const hit = (t, w) => { const m = new RegExp(w + '(?![\\u0621-\\u064A])').exec(t); return m ? m.index : -1; };
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
    for (const w of BANNED) if (hit(t, w) >= 0) {
      const i = hit(t, w); fail(id, `كلمة محظورة «${w}» … ${t.slice(Math.max(0, i - 25), i + 25).replace(/\s+/g, ' ')}`);
    }
  };
  const hOverflow = async id => {
    const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (o > 0) fail(id, `تمرير أفقي بمقدار ${o}px عند 390`);
  };
  const go = async (hash, waitSel) => {
    if (process.env.E2E_VERBOSE) console.error("->", hash);
    pageErrors = [];
    if (page.url().startsWith(BASE)) await page.evaluate(h => { location.hash = h; }, hash);
    else await page.goto(`${BASE}/index.html#${hash}`);
    await page.waitForSelector(waitSel || '#app .acx', { timeout: 8000 });
    await page.waitForTimeout(30);
  };
  // عبارات داخلية ومعرّفات خام يجب ألا تظهر للمتعلم (F-04/F-05)
  const INTERNAL = /SPR-|\bD\d+\b|BLUEPRINT|CLAUDE|المالك(?![\u0621-\u064A])|ترخيص الصوت|اعتماد الإدارة العلمية|\b[A-Z]\d{1,2}-[LS]\d{1,2}\b|\bP\d\d\b/;
  const internalHit = (id, t) => { const m = INTERNAL.exec(t); if (m) fail(id, `عبارة/معرّف داخلي ظاهر «${m[0]}» … ${t.slice(Math.max(0, m.index - 30), m.index + 30).replace(/\s+/g, ' ')}`); };
  const noErrs = id => { if (pageErrors.length) fail(id, 'أخطاء JS: ' + pageErrors.join(' | ')); };

  // (1) home
  await go('/academy', '.pcard');
  const cards = await page.locator('.pcard').count();
  const expectedCards = JSON.parse(fs.readFileSync(path.join(ROOT, 'academy-programs.json'), 'utf8')).programs.length;
  if (cards !== expectedCards) fail('home', `عدد بطاقات البرامج ${cards} بدل ${expectedCards}`);
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
      internalHit(id, await page.locator('#app').evaluate(e => e.textContent));
    } catch (e) { fail(id, e.message.split('\n')[0]); }
  }

  // (3) lessons: open and walk every step
  for (const l of lessonIds) {
    const id = 'lesson/' + l;
    try {
      await go('/academy/l/' + l, '.acx h1');
      // الخطوات كلها داخل الصفحة: نص كل خطوة + أكبر تجاوز أفقي
      const r = await page.evaluate(async () => {
        const texts = [], over = [], raw = [];
        const snap = () => { texts.push(document.querySelector('#app').innerText); raw.push(document.querySelector('#app').textContent);
          over.push(document.documentElement.scrollWidth - document.documentElement.clientWidth); };
        snap();
        for (let i = 0; i < 40; i++) {
          const nx = [...document.querySelectorAll('.nav2 button')].find(b => b.textContent.trim() === 'التالي');
          if (!nx) break; nx.click(); snap();
        }
        return { texts, over, raw };
      });
      r.texts.forEach((t0, i) => {
        const t = t0.replace(ALLOWED, '');
        for (const w of BANNED) if (hit(t, w) >= 0) { const k = hit(t, w);
          fail(`${id}#${i}`, `كلمة محظورة «${w}» … ${t.slice(Math.max(0, k - 25), k + 25).replace(/\s+/g, ' ')}`); }
      });
      r.raw.forEach((t, i) => internalHit(`${id}#${i}`, t));
      const mo = Math.max(...r.over); if (mo > 0) fail(id, `تمرير أفقي بمقدار ${mo}px عند 390`);
      if (!r.texts[r.texts.length - 1].includes('ختام الدرس')) fail(id, 'لم يصل إلى «ختام الدرس»');
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
  // (5) age gate: an institution-managed student account must not open adult-only programs/lessons; a plain adult account still can
  {
    const progs = JSON.parse(fs.readFileSync(path.join(ROOT, 'academy-programs.json'), 'utf8')).programs;
    const isAdult = p => (p.age_min || 0) >= 16 || (p.gating && p.gating.adults_only);
    const refsOf = p => (p.stages || []).flatMap(st => (st.items || []).map(i => i.ref));
    const adultProg = progs.find(isAdult);
    const adultOnlyRef = refsOf(adultProg).find(r => progs.filter(p => refsOf(p).includes(r)).every(isAdult));
    const youthProg = progs.find(p => !isAdult(p));
    const stuCtx = await browser.newContext({ viewport: { width: 390, height: 800 }, locale: 'ar' });
    await stuCtx.addInitScript(() => { try { sessionStorage.setItem('t', 'e2e-token'); } catch {} });
    await stuCtx.route('**/api/**', r => r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ id: 'u2', displayName: 'طالب', roles: [], memberships: [{ institutionId: 'i1', role: 'student' }] }) }));
    const sp = await stuCtx.newPage();
    const open = async h => { await sp.goto(`${BASE}/index.html#${h}`); await sp.waitForSelector('#app .acx', { timeout: 8000 }); await sp.waitForTimeout(150); return sp.locator('#app').innerText(); };
    let t = await open('/academy/p/' + adultProg.slug); if (!t.includes('مخصّص للبالغين')) fail('gate/program', 'برنامج البالغين فُتح لحساب طالب');
    if (adultOnlyRef) { t = await open('/academy/' + (adultOnlyRef.startsWith('S') && !adultOnlyRef.includes('-L') ? 's/' : 'l/') + adultOnlyRef);
      if (!t.includes('مخصّص للبالغين') && !(lessonIds.includes(adultOnlyRef) || scenarioIds.includes(adultOnlyRef))) fail('gate/item', 'عنصر البالغين'); }
    t = await open('/academy/p/' + youthProg.slug); if (t.includes('مخصّص للبالغين')) fail('gate/youth', 'برنامج مناسب للعمر حُجب');
    await stuCtx.close();
    const t2 = (await (async () => { await go('/academy/p/' + adultProg.slug, '.acx h1'); return page.locator('#app').innerText(); })());
    if (t2.includes('مخصّص للبالغين') && !t2.includes('رحلتك')) fail('gate/adult-account', 'حساب بالغ حُجب');
  }

  // (6) إصلاحات F-01..F-12 (ما لا يحتاج قرار المالك)
  {
    // 6a) وضع المرشد مفعّل: لوحة المرشد وأدلة البرامج لا تُظهر معرّفات/عبارات داخلية
    await page.evaluate(() => { try { localStorage.setItem('acx:user:u1:mentor', JSON.stringify({ ack: true })); localStorage.setItem('acx:user:u1:guideon', 'true'); } catch {} });
    for (const l of lessonIds) {
      const id = 'guide-lesson/' + l;
      try {
        await go('/academy/l/' + l, '.acx h1');
        const raws = await page.evaluate(() => { const o = [document.querySelector('#app').textContent];
          for (let i = 0; i < 40; i++) { const nx = [...document.querySelectorAll('.nav2 button')].find(b => b.textContent.trim() === 'التالي'); if (!nx) break; nx.click(); o.push(document.querySelector('#app').textContent); } return o; });
        raws.forEach((t, i) => internalHit(`${id}#${i}`, t));
      } catch (e) { fail(id, e.message.split('\n')[0]); }
    }
    await page.evaluate(() => { try { localStorage.removeItem('acx:user:u1:mentor'); localStorage.removeItem('acx:user:u1:guideon'); } catch {} });

    // 6b) F-05: الشرط المسبق يظهر بعنوان البرنامج مع رابط لا بمعرّفه
    {
      const progs = JSON.parse(fs.readFileSync(path.join(ROOT, 'academy-programs.json'), 'utf8')).programs;
      const p = progs.find(x => (x.prerequisites || []).some(t => /P\d\d/.test(t)));
      const pre = progs.find(x => x.id === p.prerequisites[0].match(/P\d\d/)[0]);
      await go('/academy/p/' + p.slug, '.acx h1');
      const t = await page.locator('#app').innerText();
      if (!t.includes('يُفضَّل قبلها: ' + pre.title)) fail('F-05/prereq', 'الشرط المسبق لا يظهر بعنوان البرنامج: ' + pre.title);
      if (!(await page.locator(`#app a[href="#/academy/p/${pre.slug}"]`).count())) fail('F-05/prereq-link', 'لا رابط للبرنامج المسبق');
    }
    // 6c) F-04: برنامج مؤجّل لا يعرض سبب التأجيل الداخلي
    {
      const progs = JSON.parse(fs.readFileSync(path.join(ROOT, 'academy-programs.json'), 'utf8')).programs;
      for (const p of progs.filter(x => x.status === 'adults_gated')) {
        await go('/academy/p/' + p.slug, '.acx h1');
        const t = await page.locator('#app').evaluate(e => e.textContent);
        if (/D11|BLUEPRINT/.test(t)) fail('F-04/gated/' + p.id, 'سبب التأجيل الداخلي ظاهر');
      }
    }
    // 6d) F-07: لوحة المراجعة محجوبة لغير المراجع ورابطها مخفي؛ ومتاحة للمراجع
    {
      await go('/academy', '.pcard');
      if (await page.locator('#app a[href="#/academy/review"]').count()) fail('F-07/link', 'رابط بوابة المراجعين ظاهر لغير المراجع');
      for (const h of ['/academy/review', '/academy/review/K1', '/academy/K1']) {
        await go(h, '#app .acx');
        const t = await page.locator('#app').innerText();
        if (!t.includes('للمراجعين العلميين المعتمدين فقط')) fail('F-07/gate' + h, 'لا رسالة حجب');
        if (t.includes('المراسي المصدرية') || t.includes('سجل مصدر')) fail('F-07/leak' + h, 'محتوى المراجعة ظاهر لغير المراجع');
      }
      const rvCtx = await browser.newContext({ viewport: { width: 390, height: 800 }, locale: 'ar' });
      await rvCtx.addInitScript(() => { try { sessionStorage.setItem('t', 'e2e-token'); } catch {} });
      await rvCtx.route('**/api/**', r => r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ id: 'u3', displayName: 'مراجع', roles: [], memberships: [{ institutionId: 'i1', role: 'scholarly_reviewer' }] }) }));
      const rp = await rvCtx.newPage();
      await rp.goto(`${BASE}/index.html#/academy/review`); await rp.waitForSelector('#app .acx', { timeout: 8000 }); await rp.waitForTimeout(300);
      const rt = await rp.locator('#app').innerText();
      if (rt.includes('للمراجعين العلميين المعتمدين فقط') || !rt.includes('لوحة المراجعة')) fail('F-07/reviewer', 'المراجع لا يصل إلى اللوحة');
      await rp.goto(`${BASE}/index.html#/academy`); await rp.waitForSelector('.pcard', { timeout: 8000 });
      if (!(await rp.locator('#app a[href="#/academy/review"]').count())) fail('F-07/reviewer-link', 'رابط البوابة غير ظاهر للمراجع');
      await rvCtx.close();
    }
    // 6e) F-08: زر «أنهيتُ» مخفي حتى النهاية، ثم يعيد إلى الكفاية
    {
      const sid = scenarioIds[0];
      await go('/academy/s/' + sid, '.acx h3');
      if (await page.locator('#sc-fin').isVisible()) fail('F-08/start', 'زر الإنهاء ظاهر قبل النهاية');
      for (let i = 0; i < 40; i++) { const o = page.locator('button.opt'); if (!(await o.count())) break; await o.first().click(); }
      if (!(await page.locator('#sc-fin').isVisible())) fail('F-08/end', 'زر الإنهاء غير ظاهر عند النهاية');
      await page.locator('#sc-fin').click(); await page.waitForTimeout(100);
      if (!/#\/academy\/c\/[A-Za-z0-9-]+$/.test(await page.evaluate(() => location.hash))) fail('F-08/target', 'لا يعود إلى صفحة الكفاية');
    }
    // 6f) F-12: جملة التوضيح التي تكشف الجواب مطويّة خلف زر
    {
      await go('/academy/l/T6-L2', '.acx h1');
      let found = false;
      for (let i = 0; i < 12 && !found; i++) {
        if (await page.locator('details.reveal').count()) {
          found = true;
          const vis = await page.locator('#app').innerText();
          if (vis.includes('ما جاء في المصدر ب غير صحيح')) fail('F-12/leak', 'الجواب ظاهر قبل الكشف');
          if (!(await page.locator('details.reveal').first().evaluate(e => e.textContent.includes('ما جاء في المصدر ب غير صحيح') && !e.open))) fail('F-12/fold', 'الجملة ليست داخل تفصيل مطوي');
        } else { const nx = page.locator('.nav2 button', { hasText: 'التالي' }); if (!(await nx.count())) break; await nx.click(); }
      }
      if (!found) fail('F-12/none', 'لم يُعثر على التفصيل المطوي في T6-L2');
    }
    // 6g) الصفحة الرئيسية (F-02): شارة الحالة منفصلة ولا اقتطاع للنص عند 390
    {
      await go('/', '.eco');
      const r = await page.evaluate(() => { const c = [...document.querySelectorAll('.ec:not(.lead) .small')];
        return { n: document.querySelectorAll('.ec .ecs').length, clamp: c.filter(e => getComputedStyle(e).webkitLineClamp !== 'none').length,
          cut: c.filter(e => e.scrollHeight > e.clientHeight + 1).length, paren: c.filter(e => /\([^)]*\)\s*$/.test(e.textContent)).length }; });
      if (r.n < 4) fail('F-02/badge', 'شارات الحالة غير موجودة: ' + r.n);
      if (r.clamp || r.cut) fail('F-02/clamp', 'نص بطاقات الرئيسية مقتطع');
      if (r.paren) fail('F-02/paren', 'نص الحالة ما زال داخل الوصف');
    }
    // 6h) F-03/F-04: الأسس: لا عبارات داخلية، والنقر المتعدد لا يزيد العدّ، ونهاية الاختبار تعرض النتيجة
    {
      await go('/foundations', '#app .phead');
      await page.evaluate(() => { try { localStorage.setItem('fdMode', 'reg'); } catch {} });
      await go('/', '.eco');
      await go('/foundations', '#app .tabs');
      const t0 = await page.locator('#app').innerText();
      if (/الإدارة العلمية|بانتظار اعتماد/.test(t0)) fail('F-04/foundations', 'نص موجّه للإدارة ظاهر');
      if (!(await page.locator('#app .hbtns button').count())) fail('F-03/setup', 'لا أزرار اختبار');
      await page.evaluate(() => document.querySelectorAll('#app .hbtns button').forEach(b => b.click()));
      await page.waitForTimeout(1900);
      const q = await page.locator('#app').innerText();
      if (!/السؤال ٢ من ١٠/.test(q)) fail('F-03/multiclick', 'النقر المتعدد قفز بالأسئلة: ' + (q.match(/السؤال [^\n]*/) || [''])[0]);
      for (let i = 0; i < 9; i++) { await page.locator('#app .hbtns button').first().click(); await page.waitForTimeout(1500); }
      const end = await page.locator('#app').innerText();
      if (!/أجبتَ عن [^\n]* من ١٠ بشكل صحيح/.test(end)) fail('F-03/score', 'النتيجة لا تظهر في نهاية الاختبار');
      await page.evaluate(() => { try { localStorage.removeItem('fdMode'); } catch {} });
    }
    // 6i) F-09: الجملة التحذيرية ظاهرة دائمًا والخطأ النحوي غائب
    {
      await go('/tajweed', '#app .tjn');
      const t = await page.locator('#app .tjn').evaluate(e => e.innerText);
      if (!t.includes('ولا يغني عن التلقّي من مقرئ مجاز')) fail('F-09/visible', 'جملة «لا يغني عن مقرئ مجاز» غير ظاهرة');
      const all = await page.locator('#app').evaluate(e => e.textContent);
      if (all.includes('ولا يُصدر المنصة')) fail('F-09/grammar', 'الخطأ النحوي ما زال موجودًا');
    }
    // 6j) F-01/F-10/F-11: تباين مقيس فعليًا في الفاتح والداكن (عنوان نشاط الصغار، ألوان التجويد، حدّ الحقل والزر الشبحي)
    {
      for (const theme of ['light', 'dark']) {
        await page.evaluate(t => { try { localStorage.setItem('theme', t); } catch {} document.documentElement.setAttribute('data-theme', t); }, theme);
        await go('/kids', '#app .kids');
        await page.waitForTimeout(500);
        if (!(await page.locator('#app .kids button.card').count())) { await page.locator('#app .kids .btn').first().click(); await page.waitForSelector('#app .kids button.card', { timeout: 4000 }); }
        await page.waitForTimeout(500);
        const m = await page.evaluate(() => {
          const P = s => { const c = document.createElement('canvas').getContext('2d'); c.fillStyle = '#000'; c.fillStyle = s; c.fillRect(0, 0, 1, 1); const d = c.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3]]; };
          const L = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]) };
          const CR = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05) };
          const bgOf = e => { for (let n = e; n; n = n.parentElement) { const c = P(getComputedStyle(n).backgroundColor); if (c[3] > 250) return c; } return P(getComputedStyle(document.body).backgroundColor) };
          const out = {};
          const b = document.querySelector('#app .kids button.card > b'); out.kidsTitle = CR(P(getComputedStyle(b).color), bgOf(b.parentElement));
          const card = P(getComputedStyle(document.documentElement).getPropertyValue('--card').trim() || '#fff'), page = P(getComputedStyle(document.body).backgroundColor);
          out.tj = {};
          for (const k of ['ghunna', 'ikhfa', 'idg_g', 'idg_n', 'iqlab', 'qalqala', 'madd']) { const s = document.createElement('span'); s.className = 'tj-' + k; s.textContent = 'x'; document.body.append(s); const c = P(getComputedStyle(s).color); s.remove(); out.tj[k] = Math.min(CR(c, card), CR(c, page)); }
          const inp = document.createElement('input'); document.body.append(inp); const ib = P(getComputedStyle(inp).borderTopColor); inp.remove(); out.field = Math.min(CR(ib, card), CR(ib, page));
          const g = document.createElement('button'); g.className = 'ghost'; document.body.append(g); const gb = P(getComputedStyle(g).borderTopColor); g.remove(); out.ghost = Math.min(CR(gb, card), CR(gb, page));
          return out; });
        if (m.kidsTitle < 4.5) fail('F-01/' + theme, 'عنوان بطاقة النشاط تباينه ' + m.kidsTitle.toFixed(2));
        for (const [k, v] of Object.entries(m.tj)) if (v < 4.5) fail('F-10/' + theme + '/' + k, 'تباين لون التجويد ' + v.toFixed(2));
        if (m.field < 3) fail('F-11/field/' + theme, 'حدّ الحقل ' + m.field.toFixed(2));
        if (m.ghost < 3) fail('F-11/ghost/' + theme, 'حدّ الزر الشبحي ' + m.ghost.toFixed(2));
      }
      await page.evaluate(() => { try { localStorage.removeItem('theme'); } catch {} document.documentElement.setAttribute('data-theme', 'light'); });
    }
    // 6l) F-13..F-18: عنوان الصفحة والتركيز، الشريط السفلي، دلالات التبويب، جدول الحفظ، زر الملف، لا تمرير أفقي
    {
      await page.evaluate(() => { try { localStorage.setItem('fdMode', 'adult'); } catch {} });
      await page.route('**/api/me/hifz', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ now: new Date().toISOString(), items: [
        { id: 'h1', surah: 2, fromAyah: 1, toAyah: 5, status: 'memorized', intervalDays: 9, dueAt: new Date(Date.now() + 864e5).toISOString() },
        { id: 'h2', surah: 36, fromAyah: 1, toAyah: 12, status: 'learning', intervalDays: 1, dueAt: new Date(Date.now() - 1e3).toISOString() }] }) }));
      await page.route('**/api/quran/editions', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ editions: [{ code: 'hafs', name: 'حفص عن عاصم', attribution: 'اختبار' }] }) }));
      await page.route('**/api/quran/reference', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ surahs: [{ surah: 1, ayahCount: 7 }, { surah: 2, ayahCount: 286 }, { surah: 36, ayahCount: 83 }] }) }));
      const titles = {};
      for (const h of ['/quran', '/tajweed/makharij', '/me/hifz', '/learn', '/practise', '/kids', '/foundations', '/search', '/academy']) {
        await go(h, '#app h1, #app h2');
        await page.waitForTimeout(150);
        const r = await page.evaluate(() => ({ t: document.title, f: document.activeElement && document.activeElement.tagName, inApp: !!(document.activeElement && document.activeElement.closest('#app')) }));
        titles[h] = r.t;
        if (!/ — ترتيل$/.test(r.t)) fail('F-13/title' + h, 'عنوان غير متوقع: ' + r.t);
        if (!(r.inApp && (r.f === 'H1' || r.f === 'MAIN'))) fail('F-13/focus' + h, 'التركيز لم ينتقل إلى العنوان: ' + r.f);
        await hOverflow('F-13/overflow' + h);
      }
      if (new Set(Object.values(titles)).size !== Object.keys(titles).length) fail('F-13/title', 'عناوين مكررة بين المسارات: ' + JSON.stringify(titles));
      // التركيز يبقى على التبويب النشط عند التنقل بين التبويبات
      await go('/me/hifz', '#app [role=tab]');
      await page.locator('#app [role=tablist] [role=tab][href="#/me/quiz"]').click();
      await page.waitForTimeout(250);
      const kept = await page.evaluate(() => { const a = document.activeElement; return a && a.getAttribute('role') === 'tab' && a.getAttribute('aria-selected') === 'true'; });
      if (!kept) fail('F-13/tabfocus', 'التركيز لم يبقَ على التبويب المحدّد بعد التنقل');
      // F-14: الشريط السفلي
      const bn = await page.evaluate(() => ({ n: document.querySelectorAll('#bnav a').length, btn: document.querySelectorAll('#bnav button,#bnav [aria-haspopup]').length, more: !!document.getElementById('more'), cur: [...document.querySelectorAll('#bnav a[aria-current=page]')].map(a => a.textContent.trim()), vis: getComputedStyle(document.getElementById('bnav')).display }));
      if (bn.n !== 5 || bn.btn || bn.more || bn.vis === 'none') fail('F-14/bnav', JSON.stringify(bn));
      if (bn.cur.length !== 1) fail('F-14/current', 'يجب وجهة حالية واحدة: ' + JSON.stringify(bn.cur));
      await go('/tajweed/makharij', '#app [role=tab]');
      const cur2 = await page.evaluate(() => [...document.querySelectorAll('#bnav a[aria-current=page]')].map(a => a.textContent.trim()));
      if (cur2.join() !== 'تعلّم') fail('F-14/current-tajweed', JSON.stringify(cur2));
      await page.keyboard.press('Escape'); // لا ورقة معلّقة: لا يجب أن يتغير شيء
      // F-16: دلالات التبويب
      const checkTabs = async (id, hash) => {
        await go(hash, '#app [role=tablist] [role=tab]');
        const r = await page.evaluate(() => {
          const out = []; for (const tl of document.querySelectorAll('#app [role=tablist]:not(.tabs2)')) {
            const tabs = [...tl.querySelectorAll('[role=tab]')], sel = tabs.filter(t => t.getAttribute('aria-selected') === 'true'), pan = document.querySelector('[role=tabpanel]');
            out.push({ n: tabs.length, sel: sel.length, tab0: tabs.filter(t => t.tabIndex === 0).length, ctl: sel[0] && pan && pan.getAttribute('aria-labelledby') === sel[0].id, ctrl: sel[0] && sel[0].getAttribute('aria-controls') === (pan && pan.id), js: tl.querySelectorAll('a[href^="javascript:"]').length, lab: !!tl.getAttribute('aria-label') }); }
          return out; });
        if (!r.length) { fail('F-16/' + id, 'لا tablist'); return; }
        for (const t of r) if (t.n < 2 || t.sel !== 1 || t.tab0 !== 1 || !t.ctl || !t.ctrl || t.js || !t.lab) fail('F-16/' + id, JSON.stringify(t));
      };
      await checkTabs('me', '/me/hifz'); await checkTabs('tajweed', '/tajweed/makharij'); await checkTabs('foundations', '/foundations');
      await page.evaluate(() => setToken(null)); await checkTabs('auth', '/auth'); await page.evaluate(() => { token = 'e2e-token'; sessionStorage.setItem('t', 'e2e-token'); });
      // مفاتيح الأسهم (نمط الحالة: الأسس)
      await go('/foundations', '#app [role=tab]');
      await page.locator('#app [role=tab][aria-selected=true]').focus();
      const before = await page.evaluate(() => document.activeElement.id);
      await page.keyboard.press('ArrowLeft'); // RTL: التالي
      const after = await page.evaluate(() => ({ id: document.activeElement.id, sel: document.activeElement.getAttribute('aria-selected'), role: document.activeElement.getAttribute('role') }));
      if (after.role !== 'tab' || after.id === before || after.sel !== 'true') fail('F-16/arrows', 'السهم لم ينقل التبويب: ' + JSON.stringify(after));
      await page.keyboard.press('End');
      const last = await page.evaluate(() => { const t = [...document.querySelectorAll('#app [role=tab]')]; return document.activeElement === t[t.length - 1]; });
      if (!last) fail('F-16/end', 'End لا ينقل إلى آخر تبويب');
      // أكاديمية: التبويبان والقفز
      await go('/academy', '#app .acx .jump a');
      const ac = await page.evaluate(() => ({ tl: document.querySelectorAll('#app .tabs2[role=tablist] [role=tab]').length, jump: document.querySelectorAll('#app .jump a').length, wrap: !!document.querySelector('#app .tabsw .jump') }));
      if (ac.tl !== 2 || ac.jump < 2 || !ac.wrap) fail('F-16/academy', JSON.stringify(ac));
      await hOverflow('F-16/academy-overflow');
      // F-17: جدول الحفظ بطاقات على الجوال
      await go('/me/hifz', '#app table.rt');
      await page.waitForTimeout(150);
      const rt = await page.evaluate(() => { const t = document.querySelector('#app table.rt'), tr = t.querySelector('tbody tr'), td = tr.querySelector('td'); const w = t.parentElement; return { disp: getComputedStyle(tr).display, tdLabel: td.getAttribute('data-label'), rows: t.querySelectorAll('tbody tr').length, scroll: w.scrollWidth - w.clientWidth, trW: tr.getBoundingClientRect().width, vw: innerWidth }; });
      if (rt.disp !== 'block' || !rt.tdLabel || rt.rows !== 2 || rt.scroll > 0 || rt.trW > rt.vw) fail('F-17/hifz', JSON.stringify(rt));
      await hOverflow('F-17/overflow');
      // F-18: زر اختيار الملف بنمط عربي
      await go('/me/tasmi', '#app input[type=file]');
      const fb = await page.evaluate(() => { const i = document.querySelector('#app input[type=file]'), l = i.closest('label.filebtn'), b = l && l.querySelector('.fb'); return { lab: !!l, txt: b && b.textContent, none: l && l.querySelector('.fn').textContent, h: b && b.getBoundingClientRect().height, desc: i.getAttribute('aria-describedby') }; });
      if (!fb.lab || fb.txt !== 'اختيار ملف صوتي' || fb.none !== 'لم يُختر ملف' || fb.h < 44 || !fb.desc) fail('F-18/file', JSON.stringify(fb));
      await page.locator('#app input[type=file]').setInputFiles({ name: 'rec.webm', mimeType: 'audio/webm', buffer: Buffer.from('abc') });
      await page.waitForTimeout(100);
      const fn2 = await page.locator('#app .filebtn .fn').innerText();
      if (fn2 !== 'rec.webm') fail('F-18/filename', 'اسم الملف لم يظهر: ' + fn2);
      await hOverflow('F-18/overflow');
      await page.unroute('**/api/me/hifz'); await page.unroute('**/api/quran/editions'); await page.unroute('**/api/quran/reference');
      await page.evaluate(() => { try { localStorage.removeItem('fdMode'); } catch {} });
    }
    // 6k) المصدر: لا عبارات المالك/الإدارة في ملفي الواجهة
    for (const dir of ['web-vercel', 'web']) {
      const src = fs.readFileSync(path.join(here, '../packages', dir, 'index.html'), 'utf8');
      for (const w of ['ترخيص الصوت قرار المالك', 'بانتظار اعتماد الإدارة العلمية']) if (src.includes(w)) fail('F-04/source/' + dir, 'ما زالت العبارة في المصدر: ' + w);
      if (/href:'javascript:void 0'/.test(src)) fail('F-16/source/' + dir, 'ما زالت روابط javascript:void 0');
      if (/id="more"|#more/.test(src)) fail('F-14/source/' + dir, 'بقايا #more');
    }
  }
  // (7) TARTIL 14.1 UX/UI redesign: gated guides, FAQ/folds, no internal codes, progress wording, per-user storage, delete button, responsive, contrast, targets
  {
    const progsDoc = JSON.parse(fs.readFileSync(path.join(ROOT, 'academy-programs.json'), 'utf8')).programs;
    const guidesDoc = JSON.parse(fs.readFileSync(path.join(ROOT, 'academy-guides.json'), 'utf8')).guides;
    const isAdult = p => (p.age_min || 0) >= 16 || (p.gating && p.gating.adults_only);
    const P07 = progsDoc.find(p => p.id === 'P07');
    const adg = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
    const N07 = P07.stages.reduce((s, st) => s + st.items.length, 0);
    const LREF = P07.stages.flatMap(s => s.items).map(i => i.ref).find(r => lessonIds.includes(r));
    const PERSONA = {
      student: { id: 'u2', displayName: 'طالب', roles: [], memberships: [{ institutionId: 'i1', role: 'student' }] },
      qari: { id: 'u4', displayName: 'مقرئ', roles: [], memberships: [{ institutionId: 'i1', role: 'qari' }] },
      guardian: { id: 'u5', displayName: 'ولي', roles: [], memberships: [{ institutionId: 'i1', role: 'guardian' }] },
      plain: { id: 'u1', displayName: 'مستخدم', roles: [], memberships: [] },
    };
    let nav = 0;
    const mk = async (me, w = 390, extra = {}) => {
      const c = await browser.newContext({ viewport: { width: w, height: 800 }, locale: 'ar', ...extra });
      await c.addInitScript(() => { try { sessionStorage.setItem('t', 'e2e-token'); } catch {} });
      await c.route('**/api/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(me) }));
      const pg = await c.newPage(); const errs = [];
      pg.on('pageerror', e => errs.push(e.message));
      pg.on('dialog', d => d.dismiss().catch(() => {}));
      return { c, pg, errs };
    };
    const open = async (pg, h, sel = '#app .acx h1') => { await pg.goto(`${BASE}/index.html?n=${++nav}#${h}`); await pg.waitForSelector(sel, { timeout: 8000 }); await pg.waitForTimeout(120); };
    const text = pg => pg.locator('#app').innerText();
    const raw = pg => pg.locator('#app').evaluate(e => e.textContent);
    const ovf = pg => pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    // structural completeness of a rendered page: no heading without content, no fold without body, no answer-less FAQ
    const emptiness = pg => pg.evaluate(() => {
      const bad = [];
      document.querySelectorAll('#app .gsec').forEach(s => { const h = s.querySelector('h2'); if (s.innerText.replace(h ? h.innerText : '', '').trim().length < 3) bad.push('قسم فارغ: ' + (h && h.innerText)); });
      document.querySelectorAll('#app details').forEach(d => { const s = d.querySelector('summary'); if (d.textContent.replace(s ? s.textContent : '', '').trim().length < 3) bad.push('تفصيل فارغ: ' + (s && s.textContent)); });
      document.querySelectorAll('#app h2.sh').forEach(h => { const n = h.nextElementSibling; if (!n && !h.closest('.gsec')) bad.push('عنوان بلا محتوى: ' + h.innerText); });
      return bad;
    });
    try {
      // ---- 7a student: program page is learner-only; guides closed
      {
        const { c, pg, errs } = await mk(PERSONA.student);
        const youth = progsDoc.find(p => !isAdult(p) && p.id === 'P07');
        await open(pg, '/academy/p/' + youth.slug);
        const t = await text(pg), r = await raw(pg);
        for (const w of ['دليل المرشد', 'دليل ولي الأمر', 'أسئلة شائعة', 'للمرشد وولي الأمر', 'حواجز', 'جهة المراجعة', 'وضع المرشد']) if (t.includes(w)) fail('7a/student/' + w, 'نص موجّه للكبار ظاهر في صفحة الطالب');
        if (await pg.locator('#app a[href$="/guide"],#app a[href$="/parent"]').count()) fail('7a/student/links', 'رابط الدليل ظاهر لطالب');
        internalHit('7a/student/prog', r);
        for (const k of ['guide', 'parent']) { await open(pg, `/academy/p/${youth.slug}/${k}`); const g = await text(pg);
          if (!g.includes('ولا تُفتح من حساب طالب') || g.includes('أسئلة شائعة') || await pg.locator('#ac-ack').count()) fail('7a/student/' + k, 'يجب حجب الدليل بلا إتاحة الإقرار: ' + g.slice(0, 80)); }
        await open(pg, '/academy', '.pcard');
        if (await pg.locator('#ac-adults').count()) fail('7a/student/home', 'صندوق المرشدين ظاهر لطالب');
        await open(pg, '/academy/l/' + LREF);
        if (await pg.locator('.gswitch').count()) fail('7a/student/lesson', 'زر وضع المرشد ظاهر لطالب');
        // a student cannot enable the mentor key by hand either
        await pg.evaluate(() => { localStorage.setItem('acx:user:u2:mentor', JSON.stringify({ ack: true })); localStorage.setItem('acx:user:u2:guideon', 'true'); });
        await open(pg, `/academy/p/${youth.slug}/guide`); if ((await text(pg)).includes('أسئلة شائعة')) fail('7a/student/forced', 'مفتاح يدوي فتح الدليل لطالب');
        if (errs.length) fail('7a/errors', errs.join('|'));
        await c.close();
      }
      // ---- 7b qari + guardian: links, guide/parent pages, FAQ open with chevron, no empty sections, no internal codes, no overflow
      {
        const { c, pg, errs } = await mk(PERSONA.qari);
        await open(pg, '/academy/p/' + P07.slug);
        const hasG = await pg.locator(`#app a[href="#/academy/p/${P07.slug}/guide"]`).count(), hasP = await pg.locator(`#app a[href="#/academy/p/${P07.slug}/parent"]`).count();
        if (!hasG || !hasP) fail('7b/qari/links', `روابط الدليلين ${hasG}/${hasP}`);
        for (const k of ['guide', 'parent']) {
          await open(pg, `/academy/p/${P07.slug}/${k}`);
          const t = await text(pg);
          if (!t.includes('أسئلة شائعة')) fail('7b/faq/' + k, 'لا أسئلة شائعة');
          const faq = await pg.evaluate(() => [...document.querySelectorAll('#app details.faq')].map(d => ({ open: d.open, a: (d.querySelector('p') || {}).textContent || '', chev: getComputedStyle(d.querySelector('summary'), '::after').content, mk: getComputedStyle(d.querySelector('summary')).listStyleType })));
          if (!faq.length) fail('7b/faq-count/' + k, 'لا عناصر FAQ');
          faq.forEach((f, i) => { if (!f.open || f.a.trim().length < 5) fail(`7b/faq/${k}#${i}`, 'الإجابة غير ظاهرة أو فارغة'); if (!f.chev || f.chev === 'none' || f.chev === 'normal') fail(`7b/chevron/${k}#${i}`, 'لا سهم فتح'); });
          const em = await emptiness(pg); if (em.length) fail('7b/empty/' + k, em.join(' ; '));
          if (/\bD\d+\b/.test(await raw(pg))) fail('7b/D/' + k, 'D\\d+ ظاهر');
        }
        // all programs: guide + parent views clean
        for (const p of progsDoc) for (const k of ['guide', 'parent']) {
          const id = `7b/all/${p.id}/${k}`;
          try { await open(pg, `/academy/p/${p.slug}/${k}`); internalHit(id, await raw(pg)); const em = await emptiness(pg); if (em.length) fail(id, em.join(' ; ')); const o = await ovf(pg); if (o > 0) fail(id, 'تمرير أفقي ' + o); }
          catch (e) { fail(id, e.message.split('\n')[0]); }
        }
        if (errs.length) fail('7b/errors', errs.join('|'));
        await c.close();
        const g2 = await mk(PERSONA.guardian);
        await open(g2.pg, '/academy/p/' + P07.slug); if (!(await g2.pg.locator('#app a[href$="/parent"]').count())) fail('7b/guardian/link', 'لا رابط دليل ولي الأمر');
        await g2.c.close();
      }
      // ---- 7c plain adult account: no links until an explicit acknowledgement
      {
        const { c, pg } = await mk(PERSONA.plain);
        await open(pg, '/academy/p/' + P07.slug);
        if (await pg.locator('#app a[href$="/guide"]').count()) fail('7c/plain/link', 'رابط الدليل ظاهر بلا إقرار');
        await open(pg, `/academy/p/${P07.slug}/guide`);
        if ((await text(pg)).includes('أسئلة شائعة')) fail('7c/plain/leak', 'الدليل مفتوح بلا إقرار');
        if (!(await pg.locator('#ac-ack').count()) || !(await pg.locator('#ac-ack-go').isDisabled())) fail('7c/plain/ack', 'لا خانة إقرار أو الزر غير معطّل');
        await pg.locator('#ac-ack').check(); await pg.locator('#ac-ack-go').click(); await pg.waitForTimeout(150);
        if (!(await text(pg)).includes('أسئلة شائعة')) fail('7c/plain/open', 'الدليل لم يفتح بعد الإقرار');
        if (!(await pg.evaluate(() => Object.keys(localStorage).some(k => k === 'acx:user:u1:mentor')))) fail('7c/plain/key', 'مفتاح الإقرار غير مقيّد بالمستخدم');
        await open(pg, '/academy/p/' + P07.slug);
        if (!(await pg.locator('#app a[href$="/guide"]').count())) fail('7c/plain/after', 'الرابط لا يظهر بعد الإقرار');
        await c.close();
      }
      // ---- 7d progress wording, per-user keys, delete button
      {
        const { c, pg, errs } = await mk(PERSONA.plain);
        await open(pg, '/academy/p/' + P07.slug);
        const pr = await pg.locator('.pprog').innerText();
        if (!new RegExp('أنجزتَ ٠ من ' + adg(N07) + ' خطوة').test(pr)) fail('7d/wording', 'الصياغة: ' + pr.replace(/\s+/g, ' ').slice(0, 80));
        if (/\d/.test(pr)) fail('7d/digits', 'أرقام لاتينية في التقدّم: ' + pr.replace(/\s+/g, ' ').slice(0, 100));
        if (!pr.includes('محفوظ على هذا الجهاز فقط')) fail('7d/local', 'لا توضيح أن التقدّم محلي');
        if (/تزامن|مزامنة/.test(pr) && !/لا يُزامَن/.test(pr)) fail('7d/sync', 'ادّعاء مزامنة');
        if (!/أنشطة البرنامج/.test(pr) || !/الخطوة التالية المقترحة/.test(pr) || (await pg.locator('#ac-go').innerText()).trim() !== 'تابع') fail('7d/parts', 'أجزاء التقدّم/زر تابع ناقصة');
        // finish a lesson + write a reflection, through the UI
        await open(pg, '/academy/l/' + LREF);
        for (let i = 0; i < 40; i++) { if (await pg.locator('textarea').count()) break; const nx = pg.locator('.nav2 button', { hasText: 'التالي' }); if (!(await nx.count())) break; await nx.click(); }
        await pg.locator('textarea').fill('ملاحظة اختبار');
        const privTxt = await text(pg);
        if (!privTxt.includes('يبقى ما تكتبه هنا على هذا الجهاز ولا يُرسَل إلى أحد؛ من يستعمل الجهاز نفسه قد يراه')) fail('7d/privacy-text', 'نص الخصوصية الصادق غير ظاهر');
        if (/لا يراه أحد|ولا يراه أحد/.test(privTxt)) fail('7d/privacy-claim', 'ادّعاء «لا يراه أحد» ظاهر');
        if (!(await pg.locator('#ac-del').count())) fail('7d/del-in-lesson', 'زر الحذف غير موجود في الدرس');
        await pg.locator('.nav2 button', { hasText: 'التالي' }).click();
        await pg.locator('button', { hasText: 'أنهيتُ الدرس' }).click(); await pg.waitForTimeout(200);
        const keys = await pg.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('acx')));
        if (!keys.includes('acx:user:u1:done') || !keys.includes('acx:user:u1:ref:' + LREF)) fail('7d/keys', 'مفاتيح غير مقيّدة بالمستخدم: ' + keys.join(','));
        if (keys.some(k => k === 'acx_done' || k.startsWith('acx_ref_'))) fail('7d/legacy-write', 'كتابة على مفاتيح غير مقيّدة: ' + keys.join(','));
        await open(pg, '/academy/p/' + P07.slug);
        if (!new RegExp('أنجزتَ ١ من ' + adg(N07) + ' خطوة').test(await pg.locator('.pprog').innerText())) fail('7d/count', 'العدّ لم يتحدّث');
        // another account on the same browser sees none of it
        await pg.route('**/api/me', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...PERSONA.plain, id: 'u9' }) }));
        await pg.evaluate(() => { ME = null; }); await pg.reload(); await pg.waitForSelector('#app .acx h1'); await pg.waitForTimeout(150);
        if (!new RegExp('أنجزتَ ٠ من ' + adg(N07) + ' خطوة').test(await pg.locator('.pprog').innerText())) fail('7d/other-user', 'حساب آخر يرى تقدّم u1');
        await pg.goto(`${BASE}/index.html?n=${++nav}#/academy/l/${LREF}`); await pg.waitForSelector('#app .acx h1');
        for (let i = 0; i < 40; i++) { if (await pg.locator('textarea').count()) break; await pg.locator('.nav2 button', { hasText: 'التالي' }).click(); }
        if ((await pg.locator('textarea').inputValue()) !== '') fail('7d/other-notebook', 'حساب آخر يرى دفتر u1');
        await pg.unroute('**/api/me');
        // delete: other user's data untouched; own data removed after confirmation; cancel keeps it
        await pg.goto(`${BASE}/index.html?n=${++nav}#/academy`); await pg.waitForSelector('.pcard');
        await pg.evaluate(() => localStorage.setItem('acx:user:u9:done', '{"x":1}'));
        pg.removeAllListeners('dialog'); pg.once('dialog', d => d.dismiss());
        await pg.locator('#ac-privacy summary').click(); await pg.locator('#ac-del').click(); await pg.waitForTimeout(150);
        if (!(await pg.evaluate(() => !!localStorage.getItem('acx:user:u1:done')))) fail('7d/cancel', 'الإلغاء حذف البيانات');
        pg.once('dialog', d => d.accept());
        await pg.locator('#ac-del').click(); await pg.waitForTimeout(300);
        const after = await pg.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('acx')));
        if (after.some(k => k.startsWith('acx:user:u1:'))) fail('7d/delete', 'بقيت مفاتيح u1: ' + after.join(','));
        if (!after.includes('acx:user:u9:done')) fail('7d/delete-scope', 'حُذفت بيانات مستخدم آخر');
        if (errs.length) fail('7d/errors', errs.join('|'));
        await c.close();
      }
      // ---- 7d2 logout: asks, detaches; wipes on consent
      {
        const { c, pg } = await mk(PERSONA.plain);
        await open(pg, '/academy/l/' + LREF);
        await pg.evaluate(r => localStorage.setItem('acx:user:u1:done', JSON.stringify({ [r]: 1 })), LREF);
        let msg = ''; pg.removeAllListeners('dialog'); pg.once('dialog', d => { msg = d.message(); d.accept(); });
        await pg.evaluate(() => acLogoutPrompt());
        if (!/احذفهما الآن/.test(msg)) fail('7d2/prompt', 'لا يُسأل المستخدم عند الخروج');
        if (await pg.evaluate(() => !!localStorage.getItem('acx:user:u1:done'))) fail('7d2/wipe', 'لم تُمحَ البيانات بعد الموافقة');
        await pg.evaluate(r => localStorage.setItem('acx:user:u1:done', JSON.stringify({ [r]: 1 })), LREF);
        pg.once('dialog', d => d.dismiss()); await pg.evaluate(() => acLogoutPrompt());
        if (!(await pg.evaluate(() => !!localStorage.getItem('acx:user:u1:done')))) fail('7d2/keep', 'حُذفت بيانات رغم الإلغاء');
        await c.close();
      }
      // ---- 7e learner lesson: session path, one step at a time, formative hidden, no overflow at 4 widths
      {
        const { c, pg, errs } = await mk(PERSONA.plain);
        for (const w of [375, 390, 768, 1440]) {
          await pg.setViewportSize({ width: w, height: 800 });
          const hs = ['/academy', '/academy/p/' + P07.slug, '/academy/s/' + scenarioIds[0], '/academy/c/' + lessonsDoc.units[Object.keys(lessonsDoc.units)[0]].competency];
          for (const h of hs) { await open(pg, h, '#app .acx'); const o = await ovf(pg); if (o > 0) fail(`7e/overflow/${w}${h}`, 'تمرير أفقي ' + o); }
          await open(pg, '/academy/l/' + LREF);
          for (let i = 0; i < 12; i++) {
            const o = await ovf(pg); if (o > 0) fail(`7e/overflow/${w}/lesson#${i}`, 'تمرير أفقي ' + o);
            if (w === 390 && i === 0) {
              const t = await text(pg);
              if (!/أكتشف/.test(t) || !/الخطوة ١ من/.test(t)) fail('7e/path', 'مسار الجلسة/الخطوة غير ظاهر');
              if (!(await pg.locator('.phases li.on').count()) || !(await pg.locator('.bar2[role=progressbar]').count())) fail('7e/header', 'رأس الجلسة ناقص');
            }
            const nx = pg.locator('.nav2 button', { hasText: 'التالي' }); if (!(await nx.count())) break; await nx.click();
          }
          const end = await text(pg);
          if (/ظهر:|يتدرّب:|يحتاج دعمًا:/.test(end)) fail('7e/formative/' + w, 'ملاحظات التقييم ظاهرة للمتعلم');
          if (await pg.locator('#app .acx details:not([open]) > summary').count() === 0 && false) fail('x', 'x');
          const lw = await pg.evaluate(() => { let n = 0; document.querySelectorAll('#app .lesson h1').forEach(() => n++); return n; });
          if (lw > 1) fail('7e/one-h1', 'أكثر من h1');
        }
        // every program page at all four widths
        for (const w of [375, 390, 768, 1440]) { await pg.setViewportSize({ width: w, height: 800 });
          for (const p of progsDoc) { const id = `7e/prog/${w}/${p.id}`; try { await open(pg, '/academy/p/' + p.slug); const o = await ovf(pg); if (o > 0) fail(id, 'تمرير أفقي ' + o); const em = await emptiness(pg); if (em.length) fail(id, em.join(';')); internalHit(id, await raw(pg)); } catch (e) { fail(id, e.message.split('\n')[0]); } } }
        if (errs.length) fail('7e/errors', errs.join('|'));
        await c.close();
      }
      // ---- 7f contrast (>=4.5) and touch targets (>=44) on the redesigned pages, light + dark
      {
        const { c, pg } = await mk(PERSONA.qari);
        const pages = [['/academy', '.pcard'], ['/academy/p/' + P07.slug, '.pprog'], ['/academy/p/' + P07.slug + '/guide', '.gsec'], ['/academy/l/' + LREF, '.lesson'], ['/academy/c/' + lessonsDoc.units[Object.keys(lessonsDoc.units)[0]].competency, '.item']];
        for (const theme of ['light', 'dark']) {
          await pg.addInitScript(t => { try { localStorage.setItem('theme', t); } catch {} }, theme);
          for (const [h, sel] of pages) {
            await open(pg, h, sel); await pg.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme); await pg.waitForTimeout(80);
            const res = await pg.evaluate(() => {
              const P = s => { const c = document.createElement('canvas').getContext('2d'); c.fillStyle = '#000'; c.fillStyle = s; c.fillRect(0, 0, 1, 1); const d = c.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3]]; };
              const L = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]) };
              const CR = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05) };
              const bgOf = e => { for (let n = e; n; n = n.parentElement) { const s = getComputedStyle(n); if (s.backgroundImage !== 'none') return null; const c = P(s.backgroundColor); if (c[3] > 250) return c; } return P(getComputedStyle(document.body).backgroundColor); };
              const bad = [];
              document.querySelectorAll('#app .acx *').forEach(e => {
                const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1); if (!own) return;
                const r = e.getBoundingClientRect(); if (!r.width || !r.height) return; if (e.closest('button:disabled,[aria-disabled=true]')) return;
                const bg = bgOf(e); if (!bg) return; const s = getComputedStyle(e); const fg = P(s.color); fg[3] = 255;
                const op = parseFloat(s.opacity) || 1; if (op < 1) return;
                const cr = CR(fg, bg); if (cr < 4.5) bad.push(cr.toFixed(2) + ' ' + e.tagName + '.' + e.className + ' «' + e.textContent.trim().slice(0, 24) + '»');
              });
              const tgt = [];
              if (innerWidth <= 800) document.querySelectorAll('#app .acx button:not(:disabled), #app .acx .btn, #app .acx summary, #app .acx a.item, #app .acx a.pcard, #app .acx .seg a, #app .acx .back, #app .acx .tabs2 [role=tab]').forEach(e => { const r = e.getBoundingClientRect(); if (r.width && r.height && r.height < 43.5) tgt.push(Math.round(r.height) + ' ' + e.tagName + '.' + e.className + ' «' + e.textContent.trim().slice(0, 20) + '»'); });
              return { bad: [...new Set(bad)].slice(0, 6), tgt: [...new Set(tgt)].slice(0, 6) };
            });
            if (res.bad.length) fail(`7f/contrast/${theme}${h}`, res.bad.join(' | '));
            if (res.tgt.length) fail(`7f/target/${theme}${h}`, res.tgt.join(' | '));
          }
        }
        await c.close();
      }
      // ---- 7g reduced motion
      {
        const { c, pg } = await mk(PERSONA.plain, 390, { reducedMotion: 'reduce' });
        await open(pg, '/academy/p/' + P07.slug, '.pprog');
        const d = await pg.evaluate(() => { const i = document.querySelector('.bar2 i'); return getComputedStyle(i).transitionDuration; });
        if (!/^0s(, 0s)*$/.test(d)) fail('7g/reduced-motion', 'انتقال غير مُعطَّل: ' + d);
        await c.close();
      }
      // ---- 7h sources: both bundles identical apart from api-base; no old unscoped keys written
      {
        const a = fs.readFileSync(path.join(here, '../packages/web-vercel/index.html'), 'utf8'), b = fs.readFileSync(path.join(here, '../packages/web/index.html'), 'utf8');
        const norm = s => s.replace(/<meta name="api-base"[^>]*>/, '');
        if (norm(a) !== norm(b)) fail('7h/diff', 'web و web-vercel يختلفان خارج api-base');
        for (const [n, s] of [['web-vercel', a], ['web', b]]) {
          if (/acLS\.set\('acx_(done|guide)'/.test(s) || /'acx_ref_'\+id/.test(s)) fail('7h/legacy/' + n, 'كتابة على مفاتيح غير مقيّدة');
          if (!/acLogoutPrompt\(\);setToken\(null\)/.test(s)) fail('7h/logout/' + n, 'الخروج لا يمرّ عبر acLogoutPrompt');
        }
      }
    } catch (e) { fail('7/fatal', e.stack || e.message); }
  }
} catch (e) {
  fail('fatal', e.stack || e.message);
} finally {
  if (browser) await browser.close();
  server.close();
}

console.log(`برامج متوقعة | دروس: ${lessonIds.length} | سيناريوهات: ${scenarioIds.length}`);
if (fails.length) {
  console.log(`فشل (${fails.length}):`);
  for (const f of fails.slice(0, 60)) console.log(' - ' + f);
  if (fails.length > 60) console.log(` ... و${fails.length - 60} أخرى`);
  process.exit(1);
}
console.log('نجح: كل الفحوص (1-7) سليمة');
process.exit(0);
