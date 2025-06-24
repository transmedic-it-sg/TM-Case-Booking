#!/bin/bash

# Claude Code Helper Scripts
# Quick commands for efficient development and debugging

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

echo_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

echo_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Quick build check
quick_build() {
    echo_status "Running quick build check..."
    npm run build 2>&1 | head -20
    if [ $? -eq 0 ]; then
        echo_success "Build completed successfully"
    else
        echo_error "Build failed - check errors above"
    fi
}

# Component summary
component_summary() {
    echo_status "Component Summary:"
    echo "React Components: $(find src/components -name "*.tsx" | wc -l)"
    echo "Hooks: $(find src/hooks -name "*.ts" | wc -l)"
    echo "Utils: $(find src/utils -name "*.ts" | wc -l)"
    echo "Types: $(find src/types -name "*.ts" | wc -l)"
    echo ""
    echo "Recent modifications:"
    git diff --name-only HEAD~5 HEAD | grep -E "\.(tsx?|css)$" | head -10
}

# Find component by name
find_component() {
    if [ -z "$1" ]; then
        echo_error "Usage: find_component <component_name>"
        return 1
    fi
    
    echo_status "Searching for component: $1"
    find src -name "*$1*" -type f | head -10
}

# Permission matrix quick view
permission_summary() {
    echo_status "Permission Matrix Summary:"
    echo "Total Roles: $(grep -c "id:" src/data/permissionMatrixData.ts | head -1)"
    echo "Total Actions: $(grep -c "id:" src/data/permissionMatrixData.ts | tail -1)"
    echo ""
    echo "Recent permission changes:"
    git log --oneline -5 -- src/data/permissionMatrixData.ts src/utils/permissions.ts
}

# TypeScript error summary
ts_check() {
    echo_status "TypeScript check..."
    npx tsc --noEmit 2>&1 | head -20
    if [ $? -eq 0 ]; then
        echo_success "No TypeScript errors found"
    else
        echo_warning "TypeScript errors detected - see above"
    fi
}

# File size analysis
size_analysis() {
    echo_status "File Size Analysis:"
    echo "Largest TypeScript files:"
    find src -name "*.tsx" -o -name "*.ts" | xargs wc -l | sort -nr | head -10
    echo ""
    echo "Largest CSS files:"
    find src -name "*.css" | xargs wc -l | sort -nr | head -5
}

# Component dependency check
dependency_check() {
    echo_status "Component Dependencies:"
    echo "Components using CustomModal:"
    grep -l "CustomModal" src/components/**/*.tsx 2>/dev/null | wc -l
    echo "Components using SearchableDropdown:"
    grep -l "SearchableDropdown" src/components/**/*.tsx 2>/dev/null | wc -l
    echo "Components using useModal:"
    grep -l "useModal" src/components/**/*.tsx 2>/dev/null | wc -l
}

# Git status summary
git_summary() {
    echo_status "Git Status Summary:"
    echo "Current branch: $(git branch --show-current)"
    echo "Modified files: $(git status --porcelain | wc -l)"
    echo "Recent commits:"
    git log --oneline -5
}

# Main menu
show_menu() {
    echo_status "Claude Helper Scripts Menu:"
    echo "1. quick_build        - Fast build check"
    echo "2. component_summary  - Component overview"
    echo "3. find_component     - Find component by name"
    echo "4. permission_summary - Permission matrix info"
    echo "5. ts_check          - TypeScript validation"
    echo "6. size_analysis     - File size analysis"
    echo "7. dependency_check  - Component dependencies"
    echo "8. git_summary       - Git status overview"
    echo ""
    echo "Usage: source scripts/claude-helpers.sh && <function_name>"
}

# If script is run directly, show menu
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    show_menu
fi