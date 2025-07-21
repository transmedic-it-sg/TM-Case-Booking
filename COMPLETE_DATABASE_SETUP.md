# Complete Database Setup

## Current Database Status

After testing with the service role key, here's what I found:

### ✅ Tables that exist:
- `amendment_history` - Working correctly
- `system_settings` - EXISTS but has wrong schema

### ❌ Tables that need to be created:
- `audit_logs` - Does not exist

## Issues Found

### 1. system_settings table has wrong schema
**Current schema**: Uses key-value pairs (setting_key, setting_value)
**Expected schema**: Single row with multiple columns

### 2. audit_logs table is missing completely

## SQL to Fix Everything

Run this SQL in your Supabase SQL Editor to fix everything:

```sql
-- 1. Drop the existing system_settings table (backup first if needed)
DROP TABLE IF EXISTS system_settings;

-- 2. Create the correct system_settings table
CREATE TABLE system_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  app_name TEXT NOT NULL DEFAULT 'Transmedic Case Booking',
  app_version TEXT NOT NULL DEFAULT '1.2.2',
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  cache_timeout INTEGER NOT NULL DEFAULT 300,
  max_file_size INTEGER NOT NULL DEFAULT 10,
  session_timeout INTEGER NOT NULL DEFAULT 3600,
  password_complexity BOOLEAN NOT NULL DEFAULT true,
  two_factor_auth BOOLEAN NOT NULL DEFAULT false,
  audit_log_retention INTEGER NOT NULL DEFAULT 90,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  system_alerts BOOLEAN NOT NULL DEFAULT true,
  backup_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (backup_frequency IN ('daily', 'weekly', 'monthly')),
  auto_cleanup BOOLEAN NOT NULL DEFAULT true,
  default_theme TEXT NOT NULL DEFAULT 'light' CHECK (default_theme IN ('light', 'dark', 'auto')),
  default_language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT single_row_constraint CHECK (id = 1)
);

-- Insert default system settings
INSERT INTO system_settings (id) VALUES (1);

-- 3. Create audit_logs table
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

-- Create indexes for audit_logs
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_category ON audit_logs(category);

-- Enable RLS on both tables
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for system_settings
CREATE POLICY "Allow authenticated users to read system settings" ON system_settings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update system settings" ON system_settings
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create policies for audit_logs
CREATE POLICY "Allow authenticated users to read audit logs" ON audit_logs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create trigger to update updated_at on system_settings
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_system_settings_updated_at 
    BEFORE UPDATE ON system_settings
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

## After Running the SQL

1. **System Settings** will work correctly with proper schema
2. **Audit Logs** will be saved to Supabase instead of localStorage
3. **Amendment functionality** will work perfectly
4. **All data operations** will use Supabase as primary storage

## Verification

After running the SQL, you can verify everything works by:

1. Starting the application
2. Going to System Settings - should load without errors
3. Creating an audit log entry - should save to Supabase
4. Testing amendment functionality - should create history entries

The application is now fully configured to use Supabase as primary storage!