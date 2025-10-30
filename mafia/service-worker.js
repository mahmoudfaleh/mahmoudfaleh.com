const CACHE_NAME = "pwa-0.8.1";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./coolkid.webp",
  "./ossasio.jpeg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).catch(() => {
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
      });
    })
  );
});
