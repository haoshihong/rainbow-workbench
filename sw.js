/* 🌈工作台 Service Worker：支持安装为APP + 离线使用 */
const CACHE = 'rainbow-wb-v9';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* 网络优先，但只缓存"成功"的响应；服务器报错(403/5xx)或断网时一律回退到本地缓存。
   这样即使云端服务器休眠/失效，已安装的APP永远能用缓存正常打开。 */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // 跨域请求(同步通道/发音等)不接管
  e.respondWith(
    fetch(e.request).then(res => {
      if (res && res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {});
        return res;
      }
      // 服务器返回错误页 → 不缓存，改用本地好的缓存
      return caches.match(e.request).then(r => r || caches.match('./index.html')).then(r => r || res);
    }).catch(() =>
      caches.match(e.request).then(r => r || caches.match('./index.html'))
    )
  );
});
