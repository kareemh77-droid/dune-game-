/* Spellsiege offline helper: always tries the network first (so new versions
   show up right away) and falls back to the saved copy when offline. */
const CACHE="spellsiege-v1";
self.addEventListener("install",e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png"])).catch(()=>{}));
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",e=>{
  const r=e.request; if(r.method!=="GET") return;
  const url=new URL(r.url);
  if(url.origin===self.location.origin){
    e.respondWith(fetch(r).then(res=>{
      if(res.status===200&&!r.headers.get("range")){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp)).catch(()=>{});}
      return res;
    }).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match("./index.html"))));
  } else if(/(^|\.)fonts\.(googleapis|gstatic)\.com$|(^|\.)cdn\.jsdelivr\.net$/.test(url.hostname)){
    e.respondWith(caches.match(r).then(m=>{
      const f=fetch(r).then(res=>{if(res.ok||res.type==="opaque"){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp)).catch(()=>{});}return res;}).catch(()=>m);
      return m||f;
    }));
  }
});
