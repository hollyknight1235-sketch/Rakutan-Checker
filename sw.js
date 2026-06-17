const CACHE = 'rakutan-v2.1.0';
const ASSETS = ['./', './index.html', './manifest.json', './icon.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n.startsWith('rakutan-') && n !== CACHE).map(n => caches.delete(n)))
    )
  );
  return self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (ASSETS.some(a => url.pathname.endsWith(a.replace('./', '')))) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
  }
});

self.addEventListener('push', e => {
  let data = { title: '楽単チェッカー', body: 'お知らせがあります' };
  if (e.data) { try { data = e.data.json(); } catch { data.body = e.data.text(); } }
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body, icon: './icon.png', badge: './icon.png',
    vibrate: [100, 50, 100], tag: data.tag || 'rakutan',
    renotify: true, data: { url: data.url || './' },
    actions: [{ action: 'open', title: '開く' }, { action: 'close', title: '閉じる' }]
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'close') return;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const w = list.find(c => 'focus' in c);
      return w ? w.focus() : clients.openWindow(e.notification.data.url || './');
    })
  );
});

self.addEventListener('message', e => {
  if (!e.data) return;
  if (e.data.type === 'SCHEDULE') {
    const { delay, title, body, tag } = e.data;
    setTimeout(() => self.registration.showNotification(title, {
      body, icon: './icon.png', tag: tag || 'sched', renotify: true, vibrate: [100, 50, 100]
    }), delay);
  }
  if (e.data.type === 'NOTIFY_NOW') {
    self.registration.showNotification(e.data.title, {
      body: e.data.body, icon: './icon.png', tag: e.data.tag || 'now', renotify: true, vibrate: [200, 100, 200]
    });
  }
  // 翌朝の授業サマリー通知を再スケジュール
  if (e.data.type === 'MORNING_RESCHEDULE') {
    const { delay, title, body } = e.data;
    setTimeout(() => {
      self.registration.showNotification(title, {
        body, icon: './icon.png', tag: 'morning-summary', renotify: true, vibrate: [200, 100, 200]
      });
    }, delay);
  }
});
