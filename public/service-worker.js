const CACHE_NAME = 'bagresponse-cache-v2';

// App shell files to cache
const APP_SHELL_FILES = [
    '/',
    '/manifest.json',
];

// Audio files to cache
const AUDIO_FILES = [
    // man_1 voice (wav)
    '/sounds/man_1/1.wav',
    '/sounds/man_1/2.wav',
    '/sounds/man_1/3.wav',
    '/sounds/man_1/4.wav',
    '/sounds/man_1/5.wav',
    '/sounds/man_1/6.wav',
    '/sounds/man_1/7.wav',
    '/sounds/man_1/8.wav',
    // man_2 voice (mp3)
    '/sounds/man_2/1.mp3',
    '/sounds/man_2/2.mp3',
    '/sounds/man_2/3.mp3',
    '/sounds/man_2/4.mp3',
    '/sounds/man_2/5.mp3',
    '/sounds/man_2/6.mp3',
    '/sounds/man_2/7.mp3',
    '/sounds/man_2/8.mp3',
    // woman_1 voice (mp3)
    '/sounds/woman_1/1.mp3',
    '/sounds/woman_1/2.mp3',
    '/sounds/woman_1/3.mp3',
    '/sounds/woman_1/4.mp3',
    '/sounds/woman_1/5.mp3',
    '/sounds/woman_1/6.mp3',
    '/sounds/woman_1/7.mp3',
    '/sounds/woman_1/8.mp3',
    // woman_2 voice (mp3)
    '/sounds/woman_2/1.mp3',
    '/sounds/woman_2/2.mp3',
    '/sounds/woman_2/3.mp3',
    '/sounds/woman_2/4.mp3',
    '/sounds/woman_2/5.mp3',
    '/sounds/woman_2/6.mp3',
    '/sounds/woman_2/7.mp3',
    '/sounds/woman_2/8.mp3',
];

const ALL_CACHED_FILES = [...APP_SHELL_FILES, ...AUDIO_FILES];

// Install event - cache app shell and audio files
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching app shell and audio files...');
                return cache.addAll(ALL_CACHED_FILES);
            })
            .catch((err) => {
                console.error('[SW] Failed to cache files:', err);
            })
    );
    // Activate immediately
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        })
    );
    // Take control of all clients immediately
    self.clients.claim();
});

// Fetch event - serve from cache when available, with network fallback
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip cross-origin requests
    if (url.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        caches.match(request).then((response) => {
            // Return cached version if available
            if (response) {
                return response;
            }

            // Otherwise fetch from network
            return fetch(request)
                .then((networkResponse) => {
                    // Don't cache if not a valid response
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }

                    // Cache the new response for future
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseToCache);
                    });

                    return networkResponse;
                })
                .catch((error) => {
                    console.error('[SW] Fetch failed:', error);
                    // You could return a custom offline page here
                    throw error;
                });
        })
    );
});
