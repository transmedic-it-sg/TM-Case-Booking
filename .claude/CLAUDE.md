# TM Case Booking Application - Complete Claude Context

## Project Overview
**Version**: 1.3.0 | **Status**: Production-ready | **Framework**: React TypeScript + Supabase

A comprehensive medical equipment case booking application with real-time Supabase backend integration.

### Technology Stack
- **Frontend**: React 18 + TypeScript, CSS Modules, React Hooks + Context
- **Backend**: Supabase (PostgreSQL + Auth + Real-time + Storage)
- **Build**: Create React App, npm package manager

### Key Scripts
```bash
npm start                # Dev server (port 3000)
PORT=3001 npm start     # Custom port
npm run build           # Production build
npm run typecheck       # TypeScript check
npm run lint           # ESLint
npm test               # Run tests
```

### Project Structure
```
src/
├── components/         # React components
│   ├── CaseBookingForm.tsx     # Main booking form
│   ├── CasesList/              # Cases management
│   ├── EditSets/               # Equipment management
│   └── BookingCalendar.tsx     # Calendar interface
├── hooks/             # Custom React hooks (useRealtimeCases, etc.)
├── services/          # Business logic (realtimeCaseService, etc.)
├── utils/             # Utilities (supabaseCaseService, permissions, etc.)
├── types/             # TypeScript definitions
└── assets/            # CSS and static assets
```

## Recent Critical Fixes Completed ✅

### 1. Missing Tab Navigation
- **Issue**: Procedure Types and Surgery & Implants tabs disappeared
- **Fix**: Restored tab navigation in `ModernEditSets.tsx`
- **File**: `src/components/EditSets/ModernEditSets.tsx`

### 2. Form Layout Standardization  
- **Issue**: Inconsistent two-column layouts, quantities not side-by-side
- **Fix**: Fixed CSS grid layouts and form structures
- **Files**: `src/components/CaseBookingForm.tsx`, `src/assets/components/forms.css`

### 3. Edit Sets Independence
- **Issue**: Tabs requiring doctor selection inappropriately
- **Fix**: Made tabs database-driven with independent loading
- **File**: `src/components/EditSets/ModernEditSets.tsx`

### 4. Button Design Consistency
- **Issue**: Delete button styling inconsistencies  
- **Fix**: Verified standardized CSS classes applied
- **File**: `src/components/CasesList/CaseActions.tsx`

## Conversation Context & User Preferences

### Previous Session Patterns
- **Quality Standards**: User expects all claimed fixes to actually work
- **Verification Required**: Always build and test before claiming completion
- **Systematic Tracking**: User prefers TodoWrite tool for multiple issues
- **Frustration Points**: Non-working solutions, incomplete fixes

### Key User Quotes
> "Whatever I mentioned or you mentioned that you fixed isn't fixed. The only thing you fixed was the reordering of 'Manage Doctor' the rest of the issue still remains."

> "IT IS NOT WORKNIG NOT WORKING NOT WORKING!!! PLEASE DO SOMETHING OH MY GOD its so frustrating man"

### Working Relationship Notes
- User values concrete results over explanations
- Prefers systematic issue tracking with TodoWrite
- Expects thorough testing and verification
- Appreciates direct, concise communication

## Authentication & Environment Setup

### Required Environment Variables
```bash
# Anthropic API Key (for Claude Code)
export ANTHROPIC_API_KEY="your_anthropic_api_key_here"

# Supabase Configuration (for app)
export REACT_APP_SUPABASE_URL="your_supabase_url"
export REACT_APP_SUPABASE_ANON_KEY="your_supabase_anon_key"

# MCP Server (for Claude Code Supabase integration)
export SUPABASE_URL="your_supabase_url"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
export SUPABASE_PROJECT_ID="your_project_id"

# Optional
export REACT_APP_ENABLE_REAL_TIME=true
export REACT_APP_ENABLE_TESTING=false
```

