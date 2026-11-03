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
  const INTERNAL = /SPR-|D11|BLUEPRINT|CLAUDE\.md|المالك(?![\u0621-\u064A])|ترخيص الصوت|اعتماد الإدارة العلمية|\b[A-Z]\d{1,2}-[LS]\d{1,2}\b|\bP\d\d\b/;
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
    await page.evaluate(() => { try { localStorage.setItem('acx_guide', 'true'); } catch {} });
    for (const l of lessonIds) {
      const id = 'guide-lesson/' + l;
      try {
        await go('/academy/l/' + l, '.acx h1');
        const raws = await page.evaluate(() => { const o = [document.querySelector('#app').textContent];
          for (let i = 0; i < 40; i++) { const nx = [...document.querySelectorAll('.nav2 button')].find(b => b.textContent.trim() === 'التالي'); if (!nx) break; nx.click(); o.push(document.querySelector('#app').textContent); } return o; });
        raws.forEach((t, i) => internalHit(`${id}#${i}`, t));
      } catch (e) { fail(id, e.message.split('\n')[0]); }
    }
    await page.evaluate(() => { try { localStorage.removeItem('acx_guide'); } catch {} });

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
      await go('/foundations', '#app .card');
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
    // 6k) المصدر: لا عبارات المالك/الإدارة في ملفي الواجهة
    for (const dir of ['web-vercel', 'web']) {
      const src = fs.readFileSync(path.join(here, '../packages', dir, 'index.html'), 'utf8');
      for (const w of ['ترخيص الصوت قرار المالك', 'بانتظار اعتماد الإدارة العلمية']) if (src.includes(w)) fail('F-04/source/' + dir, 'ما زالت العبارة في المصدر: ' + w);
    }
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
console.log('نجح: كل الفحوص (1-6) سليمة');
process.exit(0);
