const BASE_CACHE_NAME = 'bagresponse-cache';

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

// Get current cache name (includes version)
async function getCacheName() {
    try {
        // Fetch version file with cache-busting to ensure we get latest
        const response = await fetch(`/version.json?t=${Date.now()}`);
        if (response.ok) {
            const data = await response.json();
            const version = data.version || 'v1';
            return `${BASE_CACHE_NAME}-${version}`;
        }
    } catch (e) {
        console.log('[SW] Could not fetch version, using default cache');
    }
    // Default cache name if version fetch fails
    return `${BASE_CACHE_NAME}-default`;
}

// Check if cache needs update
async function checkAndUpdateCache() {
    const cacheName = await getCacheName();

    // Try to get existing cache
    const cacheNames = await caches.keys();
    const existingCache = cacheNames.find(name => name.startsWith(BASE_CACHE_NAME));

    // If cache doesn't exist or is different version, create new cache
    if (!existingCache || existingCache !== cacheName) {
        console.log('[SW] Creating new cache:', cacheName);
        const cache = await caches.open(cacheName);

        // Cache all files
        await cache.addAll(ALL_CACHED_FILES);

        // Delete old caches
        for (const name of cacheNames) {
            if (name.startsWith(BASE_CACHE_NAME) && name !== cacheName) {
                console.log('[SW] Deleting old cache:', name);
                await caches.delete(name);
            }
        }

        return cacheName;
    }

    return existingCache;
}

// Install event
self.addEventListener('install', (event) => {
    event.waitUntil(
        checkAndUpdateCache().then(() => {
            console.log('[SW] Service worker installed');
            self.skipWaiting();
        }).catch(err => {
            console.error('[SW] Install failed:', err);
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        checkAndUpdateCache().then(() => {
            console.log('[SW] Service worker activated');
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache when available, with network fallback
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip cross-origin requests (except for fonts, etc.)
    if (url.origin !== self.location.origin) {
        return;
    }

    // For version.json, always try network first and don't cache
    if (url.pathname === '/version.json') {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    // If offline and we have a cached version, use it
                    return caches.match('/version.json');
                })
        );
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
                    getCacheName().then(cacheName => {
                        caches.open(cacheName).then((cache) => {
                            cache.put(request, responseToCache);
                        });
                    });

                    return networkResponse;
                })
                .catch((error) => {
                    console.error('[SW] Fetch failed:', error);
                    // Return nothing - app will handle offline state
                });
        })
    );
});
