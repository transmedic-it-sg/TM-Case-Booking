# TM Case Booking - Coding Standards v1.3.4

## Overview
This document establishes the coding standards, naming conventions, and best practices for the TM Case Booking System to ensure consistency, maintainability, and prevent legacy coding issues.

## File and Directory Structure

### Directory Naming
- Use **kebab-case** for directory names: `case-booking/`, `email-config/`
- Component directories use **PascalCase**: `CasesList/`, `NotificationBell/`
- Utility directories use **camelCase**: `utils/`, `services/`, `hooks/`

### File Naming Conventions
```
components/ComponentName.tsx     # React components (PascalCase)
hooks/useHookName.ts            # Custom hooks (camelCase with 'use' prefix)
services/serviceName.ts         # Service files (camelCase)
utils/utilityName.ts            # Utility files (camelCase)
types/index.ts                  # Type definitions
constants/constantName.ts       # Constants (camelCase)
assets/file-name.css           # CSS files (kebab-case)
```

## TypeScript Standards

### Interface and Type Definitions
```typescript
// ✅ Good: Clear, descriptive interface names
interface CaseBooking {
  id: string;
  caseReferenceNumber: string;
  dateOfSurgery: string;
  status: CaseStatus;
}

// ✅ Good: Union types for controlled values
type CaseStatus = 'Case Booked' | 'Preparing Order' | 'Order Prepared' | 'Sales Approved';

// ❌ Avoid: Generic or unclear names
interface Data { ... }
interface Item { ... }
```

### Variable and Function Naming
```typescript
// ✅ Good: Descriptive, clear naming
const getCurrentUserSync = () => { ... }
const hasPermissionForUser = (userId: string, action: string) => { ... }
const robustSingle = <T>(query: any) => { ... }

// ❌ Avoid: Abbreviations and unclear names
const getUserInfo = () => { ... }  // Too generic
const chkPerm = () => { ... }     // Abbreviated
const getData = () => { ... }     // Unclear purpose
```

### Component Patterns
```typescript
// ✅ Good: Functional component with proper types
interface CaseCardProps {
  caseItem: CaseBooking;
  onEdit?: (id: string) => void;
  readonly?: boolean;
}

const CaseCard: React.FC<CaseCardProps> = ({ 
  caseItem, 
  onEdit, 
  readonly = false 
}) => {
  // Component logic
};

export default CaseCard;
```

## Database Standards

### Field Mapping Convention
- **Database fields**: snake_case (`date_of_surgery`, `case_booking_id`)
- **Frontend fields**: camelCase (`dateOfSurgery`, `caseBookingId`)
- **Always use field mapping utilities**

```typescript
// ✅ Good: Use field mapping utilities
import { CASE_BOOKINGS_FIELDS, getDbField } from '../utils/fieldMappings';
const dbField = getDbField(CASE_BOOKINGS_FIELDS, 'dateOfSurgery');

// ❌ Avoid: Hardcoded field names
const query = supabase.from('case_bookings').select('date_of_surgery');
```

### Database Operations
```typescript
// ✅ Good: Use robust database operations
import { robustSingle } from '../utils/robustDatabaseOperations';

const getCase = async (id: string) => {
  try {
    const caseData = await robustSingle<CaseBooking>(
      supabase.from('case_bookings').select('*').eq('id', id)
    );
    return caseData;
  } catch (error) {
    console.error('Error fetching case:', error);
    throw error;
  }
};

// ❌ Avoid: Direct database calls without error handling
const getCase = async (id: string) => {
  const { data } = await supabase.from('case_bookings').select('*').eq('id', id).single();
  return data; // No error handling
};
```

## Component Standards

