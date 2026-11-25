// Service worker Iron Log: l'app si apre anche offline.
// - Pagine: prima la rete (versione sempre aggiornata), se manca la rete la copia in cache.
// - File statici con hash nel nome (/static/...): dalla cache, poi la rete.
// - Supabase e altri domini: mai in cache (dati personali sempre freschi e mai salvati qui).
const CACHE = "ironlog-v2";
const SHELL = ["./", "./index.html", "./manifest.json", "./favicon.svg"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)); return res; })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  if (url.pathname.includes("/static/") || /\.(woff2?|svg|png|js|css)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
