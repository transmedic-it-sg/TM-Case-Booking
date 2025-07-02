-- TM Case Booking System - Complete Database Schema
-- This script creates all required tables for migrating from localStorage to Supabase

-- =============================================================================
-- CATEGORY 1: SYSTEM CONFIGURATION TABLES
-- =============================================================================

-- Countries lookup table
CREATE TABLE countries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(3) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Roles table
CREATE TABLE roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7), -- Hex color code
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Permission actions table
CREATE TABLE permission_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Permission matrix table
CREATE TABLE permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  action_id UUID REFERENCES permission_actions(id) ON DELETE CASCADE,
  allowed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(role_id, action_id)
);

-- =============================================================================
-- CATEGORY 2: USER MANAGEMENT TABLES
-- =============================================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role_id UUID REFERENCES roles(id),
  enabled BOOLEAN DEFAULT true,
  selected_country_id UUID REFERENCES countries(id),
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User departments (many-to-many relationship)
CREATE TABLE user_departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  department_name VARCHAR(100) NOT NULL,
  country_id UUID REFERENCES countries(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, department_name, country_id)
);

-- User countries (many-to-many relationship)
CREATE TABLE user_countries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  country_id UUID REFERENCES countries(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, country_id)
);

-- User preferences
CREATE TABLE user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  notification_preferences JSONB DEFAULT '{}',
  ui_preferences JSONB DEFAULT '{}',
  filter_preferences JSONB DEFAULT '{}',
  column_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- CATEGORY 3: CODE TABLES & LOOKUP DATA
-- =============================================================================

-- Generic code tables for dynamic lookups
CREATE TABLE code_tables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name VARCHAR(50) NOT NULL,
  country_id UUID REFERENCES countries(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  items TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(table_name, country_id, name)
);

-- Departments table
CREATE TABLE departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  country_id UUID REFERENCES countries(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(name, country_id)
);

-- Hospitals table
CREATE TABLE hospitals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  country_id UUID REFERENCES countries(id),
  department_id UUID REFERENCES departments(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(name, country_id)
);

-- Procedure types table
CREATE TABLE procedure_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  country_id UUID REFERENCES countries(id),
  is_active BOOLEAN DEFAULT true,
  is_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(name, country_id)
);

-- Surgery sets table
CREATE TABLE surgery_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  country_id UUID REFERENCES countries(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Implant boxes table
CREATE TABLE implant_boxes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  country_id UUID REFERENCES countries(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Procedure mappings (procedure type to sets/boxes)
CREATE TABLE procedure_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  procedure_type_id UUID REFERENCES procedure_types(id) ON DELETE CASCADE,
  surgery_set_id UUID REFERENCES surgery_sets(id) ON DELETE CASCADE,
  implant_box_id UUID REFERENCES implant_boxes(id) ON DELETE CASCADE,
  country_id UUID REFERENCES countries(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- CATEGORY 4: CASE MANAGEMENT TABLES
-- =============================================================================

-- Case statuses lookup
CREATE TABLE case_statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  status_key VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7), -- Hex color
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Main cases table
CREATE TABLE cases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_reference_number VARCHAR(50) UNIQUE NOT NULL,
  hospital_id UUID REFERENCES hospitals(id),
  department_name VARCHAR(100),
  date_of_surgery DATE NOT NULL,
  procedure_type_id UUID REFERENCES procedure_types(id),
  procedure_name VARCHAR(200),
  doctor_name VARCHAR(100),
  time_of_procedure TIME,
  special_instruction TEXT,
  status_id UUID REFERENCES case_statuses(id),
  submitted_by UUID REFERENCES users(id),
  submitted_at TIMESTAMP DEFAULT NOW(),
  processed_by UUID REFERENCES users(id),
  processed_at TIMESTAMP,
  process_order_details TEXT,
  country_id UUID REFERENCES countries(id),
  amended_by UUID REFERENCES users(id),
  amended_at TIMESTAMP,
  is_amended BOOLEAN DEFAULT false,
  delivery_details TEXT,
  order_summary TEXT,
  do_number VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Case surgery sets (many-to-many)
CREATE TABLE case_surgery_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  surgery_set_id UUID REFERENCES surgery_sets(id),
  surgery_set_name VARCHAR(200), -- Store name for historical reference
  created_at TIMESTAMP DEFAULT NOW()
);

-- Case implant boxes (many-to-many)
CREATE TABLE case_implant_boxes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  implant_box_id UUID REFERENCES implant_boxes(id),
  implant_box_name VARCHAR(200), -- Store name for historical reference
  created_at TIMESTAMP DEFAULT NOW()
);

