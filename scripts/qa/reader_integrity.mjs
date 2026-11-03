// Visual-redesign regression check: the verses shown in the reader must equal the stored text EXACTLY
// (ornaments, ayah markers, tajweed colouring and any display layer must never add, drop or change a character).
// Usage: PW_PATH=<path to playwright module> API=<api base> node scripts/qa/reader_integrity.mjs
import {createRequire} from 'node:module';import {execSync} from 'node:child_process';import {readFileSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)(process.env.PW_PATH);
const API=process.env.API||'https://okbtrogotrtciymmuokr.supabase.co/functions/v1/api';
const html=readFileSync(new URL('../../packages/web-vercel/index.html',import.meta.url),'utf8');
const cache=new Map(),raw=p=>{if(!cache.has(p))cache.set(p,execSync(`curl -s "${API}${p}"`,{maxBuffer:5e7}).toString());return cache.get(p)},get=p=>JSON.parse(raw(p));
const ed=get('/quran/editions').editions[0];let bad=0,checked=0;
const b=await chromium.launch();
for(const tj of [false,true])for(const mode of ['flow','lines'])for(const sur of [1,2,9,36,67,112,114]){
  const p=await b.newPage({viewport:{width:390,height:844}});
  await p.addInitScript(`localStorage.setItem('tj','${tj}');localStorage.setItem('mode','"${mode}"')`);
  await p.route('https://tartil.test/**',r=>{const u=new URL(r.request().url());
    if(u.pathname.startsWith('/api/'))return r.fulfill({status:200,contentType:'application/json',body:raw(u.pathname.slice(4)+u.search)});
    r.fulfill({status:200,contentType:'text/html',body:html})});
  await p.goto('https://tartil.test/#/quran/'+sur);await p.waitForSelector('.mushaf .a');
  const shown=await p.evaluate(()=>[...document.querySelectorAll('.mushaf .a')].map(a=>{const c=a.cloneNode(true);c.querySelectorAll('.aym,.orn').forEach(x=>x.remove());return{id:a.id,t:c.textContent.replace(/‍/g,'').replace(/ $/,'')}}));
  const markers=await p.evaluate(()=>[...document.querySelectorAll('.mushaf .a .aym')].map(x=>x.textContent));
  const want=get('/quran/'+encodeURIComponent(ed.code)+'/'+sur).ayat;
  if(shown.length!==want.length){console.log('COUNT MISMATCH',sur,shown.length,want.length);bad++}
  want.forEach((a,i)=>{checked++;if(!shown[i]||shown[i].t!==a.text){bad++;console.log('TEXT MISMATCH',sur,a.ayah,tj?'tajweed':'plain')}
    const m=(markers[i]||'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));if(+m!==a.ayah){bad++;console.log('MARKER MISMATCH',sur,a.ayah,markers[i])}});
  await p.close()}
await b.close();console.log(bad?`FAILED: ${bad} problems`:`OK: ${checked} verse renderings identical to stored text, numbering correct`);process.exit(bad?1:0);
