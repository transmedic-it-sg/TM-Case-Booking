-- ====================================================
-- PRODUCTION MIGRATION FOR VERSION 1.2.3
-- ====================================================
-- Run this complete SQL script in your Supabase SQL Editor
-- before deploying to production

-- ====================================================
-- 1. UPDATE SYSTEM SETTINGS TABLE
-- ====================================================

-- Add amendment configuration columns
ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS amendment_time_limit INTEGER NOT NULL DEFAULT 24,
ADD COLUMN IF NOT EXISTS max_amendments_per_case INTEGER NOT NULL DEFAULT 5;

-- Update existing row with new default values
UPDATE system_settings 
SET 
  amendment_time_limit = 24,
  max_amendments_per_case = 5,
  app_version = '1.2.3'
WHERE id = 1;

-- Insert default row if none exists
INSERT INTO system_settings (
  id,
  app_name,
  app_version,
  maintenance_mode,
  cache_timeout,
  max_file_size,
  session_timeout,
  password_complexity,
  two_factor_auth,
  audit_log_retention,
  amendment_time_limit,
  max_amendments_per_case,
  email_notifications,
  system_alerts,
  backup_frequency,
  auto_cleanup,
  default_theme,
  default_language
) VALUES (
  1,
  'Transmedic Case Booking',
  '1.2.3',
  false,
  300,
  10,
  3600,
  true,
  false,
  90,
  24,
  5,
  true,
  true,
  'daily',
  true,
  'light',
  'en'
) ON CONFLICT (id) DO NOTHING;

-- ====================================================
-- 2. FIX AUDIT LOGS TABLE AND RLS POLICIES
-- ====================================================

-- Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_logs (
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

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Allow authenticated users to insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Allow service role full access to audit logs" ON audit_logs;

-- Create new comprehensive policies
CREATE POLICY "Allow authenticated users to read audit logs" ON audit_logs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' OR 
        auth.role() = 'service_role'
    );

CREATE POLICY "Allow service role full access to audit logs" ON audit_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_country ON audit_logs(country);

-- Grant permissions
GRANT SELECT, INSERT ON audit_logs TO authenticated;
GRANT ALL ON audit_logs TO service_role;

-- ====================================================
-- 3. VERIFY AMENDMENT HISTORY TABLE
-- ====================================================

-- Ensure amendment_history table exists with correct structure
CREATE TABLE IF NOT EXISTS amendment_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  case_id TEXT NOT NULL REFERENCES case_bookings(id) ON DELETE CASCADE,
  amended_by TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  reason TEXT,
  changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on amendment_history
ALTER TABLE amendment_history ENABLE ROW LEVEL SECURITY;

-- Create policy for amendment_history if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'amendment_history' 
    AND policyname = 'Allow authenticated users to read amendment history'
  ) THEN
    CREATE POLICY "Allow authenticated users to read amendment history" ON amendment_history
        FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'amendment_history' 
    AND policyname = 'Allow authenticated users to insert amendment history'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert amendment history" ON amendment_history
        FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
END$$;

-- Create indexes for amendment_history
CREATE INDEX IF NOT EXISTS idx_amendment_history_case_id ON amendment_history(case_id);
CREATE INDEX IF NOT EXISTS idx_amendment_history_timestamp ON amendment_history(timestamp DESC);

-- ====================================================
-- 4. VERIFICATION QUERIES
-- ====================================================

-- Verify system_settings table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'system_settings' 
ORDER BY ordinal_position;

-- Verify audit_logs table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'audit_logs' 
ORDER BY ordinal_position;

-- Verify amendment_history table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'amendment_history' 
ORDER BY ordinal_position;

-- Check RLS policies
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('system_settings', 'audit_logs', 'amendment_history')
ORDER BY tablename, policyname;

-- ====================================================
-- MIGRATION COMPLETE
-- ====================================================

-- Display success message
SELECT 'Migration v1.2.3 completed successfully!' as status,
       'System ready for production deployment' as message;