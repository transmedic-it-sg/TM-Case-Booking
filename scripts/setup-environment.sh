#!/bin/bash

# Environment Setup Script for TM-Case-Booking
# Usage: ./scripts/setup-environment.sh [development|production]

ENVIRONMENT=${1:-development}

echo "🚀 Setting up $ENVIRONMENT environment..."

# Copy the appropriate environment file
if [ "$ENVIRONMENT" = "production" ]; then
    cp .env.production .env
    echo "✅ Production environment configured"
    echo "🌐 Using main Supabase branch: yjllfmmzgnapsqfddbwt"
elif [ "$ENVIRONMENT" = "development" ]; then
    cp .env.development .env
    echo "✅ Development environment configured"
    echo "🧪 Using development Supabase branch (to be created)"
else
    echo "❌ Invalid environment. Use 'development' or 'production'"
    exit 1
fi

echo ""
echo "📋 Next steps:"
if [ "$ENVIRONMENT" = "development" ]; then
    echo "1. Create development branch in Supabase dashboard"
    echo "2. Update .env.development with development branch credentials"
    echo "3. Run: npm start"
elif [ "$ENVIRONMENT" = "production" ]; then
    echo "1. Run: npm run build"
    echo "2. Deploy to GitHub Pages"
fi

echo ""
echo "🔧 Current configuration:"
cat .env