// Rendered-page completeness scan (TARTIL 14.1). Usage: node scripts/validate_completeness_rendered.mjs
// Serves packages/web-vercel statically, mocks /api, opens every program, lesson (all steps, learner and guide mode) and scenario,
// expands every <details>, and fails on: entities (&#x..;), undefined/NaN/[object, empty details, empty lists, headings with no content, internal markers, horizontal overflow.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../packages/web-vercel');
const req = createRequire(import.meta.url); let pw;
for (const p of [undefined, '/opt/npm-tools/node_modules', '/usr/lib/node_modules', '/usr/local/lib/node_modules']) { try { pw = req(p ? req.resolve('playwright', { paths: [p] }) : 'playwright'); break; } catch {} }
if (!pw) { console.error('playwright unavailable'); process.exit(2); }
const MIME = { '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((rq, res) => { let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = path.join(ROOT, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
await new Promise(r => srv.listen(0, '127.0.0.1', r)); const BASE = `http://127.0.0.1:${srv.address().port}`;
const progs = JSON.parse(fs.readFileSync(path.join(ROOT, 'academy-programs.json'), 'utf8')).programs;
const units = JSON.parse(fs.readFileSync(path.join(ROOT, 'academy-lessons.json'), 'utf8')).units;
const lessonIds = [], scenIds = []; for (const u of Object.values(units)) { (u.lessons || []).forEach(l => lessonIds.push(l.id)); (u.scenarios || []).forEach(s => scenIds.push(s.id)); }
const BAD = [[/&#x?[0-9a-f]+;|&(amp|lt|gt|quot|nbsp);/i, 'html_entity'], [/\bundefined\b|\bNaN\b|\[object |\bnull\b/, 'js_leak'], [/\bD\d{1,2}\b|SPR-|CLAUDE\.md|BLUEPRINT|المالك(?![ء-ي])/, 'internal_marker'], [/\b[A-Z]\d{1,2}-[LS]\d{1,2}\b/, 'raw_id']];
const fails = {}; const f = (c, w, d = '') => (fails[c] ||= []).push(w + (d ? ' :: ' + d : ''));
const browser = await pw.chromium.launch();
async function run(mode) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 }, locale: 'ar' });
  await ctx.addInitScript(g => { try { sessionStorage.setItem('t', 'e2e'); if (g) { localStorage.setItem('acx:user:u1:mentor', '{"ack":true}'); localStorage.setItem('acx:user:u1:guideon', 'true'); } } catch {} }, mode === 'guide');
  await ctx.route('**/api/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'u1', displayName: 'م', roles: [], memberships: [] }) }));
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const scan = async (w) => {
    const r = await pg.evaluate(() => {
      const app = document.querySelector('#app'); app.querySelectorAll('details').forEach(d => d.open = true);
      const out = { text: app.textContent, emptyDetails: [], emptyLists: 0, emptyHeads: [], over: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      app.querySelectorAll('details').forEach(d => { const s = d.querySelector('summary'); const body = [...d.childNodes].filter(n => n !== s).map(n => n.textContent).join('').trim(); if (!body) out.emptyDetails.push((s && s.textContent.trim()) || '(no summary)'); });
      app.querySelectorAll('ul,ol').forEach(l => { if (!l.children.length) out.emptyLists++; });
      app.querySelectorAll('h2,h3,h4').forEach(h => { let n = h.nextElementSibling; const own = h.textContent.trim(); if (!n || /^H[1-4]$/.test(n.tagName)) out.emptyHeads.push(own); else if (!n.textContent.trim() && !n.querySelector('input,textarea,button,img,svg')) out.emptyHeads.push(own); });
      return out; });
    for (const [re, c] of BAD) { const m = re.exec(r.text); if (m) f(c, `${mode} ${w}`, r.text.slice(Math.max(0, m.index - 30), m.index + 30).replace(/\s+/g, ' ')); }
    r.emptyDetails.forEach(s => f('empty_details', `${mode} ${w}`, s)); if (r.emptyLists) f('empty_list', `${mode} ${w}`, String(r.emptyLists));
    r.emptyHeads.forEach(s => f('heading_without_content', `${mode} ${w}`, s)); if (r.over > 0) f('h_overflow', `${mode} ${w}`, r.over + 'px');
  };
  const go = async (h, sel) => { if (pg.url().startsWith(BASE)) await pg.evaluate(x => { location.hash = x; }, h); else await pg.goto(`${BASE}/index.html#${h}`); await pg.waitForSelector(sel, { timeout: 8000 }); await pg.waitForTimeout(40); };
  for (const p of progs) { try { await go('/academy/p/' + p.slug, '.acx h1'); await scan('program/' + p.id); } catch (e) { f('render_error', 'program/' + p.id, e.message.split('\n')[0]); } }
  for (const id of lessonIds) { try { await go('/academy/l/' + id, '.acx h1');
      for (let i = 0; i < 30; i++) { await scan(`lesson/${id}#${i}`); const nx = await pg.evaluate(() => { const b = [...document.querySelectorAll('.nav2 button')].find(x => x.textContent.trim() === 'التالي'); if (b) { b.click(); return true; } return false; }); if (!nx) break; }
    } catch (e) { f('render_error', 'lesson/' + id, e.message.split('\n')[0]); } }
  for (const id of scenIds) { try { await go('/academy/s/' + id, '.acx h3'); await scan('scenario/' + id); } catch (e) { f('render_error', 'scenario/' + id, e.message.split('\n')[0]); } }
  if (errs.length) f('js_error', mode, errs.slice(0, 3).join(' | '));
  await ctx.close();
}
await run('learner'); await run('guide'); await browser.close(); srv.close();
const n = Object.values(fails).reduce((a, v) => a + v.length, 0);
for (const [c, v] of Object.entries(fails).sort((a, b) => b[1].length - a[1].length)) { console.log(`FAIL ${c}: ${v.length}`); v.slice(0, 5).forEach(x => console.log('   -', x)); }
console.log(`rendered scan: ${progs.length} programs, ${lessonIds.length} lessons, ${scenIds.length} scenarios; RESULT: ${n ? 'FAIL (' + n + ')' : 'PASS'}`);
process.exit(n ? 1 : 0);
