const CACHE='appnote-v1.4.0-r2';
const FILES=['./','./index.html','./style.css','./app.js','./core.js','./collections.js','./pwa.js','./study.js','./study-core.js','./study-ai.js','./study-media.js','./math-render.js','./pdf-summary.js','./pdf-core.js','./pdf-engine.js','./pdf-store.js','./pdf-manager.js','./gemini.js','./config.js','./manifest.webmanifest','./assets/appnote-icon.jpg','./assets/appnote-192.png','./assets/appnote-512.png','./assets/appnote-180.png','./manifest.webmanifest?v=1.4.0','./style.css?v=study-recall-2','./app.js?v=study-recall-2'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('appnote-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 const pdfLibrary=u.origin==='https://cdn.jsdelivr.net'&&u.pathname.startsWith('/npm/pdfjs-dist@6.4.299/');
 const mathLibrary=u.origin==='https://cdn.jsdelivr.net'&&u.pathname.startsWith('/npm/katex@0.19.0/dist/');
 if(e.request.method!=='GET'||(u.origin!==location.origin&&!pdfLibrary&&!mathLibrary))return;
 e.respondWith(fetch(e.request).then(async r=>{
  if(r.ok)try{const cache=await caches.open(CACHE);await cache.put(e.request,r.clone())}catch{}
  return r;
 }).catch(async()=>{
  // A shared origin may contain unrelated applications' caches. Never mix modules.
  const cache=await caches.open(CACHE);
  return await cache.match(e.request)||(e.request.mode==='navigate'?await cache.match('./index.html'):Response.error());
 }));
});
