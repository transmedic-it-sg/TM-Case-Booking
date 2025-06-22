# Code Reference - Key Implementation Details

## 🔑 Permission Service Core

### `src/utils/permissions.ts`
```typescript
// Main permission checking function
export const hasPermission = (roleId: string, actionId: string): boolean => {
  const permissions = getRuntimePermissions();
  const permission = permissions.find(p => p.roleId === roleId && p.actionId === actionId);
  return permission?.allowed || false;
};

// Update permission and save to localStorage
export const updatePermission = (roleId: string, actionId: string, allowed: boolean): void => {
  const permissions = getRuntimePermissions();
  const existingIndex = permissions.findIndex(p => p.roleId === roleId && p.actionId === actionId);
  
  if (existingIndex >= 0) {
    permissions[existingIndex] = { ...permissions[existingIndex], allowed };
  } else {
    permissions.push({ roleId, actionId, allowed });
  }
  
  saveRuntimePermissions(permissions);
};
```

## 🔧 Key Implementation Patterns

### Permission-Based UI Pattern
```typescript
// In any component:
import { hasPermission, PERMISSION_ACTIONS } from '../utils/permissions';

const currentUser = getCurrentUser();
const canCreateUsers = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.CREATE_USER) : false;

return (
  <>
    {canCreateUsers && (
      <button onClick={handleCreateUser}>Add User</button>
    )}
  </>
);
```

### Status Change Success Pattern
```typescript
// In CasesList component:
const [showSuccessPopup, setShowSuccessPopup] = useState(false);
const [successMessage, setSuccessMessage] = useState('');

const handleStatusChange = (caseId: string, newStatus: CaseStatus) => {
  updateCaseStatus(caseId, newStatus, currentUser.name);
  
  // Show success popup
  setSuccessMessage(`Case status successfully updated to "${newStatus}"`);
  setShowSuccessPopup(true);
  
  // Add notification
  addNotification({...});
};

return (
  <>
    {/* Other components */}
    <StatusChangeSuccessPopup
      message={successMessage}
      isVisible={showSuccessPopup}
      onClose={() => setShowSuccessPopup(false)}
    />
  </>
);
```

## 🎨 CSS Key Fixes

### Role-Country Alignment Fix
```css
.role-country-info {
  display: flex;
  align-items: center;
  gap: 8px;
  /* Removed: margin-bottom: 8px; */
}
```

### Notification Badge Position Fix
```css
.notification-badge {
  position: absolute;
  top: -3px;    /* Changed from -8px */
  right: -4px;  /* Changed from -8px */
  /* ... other styles */
}
```

### Option Text Centering Fix
```css
.multi-select-option .option-text {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
  text-align: center;  /* Added */
}
```

### Status Legend Popup Styles
```css
.status-legend-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.3s ease;
}

.status-legend-popup {
  background: white;
  border-radius: 16px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease;
}
```

## 🔄 Data Flow

### Permission Matrix → Runtime Enforcement
```
1. Admin changes permission in matrix
   ↓
2. updatePermission() called
   ↓
3. localStorage updated
   ↓
4. UI components re-check hasPermission()
   ↓
5. Buttons/features show/hide immediately
```

### Status Change → User Feedback
```
1. User clicks status button
   ↓
2. handleStatusChange() called
   ↓
3. Database updated
   ↓
4. Success popup shown (3s auto-close)
   ↓
5. Notification added to bell
```

## 🧩 Component Integration Points

### App.tsx Permission Checks
```typescript
// User Management access
{hasPermission(user.role, PERMISSION_ACTIONS.VIEW_USERS) && (
  <button onClick={() => setActivePage('users')}>
    👥 User Management
  </button>
)}

// Conditional rendering
{activePage === 'users' && hasPermission(user.role, PERMISSION_ACTIONS.VIEW_USERS) && (
  <UserManagement />
)}
```

### UserManagement.tsx Permission Checks
```typescript
const canCreateUsers = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.CREATE_USER) : false;
const canEditUsers = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.EDIT_USER) : false;
const canDeleteUsers = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.DELETE_USER) : false;

// UI rendering based on permissions
{canCreateUsers && <button>Add New User</button>}
{canEditUsers && <button>Edit</button>}
{canDeleteUsers && <button>Delete</button>}
```

## 📊 Permission Constants Reference

```typescript
export const PERMISSION_ACTIONS = {
  // Case Management
  CREATE_CASE: 'create-case',
  VIEW_CASES: 'view-cases',
  AMEND_CASE: 'amend-case',
  DELETE_CASE: 'delete-case',
  
  // User Management  
  CREATE_USER: 'create-user',
  EDIT_USER: 'edit-user',
  DELETE_USER: 'delete-user',
  VIEW_USERS: 'view-users',
  
  // Status Transitions
  PROCESS_ORDER: 'process-order',
  ORDER_PROCESSED: 'order-processed',
  // ... etc
} as const;
```

## 🔍 Debugging Tips

### Check Permission State
```javascript
// In browser console:
JSON.parse(localStorage.getItem('app_runtime_permissions'))

// Check specific permission:
import { hasPermission } from './src/utils/permissions';
hasPermission('it', 'create-user')
```

### Reset Permissions
```javascript
// In browser console:
localStorage.removeItem('app_runtime_permissions');
window.location.reload();
```

### Test Permission Changes
```javascript
// Simulate permission change:
import { updatePermission } from './src/utils/permissions';
updatePermission('it', 'create-user', false); // Deny IT create user
```

---
*This reference contains the essential code patterns and implementation details for maintaining and extending the permission system.*