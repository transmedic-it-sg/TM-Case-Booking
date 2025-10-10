#!/bin/bash

# Quick Start Guide for E2E Testing Framework
# Comprehensive testing for all 9 critical issues

echo "🚀 TM Case Booking - E2E Testing Framework"
echo "=========================================="
echo ""

# Check if Playwright is installed
if ! command -v npx playwright &> /dev/null; then
    echo "❌ Playwright not found. Installing..."
    npm install @playwright/test playwright
    npx playwright install
fi

echo "✅ Playwright is ready"
echo ""

# Check application build
echo "🔨 Checking application build..."
if npm run build > /dev/null 2>&1; then
    echo "✅ Application builds successfully"
else
    echo "❌ Application build failed. Please fix build errors first."
    exit 1
fi

echo ""
echo "📋 Available Test Commands:"
echo ""
echo "1. 🏃‍♂️ Quick test run:"
echo "   npm run test:e2e:playwright"
echo ""
echo "2. 👀 Run with browser visible:"
echo "   npm run test:e2e:playwright:headed"
echo ""
echo "3. 🐛 Debug mode (step through):"
echo "   npm run test:e2e:playwright:debug"
echo ""
echo "4. 📊 Comprehensive test suite:"
echo "   node e2e/run-comprehensive-tests.js"
echo ""
echo "5. 📈 View test report:"
echo "   npm run test:e2e:playwright:report"
echo ""

echo "🎯 Critical Issues Being Tested:"
echo ""
echo "✓ Case creation error (saves but shows error)"
echo "✓ Case card quantities not showing"
echo "✓ Mobile notification dropdown design"
echo "✓ Status colors move to More section on mobile"
echo "✓ Email notification system"
echo "✓ Mobile modal padding issues"
echo "✓ Status update history timing"
echo "✓ Case card attachment functionality"
echo "✓ Amendment history display"
echo ""

echo "🔍 Test Coverage:"
echo "• 175 total tests across 7 test suites"
echo "• Cross-browser: Chrome, Firefox, Safari"
echo "• Mobile responsive: Pixel 5, iPhone 12"
echo "• Parallel execution for speed"
echo ""

echo "💡 Usage Examples:"
echo ""
echo "# Test specific issue category:"
echo "npx playwright test e2e/tests/02-case-creation.spec.ts"
echo ""
echo "# Test only mobile responsiveness:"
echo "npx playwright test e2e/tests/04-mobile-responsiveness.spec.ts"
echo ""
echo "# Test email notifications:"
echo "npx playwright test e2e/tests/05-email-notifications.spec.ts"
echo ""

read -p "🚀 Run comprehensive test suite now? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Starting comprehensive e2e test execution..."
    echo ""
    node e2e/run-comprehensive-tests.js
fi

echo ""
echo "📚 For more details, see: e2e/README.md"