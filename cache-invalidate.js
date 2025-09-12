/**
 * Cache Invalidation Script
 * Forces browser to fetch fresh files
 */

// Clear all browser caches
if ('caches' in window) {
  caches.keys().then(function(names) {
    for (let name of names) {
      caches.delete(name);
    }
    console.log('✅ All browser caches cleared');
  });
}

// Clear localStorage version tracking to force re-evaluation
localStorage.removeItem('tm-app-version');
localStorage.removeItem('tm-cache-version');

// Unregister service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
    }
    console.log('✅ Service workers unregistered');
  });
}

console.log('🔄 Cache invalidation complete. Please refresh the page.');