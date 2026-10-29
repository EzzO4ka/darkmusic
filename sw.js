// Dark Music Service Worker — System Push Notification Shade Support
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'SHOW_SYSTEM_PUSH') return;

  const title = data.title || 'Dark Music';
  const options = {
    body: data.message || '',
    icon: data.icon || '/logo.png',
    badge: data.badge || '/logo.png',
    image: data.image || undefined,
    tag: data.tag || 'dark-music-push',
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('push', (event) => {
  let payload = { title: 'Dark Music', message: 'Новое уведомление в каталоге Dark Music' };
  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch (e) {
    try {
      payload.message = event.data.text();
    } catch (err) {}
  }

  const title = payload.title || 'Dark Music';
  const options = {
    body: payload.message || payload.body || '',
    icon: payload.icon || '/logo.png',
    badge: '/logo.png',
    tag: payload.id || 'dark-music-push',
    renotify: true,
    vibrate: [200, 100, 200]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
