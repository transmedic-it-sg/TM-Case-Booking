/**
 * CENTRAL FIELD MAPPING UTILITY - ENHANCED
 * 
 * This file contains all database field mappings to prevent naming convention issues.
 * CRITICAL: Always use these mappings instead of hardcoded field names.
 * 
 * Pattern:
 * - Database fields: snake_case (e.g., date_of_surgery)
 * - TypeScript interfaces: camelCase (e.g., dateOfSurgery)
 * 
 * ENHANCED FEATURES:
 * - Validation functions to catch mapping errors at runtime
 * - Bidirectional mapping utilities
 * - Type-safe field access
 */

// ================================================
// CASE BOOKINGS TABLE MAPPINGS
// ================================================

export const CASE_BOOKINGS_FIELDS = {
  // Primary fields
  id: 'id',
  caseReferenceNumber: 'case_reference_number',
  
  // Hospital/procedure information
  hospital: 'hospital',
  department: 'department',
  dateOfSurgery: 'date_of_surgery',              // ⚠️ CRITICAL: NOT case_date
  procedureType: 'procedure_type',               // ⚠️ CRITICAL: NOT procedure
  procedureName: 'procedure_name',               // ⚠️ CRITICAL: Full name required
  
  // Doctor information
  doctorName: 'doctor_name',
  doctorId: 'doctor_id',
  timeOfProcedure: 'time_of_procedure',
  
  // Selections and equipment
  surgerySetSelection: 'surgery_set_selection',
  implantBox: 'implant_box',
  specialInstruction: 'special_instruction',
  
  // Status and workflow
  status: 'status',
  submittedBy: 'submitted_by',
  submittedAt: 'submitted_at',
  processedBy: 'processed_by',
  processedAt: 'processed_at',
  processOrderDetails: 'process_order_details',
  
  // Location and amendments
  country: 'country',
  isAmended: 'is_amended',
  amendedBy: 'amended_by',
  amendedAt: 'amended_at',
  
  // Timestamps
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  
  // Additional fields
  deliveryImage: 'delivery_image',
  deliveryDetails: 'delivery_details',
  attachments: 'attachments',
  orderSummary: 'order_summary',
  doNumber: 'do_number',
  quantitiesMigrated: 'quantities_migrated'
} as const;

// ================================================
// CASE BOOKING QUANTITIES TABLE MAPPINGS
// ================================================

export const CASE_QUANTITIES_FIELDS = {
  id: 'id',
  caseBookingId: 'case_booking_id',              // ⚠️ CRITICAL: FK to case_bookings
  itemType: 'item_type',                         // ⚠️ CRITICAL: surgery_set | implant_box
  itemName: 'item_name',                         // ⚠️ CRITICAL: Full item name
  quantity: 'quantity'
} as const;

// ================================================
// STATUS HISTORY TABLE MAPPINGS
// ================================================

export const STATUS_HISTORY_FIELDS = {
  id: 'id',
  caseId: 'case_id',                            // ⚠️ CRITICAL: FK to case_bookings
  status: 'status',
  processedBy: 'processed_by',
  timestamp: 'timestamp',
  details: 'details',
  attachments: 'attachments'
} as const;

// ================================================
// AMENDMENT HISTORY TABLE MAPPINGS
// ================================================

export const AMENDMENT_HISTORY_FIELDS = {
  id: 'id',
  caseId: 'case_id',                            // ⚠️ CRITICAL: FK to case_bookings
  amendedBy: 'amended_by',
  timestamp: 'timestamp',
  reason: 'reason',
  changes: 'changes'
} as const;

// ================================================
// UTILITY FUNCTIONS
// ================================================

/**
 * Get database field name from TypeScript property name
 * Usage: getDbField('case_bookings', 'dateOfSurgery') → 'date_of_surgery'
 */
export function getDbFieldByTable(table: string, tsProperty: string): string {
  switch (table) {
    case 'case_bookings':
      return (CASE_BOOKINGS_FIELDS as any)[tsProperty] || tsProperty;
    case 'case_booking_quantities':
      return (CASE_QUANTITIES_FIELDS as any)[tsProperty] || tsProperty;
    case 'status_history':
      return (STATUS_HISTORY_FIELDS as any)[tsProperty] || tsProperty;
    case 'amendment_history':
      return (AMENDMENT_HISTORY_FIELDS as any)[tsProperty] || tsProperty;
    default:
      return tsProperty;
  }
}

/**
 * Get TypeScript property name from database field name
 * Usage: getTsProperty('case_bookings', 'date_of_surgery') → 'dateOfSurgery'
 */