### Component Structure
```typescript
// ✅ Good: Organized component structure
import React, { useState, useEffect, useCallback } from 'react';
import { ComponentProps } from './types';
import { useCustomHook } from '../hooks/useCustomHook';
import { SERVICE_METHOD } from '../services/serviceFile';
import './ComponentName.css';

interface ComponentNameProps {
  // Props interface
}

const ComponentName: React.FC<ComponentNameProps> = ({ prop1, prop2 }) => {
  // 1. Hooks (useState, useEffect, custom hooks)
  const [state, setState] = useState();
  const { data, loading } = useCustomHook();
  
  // 2. Event handlers
  const handleClick = useCallback(() => {
    // Handler logic
  }, [dependencies]);
  
  // 3. Effects
  useEffect(() => {
    // Effect logic
  }, [dependencies]);
  
  // 4. Render
  return (
    <div className="component-name">
      {/* JSX */}
    </div>
  );
};

export default ComponentName;
```

### Permission-Based Rendering
```typescript
// ✅ Good: Check permissions before rendering
const { hasPermission, PERMISSION_ACTIONS } = usePermissions();

return (
  <div>
    {hasPermission(userRole, PERMISSION_ACTIONS.CREATE_CASE) && (
      <button onClick={handleCreateCase}>Create Case</button>
    )}
  </div>
);

// ❌ Avoid: Rendering without permission checks
return (
  <div>
    <button onClick={handleCreateCase}>Create Case</button>
  </div>
);
```

## CSS Standards

### Class Naming (BEM Methodology)
```css
/* ✅ Good: BEM naming convention */
.case-card { }
.case-card__header { }
.case-card__title { }
.case-card__title--highlighted { }
.case-card__button { }
.case-card__button--primary { }

/* ❌ Avoid: Generic or unclear names */
.card { }
.header { }
.button { }
.red { }
```

### CSS Organization
```css
/* Component-specific styles */
.case-booking-form {
  /* Layout properties */
  display: flex;
  flex-direction: column;
  gap: 1rem;
  
  /* Visual properties */
  background: var(--white);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-medium);
  
  /* Responsive behavior */
}

@media (max-width: 768px) {
  .case-booking-form {
    /* Mobile-specific styles */
  }
}
```

## Service Layer Standards

### Service File Structure
```typescript
// services/caseService.ts
export interface CaseService {
  getCases: (filters?: CaseFilters) => Promise<CaseBooking[]>;
  createCase: (caseData: CreateCaseRequest) => Promise<CaseBooking>;
  updateCase: (id: string, updates: UpdateCaseRequest) => Promise<CaseBooking>;
  deleteCase: (id: string) => Promise<boolean>;
}

class CaseServiceImpl implements CaseService {
  async getCases(filters?: CaseFilters): Promise<CaseBooking[]> {
    // Implementation with error handling
  }
  
  // Other methods...
}

export const caseService = new CaseServiceImpl();
```

### Error Handling Standards
```typescript
// ✅ Good: Comprehensive error handling
export const updateCaseStatus = async (
  caseId: string, 
  newStatus: string, 
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Validate inputs
    if (!caseId || !newStatus || !userId) {
      return { success: false, error: 'Missing required parameters' };
    }
    
    // Perform operation
    const result = await robustSingle<CaseBooking>(
      supabase.from('case_bookings')
        .update({ status: newStatus })
        .eq('id', caseId)
    );
    
    if (!result) {
      return { success: false, error: 'Case not found' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating case status:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};
```

## Testing Standards

### Unit Test Naming
```typescript
// ✅ Good: Descriptive test names
describe('CaseBookingForm', () => {
  it('should validate required fields before submission', () => {
    // Test implementation
  });
  
  it('should display error message when hospital field is empty', () => {
    // Test implementation
  });
  
  it('should call onSubmit callback with correct data when form is valid', () => {
    // Test implementation
  });
});

// ❌ Avoid: Generic test names
describe('Form', () => {
  it('should work', () => {
    // Too generic
  });
});
```

