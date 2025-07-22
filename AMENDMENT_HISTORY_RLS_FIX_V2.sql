-- Enhanced fix for amendment_history RLS policy issues
-- Run this SQL in your Supabase SQL Editor

-- First, disable RLS temporarily to clean up
ALTER TABLE amendment_history DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read amendment history" ON amendment_history;
DROP POLICY IF EXISTS "Allow authenticated users to insert amendment history" ON amendment_history;
DROP POLICY IF EXISTS "Allow service role full access to amendment history" ON amendment_history;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON amendment_history;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON amendment_history;

-- Re-enable RLS
ALTER TABLE amendment_history ENABLE ROW LEVEL SECURITY;

-- Create simple, permissive policies for authenticated users
CREATE POLICY "Enable all access for authenticated users" ON amendment_history
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable service role access" ON amendment_history
    FOR ALL USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT ALL ON amendment_history TO authenticated;
GRANT ALL ON amendment_history TO service_role;
GRANT ALL ON amendment_history TO anon;

-- Verify the table structure
\d amendment_history;

-- Test insert permissions
SELECT current_user, session_user;
SELECT auth.role();

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'amendment_history'
ORDER BY policyname;