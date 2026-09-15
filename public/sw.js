// Service worker mínimo: só app shell/assets estáticos.
// Nunca faz cache de dados dinâmicos, chamadas de API/Supabase ou autenticação.
const CACHE = "shell-v1";
const ESTATICOS = ["/manifest.webmanifest", "/favicon.png", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ESTATICOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function podeCachear(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/api")) return false;
  if (url.pathname.startsWith("/_serverFn")) return false;
  if (url.search) return false;
  return /\.(?:css|js|png|svg|ico|webmanifest|woff2?)$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (!podeCachear(url)) return; // rede direta, sem cache

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && res.type === "basic") {
            const copia = res.clone();
            void caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return res;
        }),
    ),
  );
});
