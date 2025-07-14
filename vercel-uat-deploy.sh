#!/bin/bash

# UAT Deployment Script
echo "🚀 Deploying UAT Environment to Vercel..."

# Set environment variables for UAT
export REACT_APP_SUPABASE_URL="https://rqcrsrdlcdpkxxkqwvyo.supabase.co"
export REACT_APP_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxY3JzcmRsY2Rwa3h4a3F3dnlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0NTYxNzgsImV4cCI6MjA2ODAzMjE3OH0.TsacGcws7AueQNG0BGlgSrxSnVVeVTomsxRz-0mV2N0"
export GENERATE_SOURCEMAP="false"

# Deploy to Vercel with UAT configuration
vercel deploy \
  --build-env REACT_APP_SUPABASE_URL="$REACT_APP_SUPABASE_URL" \
  --build-env REACT_APP_SUPABASE_ANON_KEY="$REACT_APP_SUPABASE_ANON_KEY" \
  --build-env GENERATE_SOURCEMAP="$GENERATE_SOURCEMAP" \
  --name="tm-case-booking-uat-new" \
  --yes

echo "✅ UAT Deployment completed!"
echo "🔗 Check your Vercel dashboard for the new deployment URL"