/* ================================================
   RepoIA - Service Worker
   Versión de la aplicación: 1.0
   Al publicar una nueva versión, incrementa APP_VERSION
   (debe coincidir con APP_VERSION de index.html)
================================================ */
const APP_VERSION = '1.0';
const CACHE_NAME = `repoia-v${APP_VERSION}`;

const PRECACHE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './img/RepoIA.png',
    './img/icon-192.png',
    './img/icon-512.png',
    './img/icon-maskable-192.png',
    './img/icon-maskable-512.png',
    './img/apple-touch-icon.png',
    './img/favicon.ico',
    './img/favicon-32.png',
    'https://unpkg.com/tailwindcss-cdn@3.4.10/tailwindcss.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics-compat.js'
];

// INSTALL: precachea los recursos base
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// ACTIVATE: elimina cachés de versiones anteriores
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((names) => Promise.all(
                names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
            ))
            .then(() => self.clients.claim())
    );
});

// FETCH: network-first para navegaciones (datos frescos),
// cache-first para el resto (recursos estáticos)
self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
                    return response;
                })
                .catch(() => caches.match('./index.html'))
        );
        return;
    }

    if (request.method === 'GET') {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;
                return fetch(request).then((response) => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return response;
                }).catch(() => cached);
            })
        );
    }
});

// MESSAGE: permite a la app conocer la versión del SW (chip de versión)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'GET_VERSION') {
        const reply = { type: 'VERSION', version: APP_VERSION };
        // Preferimos responder por el puerto del MessageChannel
        if (event.ports && event.ports[0]) {
            event.ports[0].postMessage(reply);
        } else if (event.source) {
            event.source.postMessage(reply);
        } else {
            self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
                clients.forEach((client) => client.postMessage(reply));
            });
        }
    }
});
