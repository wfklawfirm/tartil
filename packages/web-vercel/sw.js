// Service worker: app shell + Quran text reading offline. Never caches anything authenticated or personal.
const V = 'tartil-v1', SHELL = ['/', '/manifest.webmanifest', '/icon.svg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url); if (u.origin !== location.origin) return;
  if (u.pathname.startsWith('/api/')) {
    if (!u.pathname.startsWith('/api/quran')) return;                       // only public Quran text is cached
    if (r.headers.get('authorization')) return;
    e.respondWith(caches.open(V).then(async c => { const hit = await c.match(r);
      const net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => hit);
      return hit || net; }));
    return;
  }
  e.respondWith(fetch(r).then(res => { if (res.ok && (u.pathname === '/' || SHELL.includes(u.pathname))) caches.open(V).then(c => c.put(r, res.clone())); return res; })
    .catch(() => caches.match(r).then(h => h || caches.match('/'))));
});
