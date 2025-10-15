# TM Case Booking - Component Standardization Guide

## The Problem
Currently the application has **5-10 different dropdown designs** and inconsistent component patterns throughout the codebase. This creates:
- Inconsistent user experience
- Maintenance overhead
- Developer confusion
- Code duplication

## Current Component Inconsistencies

### Dropdown Variations Found:
1. `MultiSelectDropdown` (legacy) - basic multi-select
2. `MultiSelectDropdownWithQuantity` (new standard) - with quantity inputs
3. Regular HTML `<select>` - basic single select
4. Department-specific dropdowns - custom styling
5. Country selector components - different approach
6. Status dropdowns - inline styling
7. Role selection dropdowns - different validation
8. Doctor selection - custom search logic

### Form Field Inconsistencies:
1. Input field styling - multiple CSS approaches
2. Label positioning - inconsistent placement
3. Validation display - different error styles
4. Required field indicators - various symbols
5. Help text positioning - inconsistent placement

### Button Variations:
1. Primary buttons - different colors/sizing
2. Secondary buttons - inconsistent styling
3. Icon buttons - various icon libraries
4. Action buttons - different hover states
5. Modal buttons - inconsistent placement

## Standardization Standards

### 1. Standard Dropdown Component
**Use this everywhere**: `MultiSelectDropdownWithQuantity`

```typescript
// Standard implementation
<MultiSelectDropdownWithQuantity
  id="standard-dropdown"
  label="Standard Label"
  options={options}
  value={selectedValues}
  quantities={quantities}
  onChange={handleChange}
  onQuantityChange={handleQuantityChange}
  placeholder="Select options..."
  required={true}
  disabled={false}
  withQuantities={true} // Set false for simple dropdowns
  maxSelections={10}
  searchable={true}
  className="standard-dropdown" // Standard CSS class
/>
```

**Variations allowed**:
```typescript
// Simple single-select (quantities disabled)
withQuantities={false}

// Multi-select without quantities
withQuantities={false}
multiple={true}

// Single-select with search
withQuantities={false}
searchable={true}
```

### 2. Standard Form Field Component
Create `StandardFormField.tsx`:

```typescript
interface StandardFormFieldProps {
  label: string;
  type: 'text' | 'email' | 'password' | 'select' | 'textarea' | 'multi-select';
  value: any;
  onChange: (value: any) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  helpText?: string;
  error?: string;
  options?: Option[]; // For select types
  className?: string;
}

// Usage
<StandardFormField
  label="Hospital Name"
  type="text"
  value={hospital}
  onChange={setHospital}
  required={true}
  placeholder="Enter hospital name"
  helpText="Full hospital name as registered"
  error={errors.hospital}
/>
```

### 3. Standard Button Component
Create `StandardButton.tsx`:

```typescript
interface StandardButtonProps {
  variant: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  size: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

// Usage
<StandardButton
  variant="primary"
  size="md"
  onClick={handleSubmit}
  loading={isSubmitting}
  icon={<SaveIcon />}
>
  Save Case
</StandardButton>
```

### 4. Standard Modal Component
Create `StandardModal.tsx`:

```typescript
interface StandardModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size: 'sm' | 'md' | 'lg' | 'xl';
  actions?: React.ReactNode;
  className?: string;
}

// Usage
<StandardModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Edit Case Details"
  size="lg"
  actions={
    <>
      <StandardButton variant="outline" onClick={handleCancel}>
        Cancel
      </StandardButton>
      <StandardButton variant="primary" onClick={handleSave}>
        Save Changes
      </StandardButton>
    </>
  }
>
  <StandardFormField ... />
</StandardModal>
```

## CSS Standardization

### 1. Design Tokens (CSS Variables)
Create `src/assets/styles/tokens.css`:

```css
:root {
  /* Colors */
  --color-primary: #007bff;
  --color-primary-hover: #0056b3;
  --color-secondary: #6c757d;
  --color-success: #28a745;
  --color-danger: #dc3545;
  --color-warning: #ffc107;
  --color-info: #17a2b8;
  
  /* Background Colors */
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-dark: #343a40;
  
  /* Text Colors */
  --text-primary: #212529;
  --text-secondary: #6c757d;
  --text-muted: #868e96;
  --text-white: #ffffff;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-xxl: 48px;
  
  /* Border Radius */
  --border-radius-sm: 2px;
  --border-radius-md: 4px;
  --border-radius-lg: 6px;
  --border-radius-xl: 8px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 4px 6px rgba(0, 0, 0, 0.1);
  
  /* Typography */
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-md: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 20px;
  --font-size-xxl: 24px;
  
  /* Line Heights */
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
  
  /* Font Weights */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  
  /* Transitions */
  --transition-fast: 150ms ease-in-out;
  --transition-normal: 250ms ease-in-out;
  --transition-slow: 350ms ease-in-out;
  
  /* Z-Index */
  --z-dropdown: 1000;
  --z-modal: 1050;
  --z-tooltip: 1070;
}
```

