#!/usr/bin/env node

/**
 * Enterprise Build Script
 * Implements proper cache busting and version management
 * Based on 2024 production deployment best practices
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const { version, cacheVersion } = packageJson;

console.log('🏗️  Starting enterprise build process...');
console.log(`📦 App Version: ${version}`);
console.log(`💾 Cache Version: ${cacheVersion}`);

/**
 * Step 1: Generate build-time metadata
 */
function generateBuildMetadata() {
  const buildTime = new Date().toISOString();
  const buildHash = generateBuildHash();
  
  const metadata = {
    version,
    cacheVersion,
    buildTime,
    buildHash,
    nodeVersion: process.version,
    platform: process.platform
  };

  // Write metadata file (not cached by browser)
  fs.writeFileSync(
    path.join('public', 'meta.json'),
    JSON.stringify(metadata, null, 2)
  );

  console.log('✅ Generated build metadata');
  return metadata;
}

/**
 * Step 2: Update service worker with dynamic versions
 */
function updateServiceWorker(metadata) {
  const swPath = path.join('public', 'sw-enterprise.js');
  let swContent = fs.readFileSync(swPath, 'utf8');

  // Replace placeholders with actual versions
  swContent = swContent
    .replace(/__CACHE_VERSION__/g, `${version}-cache-${cacheVersion}-${metadata.buildHash}`)
    .replace(/__APP_VERSION__/g, version);

  // Write to final service worker
  fs.writeFileSync(path.join('public', 'sw.js'), swContent);
  
  console.log('✅ Updated service worker with version info');
}

/**
 * Step 3: Update index.html with version metadata
 */
function updateIndexHtml(metadata) {
  const indexPath = path.join('public', 'index.html');
  let indexContent = fs.readFileSync(indexPath, 'utf8');

  // Add version meta tag for service worker detection
  const versionMeta = `<meta name="app-version" content="${version}" data-version="${version}">`;
  const cacheMeta = `<meta name="cache-version" content="${cacheVersion}">`;
  const buildMeta = `<meta name="build-time" content="${metadata.buildTime}">`;

  // Insert before closing head tag
  indexContent = indexContent.replace(
    '</head>',
    `  ${versionMeta}\n  ${cacheMeta}\n  ${buildMeta}\n</head>`
  );

  fs.writeFileSync(indexPath, indexContent);
  console.log('✅ Updated index.html with version metadata');
}

/**
 * Step 4: Run the actual React build
 */
function runReactBuild() {
  console.log('🔨 Running React build...');
  
  try {
    execSync('npm run build', { 
      stdio: 'inherit',
      env: {
        ...process.env,
        GENERATE_SOURCEMAP: 'false', // Disable sourcemaps for production
        INLINE_RUNTIME_CHUNK: 'false' // Prevent inline runtime for better caching
      }
    });
    console.log('✅ React build completed');
  } catch (error) {
    console.error('❌ React build failed:', error.message);
    process.exit(1);
  }
}

/**
 * Step 5: Post-build optimizations
 */
function postBuildOptimizations() {
  const buildDir = path.join('build');
  
  // Copy metadata to build directory
  fs.copyFileSync(
    path.join('public', 'meta.json'),
    path.join(buildDir, 'meta.json')
  );

  // Generate cache manifest for debugging
  generateCacheManifest(buildDir);
  
  // Set proper cache headers configuration
  generateCacheConfig(buildDir);
  
  console.log('✅ Post-build optimizations completed');
}

/**
 * Generate cache manifest for debugging
 */
function generateCacheManifest(buildDir) {
  const staticDir = path.join(buildDir, 'static');
  const manifest = {
    version: cacheVersion,
    generated: new Date().toISOString(),
    files: {
      cached: [],
      neverCache: ['index.html', 'meta.json', 'cache-manifest.json']
    }
  };

  // Find all static files (these are cache-forever)
  if (fs.existsSync(staticDir)) {
    const findStaticFiles = (dir, basePath = '') => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const fullPath = path.join(dir, file);
        const relativePath = path.join(basePath, file);
        
        if (fs.statSync(fullPath).isDirectory()) {
          findStaticFiles(fullPath, relativePath);
        } else {
          manifest.files.cached.push(`/static/${relativePath}`);
        }
      });
    };
    
    findStaticFiles(staticDir);
  }

  fs.writeFileSync(
    path.join(buildDir, 'cache-manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
}

/**
 * Generate cache configuration for web servers
 */
function generateCacheConfig(buildDir) {
  const config = {
    // Nginx configuration
    nginx: `
# Cache static assets forever (they have hashes)
location /static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Never cache index.html and meta files
location ~* \\.(html|json)$ {
    expires -1;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
}

# Cache other assets for a day
location / {
    expires 1d;
    add_header Cache-Control "public";
}`,

    // Apache configuration
    apache: `
# Cache static assets forever
<LocationMatch "^/static/">
    ExpiresActive On
    ExpiresDefault "access plus 1 year"
    Header set Cache-Control "public, immutable"
</LocationMatch>

# Never cache HTML and JSON
<FilesMatch "\\.(html|json)$">
    ExpiresActive On
    ExpiresDefault "access minus 1 seconds"
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
</FilesMatch>`,

    // Vercel configuration
    vercel: {
      "headers": [
        {
          "source": "/static/(.*)",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "public, max-age=31536000, immutable"
            }
          ]
        },
        {
          "source": "/(.*\\.(html|json))",
          "headers": [
            {
              "key": "Cache-Control", 
              "value": "no-cache, no-store, must-revalidate"
            }
          ]
        }
      ]
    }
  };

  fs.writeFileSync(
    path.join(buildDir, 'cache-config.json'),
    JSON.stringify(config, null, 2)
  );
}

/**
 * Generate build hash for cache busting
 */
function generateBuildHash() {
  const crypto = require('crypto');
  const hash = crypto.createHash('md5');
  hash.update(version + cacheVersion + Date.now().toString());
  return hash.digest('hex').substring(0, 8);
}

/**
 * Main build process
 */
function main() {
  try {
    console.log('🚀 Enterprise build started');
    
    const metadata = generateBuildMetadata();
    updateServiceWorker(metadata);
    updateIndexHtml(metadata);
    runReactBuild();
    postBuildOptimizations();
    
    console.log('🎉 Enterprise build completed successfully!');
    console.log('📊 Build Summary:');
    console.log(`   Version: ${version}`);
    console.log(`   Cache Version: ${cacheVersion}`);
    console.log(`   Build Hash: ${metadata.buildHash}`);
    console.log(`   Build Time: ${metadata.buildTime}`);
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };