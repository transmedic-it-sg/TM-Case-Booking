-- Debug script to check amendment_history table and permissions
-- Run this to diagnose the issue

-- Check table structure and constraints
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'amendment_history' 
ORDER BY ordinal_position;

-- Check for any triggers on the table
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'amendment_history';

-- Check current RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'amendment_history';

-- Check table permissions
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'amendment_history';

-- Test current authentication
SELECT 
    auth.uid() as user_id,
    auth.role() as user_role,
    current_user as db_user;

-- Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'amendment_history';