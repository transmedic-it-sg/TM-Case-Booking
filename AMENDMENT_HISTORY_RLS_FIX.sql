-- Fix amendment_history RLS policy to allow authenticated users to insert
-- Run this SQL in your Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read amendment history" ON amendment_history;
DROP POLICY IF EXISTS "Allow authenticated users to insert amendment history" ON amendment_history;
DROP POLICY IF EXISTS "Allow service role full access to amendment history" ON amendment_history;

-- Create comprehensive policies for amendment_history
CREATE POLICY "Allow authenticated users to read amendment history" ON amendment_history
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert amendment history" ON amendment_history
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' OR 
        auth.role() = 'service_role'
    );

CREATE POLICY "Allow service role full access to amendment history" ON amendment_history
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions to authenticated users
GRANT SELECT, INSERT ON amendment_history TO authenticated;
GRANT ALL ON amendment_history TO service_role;

-- Verify policies are created
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'amendment_history'
ORDER BY policyname;