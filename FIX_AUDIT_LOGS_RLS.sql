-- Fix for Audit Logs RLS Policy Issue
-- Run this SQL in your Supabase SQL Editor to fix the audit logs policy

-- First, check if the table exists and has RLS enabled
-- If audit_logs table doesn't exist, create it first
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

-- Enable RLS if not already enabled
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Allow authenticated users to insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Allow service role full access to audit logs" ON audit_logs;

-- Create new policies that allow proper access
-- Policy for reading audit logs (authenticated users)
CREATE POLICY "Allow authenticated users to read audit logs" ON audit_logs
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for inserting audit logs (allow both authenticated users and service role)
CREATE POLICY "Allow authenticated users to insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' OR 
        auth.role() = 'service_role'
    );

-- Policy for service role to have full access (fallback)
CREATE POLICY "Allow service role full access to audit logs" ON audit_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_country ON audit_logs(country);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT ON audit_logs TO authenticated;
GRANT ALL ON audit_logs TO service_role;