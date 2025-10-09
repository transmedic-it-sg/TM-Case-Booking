# .claude Directory Organization

This directory contains all Claude Code development tools and resources organized by purpose.

## Folder Structure

### 📁 **scripts/**
Utility and testing scripts for database operations and authentication fixes:
- `fix-admin-password.js` - Fix admin user password to use proper bcrypt hashing
- `fix-password.js` - Generate proper bcrypt hashes for all users
- `production-test.js` - Production environment testing script
- `production-verification.js` - Verify production deployment status
- `quick-production-check.js` - Quick health check for production
- `run-e2e-tests.js` - Execute end-to-end test suite
- `test-login.js` - Test authentication functionality
- `test-user-management.js` - Test user management operations
- `test-user-update.js` - Test user password reset functionality

### 📁 **testing/**
End-to-end testing framework and test results:
- `playwright.config.ts` - Playwright configuration for e2e testing
- `e2e-tests/` - Complete test suite for production readiness
  - `comprehensive-app-test.spec.ts` - Full application flow testing
  - `critical-flows.spec.ts` - Critical business flow validation
  - `data-integrity.spec.ts` - Database integrity testing
  - `login.spec.ts` - Authentication flow testing
  - `performance-and-load.spec.ts` - Performance validation
  - `production-ready-test.spec.ts` - Production readiness checks
  - `supabase-integration.spec.ts` - Database integration testing
- `test-results/` - Test execution results and reports

### 📁 **documentation/**
Project documentation and development notes:
- `GO-LIVE-SUCCESS.md` - Go-live deployment success documentation
- `conversation-summary-october-2024.md` - Development session summary
- `go-live-checklist.md` - Pre-deployment checklist
- `technical-roadmap.md` - Technical roadmap and future enhancements

### 📁 **hooks/**
Development automation scripts:
- `startup.sh` - Development environment startup script

### 📁 **.vercel/**
Vercel deployment configuration:
- `project.json` - Vercel project configuration
- `README.txt` - Deployment notes

## Core Files

- `CLAUDE.md` - Complete project context and development knowledge base
- `settings.local.json` - Local Claude Code settings
- `.gitignore` - Git ignore rules for .claude directory

## Usage Notes

- All scripts in `scripts/` can be run with `node .claude/scripts/[script-name].js`
- Testing files use Playwright framework - run with `npm run test:e2e`
- Documentation provides context for ongoing development and deployment history
- The `CLAUDE.md` file contains the complete project context and should be maintained