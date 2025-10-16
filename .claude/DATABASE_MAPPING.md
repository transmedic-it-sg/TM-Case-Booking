# 🗄️ TM Case Booking Database Mapping & Component Analysis

## 📊 **CRITICAL ISSUE ANALYSIS**

Based on console logs, here are the confirmed issues:

### Issue #1: Department Deletion Problem
- **Console Log**: `CODE TABLE DELETE - Department deleted from database: {deletedRows: null, count: 0}`
- **Problem**: Delete operation returns count: 0, meaning no rows were actually deleted
- **Location**: `src/utils/supabaseCodeTableService.ts`

### Issue #2: Doctor Lookup Degradation  
- **Console Log**: Doctor lookup finding 2 doctors for Spine instead of expected ones (Dr Virgil Lee missing)
- **Problem**: Department-Doctor mapping inconsistency
- **Location**: `src/utils/departmentDoctorService.ts`

### Issue #3: User Creation Error Popup
- **Console Log**: `Failed to create user: Error: Failed to create user. Please check all required fields are filled correctly.`
- **Problem**: User gets created but error popup still shows
- **Location**: `src/hooks/useRealtimeUsers.ts` + `src/components/UserManagement.tsx`

---

## 📋 **COMPLETE DATABASE SCHEMA MAPPING**

### **Core Tables & Relationships**

#### 1. **USERS & AUTHENTICATION**
```
profiles (Primary User Table)
├── id (UUID, Primary Key)
├── username (TEXT, UNIQUE)
├── password_hash (TEXT)
├── role (TEXT) → ['admin', 'operations', 'operations-manager', 'sales', 'sales-manager', 'driver', 'it']
├── name (TEXT)
├── departments (TEXT[])
├── countries (TEXT[])
├── selected_country (TEXT)
├── enabled (BOOLEAN)
└── email (TEXT)

Related Tables:
├── user_sessions → profiles.id
├── app_settings → profiles.id  
├── notification_preferences → profiles.id
└── admin_email_configs → profiles.id
```

#### 2. **DEPARTMENT & DOCTOR HIERARCHY**
```
code_tables (Master Reference)
├── id (UUID)
├── country (VARCHAR)
├── table_type (TEXT) → ['departments', 'procedure_types', 'hospitals', 'countries']
├── code (TEXT)
├── display_name (TEXT)
└── is_active (BOOLEAN)

departments (Department Details)
├── id (UUID)
├── name (VARCHAR)
├── country (VARCHAR)
├── code_table_id (UUID) → code_tables.id
└── is_active (BOOLEAN)

doctors (Doctor Information)
├── id (UUID)
├── name (VARCHAR)
├── country (VARCHAR)
├── department_id (UUID) → departments.id
├── specialties (TEXT[])
└── is_active (BOOLEAN)
```

#### 3. **PROCEDURE & EQUIPMENT MANAGEMENT**
```
doctor_procedures
├── doctor_id (UUID) → doctors.id
├── procedure_type (VARCHAR)
└── country (VARCHAR)

surgery_sets
├── id (UUID)
├── name (VARCHAR)
├── country (VARCHAR)
├── doctor_id (UUID) → doctors.id
├── procedure_type (VARCHAR)
└── is_active (BOOLEAN)

implant_boxes
├── id (UUID)
├── name (VARCHAR)
├── country (VARCHAR)
├── doctor_id (UUID) → doctors.id
├── procedure_type (VARCHAR)
└── is_active (BOOLEAN)

doctor_procedure_sets (Junction Table)
├── doctor_id (UUID) → doctors.id
├── procedure_type (VARCHAR)
├── surgery_set_id (UUID) → surgery_sets.id
├── implant_box_id (UUID) → implant_boxes.id
└── country (VARCHAR)
```

#### 4. **CASE BOOKING SYSTEM**
```
case_bookings (Main Case Table)
├── id (UUID)
├── case_reference_number (TEXT, UNIQUE)
├── doctor_id (UUID) → doctors.id
├── hospital (TEXT)
├── department (TEXT)
├── date_of_surgery (DATE)
├── procedure_type (TEXT)
├── surgery_set_selection (TEXT[])
├── implant_box (TEXT[])
├── status (TEXT) → [Enum of 13 statuses]
└── country (VARCHAR)

case_booking_quantities
├── case_booking_id (UUID) → case_bookings.id
├── item_type (VARCHAR) → ['surgery_set', 'implant_box']
├── item_name (VARCHAR)
└── quantity (INTEGER)

status_history
├── case_id (UUID) → case_bookings.id
├── status (TEXT)
├── processed_by (TEXT)
└── timestamp (TIMESTAMPTZ)
```

