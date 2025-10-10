# Comprehensive E2E Testing Framework

## Overview

This comprehensive End-to-End testing framework addresses all 9 critical issues reported in the TM Case Booking application using Playwright. The framework is designed to systematically test and verify fixes for production-critical bugs.

## Critical Issues Being Tested

1. **Case Creation Error** - Case saves but shows error message
2. **Case Card Quantities** - Quantities not displaying properly
3. **Mobile Notification Dropdown** - Design issues on mobile
4. **Status Colors on Mobile** - Should move to More section
5. **Email Notification System** - Not working properly
6. **Mobile Modal Padding** - Padding issues on mobile
7. **Status Update History Timing** - Incorrect timing display
8. **Case Card Attachments** - Attachment functionality broken
9. **Amendment History Display** - History not showing correctly

## Test Structure

```
e2e/
├── tests/
│   ├── 01-authentication.spec.ts      # Login/logout functionality
│   ├── 02-case-creation.spec.ts       # Case creation & validation
│   ├── 03-case-display.spec.ts        # Data display & quantities
│   ├── 04-mobile-responsiveness.spec.ts # Mobile UI issues
│   ├── 05-email-notifications.spec.ts # Email system
│   ├── 06-case-amendments.spec.ts     # Amendment history
│   └── 07-file-attachments.spec.ts    # File upload/download
├── utils/
│   ├── auth.ts                        # Authentication helpers
│   └── case-helpers.ts                # Case management helpers
├── fixtures/                          # Test files for uploads
└── test-results/                      # Generated reports
```

## Setup & Installation

### Prerequisites
- Node.js 16+ installed
- Application builds successfully (`npm run build`)
- Supabase environment variables configured

### Installation
```bash
# Install Playwright (already done)
npm install @playwright/test playwright

# Install browsers
npx playwright install

# Verify setup
npm run test:e2e:playwright -- --version
```

## Running Tests

### Quick Test Run
```bash
# Run all e2e tests
npm run test:e2e:playwright

# Run with browser visible
npm run test:e2e:playwright:headed

# Debug mode (step through)
npm run test:e2e:playwright:debug
```

### Comprehensive Test Suite
```bash
# Run full comprehensive test suite
node e2e/run-comprehensive-tests.js

# With browser visible
node e2e/run-comprehensive-tests.js --headed

# Quick mode (essential tests only)
node e2e/run-comprehensive-tests.js --quick
```

### Individual Test Categories
```bash
# Authentication tests only
npx playwright test e2e/tests/01-authentication.spec.ts

# Case creation issues
npx playwright test e2e/tests/02-case-creation.spec.ts

# Mobile responsiveness
npx playwright test e2e/tests/04-mobile-responsiveness.spec.ts

# Email notifications
npx playwright test e2e/tests/05-email-notifications.spec.ts
```

## Test Reports

### View Reports
```bash
# Show interactive report
npm run test:e2e:playwright:report

# View comprehensive report
cat e2e/test-results/comprehensive-report.json
```

### Report Locations
- **HTML Report**: `playwright-report/index.html`
- **JSON Results**: `e2e/test-results/results.json`
- **Comprehensive Report**: `e2e/test-results/comprehensive-report.json`
- **Screenshots**: `test-results/` (on failures)
- **Videos**: `test-results/` (on failures)

## Configuration

### Playwright Config
- **Base URL**: `http://localhost:3000`
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile**: Pixel 5, iPhone 12
- **Retries**: 2 on CI, 0 locally
- **Parallel**: Full parallel execution
- **Timeouts**: 30s default, 120s for server startup

### Environment Setup
Ensure these environment variables are set:
```bash
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
```

## Test Data Requirements

### Test Users
- **Admin User**: username=admin, password=admin123
- **Temp User**: username=tempuser, password=temp123 (for password change tests)

### Test Data
- Hospital: "Test Hospital"
- Doctor: "Dr. Test"
- Procedure: "Test Procedure"
- Country: "Indonesia"

## CI/CD Integration

### GitHub Actions
```yaml
- name: Run E2E Tests
  run: |
    npm run build
    npm run test:e2e:playwright
```

### Pre-deployment Check
```bash
# Verify all critical issues are fixed
node e2e/run-comprehensive-tests.js

# Exit code 0 = ready for production
# Exit code 1 = issues found, fix before deployment
```

## Debugging Failed Tests

### Visual Debugging
```bash
# Run with browser visible
npm run test:e2e:playwright:headed

# Step-by-step debugging
npm run test:e2e:playwright:debug
```

### Common Issues
1. **Server not starting**: Check port 3000 availability
2. **Login failures**: Verify test user credentials
3. **Data not loading**: Check Supabase connection
4. **Mobile tests failing**: Verify responsive design CSS

### Test Data Cleanup
```bash
# Reset test environment
# (Implementation depends on your data management strategy)
```

## Expected Results

### Success Criteria
- ✅ All authentication flows work
- ✅ Cases create without error messages
- ✅ Quantities display correctly in case cards
- ✅ Mobile UI renders properly
- ✅ Email notifications send successfully
- ✅ Amendment history displays correctly
- ✅ File attachments work end-to-end

### Performance Targets
- Test execution: < 10 minutes for full suite
- Page load times: < 3 seconds
- Mobile responsiveness: All viewports 375px+

## Maintenance

### Updating Tests
1. Modify test files in `e2e/tests/`
2. Update helpers in `e2e/utils/`
3. Add new fixtures to `e2e/fixtures/`
4. Run tests to verify changes

### Adding New Tests
1. Create new `.spec.ts` file in `tests/`
2. Follow existing naming convention
3. Use helper utilities for common actions
4. Add to comprehensive test runner if critical

## Support

### Documentation
- [Playwright Docs](https://playwright.dev/docs/intro)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)

### Troubleshooting
- Check application builds: `npm run build`
- Verify environment variables
- Ensure test data exists in database
- Check browser compatibility

This framework ensures that all critical issues are systematically tested and verified before any production deployment.