/**
 * Enterprise Service Worker
 * Implements 2024 best practices for production deployments
 * Solves: Cache coherence across deployments and user sessions
 */

// Dynamic cache version from build process
const CACHE_VERSION = 'tm-case-booking-v__CACHE_VERSION__';
const APP_VERSION = '__APP_VERSION__';

// Cache strategies by resource type
const CACHE_STRATEGIES = {
  // Never cache - always fetch fresh
  NO_CACHE: [
    'index.html',
    'meta.json',
    'version.json'
  ],
  
  // Cache forever - file content hashed
  CACHE_FOREVER: [
    '/static/js/',
    '/static/css/',
    '/static/media/'
  ],
  
  // Cache with validation
  CACHE_WITH_VALIDATION: [
    'manifest.json',
    '/api/'
  ]
};

// Runtime cache for API responses
const API_CACHE_NAME = `${CACHE_VERSION}-api`;
const STATIC_CACHE_NAME = `${CACHE_VERSION}-static`;

/**
 * Install event - setup initial cache
 */
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...', { version: CACHE_VERSION });
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        // Pre-cache critical resources
        const criticalResources = [
          '/',
          '/manifest.json'
        ];
        
        return Promise.allSettled(
          criticalResources.map(url => 
            cache.add(new Request(url, { cache: 'reload' }))
              .catch(err => console.warn(`Failed to cache ${url}:`, err))
          )
        );
      })
      .then(() => {
        console.log('✅ Service Worker installed');
        // Force activation of new service worker
        return self.skipWaiting();
      })
  );
});

/**
 * Activate event - cleanup old caches
 */
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...', { version: CACHE_VERSION });
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              // Keep current version caches
              return !cacheName.startsWith(CACHE_VERSION.split('-').slice(0, -1).join('-'));
            })
            .map(cacheName => {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      
      // Take control of all clients immediately
      self.clients.claim()
    ]).then(() => {
      console.log('✅ Service Worker activated');
      
      // Notify all clients of the update
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'CACHE_UPDATED',
            version: CACHE_VERSION,
            appVersion: APP_VERSION
          });
        });
      });
    })
  );
});

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Only handle GET requests
  if (request.method !== 'GET') return;
  
  // Determine cache strategy
  const strategy = getCacheStrategy(url.pathname);
  
  switch (strategy) {
    case 'NO_CACHE':
      event.respondWith(fetchWithNoCache(request));
      break;
      
    case 'CACHE_FOREVER':
      event.respondWith(cacheForever(request));
      break;
      
    case 'CACHE_WITH_VALIDATION':
      event.respondWith(cacheWithValidation(request));
      break;
      
    default:
      // Default: network first with cache fallback
      event.respondWith(networkFirstWithCache(request));
  }
});

/**
 * Determine cache strategy for a given path
 */
function getCacheStrategy(pathname) {
  // Check no-cache patterns
  if (CACHE_STRATEGIES.NO_CACHE.some(pattern => pathname.includes(pattern))) {
    return 'NO_CACHE';
  }
  
  // Check cache-forever patterns  
  if (CACHE_STRATEGIES.CACHE_FOREVER.some(pattern => pathname.startsWith(pattern))) {
    return 'CACHE_FOREVER';
  }
  
  // Check cache-with-validation patterns
  if (CACHE_STRATEGIES.CACHE_WITH_VALIDATION.some(pattern => pathname.includes(pattern))) {
    return 'CACHE_WITH_VALIDATION';
  }
  
  return 'DEFAULT';
}

/**
 * No cache strategy - always fetch fresh
 */
async function fetchWithNoCache(request) {
  try {
    const response = await fetch(request, { cache: 'no-cache' });
    
    // Check for version updates in index.html
    if (request.url.includes('index.html')) {
      await checkForVersionUpdate(response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('Fetch failed for no-cache resource:', error);
    throw error;
  }
}

/**
 * Cache forever strategy - for hashed static assets
 */
async function cacheForever(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Fetch and cache
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('Fetch failed for static asset:', error);
    throw error;
  }
}

/**
 * Cache with validation strategy - for API and manifest
 */
async function cacheWithValidation(request) {
  const cache = await caches.open(API_CACHE_NAME);
  
  try {
    // Network first
    const response = await fetch(request);
    if (response.ok) {
      // Update cache with fresh data
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('🔄 Serving from cache (network failed):', request.url);
      return cachedResponse;
    }
    throw error;
  }
}

/**
 * Default strategy - network first with cache fallback
 */
async function networkFirstWithCache(request) {
  const cache = await caches.open(API_CACHE_NAME);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

/**
 * Check for application version updates
 */
async function checkForVersionUpdate(response) {
  try {
    const text = await response.text();
    
    // Extract version from meta tag or script
    // Security: Stricter version validation
    const versionMatch = text.match(/data-version="([a-zA-Z0-9\.\-]+)"/);
    const newVersion = versionMatch?.[1];
    
    // Validate version format (semantic versioning)
    if (newVersion && !/^\d+\.\d+\.\d+$/.test(newVersion)) {
      console.warn('Invalid version format detected:', newVersion);
      return;
    }
    
    if (newVersion && newVersion !== APP_VERSION) {
      console.log('🔄 New app version detected:', newVersion);
      
      // Notify all clients
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'VERSION_UPDATE',
          oldVersion: APP_VERSION,
          newVersion: newVersion
        });
      });
    }
  } catch (error) {
    console.error('Version check failed:', error);
  }
}

/**
 * Handle messages from main thread
 */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0]?.postMessage({ success: true });
      });
      break;
      
    case 'GET_CACHE_INFO':
      getCacheInfo().then(info => {
        event.ports[0]?.postMessage(info);
      });
      break;
      
    case 'FORCE_UPDATE':
      // Force service worker update
      self.skipWaiting();
      break;
  }
});

/**
 * Clear all application caches
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(name => {
      console.log('🗑️ Clearing cache:', name);
      return caches.delete(name);
    })
  );
}

/**
 * Get cache information for monitoring
 */
async function getCacheInfo() {
  const cacheNames = await caches.keys();
  const info = {
    version: CACHE_VERSION,
    appVersion: APP_VERSION,
    caches: []
  };
  
  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    info.caches.push({
      name,
      size: keys.length,
      entries: keys.map(req => req.url)
    });
  }
  
  return info;
}

console.log('📦 Enterprise Service Worker loaded', {
  cacheVersion: CACHE_VERSION,
  appVersion: APP_VERSION
});