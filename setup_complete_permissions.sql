-- Complete permissions setup for all roles
-- Run this in Supabase Dashboard > SQL Editor

-- Create permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id TEXT NOT NULL,
  action_id TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, action_id)
);

-- Clear existing permissions to avoid conflicts
DELETE FROM permissions;

-- Insert complete permissions for all roles
INSERT INTO permissions (role_id, action_id, allowed) VALUES
-- Admin permissions (full access)
('admin', 'view_cases', true),
('admin', 'create_cases', true),
('admin', 'edit_cases', true),
('admin', 'delete_cases', true),
('admin', 'process_orders', true),
('admin', 'delivered_hospital', true),
('admin', 'pending_delivery_office', true),
('admin', 'delivered_office', true),
('admin', 'case_completed', true),
('admin', 'edit_sets', true),
('admin', 'manage_users', true),
('admin', 'view_permissions', true),
('admin', 'edit_permissions', true),

-- IT permissions (same as admin)
('it', 'view_cases', true),
('it', 'create_cases', true),
('it', 'edit_cases', true),
('it', 'delete_cases', true),
('it', 'process_orders', true),
('it', 'delivered_hospital', true),
('it', 'pending_delivery_office', true),
('it', 'delivered_office', true),
('it', 'case_completed', true),
('it', 'edit_sets', true),
('it', 'manage_users', true),
('it', 'view_permissions', true),
('it', 'edit_permissions', true),

-- Operations permissions
('operations', 'view_cases', true),
('operations', 'create_cases', true),
('operations', 'edit_cases', true),
('operations', 'process_orders', true),
('operations', 'delivered_hospital', true),
('operations', 'edit_sets', false),
('operations', 'manage_users', false),
('operations', 'view_permissions', false),
('operations', 'edit_permissions', false),

-- Sales permissions
('sales', 'view_cases', true),
('sales', 'create_cases', true),
('sales', 'edit_cases', true),
('sales', 'case_completed', true),
('sales', 'pending_delivery_office', true),
('sales', 'delivered_office', true),
('sales', 'edit_sets', false),
('sales', 'manage_users', false),
('sales', 'view_permissions', false),
('sales', 'edit_permissions', false),

-- Driver permissions
('driver', 'view_cases', true),
('driver', 'delivered_hospital', true),
('driver', 'edit_sets', false),
('driver', 'manage_users', false),
('driver', 'view_permissions', false),
('driver', 'edit_permissions', false)

ON CONFLICT (role_id, action_id) DO UPDATE SET
  allowed = EXCLUDED.allowed,
  updated_at = NOW();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_permissions_role_action ON permissions (role_id, action_id);