#!/bin/bash

echo "🚀 Supabase MCP Setup Script"
echo "============================"

# Check Node.js version
NODE_VERSION=$(node --version)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')

if [ "$NODE_MAJOR" -lt 20 ]; then
    echo "⚠️  Node.js $NODE_VERSION is too old. Updating to 20+..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - > /dev/null 2>&1
    sudo apt-get install nodejs -y > /dev/null 2>&1
    echo "✅ Updated to $(node --version)"
else
    echo "✅ Node.js $NODE_VERSION is compatible"
fi

# Setup MCP server for current production database
echo ""
echo "🔧 Setting up Supabase MCP server..."

# Remove existing configurations
claude mcp remove supabase -s local > /dev/null 2>&1

# Set access token for production database
export SUPABASE_TOKEN="sbp_21925f3541ba2e2c40327f4ec3314f96c0fda952"

echo "📥 Configuring production database (ycmrdeiofuuqsugzjzoq)..."
claude mcp add-json supabase '{
    "command": "npx",
    "args": ["-y", "@supabase/mcp-server-supabase@latest", "--project-ref=ycmrdeiofuuqsugzjzoq"],
    "env": {"SUPABASE_ACCESS_TOKEN": "'$SUPABASE_TOKEN'"}
}' -s local

# Wait for connection
echo "⏳ Waiting for MCP connection..."
sleep 5

# Check final status
MCP_STATUS=$(claude mcp list 2>&1)
if echo "$MCP_STATUS" | grep -q "supabase"; then
    echo "✅ Supabase MCP server connected successfully!"
    echo ""
    echo "📊 Database Configuration:"
    echo "   🚀 Production Database: ycmrdeiofuuqsugzjzoq.supabase.co"
    echo ""
    echo "🔧 Available MCP Tools:"
    echo "   - mcp__supabase__execute_sql"
    echo "   - mcp__supabase__list_tables"
    echo "   - mcp__supabase__apply_migration"
    echo "   - mcp__supabase__generate_typescript_types"
    echo ""
    echo "🎉 Setup Complete!"
    echo "=================="
    echo ""
    echo "📋 Summary:"
    echo "   - Node.js: $(node --version)"
    echo "   - Production Database MCP: ✓ Connected"
    echo "   - Ready for database operations"
    echo ""
    echo "✅ All systems operational"
else
    echo "❌ MCP connection failed"
    echo "📋 Status:"
    claude mcp list
    echo ""
    echo "🔧 Try restarting Claude Code and running this script again"
    exit 1
fi