const CACHE_NAME = 'tm-case-booking-COMPLETE-RESET-' + Date.now() + '-' + Math.random();
const urlsToCache = [
  '/',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Cache files individually to avoid failure of entire batch
        return Promise.all(
          urlsToCache.map(url => {
            return cache.add(new Request(url, {
              cache: 'reload'
            })).catch(error => {
              console.warn('Failed to cache:', url, error);
              // Don't fail the entire installation if one file fails
              return Promise.resolve();
            });
          })
        );
      })
      .then(() => {
        console.log('Service Worker cache completed');
      })
      .catch((error) => {
        console.error('Service Worker installation failed:', error);
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up ALL old caches aggressively
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating... FORCING COMPLETE CACHE RESET');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      console.log('Found caches:', cacheNames);
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('DELETING cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('ALL CACHES DELETED - Fresh start');
      // Force all clients to reload
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({type: 'CACHE_RESET', action: 'reload'});
        });
      });
    })
  );
  // Ensure the new service worker takes control immediately
  self.clients.claim();
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    // Force network-first for JavaScript files and CSS files to ensure latest version
    (function() {
      if (event.request.url.includes('.js') || 
          event.request.url.includes('.css') || 
          event.request.url.includes('main.') ||
          event.request.url.includes('chunk.')) {
        // Always fetch from network for critical files, with aggressive cache-busting
        const cacheBuster = Date.now() + Math.random();
        const request = new Request(event.request.url + '?v=' + cacheBuster, {
          method: event.request.method,
          headers: event.request.headers,
          body: event.request.body,
          mode: 'cors',
          credentials: event.request.credentials,
          cache: 'no-cache',
          redirect: 'follow'
        });
        
        return fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              // NEVER cache JS/CSS files - ALWAYS fresh
              console.log('🔄 Serving UNCACHED fresh JS/CSS from network:', event.request.url);
            }
            return response;
          })
          .catch((error) => {
            console.warn('⚠️ Network failed for JS/CSS, trying original request:', error);
            // Try original request without cache-busting as fallback
            return fetch(event.request);
          });
      }
      
      // For non-critical files, use cache-first strategy
      return caches.match(event.request)
        .then((response) => {
          // Return cached version for other files or fetch from network
          if (response) {
            console.log('Serving from cache:', event.request.url);
            return response;
          }
          
          return fetch(event.request)
            .then((response) => {
              // Don't cache if not a valid response
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }

              // Clone the response
              const responseToCache = response.clone();

              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                })
                .catch((error) => {
                  console.warn('Cache put failed:', error);
                });

              return response;
            })
            .catch((error) => {
              console.warn('Fetch failed:', error);
              // If both cache and network fail, return offline page
              if (event.request.destination === 'document') {
                return caches.match('/').then((cachedResponse) => {
                  return cachedResponse || new Response('Offline - App not available', {
                    status: 200,
                    headers: { 'Content-Type': 'text/html' }
                  });
                });
              }
              // For other requests, return empty response
              return new Response('', { status: 404 });
            });
        })
        .catch((error) => {
          console.warn('Cache match failed:', error);
          return new Response('Cache Error', { status: 500 });
        });
    })()
  );
});

// Handle push notifications - Enhanced for better mobile experience
self.addEventListener('push', (event) => {
  console.log('📱 Push notification received:', event);
  
  let notificationData = {
    title: 'TM Case Booking',
    body: 'You have a new notification',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: 'tm-notification',
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200, 100, 200], // Enhanced vibration pattern
    data: {
      timestamp: Date.now(),
      url: '/'
    }
  };

  // Parse structured push data if available
  if (event.data) {
    try {
      const pushPayload = event.data.json();
      console.log('📱 Push payload:', pushPayload);
      
      notificationData = {
        title: pushPayload.title || notificationData.title,
        body: pushPayload.body || pushPayload.message || notificationData.body,
        icon: pushPayload.icon || notificationData.icon,
        badge: pushPayload.badge || notificationData.badge,
        tag: pushPayload.tag || notificationData.tag,
        renotify: pushPayload.renotify !== false,
        requireInteraction: pushPayload.requireInteraction || false,
        vibrate: pushPayload.vibrate || notificationData.vibrate,
        data: {
          ...notificationData.data,
          ...pushPayload.data,
          caseId: pushPayload.caseId,
          type: pushPayload.type || 'general',
          url: pushPayload.url || notificationData.data.url
        }
      };
      
      // Add contextual actions based on notification type
      const actions = [];
      if (pushPayload.type === 'case-status') {
        actions.push({
          action: 'view-case',
          title: 'View Case',
          icon: '/logo192.png'
        });
      }
      actions.push({
        action: 'open-app',
        title: 'Open App',
        icon: '/logo192.png'
      });
      
      notificationData.actions = actions;
      
    } catch (error) {
      console.error('📱 Failed to parse push data:', error);
      // Fallback to text content
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      renotify: notificationData.renotify,
      requireInteraction: notificationData.requireInteraction,
      vibrate: notificationData.vibrate,
      data: notificationData.data,
      actions: notificationData.actions || [],
      timestamp: Date.now(),
      silent: false
    }).then(() => {
      console.log('📱 Notification shown successfully');
    }).catch(error => {
      console.error('📱 Failed to show notification:', error);
    })
  );
});

// Handle notification clicks - Enhanced with better navigation
self.addEventListener('notificationclick', (event) => {
  console.log('📱 Notification clicked:', event.notification.tag, 'Action:', event.action);
  
  // Close the notification
  event.notification.close();
  
  // Get notification data
  const notificationData = event.notification.data || {};
  let urlToOpen = notificationData.url || '/';
  
  // Handle different actions
  if (event.action === 'view-case' && notificationData.caseId) {
    // Navigate to specific case (future enhancement - when case detail view is implemented)
    urlToOpen = `/?highlight=${notificationData.caseId}`;
  } else if (event.action === 'open-app' || !event.action) {
    // Default action - open the app
    urlToOpen = notificationData.url || '/';
  }
  
  // Focus existing app window or open new one
  event.waitUntil(
    clients.matchAll({ 
      type: 'window',
      includeUncontrolled: true 
    }).then((clientList) => {
      console.log(`📱 Found ${clientList.length} existing windows`);
      
      // Try to focus an existing window
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          console.log('📱 Focusing existing window');
          return client.focus().then(() => {
            // Send message to focused window with notification data
            return client.postMessage({
              type: 'NOTIFICATION_CLICK',
              data: notificationData,
              action: event.action
            });
          });
        }
      }
      
      // No existing window found, open a new one
      if (clients.openWindow) {
        console.log('📱 Opening new window:', urlToOpen);
        return clients.openWindow(urlToOpen);
      }
      
      console.warn('📱 Cannot open window - no clients.openWindow support');
    }).catch(error => {
      console.error('📱 Error handling notification click:', error);
    })
  );
});

// Handle background sync (for offline functionality)
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Add your background sync logic here
      console.log('Background sync completed')
    );
  }
});

console.log('Service Worker loaded successfully');