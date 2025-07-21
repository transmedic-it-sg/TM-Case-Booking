# Database Setup Instructions

## Missing Table: audit_logs

The `audit_logs` table is required for the application to function properly. Please create it manually in your Supabase dashboard.

### Steps to Create the Table

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Run the following SQL commands:

```sql
-- Create audit_logs table
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    user_name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL,
    category TEXT NOT NULL,
    target TEXT NOT NULL,
    details TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'warning', 'error')),
    metadata JSONB,
    country TEXT,
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_category ON audit_logs(category);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to read audit logs" ON audit_logs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

### Verification

After creating the table, you can verify it works by:

1. Running the application
2. Checking that the System Settings no longer shows errors
3. Confirming that Audit Logs are being saved to Supabase instead of localStorage

## Current Database Status

✅ **system_settings** - Table exists and working correctly
✅ **amendment_history** - Table exists and working correctly  
❌ **audit_logs** - Table missing, needs manual creation

## Application Changes Made

### 1. System Settings Service
- Now uses Supabase as primary storage
- Only falls back to localStorage for network issues
- Proper error handling for missing tables

### 2. Audit Log Service
- Now uses Supabase as primary storage
- Only falls back to localStorage for network issues or missing table
- Proper error handling and graceful degradation

### 3. Amendment Case Functionality
- Enhanced with proper debugging
- Uses Supabase exclusively for critical operations
- Comprehensive change tracking implemented

## localStorage Usage Policy

localStorage is now used only as an emergency fallback in these scenarios:
- Network connectivity issues
- Supabase service temporarily unavailable
- Missing database tables (until they are created)

**Primary storage is always Supabase for all critical operations.**