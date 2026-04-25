importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js");

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || data.notification?.title || 'Nova Notificação IMW Laureano';
      const body = data.body || data.notification?.body || '';
      const options = data.options || {};
      
      event.waitUntil(
        self.registration.showNotification(title, {
          body: body,
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          vibrate: [200, 100, 200, 100, 200, 100, 200],
          priority: 'high',
          requireInteraction: true,
          ...options
        })
      );
    } catch (e) {
      event.waitUntil(
        self.registration.showNotification('Mídia IMW Laureano', {
          body: event.data.text(),
          icon: '/favicon.svg',
          vibrate: [200, 100, 200],
          priority: 'high',
          requireInteraction: true
        })
      );
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
