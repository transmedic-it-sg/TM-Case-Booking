# Country-Specific Behaviors Documentation

## Overview
The TM-Case-Booking application supports 7 countries with fully isolated data and configurations per country.

## Supported Countries
1. **Singapore** (SG)
2. **Malaysia** (MY)
3. **Philippines** (PH)
4. **Indonesia** (ID)
5. **Vietnam** (VN)
6. **Hong Kong** (HK)
7. **Thailand** (TH)

## Data Isolation Architecture

### 1. Country Field in All Major Tables
Every major table includes a `country` field to ensure data isolation:
- `departments`
- `doctors`
- `surgery_sets`
- `implant_boxes`
- `doctor_procedures`
- `doctor_procedure_sets`
- `case_bookings`
- `code_tables`
- `audit_logs`

### 2. Hierarchical Data Structure
```
Country
  └── Department
       └── Doctor
            └── Procedure
                 ├── Surgery Sets
                 └── Implant Boxes
```

### 3. Country-Specific Features

#### User Management
- Users can be assigned to multiple countries via `countries[]` array
- Users have a `selected_country` for current session context
- Department assignments are country-specific

#### Case Reference Numbers
- Format: `{COUNTRY_CODE}-{YEAR}{MONTH}{DAY}-{COUNTER}`
- Example: `SG-20251006-001`
- Each country maintains its own counter sequence

#### Code Tables
- Department mappings are country-specific
- Procedure types vary by country
- Hospital lists are country-specific

#### Email Notification Rules
- Email templates can be configured per country
- Different recipients can be set for each country's status changes

## Component Behaviors

### 1. Login & Country Selection
- Users see only countries they have access to
- System remembers last selected country
- Country selection persists across sessions

### 2. Case Booking Form
- Department dropdown shows only country-specific departments
- Doctor list filtered by selected department and country
- Procedure types filtered by doctor and country
- Surgery Sets/Implant Boxes filtered by procedure and country

### 3. Cases List
- Cases filtered by user's selected country
- Department filter shows only relevant departments
- Status transitions respect country-specific workflows

### 4. Edit Sets Management
- Shows only departments for selected country
- Doctor assignments are country-specific
- Surgery sets/implant boxes managed per country

### 5. Reports & Analytics
- Data aggregated by country
- Filters respect country boundaries
- Usage statistics calculated per country

### 6. Booking Calendar
- Shows only cases for selected country
- Hospital breakdown by country
- Quantity calculations respect country boundaries

## API & Service Patterns

### Standard Service Pattern
```typescript
// All services follow this pattern
async function getDataForCountry(country: string) {
  const normalizedCountry = normalizeCountry(country);
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('country', normalizedCountry)
    .eq('is_active', true);
  return data;
}
```

### Country Normalization
- Legacy 2-letter codes automatically converted to full names
- `normalizeCountry()` utility ensures consistency
- All database queries use full country names

### Real-time Updates
- Subscriptions filtered by country
- Changes in one country don't affect others
- Multi-country users see updates for selected country only

## Testing & Validation

### Multi-Country Test Coverage
- Each country tested for:
  - Department availability
  - Doctor assignments
  - Procedure mappings
  - Surgery set availability
  - Implant box availability
  - Junction table integrity

### Data Integrity Checks
- No cross-country data leakage
- Foreign key constraints respect country boundaries
- Junction tables maintain country consistency

## Migration & Legacy Support

### Country Code Migration
- Legacy systems used 2-letter codes (SG, MY, etc.)
- New system uses full names (Singapore, Malaysia, etc.)
- Automatic conversion for backward compatibility

### Data Migration
- Case reference numbers preserved
- Historical data maintains country associations
- Quantities migrated with country context

## Security & Permissions

### Role-Based Access
- Permissions are country-agnostic
- Users with multi-country access switch context
- Department-level permissions respect country boundaries

### Audit Logging
- All actions logged with country context
- Country field included in audit entries
- Reports can be filtered by country

## Best Practices

### 1. Always Use Country Context
```typescript
// Good
const departments = await getDepartmentsForCountry(userCountry);

// Bad
const departments = await getAllDepartments();
```

### 2. Normalize Country Names
```typescript
// Always normalize before database operations
const normalizedCountry = normalizeCountry(countryInput);
```

### 3. Include Country in Queries
```typescript
// Always include country in WHERE clauses
.eq('country', country)
.eq('department_id', departmentId)
```

### 4. Validate Country Access
```typescript
// Check user has access to country
if (!user.countries.includes(selectedCountry)) {
  throw new Error('Unauthorized country access');
}
```

## Troubleshooting

### Common Issues

1. **Missing Data for Country**
   - Check if country has departments configured
   - Verify doctors assigned to departments
   - Ensure procedures mapped to doctors

2. **Cross-Country Data Showing**
   - Verify country filter in queries
   - Check component receives correct country prop
   - Ensure real-time subscriptions filtered

3. **Country Selection Not Persisting**
   - Check user's `selected_country` field updated
   - Verify local storage not overriding selection
   - Ensure session maintains country context

## Future Enhancements

### Planned Features
- Country-specific business rules engine
- Localized date/time formats
- Multi-language support per country
- Country-specific report templates
- Regional compliance configurations

### Scalability Considerations
- Database partitioning by country for large datasets
- Regional server deployment for performance
- Country-specific caching strategies
- Distributed counter management