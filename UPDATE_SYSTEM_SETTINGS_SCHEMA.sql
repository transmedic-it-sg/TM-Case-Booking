-- Update system_settings table to include amendment configuration fields
-- Run this SQL in your Supabase SQL Editor

-- Add amendment configuration columns to system_settings table
ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS amendment_time_limit INTEGER NOT NULL DEFAULT 24,
ADD COLUMN IF NOT EXISTS max_amendments_per_case INTEGER NOT NULL DEFAULT 5;

-- Update existing row to include the new default values if it exists
UPDATE system_settings 
SET 
  amendment_time_limit = 24,
  max_amendments_per_case = 5
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