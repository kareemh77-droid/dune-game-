/* Spellsiege offline helper: always tries the network first (so new versions
   show up right away) and falls back to the saved copy when offline. */
const CACHE="spellsiege-v2";
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

/* ---- turn alerts (v24): the game server sends a push when it's your turn ---- */
self.addEventListener("push",e=>{
  let d={}; try{d=e.data?e.data.json():{};}catch(x){d={body:e.data?e.data.text():""};}
  const jobs=[self.registration.showNotification(d.title||"Spellsiege",{body:d.body||"Something happened in one of your games",tag:d.tag||"spellsiege",renotify:true,icon:"icon-192.png",badge:"icon-192.png",data:{g:d.gid||null}})];
  if(typeof d.badge==="number"&&self.navigator&&self.navigator.setAppBadge) jobs.push((d.badge>0?self.navigator.setAppBadge(d.badge):self.navigator.clearAppBadge()).catch(()=>{}));
  e.waitUntil(Promise.all(jobs));
});
self.addEventListener("notificationclick",e=>{
  e.notification.close();
  const g=e.notification.data&&e.notification.data.g, url=new URL(g?"./?g="+encodeURIComponent(g):"./",self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(cs=>{
    for(const c of cs){if(c.url.startsWith(self.registration.scope)&&"focus" in c){c.postMessage({t:"open",g});return c.focus();}}
    return self.clients.openWindow(url);
  }));
});