export function getTsProperty(table: string, dbField: string): string {
  switch (table) {
    case 'case_bookings':
      const caseField = Object.entries(CASE_BOOKINGS_FIELDS).find(([, db]) => db === dbField);
      return caseField ? caseField[0] : dbField;
    case 'case_booking_quantities':
      const qtyField = Object.entries(CASE_QUANTITIES_FIELDS).find(([, db]) => db === dbField);
      return qtyField ? qtyField[0] : dbField;
    case 'status_history':
      const statusField = Object.entries(STATUS_HISTORY_FIELDS).find(([, db]) => db === dbField);
      return statusField ? statusField[0] : dbField;
    case 'amendment_history':
      const amendField = Object.entries(AMENDMENT_HISTORY_FIELDS).find(([, db]) => db === dbField);
      return amendField ? amendField[0] : dbField;
    default:
      return dbField;
  }
}

/**
 * Type-safe field mapping for case bookings
 * Ensures all fields are correctly mapped
 */
export type CaseBookingsMapping = typeof CASE_BOOKINGS_FIELDS;
export type CaseQuantitiesMapping = typeof CASE_QUANTITIES_FIELDS;
export type StatusHistoryMapping = typeof STATUS_HISTORY_FIELDS;
export type AmendmentHistoryMapping = typeof AMENDMENT_HISTORY_FIELDS;

// ================================================
// VALIDATION FUNCTIONS
// ================================================

/**
 * Validate that a field mapping exists
 */
export function validateFieldMapping(table: string, tsProperty: string): boolean {
  const dbField = getDbFieldByTable(table, tsProperty);
  return dbField !== tsProperty || Object.values(
    table === 'case_bookings' ? CASE_BOOKINGS_FIELDS :
    table === 'case_booking_quantities' ? CASE_QUANTITIES_FIELDS :
    table === 'status_history' ? STATUS_HISTORY_FIELDS :
    table === 'amendment_history' ? AMENDMENT_HISTORY_FIELDS :
    {}
  ).includes(tsProperty as any);
}

/**
 * Get all valid database fields for a table
 */
export function getValidDbFields(table: string): string[] {
  switch (table) {
    case 'case_bookings':
      return Object.values(CASE_BOOKINGS_FIELDS);
    case 'case_booking_quantities':
      return Object.values(CASE_QUANTITIES_FIELDS);
    case 'status_history':
      return Object.values(STATUS_HISTORY_FIELDS);
    case 'amendment_history':
      return Object.values(AMENDMENT_HISTORY_FIELDS);
    default:
      return [];
  }
}

// ================================================
// ADDITIONAL TABLE MAPPINGS
// ================================================

export const PROFILES_FIELDS = {
  id: 'id',
  username: 'username',
  name: 'name',
  passwordHash: 'password_hash',
  role: 'role',
  departments: 'departments',
  countries: 'countries',
  selectedCountry: 'selected_country',
  enabled: 'enabled',
  email: 'email',
  isTemporaryPassword: 'is_temporary_password',
  passwordChangedAt: 'password_changed_at',
  passwordResetAt: 'password_reset_at',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
} as const;

export const DOCTORS_FIELDS = {
  id: 'id',
  name: 'name',
  country: 'country',
  specialties: 'specialties',
  isActive: 'is_active',
  departmentId: 'department_id',
  sortOrder: 'sort_order',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
} as const;

export const DEPARTMENTS_FIELDS = {
  id: 'id',
  name: 'name',
  country: 'country',
  description: 'description',
  isActive: 'is_active',
  codeTableId: 'code_table_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
} as const;

export const SURGERY_SETS_FIELDS = {
  id: 'id',
  name: 'name',
  country: 'country',
  isActive: 'is_active',
  description: 'description',
  doctorId: 'doctor_id',
  procedureType: 'procedure_type',
  sortOrder: 'sort_order',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
} as const;

export const IMPLANT_BOXES_FIELDS = {
  id: 'id',
  name: 'name',
  country: 'country',
  isActive: 'is_active',
  description: 'description',
  doctorId: 'doctor_id',
  procedureType: 'procedure_type',
  sortOrder: 'sort_order',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
} as const;

export const EMAIL_NOTIFICATION_RULES_FIELDS = {
  id: 'id',
  country: 'country',
  status: 'status',
  enabled: 'enabled',
  recipients: 'recipients',
  template: 'template',
  conditions: 'conditions',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
} as const;