#### 5. **SYSTEM CONFIGURATION**
```
system_settings (Global Settings)
├── setting_key (VARCHAR, UNIQUE)
├── setting_value (JSONB)
└── description (TEXT)

permissions (Role-Based Access)
├── role (TEXT)
├── resource (TEXT)
├── action (TEXT)
└── allowed (BOOLEAN)

email_notification_rules
├── country (VARCHAR)
├── status (TEXT)
├── enabled (BOOLEAN)
├── recipients (JSONB)
└── template (JSONB)
```

---

## 🔧 **COMPONENT → DATABASE MAPPING**

### **Frontend Components & Their Database Dependencies**

#### **1. UserManagement.tsx**
```typescript
// Primary Tables Used:
├── profiles (CRUD operations)
├── permissions (permission checks)
└── audit_logs (activity logging)

// Service Dependencies:
├── src/utils/supabaseUserService.ts
├── src/hooks/useRealtimeUsers.ts
└── src/utils/permissions.ts
```

#### **2. PermissionMatrix.tsx**
```typescript
// Primary Tables Used:
├── permissions (read/write permission matrix)
└── profiles (role information)

// Service Dependencies:
├── src/hooks/useRealtimePermissions.ts
└── src/data/permissionMatrixData.ts
```

#### **3. EditSets.tsx (Surgery & Implant Sets)**
```typescript
// Primary Tables Used:
├── doctors (doctor selection)
├── departments (department filtering)
├── surgery_sets (set management)
├── implant_boxes (implant management)
├── doctor_procedure_sets (doctor-set relationships)
└── code_tables (department lookup)

// Service Dependencies:
├── src/utils/departmentDoctorService.ts
├── src/utils/supabaseCodeTableService.ts
└── src/components/CountryGroupedDepartments.tsx
```

#### **4. SystemSettings.tsx**
```typescript
// Primary Tables Used:
└── system_settings (JSONB configuration storage)

// Service Dependencies:
└── src/utils/systemSettingsService.ts
```

#### **5. DataExportImport.tsx**
```typescript
// Primary Tables Used:
├── case_bookings (case data export/import)
├── doctors (doctor data)
├── departments (department data)
└── code_tables (reference data)

// Service Dependencies:
└── src/components/DataExportImport.tsx
```

---

## ⚠️ **CRITICAL DATA INCONSISTENCIES IDENTIFIED**

### **1. Department Deletion Issue**
**Problem**: Code table delete operations show `count: 0` despite "success" message

**Root Cause Analysis**:
```sql
-- The deletion likely targets wrong field or uses incorrect WHERE clause
-- Console shows: code: 'cardiology' but actual data might use different format
```

**Investigation Needed**:
- Check actual data in `code_tables` where `table_type = 'departments'`
- Verify if `code` field matches the normalized values being used
- Check if soft delete (is_active = false) should be used instead of hard delete

### **2. Doctor-Department Mapping Inconsistency**
**Problem**: Edit Sets shows different doctors than New Case Booking for same department

**Root Cause Analysis**:
```typescript
// Two different lookup paths:
// 1. New Case Booking: departments → doctors (via department_id)
// 2. Edit Sets: code_tables → departments → doctors (via department name matching)
```

**Data Integrity Issues**:
- Department names might not match between `departments.name` and `code_tables.display_name`
- Foreign key `doctors.department_id` might point to wrong department records
- Case sensitivity or spacing differences in department names

### **3. User Creation Error Despite Success**
**Problem**: useRealtimeUsers mutation shows success notification alongside error notification

**Root Cause**: 
- Duplicate notification handlers in mutation and component
- Previous fix attempted but mutation still triggers error handling

---

## 🔍 **RECOMMENDED FIXES**

### **Fix 1: Department Deletion**
1. **Investigate actual data structure**:
   ```sql
   SELECT * FROM code_tables WHERE table_type = 'departments' AND country = 'Singapore';
   ```

2. **Fix deletion query to match actual data format**

3. **Add proper error handling for 0 affected rows**

### **Fix 2: Doctor Lookup Consistency** 
1. **Audit department name consistency across tables**:
   ```sql
   SELECT d.name as dept_name, ct.display_name as code_table_name, ct.code
   FROM departments d 
   LEFT JOIN code_tables ct ON d.code_table_id = ct.id;
   ```

2. **Standardize department lookup to use single source of truth**

3. **Fix foreign key relationships if inconsistent**

### **Fix 3: User Creation Error Popup**
1. **Remove automatic error notifications from mutation**
2. **Let component handle all success/error messaging**
3. **Add proper error logging to identify root cause**

---

## 📝 **NEXT STEPS**

1. **Investigate actual database data for inconsistencies**
2. **Fix department deletion query**  
3. **Standardize doctor-department lookups**
4. **Remove duplicate notification handling**
5. **Add comprehensive logging for debugging**
6. **Perform E2E testing of all fixed components**

This mapping provides the foundation for systematic debugging and fixing of all reported issues.