# Supabase Database Setup Guide

This guide will help you set up the Supabase database for the TM Case Booking System.

## Prerequisites

1. Supabase account (create one at [supabase.com](https://supabase.com))
2. Your Supabase project URL and anon key (already configured in `.env`)

## Database Setup Steps

### Step 1: Create the Database Schema

1. Go to your Supabase dashboard: https://supabase.com/dashboard/projects
2. Select your project
3. Navigate to **SQL Editor** in the sidebar
4. Create a new query and copy/paste the contents of `database-schema.sql`
5. Run the query to create all tables, indexes, and functions

### Step 2: Seed Initial Data

1. In the SQL Editor, create another new query
2. Copy/paste the contents of `database-seed.sql`
3. Run the query to populate the database with initial reference data

### Step 3: Set Up Storage (Optional - for file attachments)

1. Navigate to **Storage** in the sidebar
2. Create a new bucket called `case-attachments`
3. Set the bucket to **Private** (not public)
4. Configure bucket policies:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload case attachments" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'case-attachments');

-- Allow authenticated users to view files
CREATE POLICY "Authenticated users can view case attachments" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'case-attachments');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own attachments" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'case-attachments');
```

### Step 4: Configure Row Level Security (RLS)

The schema already includes basic RLS policies, but you may want to customize them based on your security requirements:

1. Navigate to **Authentication** > **Policies** in the sidebar
2. Review and modify policies as needed
3. Key policies to review:
   - Users can only see their own data
   - Cases are visible to authenticated users
   - Admin users have broader access

### Step 5: Create Your First Admin User

1. Navigate to **Authentication** > **Users** in the sidebar
2. Click **Add User**
3. Enter email and temporary password
4. After creating the user, go to SQL Editor and run:

```sql
-- Get the admin role ID
SELECT id FROM roles WHERE name = 'admin';

-- Update the user with admin role (replace USER_ID and ROLE_ID)
UPDATE users SET role_id = 'ROLE_ID_FROM_ABOVE' WHERE id = 'USER_ID_FROM_AUTH';
```

## Database Schema Overview

The database is organized into 7 categories:

### 1. System Configuration Tables
- `countries` - Supported countries
- `roles` - User roles and permissions
- `permission_actions` - Available system actions
- `permissions` - Role-permission matrix

### 2. User Management Tables
- `users` - User profiles (extends Supabase auth.users)
- `user_departments` - User-department associations
- `user_countries` - User-country access
- `user_preferences` - User settings and preferences

### 3. Code Tables & Lookup Data
- `code_tables` - Generic lookup tables
- `departments` - Medical departments by country
- `hospitals` - Hospital listings by country
- `procedure_types` - Surgery procedure types
- `surgery_sets` - Available surgery sets
- `implant_boxes` - Available implant boxes
- `procedure_mappings` - Procedure type to sets/boxes mapping

### 4. Case Management Tables
- `case_statuses` - Case status definitions
- `cases` - Main case booking data
- `case_surgery_sets` - Case-surgery set associations
- `case_implant_boxes` - Case-implant box associations
- `case_status_history` - Status change tracking
- `amendment_history` - Case amendment tracking
- `case_drafts` - Temporary case drafts

### 5. File Management Tables
- `attachments` - File attachment metadata

### 6. Notification & Communication Tables
- `email_configurations` - Email settings per country
- `notification_rules` - Email notification rules
- `notifications` - User notifications

### 7. Audit & System Logs
- `audit_logs` - System audit trail
- `system_settings` - Application settings
- `case_reference_counters` - Case numbering per country

## Key Features

### Automatic Case Reference Numbers
The system automatically generates case reference numbers using the format: `TM-{COUNTRY_CODE}-{NUMBER}`

Example: `TM-SG-001`, `TM-MY-002`

### Real-time Capabilities
The application supports real-time updates through Supabase's real-time features:
- Case status changes
- New notifications
- Data updates

### Multi-country Support
All lookup data (hospitals, departments, procedure types) is country-specific, allowing for:
- Country-specific configurations
- Localized data management
- Scalable multi-region support

### Audit Trail
Every important action is logged in the `audit_logs` table for:
- Compliance requirements
- Security monitoring
- User activity tracking

## Testing the Setup

After completing the setup, you can test the connection by running:

```bash
npm start
```

The application should:
1. Successfully connect to Supabase
2. Load countries and other lookup data
3. Allow user registration/login
4. Enable case creation and management

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Verify your `.env` file has the correct Supabase URL and anon key
   - Check that your Supabase project is active

2. **Permission Denied**
   - Ensure RLS policies are correctly configured
   - Verify user roles are properly assigned

3. **Missing Data**
   - Re-run the seed script (`database-seed.sql`)
   - Check that all tables were created successfully

4. **Authentication Issues**
   - Verify email confirmation settings in Supabase Auth
   - Check user creation in the Supabase dashboard

### Getting Help

- Supabase Documentation: https://supabase.com/docs
- Supabase Community: https://github.com/supabase/supabase/discussions
- Project Issues: Create an issue in the project repository

## Migration from localStorage

If you have existing data in localStorage, the application includes migration utilities in `src/services/migrationService.ts`. However, manual data migration may be required depending on your specific data structure.

## Security Considerations

1. **Row Level Security (RLS)** is enabled on all tables
2. **Anon key** is safe to expose in client-side code
3. **Service role key** should NEVER be exposed client-side
4. Regular security audits are recommended
5. Monitor the audit logs for suspicious activity

## Performance Optimization

1. **Indexes** are created on frequently queried columns
2. **Caching** is implemented in the constants service
3. **Real-time subscriptions** should be used judiciously
4. **Pagination** should be implemented for large datasets

## Backup and Recovery

1. Enable **Point-in-Time Recovery** in your Supabase project settings
2. Regular database backups are automatically handled by Supabase
3. Consider exporting critical data periodically
4. Document your custom policies and functions for recreation if needed