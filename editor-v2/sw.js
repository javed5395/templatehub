/* ═══════════════════════════════════════════════════════════════════════════
   LAZYDOG EDITOR v2 — SERVICE WORKER (20 Aug 2026, Fable)
   ═══════════════════════════════════════════════════════════════════════════
   Makes the editor OPEN AND EDIT OFFLINE, PowerPoint-style — for both the
   website and the desktop app (which is a thin wrapper around this page).

   Strategy, deliberately simple:

     · THE SHELL (editor.html, css, the six js files, lazydog_renderer.js and
       the CDN libraries) — network-first, cache fallback. Online visits keep
       the cache fresh, so every deploy still reaches users instantly; offline
       the last good copy opens and normal editing works fully.
     · IMAGES + FONTS (GCS-parked deck images, Google Fonts) — cache-first
       runtime cache, so a deck already opened keeps its pictures offline.
     · EVERYTHING ELSE (the cloud: composer proxy, Firestore, auth) — network
       only, untouched. Offline those calls fail exactly as before and the
       editor's own toasts explain; no stale AI responses are ever served.

   Cloud actions (compose, export, templates) still need the internet —
   that is the product rule: editing is free and offline, generation is
   online and metered.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

var CACHE_SHELL = 'ld-editor-shell-202608281440';   /* stamped by STAMP_EDITOR_VERSION.py on every ship */
var CACHE_ASSETS = 'ld-editor-assets-v1';

var SHELL = [
  './editor.html',
  './css/editor.css',
  './js/core.js',
  './js/icons.js',
  './js/assets.js',
  './js/engine.js',
  './js/ribbon.js',
  './js/sidebar.js',
  '../lazydog_renderer.js',
  '../design_form_data.js',
  './vendor/fabric.min.js',
  './vendor/jszip.min.js',
  './vendor/UTIF.min.js',
  './vendor/three.min.js',
  './vendor/fonts.css',
  './vendor/fonts/dm-sans-latin-wght-normal.woff2',
  './vendor/fonts/dm-sans-latin-ext-wght-normal.woff2',
  './vendor/fonts/material-icons-outlined-latin-400-normal.woff2',
  './vendor/fonts/material-symbols-outlined-latin-wght-normal.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/utif/3.1.0/UTIF.min.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_SHELL).then(function (c) {
      /* addAll fails the whole install if ONE file 404s — fetch each one
         individually instead, so a hiccup can never brick the worker */
      return Promise.all(SHELL.map(function (u) {
        return fetch(u, { mode: u.indexOf('http') === 0 ? 'cors' : 'same-origin' })
          .then(function (r) { if (r && (r.ok || r.type === 'opaque')) return c.put(u, r); })
          .catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE_SHELL && k !== CACHE_ASSETS) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function isShell(url) {
  return SHELL.some(function (u) {
    if (u.indexOf('http') === 0) return url === u;
    /* relative entries — compare by pathname tail */
    return url.indexOf(u.replace('./', '/editor-v2/').replace('../', '/')) !== -1;
  });
}

function isCachableAsset(url) {
  return url.indexOf('storage.googleapis.com') !== -1 ||        /* parked deck images */
         url.indexOf('fonts.googleapis.com') !== -1 ||
         url.indexOf('fonts.gstatic.com') !== -1;
}

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;               /* cloud POSTs untouched */
  var url = e.request.url;

  /* the page itself — network first, cache fallback (offline open) */
  if (e.request.mode === 'navigate' || isShell(url)) {
    e.respondWith(
      /* 24 Aug 2026 (Fable) — cache:'no-cache' forces a revalidation with
         the server (ETag 304s are cheap), so the browser's OWN http cache can
         never serve a stale shell file through the worker. */
      fetch(e.request, { cache: 'no-cache' }).then(function (r) {
        if (r && r.ok) {
          var copy = r.clone();
          caches.open(CACHE_SHELL).then(function (c) { c.put(e.request, copy); });
        }
        return r;
      }).catch(function () {
        /* offline fallback — ignoreSearch so a ?v= bump never breaks offline */
        return caches.match(e.request, { ignoreSearch: true })
          .then(function (hit) {
            if (hit) return hit;
            if (e.request.mode === 'navigate') return caches.match('./editor.html');
          });
      })
    );
    return;
  }

  /* images + fonts — cache first, then network (and remember it) */
  if (isCachableAsset(url)) {
    e.respondWith(
      caches.match(e.request).then(function (hit) {
        if (hit) return hit;
        return fetch(e.request).then(function (r) {
          if (r && (r.ok || r.type === 'opaque')) {
            var copy = r.clone();
            caches.open(CACHE_ASSETS).then(function (c) { c.put(e.request, copy); });
          }
          return r;
        });
      })
    );
  }
  /* everything else: straight to the network — the cloud stays the cloud */
});
