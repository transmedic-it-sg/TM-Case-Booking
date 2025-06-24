# Claude Code Optimization Guide

## Quick Reference Scripts

### Build & Development
```bash
# Quick build check
npm run build 2>&1 | head -20

# Development server
npm start

# Type check only
npx tsc --noEmit

# Lint check
npm run lint 2>/dev/null || echo "No lint script"
```

### File Structure Overview
```
src/
├── components/           # React components
│   ├── CasesList/       # Main cases view with filters
│   ├── EditSets/        # Surgery sets management
│   ├── CustomModal.tsx  # Modal system
│   └── SearchableDropdown.tsx # Fuzzy search dropdown
├── contexts/            # React contexts
├── hooks/              # Custom hooks (useModal)
├── utils/              # Utilities (auth, storage, permissions)
├── types/              # TypeScript types
└── data/               # Permission matrix data
```

## Component Interfaces (Quick Reference)

### SearchableDropdown
```typescript
interface SearchableDropdownProps {
  options: string[] | {value: string, label: string}[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}
```

### CustomModal
```typescript
interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'alert' | 'confirm' | 'success' | 'error' | 'warning';
  actions?: {label: string, onClick: () => void, style?: string}[];
}
```

## Key Implementation Patterns

### 1. Permission Checking
```typescript
import { hasPermission, PERMISSION_ACTIONS } from '../utils/permissions';
const canEdit = hasPermission(user?.role || '', PERMISSION_ACTIONS.EDIT_CASE);
```

### 2. Modal Usage
```typescript
const { modal, closeModal, showConfirm, showSuccess } = useModal();
showConfirm('Title', 'Message', () => { /* onConfirm */ });
```

### 3. Status Workflow
```
Case Booked → Order Preparation → Order Prepared → 
Pending Delivery (Hospital) → Delivered (Hospital) → 
Case Completed → Delivered (Office) → To be billed
```

## Recent Changes Summary

### Components Modified
- **SearchableDropdown**: Added object option support `{value, label}`
- **CustomModal**: New modal system replacing browser alerts
- **CaseActions**: Added cancel case with permission checks
- **EditSets**: Made base procedure types deletable
- **BookingCalendar**: Added click navigation to cases

### New Files Added
- `src/components/CustomModal.tsx` - Modal component
- `src/components/CustomModal.css` - Modal styles  
- `src/hooks/useModal.ts` - Modal management hook
- `src/utils/emergencyFix.ts` - Utility functions
- `src/utils/notifications.ts` - Notification helpers

### Permission Matrix Updates
- Added `cancel-case` permission for admin/operations-manager roles
- Case cancellation only available for specific statuses

## Performance Optimizations Applied

### React.memo Usage
```typescript
// Applied to expensive components
export default React.memo(SearchableDropdown);
export default React.memo(NotificationBell);
```

### useMemo for Expensive Operations
```typescript
const filteredCases = useMemo(() => 
  cases.filter(c => c.status === selectedStatus), 
  [cases, selectedStatus]
);
```

### useCallback for Event Handlers
```typescript
const handleClick = useCallback((id: string) => {
  // handler logic
}, [dependency]);
```

## Common Issues & Solutions

### TypeScript Errors
- **Dropdown options**: Use `{value: string, label: string}[]` format
- **Permission checks**: Always check user existence before role access
- **Modal actions**: Provide proper action objects with onClick handlers

### Build Issues
- Run `npm run build` to check compilation
- Check for missing imports in new components
- Verify all TypeScript interfaces are properly exported

## Development Workflow

### Adding New Features
1. Check permissions in `src/data/permissionMatrixData.ts`
2. Add to `PERMISSION_ACTIONS` in `src/utils/permissions.ts`
3. Implement component with proper permission checks
4. Add to main App.tsx routing if needed
5. Test compilation with `npm run build`

### Debugging
1. Check browser console for runtime errors
2. Verify localStorage data structure
3. Check notification system for user feedback
4. Review permission matrix for access issues

## Token Usage Optimization

### For Future Claude Interactions
1. **Reference this file first** for quick context
2. **Use component interfaces** instead of reading full files
3. **Check recent changes** section for implementation patterns
4. **Use quick reference scripts** for common operations

### File Reading Strategy
- Read CLAUDE.md for architecture overview
- Use Grep for specific function/component searches
- Read component interfaces before implementation
- Use git status/diff for recent changes context

## Memory & Performance Notes

### Current Optimizations
- React.memo on heavy components
- useMemo for expensive computations  
- useCallback for event handlers
- Efficient permission checking system
- Lazy loading where applicable

### Storage Efficiency
- LocalStorage used for data persistence
- Minimal state management overhead
- Efficient filtering and search implementations
- Optimized CSS with reduced animations on mobile