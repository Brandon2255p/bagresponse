const CACHE_NAME = 'bagresponse-audio-cache-v1';

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
];

// Install event - cache audio files
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching audio files...');
                return cache.addAll(AUDIO_FILES);
            })
            .catch((err) => {
                console.error('Failed to cache audio files:', err);
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
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache when available
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Only cache audio files from the sounds directory
    if (request.url.includes('/sounds/')) {
        event.respondWith(
            caches.match(request).then((response) => {
                // Return cached version or fetch from network
                if (response) {
                    return response;
                }

                return fetch(request).then((networkResponse) => {
                    // Cache the new response for future
                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseToCache);
                        });
                    }
                    return networkResponse;
                });
            })
        );
    }
});