### VS Code Configuration

Create `.vscode/settings.json`:
```json
{
  "claude.enabled": true,
  "claude.model": "claude-3-5-sonnet-20241022",
  "claude.projectPath": ".",
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "files.exclude": {
    "**/node_modules": true,
    "**/build": true,
    "**/.git": true
  }
}
```

## MCP & Tools Configuration

### Available Tools
- **Filesystem**: Read/write project files (src/, .claude/, *.ts, *.tsx, *.css, *.json, *.md)
- **Bash**: Build commands, npm scripts, git operations, development tools
- **Supabase MCP**: Database queries, migrations, logs, advisors, TypeScript generation
- **WebFetch**: Documentation from docs.anthropic.com, supabase.com, etc.
- **TodoWrite**: Task management and progress tracking
- **Glob/Grep**: File searching and pattern matching

### Key Commands
```bash
# Development
npm run build              # ✅ Always verify fixes
npm run typecheck         # ✅ Check TypeScript
npm start                 # Development server
PORT=3001 npm start      # Alternative port

# Git Operations  
git status               # Check changes
git add .               # Stage files
git commit -m "message" # Commit changes

# Debugging
lsof -i :3000           # Check port usage
ps aux | grep node      # Check processes
```

## Current Build Status
- ✅ **TypeScript**: Compilation successful
- ✅ **Build**: Production build successful (269kB main.js)
- ✅ **Functionality**: All critical issues resolved
- ⚠️ **Linting**: Console statement warnings (non-blocking)
- ✅ **Production**: Ready for deployment

## Key Database Schema
### Core Tables
- `case_bookings` - Main case data with status tracking
- `status_history` - Case status timeline with attachments
- `amendment_history` - Case modification audit trail
- `users` - User accounts with role-based permissions
- `doctors`, `doctor_procedures`, `doctor_procedure_sets` - Equipment management

### Data Flow
1. Real-time queries via `useRealtimeCases` hook
2. Direct Supabase calls through `realtimeCaseService`
3. Database operations via `supabaseCaseService`
4. No caching - always fresh data for accuracy

## Migration to Claude Code VS Code

### Quick Setup Steps
1. Install Claude Code VS Code extension
2. Configure Anthropic API key: `export ANTHROPIC_API_KEY="your_key"`
3. Set up Supabase environment variables (see above)
4. Install MCP server: `npm install -g @supabase/mcp-server`
5. Open project in VS Code: `code /mnt/c/Users/AnRon/TM-Case-Booking`

### First Conversation Script
```
Hello! I've migrated from Claude Code CLI to VS Code extension for the TM Case Booking project.

Please review this CLAUDE.md file to understand our previous work together. Key context:
- This is a React TypeScript case booking application with Supabase backend
- We recently fixed critical issues with missing tabs, form layouts, and edit sets
- The application is currently production-ready (v1.3.0)
- I value working solutions and systematic issue tracking with TodoWrite
- Always verify fixes by running npm run build before claiming completion

Can you confirm you understand the project context and can access the codebase?
```

## Follow-up Items for Future Sessions

### Always Remember
1. **Verify fixes**: Run `npm run build` and test functionality
2. **Use TodoWrite**: For multiple issues, track systematically  
3. **User expects results**: Focus on working solutions over explanations
4. **Critical files**: Check EditSets, CaseBookingForm, and layout CSS
5. **Build verification**: TypeScript + build success required

### Common Issue Areas
- Layout/CSS Grid problems in forms and edit sets
- Tab navigation and component independence  
- Permission-based conditional rendering
- Real-time Supabase connection issues
- Button styling consistency

### Project Health Indicators
- ✅ `npm run build` succeeds
- ✅ `npm run typecheck` passes
- ✅ All tabs visible in EditSets
- ✅ Two-column layouts working
- ✅ Real-time updates functioning

---

**Current Status**: All critical issues resolved. Application is production-ready with successful build and comprehensive real-time functionality.