-- Case status history
CREATE TABLE case_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  status_id UUID REFERENCES case_statuses(id),
  status_key VARCHAR(50) NOT NULL, -- Store key for historical reference
  timestamp TIMESTAMP DEFAULT NOW(),
  processed_by UUID REFERENCES users(id),
  user_name VARCHAR(100), -- Store name for historical reference
  details TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Amendment history
CREATE TABLE amendment_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  amendment_id VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  amended_by UUID REFERENCES users(id),
  amended_by_name VARCHAR(100), -- Store name for historical reference
  changes JSONB NOT NULL, -- Array of {field, oldValue, newValue}
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Case drafts for temporary storage
CREATE TABLE case_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  draft_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- CATEGORY 5: FILE MANAGEMENT TABLES
-- =============================================================================

-- File attachments
CREATE TABLE attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  case_status_history_id UUID REFERENCES case_status_history(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL, -- Supabase Storage path
  file_size BIGINT,
  file_type VARCHAR(100),
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT NOW(),
  is_delivery_image BOOLEAN DEFAULT false
);

-- =============================================================================
-- CATEGORY 6: NOTIFICATION & COMMUNICATION TABLES
-- =============================================================================

-- Email configurations per country
CREATE TABLE email_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  country_id UUID REFERENCES countries(id),
  provider_type VARCHAR(20) NOT NULL, -- 'google' or 'microsoft'
  is_authenticated BOOLEAN DEFAULT false,
  from_name VARCHAR(100),
  user_info JSONB,
  tokens JSONB,
  is_active_provider BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(country_id, provider_type)
);

-- Notification rules
CREATE TABLE notification_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  country_id UUID REFERENCES countries(id),
  status_key VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  recipients JSONB NOT NULL, -- {roles, specificEmails, includeSubmitter, etc.}
  email_template JSONB NOT NULL, -- {subject, body}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- System notifications
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'success', 'error', 'warning', 'info'
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  duration INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- CATEGORY 7: AUDIT & SYSTEM LOGS
-- =============================================================================

-- Audit logs
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(100), -- Store for historical reference
  action VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  target VARCHAR(200),
  details TEXT,
  ip_address INET,
  status VARCHAR(20) DEFAULT 'success', -- 'success', 'warning', 'error'
  created_at TIMESTAMP DEFAULT NOW()
);

-- System settings
CREATE TABLE system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Case reference counter per country
CREATE TABLE case_reference_counters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  country_id UUID REFERENCES countries(id) UNIQUE,
  current_number INTEGER DEFAULT 0,
  prefix VARCHAR(10) DEFAULT 'TM',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE surgery_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE implant_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_surgery_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_implant_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE amendment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_reference_counters ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (authenticated users can read most data)
