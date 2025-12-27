/**
 * Push Notification Handler for Service Worker
 * This file handles incoming push notifications
 */

// Listen for push events
self.addEventListener('push', function(event) {
  console.log('Push notification received:', event);
  
  let notificationData = {
    title: 'LMS Notification',
    body: 'You have a new notification',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'lms-notification',
    requireInteraction: false,
    data: {}
  };

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data,
        data: data.data || {}
      };
    } catch (e) {
      // If not JSON, try text
      const text = event.data.text();
      if (text) {
        notificationData.body = text;
      }
    }
  }

  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon || '/pwa-192x192.png',
      badge: notificationData.badge || '/pwa-192x192.png',
      tag: notificationData.tag || 'lms-notification',
      requireInteraction: notificationData.requireInteraction || false,
      data: notificationData.data,
      actions: notificationData.actions || [],
      vibrate: [200, 100, 200],
    })
  );
});

// Listen for notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  // Get the URL from notification data or default to dashboard
  const urlToOpen = event.notification.data?.url || '/dashboard';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // Check if there's already a window/tab open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Listen for notification close
self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed:', event);
});

