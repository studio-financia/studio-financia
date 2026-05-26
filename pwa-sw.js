const CACHE_NAME = 'studio-financia-v2';

// Installation : mise en cache des fichiers essentiels
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // Chemins relatifs — fonctionnent sur GitHub Pages quel que soit le repo name
      return cache.addAll([
        './index.html',
        './manifest.json',
        './icon-192.png',
        './icon-512.png'
      ]).catch(function(err) {
        console.log('Cache addAll error (non-fatal):', err);
      });
    })
  );
  // Prendre le contrôle immédiatement
  self.skipWaiting();
});

// Activation : supprimer les anciens caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) { return name !== CACHE_NAME; })
          .map(function(name) { return caches.delete(name); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch : cache d'abord, réseau en fallback
// (meilleur pour iOS Safari qui a des limites sur le cache-first)
self.addEventListener('fetch', function(event) {
  // Ne gérer que les requêtes GET
  if (event.request.method !== 'GET') return;

  // Ne pas intercepter les requêtes cross-origin (Google Fonts, CDN etc.)
  var url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then(function(cachedResponse) {
      if (cachedResponse) {
        // Mettre à jour le cache en arrière-plan
        fetch(event.request).then(function(networkResponse) {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(function() {});
        return cachedResponse;
      }

      // Pas en cache : aller sur le réseau
      return fetch(event.request).then(function(networkResponse) {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        var responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(function() {
        // Hors ligne : retourner index.html
        return caches.match('./index.html');
      });
    })
  );
});
