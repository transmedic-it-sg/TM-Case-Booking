# Database Schema Reference

## Core Tables

### case_bookings (Primary Data)
```sql
-- Core case data with snake_case field names
-- Always use fieldMappings.ts for TypeScript conversion
id, case_reference_number, hospital, department, date_of_surgery,
procedure_type, procedure_name, doctor_name, time_of_procedure,
surgery_set_selection, implant_box, special_instruction, status,
submitted_by, submitted_at, processed_by, processed_at,
process_order_details, country, amended_by, amended_at, is_amended
```

### case_booking_quantities
```sql
-- Separate quantity tracking for surgery sets and implant boxes
case_booking_id, item_name, quantity, item_type
```

### status_history
```sql
-- Status change tracking with duplicate prevention
id, case_booking_id, status, timestamp, processed_by, details, attachments
-- Time-based duplicate prevention: 30 seconds window
```

### email_notification_rules
```sql
-- Email automation for all 11 status workflow steps
-- Includes proper recipients: Jade Long, Serene Lim, etc.
```

## Field Mappings (CRITICAL)
```typescript
// Always use src/utils/fieldMappings.ts
CASE_BOOKINGS_FIELDS = {
  dateOfSurgery: 'date_of_surgery',
  procedureType: 'procedure_type',
  caseReferenceNumber: 'case_reference_number',
  // ... complete mappings in fieldMappings.ts
}
```

## Status Enum Values
```sql
'Case Booked', 'Preparing Order', 'Order Prepared', 
'Pending Delivery (Hospital)', 'Delivered (Hospital)', 
'Case Completed', 'Sales Approval', 'Pending Delivery (Office)', 
'Delivered (Office)', 'To be billed', 'Case Closed', 'Case Cancelled'
```

## Row Level Security (RLS)
- Enabled on all tables
- Role-based access control
- User permissions enforced at database level

## Key Stored Procedures
- `get_daily_usage`: Aggregates quantities for Usage Calendar
- Uses correct status names ("Preparing Order" not "Order Preparation")

---
*Reference for v1.4.0 - All 8 critical issues resolved*