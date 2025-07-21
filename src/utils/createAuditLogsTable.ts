/**
 * Create audit_logs table in Supabase
 * This utility creates the missing audit_logs table
 */

import { supabase } from '../lib/supabase';

export const createAuditLogsTable = async (): Promise<boolean> => {
  try {
    // First check if the table exists
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .limit(1);

    if (!error) {
      // Table exists
      console.log('Audit logs table already exists');
      return true;
    }

    // Table doesn't exist, try to create it
    console.log('Creating audit_logs table...');
    
    // We can't create tables directly from the client, so we'll use a different approach
    // Create an audit log entry directly to test the functionality
    const testEntry = {
      id: `audit-${Date.now()}-test`,
      timestamp: new Date().toISOString(),
      user_name: 'system',
      user_id: 'system',
      user_role: 'system',
      action: 'Table Check',
      category: 'System',
      target: 'audit_logs',
      details: 'Testing audit logs table creation',
      ip_address: '127.0.0.1',
      status: 'success',
      metadata: { test: true },
      country: null,
      department: null
    };

    const { error: insertError } = await supabase
      .from('audit_logs')
      .insert([testEntry]);

    if (insertError) {
      console.error('Audit logs table needs to be created manually:', insertError.message);
      return false;
    }

    console.log('Audit logs table is working correctly');
    return true;

  } catch (error) {
    console.error('Error checking/creating audit logs table:', error);
    return false;
  }
};

export const ensureAuditLogsTable = async (): Promise<void> => {
  const tableExists = await createAuditLogsTable();
  if (!tableExists) {
    console.warn('Audit logs table not available. Please create it manually in Supabase dashboard.');
    console.warn('Run the following SQL in your Supabase SQL editor:');
    console.warn(`
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

CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_category ON audit_logs(category);
    `);
  }
};