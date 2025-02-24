const version = "1.0.0";
const cacheName = `jq-offline-${version}`;
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(cacheName).then(cache => {
      return cache.addAll([
        `/index.html`,
        `/style.css`
      ])
          .then(() => self.skipWaiting());
    })
  );
});

self.addEventListener('install', event => {
  event.registerForeignFetch({
    scopes:['/'],
    origins:['*'] // allow all origins
  });
});

self.addEventListener('activate', event => {
  // Clean up other versions of the caches
  event.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(keys
                .filter(function(key) {
                    return key.indexOf(cacheName) !== 0;
                })
                .map(function(key) {
                    return caches.delete(key);
                })
            );
        })
    );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    // Get the response from the cache
    // or retrieve it, and cache it if not cached yet
    caches.match(event.request).then((resp) => {
      return resp || fetch(event.request).then((response) => {
        let responseClone = response.clone();
        caches.open(cacheName).then((cache) => {
          console.log('Response was not cached. Caching...');
          cache.put(event.request, responseClone);
        });
        return response;
      }).catch(() => {
        console.log('Offline, but request not cached. Returning index.html by default.');
        return caches.match('./index.html');
      });
    })
  );
});

self.addEventListener('foreignfetch', event => {
  // Allow our service worker to correctly see the response from the aioli CDN
  // and cache them
  event.respondWith(fetch(event.request).then(response => {
    return {
      response: response,
      origin: event.origin,
      headers: ['Content-Type']
    }
  }));
});
