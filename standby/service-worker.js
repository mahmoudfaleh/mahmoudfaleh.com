const CACHE_NAME = 'standby-cache-v1';
const urlsToCache = [
    'https://mahmoudfaleh.github.io/standby/', // The base URL of your PWA
    'https://mahmoudfaleh.github.io/standby/index.html',
    'https://mahmoudfaleh.github.io/standby/manifest.json',
    'https://mahmoudfaleh.github.io/standby/photos.json',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
    'https://mahmoudfaleh.github.io/standby/icons/icon-192x192.png',
    'https://mahmoudfaleh.github.io/standby/icons/icon-512x512.png',
    'https://mahmoudfaleh.github.io/standby/service-worker.js' // Itself needs to be cached
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then(
                    (response) => {
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        return response;
                    }
                );
            })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