### 2. Standard Component CSS Classes
Create `src/assets/styles/components.css`:

```css
/* Standard Dropdown */
.standard-dropdown {
  position: relative;
  width: 100%;
}

.standard-dropdown__control {
  border: 1px solid var(--color-secondary);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-sm);
  transition: var(--transition-fast);
}

.standard-dropdown__control:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

/* Standard Button */
.standard-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  text-decoration: none;
  cursor: pointer;
  transition: var(--transition-fast);
  white-space: nowrap;
}

.standard-button--primary {
  background-color: var(--color-primary);
  color: var(--text-white);
}

.standard-button--primary:hover {
  background-color: var(--color-primary-hover);
}

.standard-button--secondary {
  background-color: var(--color-secondary);
  color: var(--text-white);
}

.standard-button--outline {
  background-color: transparent;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
}

.standard-button--sm {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-xs);
}

.standard-button--lg {
  padding: var(--spacing-md) var(--spacing-lg);
  font-size: var(--font-size-md);
}

/* Standard Form Field */
.standard-form-field {
  margin-bottom: var(--spacing-md);
}

.standard-form-field__label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.standard-form-field__input {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-secondary);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  transition: var(--transition-fast);
}

.standard-form-field__input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.standard-form-field__help {
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.standard-form-field__error {
  margin-top: var(--spacing-xs);
  font-size: var(--font-size-xs);
  color: var(--color-danger);
}

.standard-form-field--required .standard-form-field__label::after {
  content: " *";
  color: var(--color-danger);
}
```

## Implementation Plan

### Phase 1: Core Components (Week 1)
1. Create `StandardDropdown.tsx` (based on MultiSelectDropdownWithQuantity)
2. Create `StandardFormField.tsx`
3. Create `StandardButton.tsx`
4. Create `StandardModal.tsx`
5. Implement CSS design tokens

### Phase 2: Component Migration (Week 2-3)
1. Replace all dropdown variations with StandardDropdown
2. Replace all form fields with StandardFormField
3. Replace all buttons with StandardButton
4. Replace all modals with StandardModal

### Phase 3: Testing & Refinement (Week 4)
1. Test all components across different screens
2. Fix any styling inconsistencies
3. Update documentation
4. Create component storybook/examples

## Current Priority Fixes

### 1. Dropdown Standardization
**Files to update**:
- `src/components/CaseBookingForm.tsx` - Already uses new standard ✅
- `src/components/CaseCard/AmendmentForm.tsx` - Needs update
- `src/components/UserManagement.tsx` - Needs update
- `src/components/SimplifiedEmailConfig.tsx` - Needs update
- `src/components/EditSets/ModernEditSets.tsx` - Needs update

### 2. Form Field Standardization
**Common pattern to replace**:
```typescript
// BEFORE (inconsistent)
<div className="form-group">
  <label>Hospital</label>
  <input type="text" value={hospital} onChange={handleChange} />
  {error && <span className="error">{error}</span>}
</div>

// AFTER (standardized)
<StandardFormField
  label="Hospital"
  type="text"
  value={hospital}
  onChange={setHospital}
  error={error}
  required={true}
/>
```

## Benefits of Standardization

1. **Consistent UX** - Users see the same interface patterns everywhere
2. **Easier Maintenance** - One component to update vs 10 variations
3. **Faster Development** - Developers use standard components instead of creating new ones
4. **Better Testing** - Test once, works everywhere
5. **Improved Accessibility** - Standard components include proper ARIA attributes
6. **Performance** - Shared components reduce bundle size

## Enforcement Rules

1. **No new dropdown variants** - Use StandardDropdown only
2. **No inline styles** - Use CSS variables and standard classes
3. **Component review** - All new components must follow standards
4. **Regular audits** - Monthly check for standardization compliance

This standardization will prevent the current chaos of 5-10 different dropdown designs and ensure consistent, maintainable code.