export const AUDIT_LOGS_FIELDS = {
  id: 'id',
  timestamp: 'timestamp',
  userName: 'user_name',
  userId: 'user_id',
  userRole: 'user_role',
  action: 'action',
  category: 'category',
  target: 'target',
  details: 'details',
  ipAddress: 'ip_address',
  status: 'status',
  metadata: 'metadata',
  country: 'country',
  department: 'department',
  createdAt: 'created_at'
} as const;

export const SYSTEM_SETTINGS_FIELDS = {
  id: 'id',
  settingKey: 'setting_key',
  settingValue: 'setting_value',
  description: 'description',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
} as const;

export const CODE_TABLES_FIELDS = {
  id: 'id',
  country: 'country',
  tableType: 'table_type',
  code: 'code',
  displayName: 'display_name',
  isActive: 'is_active',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
} as const;

export const PERMISSIONS_FIELDS = {
  id: 'id',
  role: 'role',
  resource: 'resource',
  action: 'action',
  allowed: 'allowed',
  createdAt: 'created_at'
} as const;

export const NOTIFICATIONS_FIELDS = {
  id: 'id',
  userId: 'user_id',
  type: 'type',
  title: 'title',
  message: 'message',
  read: 'read',
  duration: 'duration',
  createdAt: 'created_at'
} as const;

export const CASE_COUNTERS_FIELDS = {
  id: 'id',
  country: 'country',
  currentCounter: 'current_counter',
  year: 'year',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
} as const;

export const USER_SESSIONS_FIELDS = {
  id: 'id',
  userId: 'user_id',
  sessionToken: 'session_token',
  expiresAt: 'expires_at',
  createdAt: 'created_at'
} as const;

export const NOTIFICATION_PREFERENCES_FIELDS = {
  id: 'id',
  userId: 'user_id',
  caseBooked: 'case_booked',
  orderPreparation: 'order_preparation',
  orderPrepared: 'order_prepared',
  pendingDeliveryHospital: 'pending_delivery_hospital',
  deliveredHospital: 'delivered_hospital',
  caseCompleted: 'case_completed',
  pendingDeliveryOffice: 'pending_delivery_office',
  deliveredOffice: 'delivered_office',
  toBeBilled: 'to_be_billed',
  caseClosed: 'case_closed',
  caseCancelled: 'case_cancelled',
  browserNotifications: 'browser_notifications',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
} as const;

export const APP_SETTINGS_FIELDS = {
  id: 'id',
  userId: 'user_id',
  settingKey: 'setting_key',
  settingValue: 'setting_value',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
} as const;

export const DOCTOR_PROCEDURES_FIELDS = {
  id: 'id',
  doctorId: 'doctor_id',
  procedureType: 'procedure_type',
  country: 'country',
  isActive: 'is_active',
  sortOrder: 'sort_order',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
} as const;

export const DOCTOR_PROCEDURE_SETS_FIELDS = {
  id: 'id',
  doctorId: 'doctor_id',
  procedureType: 'procedure_type',
  surgerySetId: 'surgery_set_id',
  implantBoxId: 'implant_box_id',
  country: 'country',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
} as const;

export const DEPARTMENT_PROCEDURE_TYPES_FIELDS = {
  id: 'id',
  departmentId: 'department_id',
  procedureType: 'procedure_type',
  country: 'country',
  isActive: 'is_active',
  isHidden: 'is_hidden',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
} as const;

export const DEPARTMENT_CATEGORIZED_SETS_FIELDS = {
  id: 'id',
  departmentId: 'department_id',
  procedureType: 'procedure_type',
  surgerySetId: 'surgery_set_id',
  implantBoxId: 'implant_box_id',
  country: 'country',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
} as const;

export const DAILY_USAGE_AGGREGATION_FIELDS = {
  id: 'id',
  usageDate: 'usage_date',
  country: 'country',
  department: 'department',
  itemType: 'item_type',
  itemName: 'item_name',
  totalQuantity: 'total_quantity',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
} as const;

// ================================================
// ENHANCED UTILITY FUNCTIONS
// ================================================

/**
 * Validates that a database object contains all required fields
 */
export function validateDatabaseFields<T extends Record<string, any>>(
  obj: any,
  requiredFields: T,
  tableName: string
): obj is Record<keyof T, any> {
  const missingFields: string[] = [];
  
  Object.entries(requiredFields).forEach(([frontendField, dbField]) => {
    if (!(dbField in obj)) {
      missingFields.push(`${frontendField} (DB: ${dbField})`);
    }
  });
  
  if (missingFields.length > 0) {
    console.error(`❌ FIELD MAPPING VALIDATION FAILED for ${tableName}:`, {
      missingFields,
      receivedFields: Object.keys(obj),
      expectedFields: Object.values(requiredFields)
    });
    return false;
  }
  
  return true;
}

