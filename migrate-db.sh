#!/bin/bash

# Database Migration Script: Production to UAT
# This script helps migrate your Supabase database from Production to UAT

echo "🔄 Supabase Database Migration: Production → UAT"
echo "================================================="

# Production Database Credentials
PROD_PROJECT_REF="aqzjzjygflmxkcbfnjbe"
PROD_DB_URL="postgresql://postgres:[YOUR_PROD_DB_PASSWORD]@db.aqzjzjygflmxkcbfnjbe.supabase.co:5432/postgres"

# UAT Database Credentials  
UAT_PROJECT_REF="rqcrsrdlcdpkxxkqwvyo"
UAT_DB_URL="postgresql://postgres:[YOUR_UAT_DB_PASSWORD]@db.rqcrsrdlcdpkxxkqwvyo.supabase.co:5432/postgres"

echo "Step 1: Login to Supabase CLI"
echo "Run: npx supabase login"
echo ""

echo "Step 2: Dump Production Database"
echo "Run: npx supabase db dump --db-url=\"$PROD_DB_URL\" --file=production_dump.sql"
echo ""

echo "Step 3: Import to UAT Database"  
echo "Run: psql \"$UAT_DB_URL\" < production_dump.sql"
echo ""

echo "Alternative: Use pg_dump and psql directly"
echo "Export: pg_dump \"$PROD_DB_URL\" > production_dump.sql"
echo "Import: psql \"$UAT_DB_URL\" < production_dump.sql"
echo ""

echo "📋 Manual Steps Required:"
echo "1. Get your database passwords from Supabase dashboard"
echo "2. Replace [YOUR_PROD_DB_PASSWORD] and [YOUR_UAT_DB_PASSWORD] above"
echo "3. Run the commands above in sequence"
echo ""

echo "🔐 Database Password Locations:"
echo "Production: https://supabase.com/dashboard/project/$PROD_PROJECT_REF/settings/database"
echo "UAT: https://supabase.com/dashboard/project/$UAT_PROJECT_REF/settings/database"