### Test Structure
```typescript
// ✅ Good: Arrange-Act-Assert pattern
it('should update case status when valid data is provided', async () => {
  // Arrange
  const mockCase = createMockCase();
  const newStatus = 'Order Prepared';
  
  // Act
  const result = await updateCaseStatus(mockCase.id, newStatus, 'user123');
  
  // Assert
  expect(result.success).toBe(true);
  expect(mockCase.status).toBe(newStatus);
});
```

## Performance Standards

### Component Optimization
```typescript
// ✅ Good: Use React.memo for expensive components
export default React.memo(CaseCard, (prevProps, nextProps) => {
  return prevProps.caseItem.id === nextProps.caseItem.id &&
         prevProps.caseItem.status === nextProps.caseItem.status;
});

// ✅ Good: Use useCallback for event handlers
const handleStatusChange = useCallback((newStatus: string) => {
  onStatusChange?.(caseItem.id, newStatus);
}, [caseItem.id, onStatusChange]);
```

### Database Query Optimization
```typescript
// ✅ Good: Efficient queries with proper indexes
const getCasesByDate = async (startDate: string, endDate: string) => {
  return await supabase
    .from('case_bookings')
    .select('id, case_reference_number, status, date_of_surgery')
    .gte('date_of_surgery', startDate)
    .lte('date_of_surgery', endDate)
    .order('date_of_surgery', { ascending: true });
};

// ❌ Avoid: Inefficient queries
const getAllCases = async () => {
  return await supabase
    .from('case_bookings')
    .select('*'); // Selects all columns for all rows
};
```

## Security Standards

### Input Validation
```typescript
// ✅ Good: Validate all user inputs
const validateCaseInput = (input: CreateCaseRequest): ValidationResult => {
  const errors: string[] = [];
  
  if (!input.hospital?.trim()) {
    errors.push('Hospital is required');
  }
  
  if (!input.department?.trim()) {
    errors.push('Department is required');
  }
  
  if (!isValidDate(input.dateOfSurgery)) {
    errors.push('Valid surgery date is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
```

### Permission Checks
```typescript
// ✅ Good: Always check permissions before operations
const deleteCase = async (caseId: string, userId: string, userRole: string) => {
  // Check permissions first
  if (!hasPermission(userRole, PERMISSION_ACTIONS.DELETE_CASE)) {
    throw new Error('Insufficient permissions to delete case');
  }
  
  // Perform operation
  return await robustSingle(
    supabase.from('case_bookings').delete().eq('id', caseId)
  );
};
```

## Documentation Standards

### Code Comments
```typescript
/**
 * Updates a case booking status with proper validation and audit logging
 * @param caseId - The unique identifier of the case to update
 * @param newStatus - The new status to set (must be valid case status)
 * @param userId - The ID of the user performing the update
 * @returns Promise resolving to update result with success/error info
 */
export const updateCaseStatus = async (
  caseId: string,
  newStatus: CaseStatus,
  userId: string
): Promise<UpdateResult> => {
  // Implementation
};
```

### Function Documentation
- Document complex business logic
- Explain non-obvious implementation decisions
- Include parameter validation requirements
- Document error handling behavior

## Migration and Legacy Code

### Legacy Code Identification
```typescript
// 🔄 LEGACY: Mark legacy code for refactoring
// TODO: Refactor to use robustDatabaseOperations pattern
const oldGetCase = async (id: string) => {
  const { data, error } = await supabase
    .from('case_bookings')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
};

// ✅ MODERN: New implementation
const getCase = async (id: string) => {
  return await robustSingle<CaseBooking>(
    supabase.from('case_bookings').select('*').eq('id', id)
  );
};
```

### Refactoring Guidelines
1. **Identify**: Mark legacy patterns with comments
2. **Plan**: Create migration roadmap for large changes
3. **Test**: Ensure comprehensive tests before refactoring
4. **Document**: Update documentation after changes
5. **Review**: Code review for all refactoring changes

---

**Version**: 1.3.4  
**Effective Date**: January 2025  
**Review Cycle**: Quarterly or major releases