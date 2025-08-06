#!/bin/bash

echo "🚀 Building PWA + Mobile Apps for TM Case Booking..."

# Build the React app
echo "📦 Building React app..."
npm run build

# Sync with Capacitor platforms  
echo "📱 Syncing with mobile platforms..."
npx cap sync

echo "✅ Build complete!"
echo ""
echo "🌐 PWA: Deploy the 'build' folder to Vercel as usual"
echo "📱 Android: Run 'npx cap open android' to build APK"
echo "🍎 iOS: Run 'npx cap open ios' to build for App Store"
echo ""
echo "🔗 For production mobile apps, update capacitor.config.ts with your Vercel URL"