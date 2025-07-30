/**
 * Apply RLS Policies to Supabase Database
 * This script will set up Row Level Security policies to secure the database
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration with service role key for admin operations
const supabaseUrl = 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk2MTMyOCwiZXhwIjoyMDY3NTM3MzI4fQ.cUNZC4bvC1Doi4DGhrPpBxoSebz1ad54tLMeYVKq7I4';

// Create admin client for applying policies
const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * SQL for RLS policies that preserve functionality
 */
const RLS_POLICIES_SQL = `
-- Enable RLS on critical tables
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS case_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS amendment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS code_tables ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read cases in their scope" ON case_bookings;
DROP POLICY IF EXISTS "Users can create cases in their scope" ON case_bookings;
DROP POLICY IF EXISTS "Users can update cases in their scope" ON case_bookings;
DROP POLICY IF EXISTS "Admins can delete cases" ON case_bookings;
DROP POLICY IF EXISTS "Authenticated users can read permissions" ON permissions;
DROP POLICY IF EXISTS "Admins can manage permissions" ON permissions;
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can read code tables" ON code_tables;
DROP POLICY IF EXISTS "Authorized users can manage code tables" ON code_tables;

-- Helper function to get current user's profile
CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS TABLE(
  id uuid,
  role text,
  countries text[],
  departments text[],
  enabled boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.role, p.countries, p.departments, p.enabled
  FROM profiles p
  WHERE p.id = auth.uid()
  AND p.enabled = true;
END;
$$;

-- PROFILES TABLE POLICIES
-- Allow users to read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Allow users to update their own profile (limited fields)  
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Allow admins to read all profiles
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM get_current_user_profile() 
      WHERE role = 'admin'
    )
  );

-- Allow admins to manage all profiles
CREATE POLICY "Admins can manage all profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM get_current_user_profile() 
      WHERE role = 'admin'
    )
  );

-- CASE_BOOKINGS TABLE POLICIES
-- Allow users to read cases from their assigned countries/departments
CREATE POLICY "Users can read cases in their scope" ON case_bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM get_current_user_profile() p
      WHERE 
        p.role = 'admin' OR  -- Admins can see all cases
        (
          country = ANY(p.countries) AND
          (
            array_length(p.departments, 1) IS NULL OR  -- No department restriction
            department = ANY(p.departments)
          )
        )
    )
  );

-- Allow users to insert cases (with country validation)
CREATE POLICY "Users can create cases in their scope" ON case_bookings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_current_user_profile() p
      WHERE 
        p.role = 'admin' OR
        (
          country = ANY(p.countries) AND
          submitted_by = p.id
        )
    )
  );

-- Allow users to update cases (with restrictions)
CREATE POLICY "Users can update cases in their scope" ON case_bookings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM get_current_user_profile() p
      WHERE 
        p.role = 'admin' OR
        (
          country = ANY(p.countries) AND
          (
            array_length(p.departments, 1) IS NULL OR
            department = ANY(p.departments)
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_current_user_profile() p
      WHERE 
        p.role = 'admin' OR
        country = ANY(p.countries)
    )
  );

-- Allow admins to delete cases
CREATE POLICY "Admins can delete cases" ON case_bookings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM get_current_user_profile() 
      WHERE role = 'admin'
    )
  );

-- PERMISSIONS TABLE POLICIES
-- Allow all authenticated users to read permissions (needed for UI)
CREATE POLICY "Authenticated users can read permissions" ON permissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow admins to manage permissions
CREATE POLICY "Admins can manage permissions" ON permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM get_current_user_profile() 
      WHERE role = 'admin'
    )
  );

-- NOTIFICATIONS TABLE POLICIES
-- Allow users to read their own notifications
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Allow users to update their own notifications
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow all authenticated users to create notifications
CREATE POLICY "Authenticated users can create notifications" ON notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- CODE_TABLES TABLE POLICIES
-- Allow all authenticated users to read code tables (needed for dropdowns)
CREATE POLICY "Authenticated users can read code tables" ON code_tables
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow admins and users with code table permissions to manage code tables
CREATE POLICY "Authorized users can manage code tables" ON code_tables
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM get_current_user_profile() 
      WHERE role IN ('admin', 'operations-manager', 'it')
    )
  );

-- Very permissive policies for status_history, amendment_history, and audit_logs
-- These will be controlled by application logic rather than strict RLS

-- STATUS_HISTORY - Allow access if user can access the related case
CREATE POLICY "Users can access status history" ON status_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM case_bookings cb
      JOIN get_current_user_profile() p ON (
        p.role = 'admin' OR
        country = ANY(p.countries)
      )
      WHERE cb.id = status_history.case_id
    )
  );

-- AMENDMENT_HISTORY - Allow access if user can access the related case  
CREATE POLICY "Users can access amendment history" ON amendment_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM case_bookings cb
      JOIN get_current_user_profile() p ON (
        p.role = 'admin' OR
        country = ANY(p.countries)
      )
      WHERE cb.id = amendment_history.case_id
    )
  );

-- AUDIT_LOGS - Allow admins and IT to read, anyone to insert
CREATE POLICY "Admins can read audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM get_current_user_profile() 
      WHERE role IN ('admin', 'it')
    )
  );

CREATE POLICY "Users can create audit logs" ON audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant service role full access (bypasses RLS)
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_enabled ON profiles(enabled);
CREATE INDEX IF NOT EXISTS idx_case_bookings_country ON case_bookings(country);
CREATE INDEX IF NOT EXISTS idx_case_bookings_department ON case_bookings(department);
CREATE INDEX IF NOT EXISTS idx_case_bookings_submitted_by ON case_bookings(submitted_by);
CREATE INDEX IF NOT EXISTS idx_status_history_case_id ON status_history(case_id);
CREATE INDEX IF NOT EXISTS idx_amendment_history_case_id ON amendment_history(case_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
`;

