self.addEventListener('push', e => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'Porra Mundial 2026', {
      body: data.body || '¡Nuevo resultado disponible!',
      icon: '/favicon.ico',
      tag: 'result',
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wcs => {
      const wc = wcs.find(w => w.focused || w.url.includes('/user'));
      if (wc) return wc.focus();
      return clients.openWindow('/user');
    })
  );
});
