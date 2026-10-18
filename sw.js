const CACHE='appnote-v1.1.0';
const FILES=['./','./index.html','./style.css','./app.js','./core.js','./collections.js','./config.js','./manifest.webmanifest','./assets/appnote-icon.jpg','./style.css?v=warm-1','./app.js?v=warm-1'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('appnote-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const c=r.clone();caches.open(CACHE).then(cache=>cache.put(e.request,c));}return r;}).catch(async()=>await caches.match(e.request)||(e.request.mode==='navigate'?await caches.match('./index.html'):Response.error())));});
