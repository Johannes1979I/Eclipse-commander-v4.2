/**
 * SERVICE WORKER - Eclipse Commander
 * Gestisce caching e funzionalità offline
 * 
 * NOTA: Usa path relativi (./) per compatibilità con GitHub Pages
 * e qualsiasi hosting in sottocartella.
 */

const CACHE_NAME = 'eclipse-commander-v4.3.0';
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './css/styles.css',
    './js/config.js',
    './js/utils.js',
    './js/storage.js',
    './js/eclipse-database.js',
    './js/audio-manager.js',
    './js/eclipse-sequences-fixed.js',
    './js/equipment/exposure-optimizer.js',
    './js/equipment/equipment-database.js',
    './js/equipment/telescope-manager.js',
    './js/core/astronomy-calculator.js',
    './js/core/location-manager.js',
    './js/core/time-calculator.js',
    './js/platforms/ekos-connector.js',
    './js/platforms/nina-connector.js',
    './js/platforms/platform-adapter.js',
    './js/platforms/device-detector.js',
    './js/modes/eclipse-mode.js',
    './js/modes/standalone-mode.js',
    './js/ui/notification-manager.js',
    './js/ui/countdown-display.js',
    './js/ui/mode-switcher.js',
    './js/ui/location-panel.js',
    './js/ui/eclipse-selector.js',
    './js/ui/equipment-panel.js',
    './js/ui/eclipse-sequence-panel.js',
    './js/ui/settings-panel.js',
    './js/ui/solar-tracker.js',
    './js/ui/ui-controller.js',
    './js/sequence-uploader.js',
    './js/main.js',
    './data/eclipses.json'
];

// Install event - cache resources
self.addEventListener('install', event => {
    console.log('[SW] Installing v4.3.0...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching app shell');
                // Usa addAll con catch per non bloccare l'install se un file manca
                return cache.addAll(urlsToCache).catch(err => {
                    console.warn('[SW] Some resources failed to cache:', err);
                    // Fallback: cacha almeno i file essenziali uno per uno
                    return Promise.allSettled(
                        urlsToCache.map(url => cache.add(url).catch(() => {
                            console.warn('[SW] Failed to cache:', url);
                        }))
                    );
                });
            })
            .then(() => {
                console.log('[SW] Install complete');
                return self.skipWaiting();
            })
    );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] Activation complete');
            return self.clients.claim();
        })
    );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Se la risposta è valida, aggiorna la cache
                if (response && response.status === 200) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                // Network fallito → cerca nella cache
                return caches.match(event.request).then(cached => {
                    if (cached) return cached;
                    // Ultima spiaggia: mostra la pagina principale dalla cache
                    return caches.match('./index.html');
                });
            })
    );
});

// Message event - handle messages from app
self.addEventListener('message', event => {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});

// Sync event - background sync
self.addEventListener('sync', event => {
    if (event.tag === 'sync-data') {
        event.waitUntil(syncData());
    }
});

async function syncData() {
    console.log('[SW] Background sync');
}

// Push event - notifications
self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Eclipse Commander';
    const options = {
        body: data.body || 'Notification',
        vibrate: [200, 100, 200],
        data: data.data || {},
        actions: data.actions || []
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Notification click event - apri la PWA
self.addEventListener('notificationclick', event => {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            // Se la PWA è già aperta, mettila in primo piano
            for (const client of clientList) {
                if (client.url.includes('index.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Altrimenti apri una nuova finestra (path relativo al SW)
            if (clients.openWindow) {
                return clients.openWindow('./index.html');
            }
        })
    );
});
