# Claude Quick Start Guide 🚀

## Immediate Context (Read This First)

### Project Status
- ✅ **Build Status**: Compiling successfully
- ✅ **All Features**: 10/10 implemented and working
- ✅ **TypeScript**: No errors
- 🎯 **Current Branch**: Version1.1.1

### Recent Major Changes
1. **SearchableDropdown** - Added fuzzy search to all single dropdowns
2. **CustomModal System** - Replaced browser prompts with custom modals  
3. **Case Cancellation** - Full workflow with permissions
4. **Edit Sets** - Made base procedure types deletable
5. **Calendar Navigation** - Click booking items to redirect to cases

## Quick Commands

```bash
# Essential checks
npm run quick-build      # Fast build verification
npm run component-summary # Component overview
npm run ts-check         # TypeScript validation

# Helper scripts
source scripts/claude-helpers.sh && show_menu
```

## File Priority for Reading

### 🔥 Critical Files (Read First)
1. `CLAUDE_OPTIMIZATION.md` - Complete optimization guide
2. `scripts/component-interfaces.ts` - All interfaces in one place
3. `CLAUDE.md` - Architecture and implementation details

### 📋 Reference Files (As Needed)
4. `src/data/permissionMatrixData.ts` - Permission system
5. `src/utils/permissions.ts` - Permission constants
6. `src/components/SearchableDropdown.tsx` - Fuzzy search component
7. `src/components/CustomModal.tsx` - Modal system

### 🔍 Search Patterns (Use Grep)
```bash
# Find components
grep -r "export.*Component" src/components/

# Find permissions  
grep -r "PERMISSION_ACTIONS" src/

# Find modal usage
grep -r "useModal\|CustomModal" src/
```

## Common Implementation Patterns

### Permission Check
```typescript
import { hasPermission, PERMISSION_ACTIONS } from '../utils/permissions';
const canEdit = hasPermission(user?.role || '', PERMISSION_ACTIONS.EDIT_CASE);
```

### Modal Usage
```typescript
const { showConfirm, showSuccess } = useModal();
showConfirm('Title', 'Message', () => { /* action */ });
```

### Dropdown with Search
```typescript
<SearchableDropdown
  options={[
    { value: 'id1', label: 'Display Name' },
    { value: 'id2', label: 'Another Option' }
  ]}
  value={selectedValue}
  onChange={setValue}
  placeholder="Search..."
/>
```

## Component Architecture

```
App.tsx (Main Router)
├── CasesList/ (Main view)
│   ├── CasesFilter.tsx (SearchableDropdowns)
│   ├── CaseActions.tsx (Permission-based buttons)
│   └── CaseCard.tsx
├── CaseBookingForm.tsx (SearchableDropdowns + CustomModal)
├── BookingCalendar.tsx (Click navigation)
├── CustomModal.tsx (Modal system)
├── SearchableDropdown.tsx (Fuzzy search)
└── EditSets/ (Procedure type management)
```

## Performance Optimizations Applied

- ✅ React.memo on expensive components
- ✅ useMemo for filtered data
- ✅ useCallback for event handlers  
- ✅ Efficient permission checking
- ✅ Optimized CSS with reduced motion support

## Token Usage Optimization

### For Claude Interactions:
1. **Start here**: Read this file + CLAUDE_OPTIMIZATION.md
2. **Interfaces**: Use `scripts/component-interfaces.ts` instead of reading full files
3. **Quick checks**: Use helper scripts for status
4. **Targeted search**: Use Grep for specific functions/components
5. **Build verification**: Always run `npm run quick-build` after changes

### Memory Efficient Approach:
- Reference interfaces file for types
- Use helper scripts for summaries
- Read only specific file sections when needed
- Check git diff for recent changes context

## Troubleshooting Quick Reference

### TypeScript Errors
- Check SearchableDropdown options format: `{value, label}[]`
- Verify permission checks have user null checks
- Ensure all imports are correctly typed

### Build Issues  
- Run `npm run ts-check` for detailed errors
- Check for missing dependencies
- Verify all new files are properly exported

### Permission Issues
- Check `permissionMatrixData.ts` for role permissions
- Verify `PERMISSION_ACTIONS` constants are imported
- Test with different user roles

### Modal Issues
- Ensure useModal hook is imported
- Check CustomModal is rendered in component JSX
- Verify action handlers are properly defined

---

⚡ **Pro Tip**: Use `npm run claude-help` to see all available helper commands!