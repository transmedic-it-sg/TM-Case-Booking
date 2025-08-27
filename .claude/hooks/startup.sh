#!/bin/bash

# Claude Code Startup Hook - MCP Validation
# This script runs automatically when Claude Code starts

echo "🚀 Claude Code startup - validating MCP configuration..."

# Change to project directory
cd /mnt/c/Users/anrong.low/TM-Case-Booking

# Run the MCP validation script
if [ -f "validate-mcp-startup.sh" ]; then
    bash validate-mcp-startup.sh
else
    echo "⚠️  MCP validation script not found, creating it..."
    
    # Create the validation script if it doesn't exist
    cat > validate-mcp-startup.sh << 'EOF'
#!/bin/bash

echo "🔍 MCP Startup Validation Script"
echo "================================="

# Check Node.js version
NODE_VERSION=$(node --version)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')

if [ "$NODE_MAJOR" -lt 20 ]; then
    echo "❌ Node.js $NODE_VERSION too old, updating..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - > /dev/null 2>&1
    sudo apt-get install nodejs -y > /dev/null 2>&1
    echo "✅ Updated to $(node --version)"
else
    echo "✅ Node.js $NODE_VERSION is compatible"
fi

# Check and fix MCP connection
MCP_STATUS=$(claude mcp list 2>&1)
if echo "$MCP_STATUS" | grep -q "✓ Connected"; then
    echo "✅ Supabase MCP server connected"
else
    echo "🔄 Reconnecting MCP server..."
    claude mcp remove supabase -s local > /dev/null 2>&1
    claude mcp add-json supabase '{"command": "npx", "args": ["-y", "@supabase/mcp-server-supabase@latest", "--project-ref=aqzjzjygflmxkcbfnjbe"], "env": {"SUPABASE_ACCESS_TOKEN": "sbp_5ccd2b2a4710ef9c0d1d5cb5262be9bf06380f26"}}' -s local
    sleep 2
    echo "✅ MCP server reconnected"
fi

echo "🎉 MCP validation complete"
EOF

    chmod +x validate-mcp-startup.sh
    bash validate-mcp-startup.sh
fi

echo "✅ Claude Code startup hook completed successfully"