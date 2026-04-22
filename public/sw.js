self.addEventListener('push', function(event) {
  if (event.data) {
    // Expected structure: { title: string, options: NotificationOptions }
    try {
      const data = event.data.json();
      const title = data.title || 'Nova Notificação IMW Laureano';
      const options = data.options || {};
      
      event.waitUntil(
        self.registration.showNotification(title, {
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          vibrate: [200, 100, 200, 100, 200, 100, 200],
          ...options
        })
      );
    } catch (e) {
      // Fallback for simple text payload
      event.waitUntil(
        self.registration.showNotification('Mídia IMW Laureano', {
          body: event.data.text(),
          icon: '/favicon.svg',
          vibrate: [200, 100, 200]
        })
      );
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  // Open the app when notification is clicked
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