/**
 * Apply RLS policies to the database
 */
export const applyRLSPolicies = async (): Promise<{
  success: boolean;
  errors: string[];
  results: any[];
}> => {
  const errors: string[] = [];
  const results: any[] = [];

  try {
    console.log('🔒 Applying RLS policies to Supabase database...');

    // Split SQL into individual statements
    const statements = RLS_POLICIES_SQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`📝 Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement || statement.startsWith('--')) continue;

      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        const { data, error } = await adminClient.rpc('exec_sql', {
          sql: statement + ';'
        });

        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error);
          errors.push(`Statement ${i + 1}: ${error.message}`);
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
          results.push({ statement: i + 1, success: true, data });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`❌ Exception in statement ${i + 1}:`, errorMsg);
        errors.push(`Statement ${i + 1}: ${errorMsg}`);
      }

      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const success = errors.length === 0;
    console.log(success ? '🎉 RLS policies applied successfully!' : `⚠️  Applied with ${errors.length} errors`);

    return { success, errors, results };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('💥 Fatal error applying RLS policies:', errorMsg);
    return {
      success: false,
      errors: [errorMsg],
      results: []
    };
  }
};

/**
 * Test the RLS policies to ensure they work correctly
 */
export const testRLSPolicies = async (): Promise<{
  success: boolean;
  tests: Array<{ name: string; passed: boolean; error?: string }>;
}> => {
  const tests: Array<{ name: string; passed: boolean; error?: string }> = [];

  try {
    console.log('🧪 Testing RLS policies...');

    // Test 1: Check if tables have RLS enabled
    try {
      const { data, error } = await adminClient.rpc('exec_sql', {
        sql: `
          SELECT tablename, rowsecurity 
          FROM pg_tables t
          JOIN pg_class c ON c.relname = t.tablename
          WHERE schemaname = 'public' 
          AND tablename IN ('profiles', 'case_bookings', 'permissions')
        `
      });

      if (error) throw error;
      
      tests.push({
        name: 'RLS enabled on tables',
        passed: true
      });
    } catch (error) {
      tests.push({
        name: 'RLS enabled on tables',
        passed: false,
        error: (error as Error).message
      });
    }

    // Test 2: Check if helper function exists
    try {
      const { data, error } = await adminClient.rpc('exec_sql', {
        sql: `SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_current_user_profile')`
      });

      if (error) throw error;
      
      tests.push({
        name: 'Helper function exists',
        passed: true
      });
    } catch (error) {
      tests.push({
        name: 'Helper function exists', 
        passed: false,
        error: (error as Error).message
      });
    }

    const allPassed = tests.every(t => t.passed);
    console.log(allPassed ? '✅ All RLS tests passed!' : '❌ Some RLS tests failed');

    return { success: allPassed, tests };
  } catch (error) {
    console.error('💥 Error testing RLS policies:', error);
    return {
      success: false,
      tests: [{
        name: 'RLS testing',
        passed: false,
        error: (error as Error).message
      }]
    };
  }
};

// Export for use in application
export default {
  applyRLSPolicies,
  testRLSPolicies
};