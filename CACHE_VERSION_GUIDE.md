# Cache Version Management Guide

## Overview
This system automatically detects when code changes have been made and forces users to refresh their browser cache to get the latest updates. This solves the issue where users need to manually do Ctrl+Shift+R after every update.

## How It Works

### 1. Cache Version in package.json
```json
{
  "version": "1.2.9",
  "cacheVersion": "1.0.1"
}
```

### 2. Automatic Detection
- When the app loads, it compares the stored cache version with the current one
- If they differ, the user is automatically logged out and cache is cleared
- The browser will reload with fresh cache, ensuring all updates are visible

### 3. Version Management
The app checks both:
- **App Version**: From `package.json` version field (for major releases)
- **Cache Version**: From `package.json` cacheVersion field (for code changes)

## For Developers

### When to Increment Cache Version
Increment the cache version after making any of these changes:
- Component updates
- CSS/styling changes
- JavaScript/TypeScript code changes
- Asset modifications
- Configuration changes

### How to Increment Cache Version
```bash
# Automatically increment cache version
npm run cache-version

# This will increment from 1.0.1 → 1.0.2
```

### Manual Method
You can also manually edit `package.json`:
```json
"cacheVersion": "1.0.2"
```

## For Users

### What Happens When Cache Version Changes
1. You start the app (`npm start`)
2. System detects cache version change
3. Shows version update popup
4. Automatically logs you out
5. Clears browser cache
6. Reloads page with latest updates
7. You log back in with fresh cache

### No More Manual Cache Clearing
You no longer need to:
- Press Ctrl+Shift+R (hard refresh)
- Clear browser cache manually
- Wonder why changes aren't showing

## Technical Details

### Storage Keys
- `tm-app-version`: Stores the main app version
- `tm-cache-version`: Stores the cache version

### Cache Clearing
The system clears:
- localStorage data
- sessionStorage data
- Browser cache (using Cache API)
- Service worker cache (if any)

### Version Comparison
```javascript
// Current versions from package.json
const currentVersion = getAppVersion();      // "1.2.9"
const currentCacheVersion = getCacheVersion(); // "1.0.1"

// Stored versions from browser
const storedVersion = localStorage.getItem('tm-app-version');
const storedCacheVersion = localStorage.getItem('tm-cache-version');

// If any version differs, trigger cache refresh
if (storedVersion !== currentVersion || storedCacheVersion !== currentCacheVersion) {
  // Show update popup and clear cache
}
```

## Best Practices

### For Development
1. Increment cache version after significant changes
2. Use `npm run cache-version` for convenience
3. Test the update flow in development
4. Don't increment unnecessarily for minor tweaks

### For Production Deployments
1. Always increment cache version before deployment
2. Consider incrementing app version for major releases
3. Document version changes in git commits
4. Monitor user experience during cache updates

## Troubleshooting

### If Users Still See Old Content
1. Check that cache version was incremented
2. Verify version update popup appeared
3. Ensure browser cache clearing is working
4. Check for cached service workers

### If Version Update Popup Doesn't Appear
1. Verify cache version changed in package.json
2. Check browser console for version messages
3. Ensure user is logged in (popup only shows for logged users)
4. Check if popup was recently dismissed

## Example Workflow
```bash
# 1. Make code changes
# 2. Increment cache version
npm run cache-version

# 3. Start development server
npm start

# 4. System detects version change
# 5. Shows update popup to logged users
# 6. Cache is automatically cleared
# 7. Users get fresh content
```

This system ensures users always see the latest version of your application without manual intervention.