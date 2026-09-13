// Service worker: guarda los archivos de la web para que UFC Picks
// funcione como una app instalada (y abra al instante).
// Patrón igual que deberes: primero internet (versión nueva),
// y si no hay conexión, la copia guardada.

const CACHE = 'ufc-picks-v1';
const ARCHIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/main.js',
  './js/firebase-config.js',
  './js/auth.js',
  './js/db.js',
  './js/stats.js',
  './js/ui.js',
  './js/views.js',
  './js/dashboard.js',
  './js/charts.js',
  './icono-192.png',
  './icono-512.png',
  './icono-512-maskable.png',
  './icono-180.png',
  'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js',
  'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js',
];

// Al instalarse, guarda todo en la caché (si algún archivo de internet
// no se pudiera guardar, se guardan los demás: allSettled no se rinde)
self.addEventListener('install', evento => {
  evento.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(ARCHIVOS.map(archivo => cache.add(archivo))),
    ),
  );
});

// Al activarse, borra las copias antiguas
self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys().then(claves => Promise.all(
      claves.filter(c => c !== CACHE).map(c => caches.delete(c)),
    )),
  );
});

// Pide primero la versión nueva por internet y,
// si no hay conexión, usa la copia guardada
self.addEventListener('fetch', evento => {
  evento.respondWith(
    fetch(evento.request).catch(() => caches.match(evento.request)),
  );
});
