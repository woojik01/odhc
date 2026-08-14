const CACHE='odhc-v4';
const ASSETS=[
  './',
  './index.html',
  './manifest.json',
  './css/reset.css',
  './css/variables.css',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/responsive.css',
  './js/app.js',
  './js/mobile-focus-fix.js',
  './js/db/database.js',
  './js/db/exercises.js',
  './js/db/workouts.js',
  './js/utils/date.js',
  './js/utils/validation.js',
  './js/utils/format.js',
  './js/services/backup.js',
  './js/services/csv.js',
  './js/services/import.js',
  './data/exercises.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(
    caches.match(e.request).then(cached=>{
      const fetchPromise = fetch(e.request).then(resp=>{
        if(resp.ok){
          const clone=resp.clone();
          caches.open(CACHE).then(c=>c.put(e.request, clone));
        }
        return resp;
      }).catch(()=>cached || caches.match('./index.html'));
      return cached || fetchPromise;
    })
  );
});
