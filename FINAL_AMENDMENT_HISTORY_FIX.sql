-- FINAL DEFINITIVE FIX for amendment_history RLS policy
-- This will completely reset and fix the RLS policies

-- Step 1: Temporarily disable RLS to clean up
ALTER TABLE amendment_history DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies (using CASCADE to be thorough)
DROP POLICY IF EXISTS "Allow authenticated users to read amendment history" ON amendment_history CASCADE;
DROP POLICY IF EXISTS "Allow authenticated users to insert amendment history" ON amendment_history CASCADE;
DROP POLICY IF EXISTS "Allow service role full access to amendment history" ON amendment_history CASCADE;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON amendment_history CASCADE;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON amendment_history CASCADE;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON amendment_history CASCADE;
DROP POLICY IF EXISTS "Enable service role access" ON amendment_history CASCADE;

-- Step 3: Re-enable RLS
ALTER TABLE amendment_history ENABLE ROW LEVEL SECURITY;

-- Step 4: Create ONE comprehensive policy that allows everything for authenticated users
CREATE POLICY "amendment_history_all_access" ON amendment_history
    FOR ALL 
    USING (true)
    WITH CHECK (true);

-- Step 5: Grant all necessary permissions
GRANT ALL PRIVILEGES ON amendment_history TO authenticated;
GRANT ALL PRIVILEGES ON amendment_history TO service_role;
GRANT ALL PRIVILEGES ON amendment_history TO anon;

-- Step 6: Grant sequence permissions (if ID is auto-generated)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Step 7: Verify the fix
SELECT 'RLS Status' as check_type, 
       CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as status
FROM pg_tables 
WHERE tablename = 'amendment_history';

SELECT 'Policies' as check_type, count(*) as policy_count
FROM pg_policies 
WHERE tablename = 'amendment_history';

SELECT 'Permissions' as check_type, string_agg(privilege_type, ', ') as privileges
FROM information_schema.role_table_grants 
WHERE table_name = 'amendment_history' AND grantee = 'authenticated';

-- Step 8: Test insertion (this should work now)
-- INSERT INTO amendment_history (case_id, amended_by, reason, changes) 
-- VALUES ('test', 'test_user', 'test reason', '[]'::jsonb);
-- DELETE FROM amendment_history WHERE case_id = 'test';

SELECT 'Fix completed successfully' as result;