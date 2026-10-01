'use strict';
// Incrementa il numero a ogni modifica dell'app per forzare l'aggiornamento della cache
const CACHE = 'carmon-v1';
const SHELL = [
  './',
  'manifest.json',
  'icon-192.png',
  'apple-touch-icon.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      // un singolo errore non deve bloccare l'installazione
      return Promise.all(SHELL.map(function(u) { return c.add(u).catch(function(){}); }));
    }).then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE; })
                             .map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // I dati non si cachano mai: le chiamate a GitHub passano dirette alla rete
  if (url.hostname === 'api.github.com') return;

  // Pagina: prima la rete, così gli aggiornamenti arrivano subito; cache solo se offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function(res) {
        const copy = res.clone();
        caches.open(CACHE).then(function(c) { c.put('./', copy); });
        return res;
      }).catch(function() { return caches.match('./'); })
    );
    return;
  }

  // Librerie, font, icone: dalla cache, aggiornate in sottofondo
  e.respondWith(
    caches.match(req).then(function(hit) {
      const net = fetch(req).then(function(res) {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(function(c) { c.put(req, copy); });
        }
        return res;
      }).catch(function() { return hit; });
      return hit || net;
    })
  );
});