/**
 * Transforms database object to frontend format using field mappings
 */
export function transformDbToFrontend<TDb, TFrontend>(
  dbObj: TDb,
  fieldMappings: Record<string, string>,
  tableName: string
): Partial<TFrontend> {
  if (!dbObj || typeof dbObj !== 'object') {
    console.warn(`⚠️ FIELD MAPPING: Invalid object for ${tableName}:`, dbObj);
    return {} as Partial<TFrontend>;
  }
  
  const frontendObj: any = {};
  
  Object.entries(fieldMappings).forEach(([frontendField, dbField]) => {
    if (dbField in (dbObj as any)) {
      frontendObj[frontendField] = (dbObj as any)[dbField];
    }
  });
  
  return frontendObj;
}

/**
 * Transforms frontend object to database format using field mappings
 */
export function transformFrontendToDb<TFrontend, TDb>(
  frontendObj: TFrontend,
  fieldMappings: Record<string, string>,
  tableName: string
): Partial<TDb> {
  if (!frontendObj || typeof frontendObj !== 'object') {
    console.warn(`⚠️ FIELD MAPPING: Invalid object for ${tableName}:`, frontendObj);
    return {} as Partial<TDb>;
  }
  
  const dbObj: any = {};
  
  Object.entries(fieldMappings).forEach(([frontendField, dbField]) => {
    if (frontendField in (frontendObj as any)) {
      dbObj[dbField] = (frontendObj as any)[frontendField];
    }
  });
  
  return dbObj;
}

/**
 * Creates a reverse mapping from database fields to frontend fields
 */
export function createReverseMapping(fieldMappings: Record<string, string>): Record<string, string> {
  const reverseMap: Record<string, string> = {};
  
  Object.entries(fieldMappings).forEach(([frontendField, dbField]) => {
    reverseMap[dbField] = frontendField;
  });
  
  return reverseMap;
}

/**
 * Type-safe field accessor with validation
 */
export function safeFieldAccess<T extends Record<string, any>>(
  obj: any,
  fieldMappings: T,
  field: keyof T,
  tableName: string,
  defaultValue?: any
): any {
  if (!obj || typeof obj !== 'object') {
    console.warn(`⚠️ SAFE FIELD ACCESS: Invalid object for ${tableName}.${String(field)}:`, obj);
    return defaultValue;
  }
  
  const dbField = fieldMappings[field];
  if (!(dbField in obj)) {
    console.warn(`⚠️ SAFE FIELD ACCESS: Missing field ${tableName}.${String(field)} (DB: ${dbField})`);
    return defaultValue;
  }
  
  return obj[dbField];
}

// Legacy function for backward compatibility
export const getDbField = (mapping: Record<string, string>, frontendField: string): string => {
  return mapping[frontendField] || frontendField;
};

// Export enhanced mapping utilities
export const FieldMappingUtils = {
  validateDatabaseFields,
  transformDbToFrontend,
  transformFrontendToDb,
  createReverseMapping,
  safeFieldAccess,
  getDbField,
  
  // Pre-computed reverse mappings for performance
  CASE_BOOKINGS_REVERSE: createReverseMapping(CASE_BOOKINGS_FIELDS),
  PROFILES_REVERSE: createReverseMapping(PROFILES_FIELDS),
  PERMISSIONS_REVERSE: createReverseMapping(PERMISSIONS_FIELDS),
  CODE_TABLES_REVERSE: createReverseMapping(CODE_TABLES_FIELDS)
};



// ================================================
// CRITICAL FIELD REMINDERS
// ================================================

/**
 * CRITICAL FIELD MAPPINGS - NEVER FORGET THESE:
 * 
 * ❌ WRONG:           ✅ CORRECT:
 * case_date           date_of_surgery
 * procedure           procedure_type
 * caseId              case_booking_id
 * itemtype            item_type
 * itemname            item_name
 * userid              user_id
 * doctorid            doctor_id
 * departmentid        department_id
 * settingkey          setting_key
 * settingvalue        setting_value
 * 
 * ALWAYS use this utility instead of hardcoded field names!
 * 
 * EXAMPLES:
 * ✅ Good: getDbField('case_bookings', 'dateOfSurgery')
 * ❌ Bad:  'date_of_surgery'
 * 
 * ✅ Good: CASE_BOOKINGS_FIELDS.dateOfSurgery
 * ❌ Bad:  'date_of_surgery'
 */