CREATE POLICY "Authenticated users can read countries" ON countries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read roles" ON roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read permission_actions" ON permission_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read permissions" ON permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can read own data" ON users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Authenticated users can read user_departments" ON user_departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read user_countries" ON user_countries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage own preferences" ON user_preferences FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can read code_tables" ON code_tables FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read departments" ON departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read hospitals" ON hospitals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read procedure_types" ON procedure_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read surgery_sets" ON surgery_sets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read implant_boxes" ON implant_boxes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read procedure_mappings" ON procedure_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read case_statuses" ON case_statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read cases" ON cases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create cases" ON cases FOR INSERT TO authenticated WITH CHECK (auth.uid() = submitted_by);
CREATE POLICY "Users can update own cases" ON cases FOR UPDATE TO authenticated USING (auth.uid() = submitted_by OR auth.uid() = processed_by);
CREATE POLICY "Authenticated users can read case_surgery_sets" ON case_surgery_sets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read case_implant_boxes" ON case_implant_boxes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read case_status_history" ON case_status_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read amendment_history" ON amendment_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage own drafts" ON case_drafts FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can read attachments" ON attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read email_configurations" ON email_configurations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read notification_rules" ON notification_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage own notifications" ON notifications FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can read audit_logs" ON audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read system_settings" ON system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read case_reference_counters" ON case_reference_counters FOR SELECT TO authenticated USING (true);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Cases table indexes
CREATE INDEX idx_cases_country_id ON cases(country_id);
CREATE INDEX idx_cases_status_id ON cases(status_id);
CREATE INDEX idx_cases_submitted_by ON cases(submitted_by);
CREATE INDEX idx_cases_date_of_surgery ON cases(date_of_surgery);
CREATE INDEX idx_cases_case_reference_number ON cases(case_reference_number);
CREATE INDEX idx_cases_created_at ON cases(created_at);

-- Status history indexes
CREATE INDEX idx_case_status_history_case_id ON case_status_history(case_id);
CREATE INDEX idx_case_status_history_timestamp ON case_status_history(timestamp);

-- User-related indexes
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_selected_country_id ON users(selected_country_id);
CREATE INDEX idx_user_departments_user_id ON user_departments(user_id);
CREATE INDEX idx_user_countries_user_id ON user_countries(user_id);

-- Lookup table indexes
CREATE INDEX idx_hospitals_country_id ON hospitals(country_id);
CREATE INDEX idx_procedure_types_country_id ON procedure_types(country_id);
CREATE INDEX idx_surgery_sets_country_id ON surgery_sets(country_id);
CREATE INDEX idx_implant_boxes_country_id ON implant_boxes(country_id);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_category ON audit_logs(category);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_code_tables_updated_at BEFORE UPDATE ON code_tables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_configurations_updated_at BEFORE UPDATE ON email_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_rules_updated_at BEFORE UPDATE ON notification_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_case_reference_counters_updated_at BEFORE UPDATE ON case_reference_counters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate case reference number
CREATE OR REPLACE FUNCTION generate_case_reference_number(p_country_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    current_num INTEGER;
    country_code VARCHAR(3);
    reference_number VARCHAR(50);
BEGIN
    -- Get country code
    SELECT code INTO country_code FROM countries WHERE id = p_country_id;
    
    -- Update counter and get new number
    INSERT INTO case_reference_counters (country_id, current_number)
    VALUES (p_country_id, 1)
    ON CONFLICT (country_id)
    DO UPDATE SET 
        current_number = case_reference_counters.current_number + 1,
        updated_at = NOW()
    RETURNING current_number INTO current_num;
    
    -- Format reference number: TM-SG-001
    reference_number := 'TM-' || country_code || '-' || LPAD(current_num::TEXT, 3, '0');
    
    RETURN reference_number;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE countries IS 'Supported countries for the case booking system';
COMMENT ON TABLE roles IS 'User roles with permissions';
COMMENT ON TABLE users IS 'User accounts extending Supabase auth.users';
COMMENT ON TABLE cases IS 'Main table for case bookings';
COMMENT ON TABLE case_status_history IS 'Tracks all status changes for cases';
COMMENT ON TABLE amendment_history IS 'Tracks all amendments made to cases';
COMMENT ON TABLE code_tables IS 'Generic lookup tables for dynamic configuration';
COMMENT ON TABLE audit_logs IS 'System audit trail for all important actions';
COMMENT ON TABLE notifications IS 'User notifications';
COMMENT ON TABLE attachments IS 'File attachments linked to cases or status updates';

-- End of schema