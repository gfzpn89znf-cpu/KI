/**
 * Service Worker: macht die App offline startbar.
 *
 * Bewusst zurückhaltend gehalten. Navigationen gehen zuerst ins Netz und
 * fallen nur bei fehlender Verbindung auf den Cache zurück – so kann ein
 * veralteter Cache die App nie dauerhaft festnageln. Modellgewichte werden
 * hier nicht angefasst: die verwaltet WebLLM in seinem eigenen Cache.
 */
const VERSION = 'ki-v1';
const SHELL = './';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(VERSION).then((cache) => cache.add(SHELL)).catch(() => undefined));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(SHELL, copy)).catch(() => undefined);
          return response;
        })
        .catch(() => caches.match(SHELL).then((hit) => hit ?? Response.error())),
    );
    return;
  }

  // Statische Dateien tragen einen Hash im Namen und dürfen dauerhaft aus dem Cache kommen.
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy)).catch(() => undefined);
          }
          return response;
        }),
    ),
  );
});
