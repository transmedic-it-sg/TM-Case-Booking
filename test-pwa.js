// Simple test to check PWA installability
// Run this in your browser console on localhost:3000

console.log('=== PWA Installation Test ===');

// Check if service worker is supported
if ('serviceWorker' in navigator) {
  console.log('✅ Service Worker supported');
} else {
  console.log('❌ Service Worker not supported');
}

// Check if PWA installation is supported
if ('getInstalledRelatedApps' in navigator) {
  console.log('✅ PWA installation supported');
} else {
  console.log('ℹ️ PWA installation API not available (normal on localhost)');
}

// Check for beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (event) => {
  console.log('✅ beforeinstallprompt event fired - PWA is installable!');
  
  // Prevent automatic prompt
  event.preventDefault();
  
  // Show manual install button
  const installBtn = document.createElement('button');
  installBtn.textContent = 'Install PWA';
  installBtn.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 9999;
    background: #20b2aa;
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
  `;
  
  installBtn.onclick = () => {
    event.prompt();
    event.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('✅ User accepted PWA install');
      } else {
        console.log('❌ User dismissed PWA install');
      }
    });
  };
  
  document.body.appendChild(installBtn);
});

// Check manifest
fetch('/manifest.json')
  .then(response => response.json())
  .then(manifest => {
    console.log('✅ Manifest loaded:', manifest);
    
    // Check required fields
    const required = ['name', 'short_name', 'start_url', 'display', 'icons'];
    const missing = required.filter(field => !manifest[field]);
    
    if (missing.length === 0) {
      console.log('✅ All required manifest fields present');
    } else {
      console.log('❌ Missing manifest fields:', missing);
    }
    
    // Check icons
    if (manifest.icons && manifest.icons.length > 0) {
      console.log('✅ Manifest icons found:', manifest.icons.length);
      
      // Test if icons are accessible
      manifest.icons.forEach((icon, index) => {
        const img = new Image();
        img.onload = () => console.log(`✅ Icon ${index + 1} (${icon.sizes}) loaded successfully`);
        img.onerror = () => console.log(`❌ Icon ${index + 1} (${icon.sizes}) failed to load: ${icon.src}`);
        img.src = icon.src;
      });
    } else {
      console.log('❌ No icons in manifest');
    }
  })
  .catch(error => {
    console.log('❌ Failed to load manifest:', error);
  });

// Check service worker registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistration()
    .then(registration => {
      if (registration) {
        console.log('✅ Service Worker registered:', registration.scope);
        console.log('Service Worker state:', registration.active?.state);
      } else {
        console.log('❌ No Service Worker registration found');
      }
    })
    .catch(error => {
      console.log('❌ Service Worker check failed:', error);
    });
}

console.log('=== Test Complete ===');
console.log('If you see the install button or beforeinstallprompt event, your PWA is working!');
console.log('Note: Install button may not show on localhost in some browsers.');