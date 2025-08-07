const CACHE_NAME = 'tm-case-booking-v1.2.5';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  // Add other static assets as needed
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache.map(url => {
          return new Request(url, {
            cache: 'reload'
          });
        }));
      })
      .catch((error) => {
        console.log('Cache addAll failed:', error);
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
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
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
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
      })
  );
});

// Handle push notifications (if needed)
self.addEventListener('push', (event) => {
  console.log('Push message received:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from TM Case Booking',
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'View Cases',
        icon: '/logo192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/logo192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('TM Case Booking', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received:', event);
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
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