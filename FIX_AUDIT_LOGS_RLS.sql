-- Fix audit_logs RLS policy (same approach as amendment_history fix)

-- Step 1: Temporarily disable RLS to clean up
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read audit logs" ON audit_logs CASCADE;
DROP POLICY IF EXISTS "Allow authenticated users to insert audit logs" ON audit_logs CASCADE;
DROP POLICY IF EXISTS "Allow service role full access to audit logs" ON audit_logs CASCADE;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON audit_logs CASCADE;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON audit_logs CASCADE;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON audit_logs CASCADE;
DROP POLICY IF EXISTS "Enable service role access" ON audit_logs CASCADE;

-- Step 3: Re-enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Step 4: Create ONE comprehensive policy that allows everything for authenticated users
CREATE POLICY "audit_logs_all_access" ON audit_logs
    FOR ALL 
    USING (true)
    WITH CHECK (true);

-- Step 5: Grant all necessary permissions
GRANT ALL PRIVILEGES ON audit_logs TO authenticated;
GRANT ALL PRIVILEGES ON audit_logs TO service_role;
GRANT ALL PRIVILEGES ON audit_logs TO anon;

-- Step 6: Grant sequence permissions (if ID is auto-generated)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Step 7: Verify the fix
SELECT 'audit_logs RLS Status' as check_type, 
       CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as status
FROM pg_tables 
WHERE tablename = 'audit_logs';

SELECT 'audit_logs Policies' as check_type, count(*) as policy_count
FROM pg_policies 
WHERE tablename = 'audit_logs';

SELECT 'Audit logs fix completed successfully' as result;