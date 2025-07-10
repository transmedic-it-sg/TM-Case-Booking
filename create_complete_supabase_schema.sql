-- Complete Supabase Schema for Case Booking Application
-- This replaces all localStorage usage with proper database tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ==============================================
-- 1. USER MANAGEMENT TABLES
-- ==============================================

-- Users table (replaces case-booking-users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'operations', 'operations-manager', 'sales', 'sales-manager', 'driver', 'it')),
    name VARCHAR(100) NOT NULL,
    departments TEXT[] DEFAULT '{}',
    countries TEXT[] DEFAULT '{}',
    selected_country VARCHAR(3),
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User sessions table (replaces case-booking-session)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom roles table (replaces case-booking-custom-roles)
CREATE TABLE IF NOT EXISTS custom_roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    color VARCHAR(7) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 2. CASE MANAGEMENT TABLES
-- ==============================================

-- Cases table (replaces case-booking-cases)
CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_reference_number VARCHAR(50) UNIQUE NOT NULL,
    hospital VARCHAR(200) NOT NULL,
    department VARCHAR(100) NOT NULL,
    date_of_surgery DATE NOT NULL,
    procedure_type VARCHAR(100) NOT NULL,
    procedure_name VARCHAR(200) NOT NULL,
    doctor_name VARCHAR(100),
    time_of_procedure TIME,
    surgery_set_selection TEXT[] DEFAULT '{}',
    implant_box TEXT[] DEFAULT '{}',
    special_instruction TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Case Booked',
    submitted_by UUID REFERENCES users(id),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    process_order_details TEXT,
    country VARCHAR(3) NOT NULL,
    is_amended BOOLEAN DEFAULT false,
    amended_by UUID REFERENCES users(id),
    amended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Case status history table (replaces statusHistory in localStorage)
CREATE TABLE IF NOT EXISTS case_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    details TEXT,
    attachments TEXT[]
);

-- Case counter table (replaces case-booking-counter)
CREATE TABLE IF NOT EXISTS case_counters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country VARCHAR(3) NOT NULL,
    current_counter INTEGER DEFAULT 0,
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(country, year)
);

-- ==============================================
-- 3. NOTIFICATION SYSTEM TABLES
-- ==============================================

-- Notifications table (replaces case-booking-notifications)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    read BOOLEAN DEFAULT false,
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification preferences table (replaces notificationPreferences_userId)
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    case_booked BOOLEAN DEFAULT true,
    order_preparation BOOLEAN DEFAULT true,
    order_prepared BOOLEAN DEFAULT true,
    pending_delivery_hospital BOOLEAN DEFAULT true,
    delivered_hospital BOOLEAN DEFAULT true,
    case_completed BOOLEAN DEFAULT true,
    pending_delivery_office BOOLEAN DEFAULT true,
    delivered_office BOOLEAN DEFAULT true,
    to_be_billed BOOLEAN DEFAULT true,
    case_closed BOOLEAN DEFAULT true,
    case_cancelled BOOLEAN DEFAULT true,
    browser_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ==============================================
-- 4. CODE TABLES & CONFIGURATION
-- ==============================================

-- Code tables (replaces codeTables and codeTables-${country})
CREATE TABLE IF NOT EXISTS code_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country VARCHAR(3) NOT NULL,
    table_type VARCHAR(50) NOT NULL, -- 'hospitals', 'departments', 'countries'
    code VARCHAR(100) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(country, table_type, code)
);

-- Categorized sets (replaces categorized-sets and categorized-sets-${country})
CREATE TABLE IF NOT EXISTS categorized_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country VARCHAR(3) NOT NULL,
    procedure_type VARCHAR(100) NOT NULL,
    surgery_sets TEXT[] DEFAULT '{}',
    implant_boxes TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(country, procedure_type)
);

-- Custom procedure types (replaces custom_procedure_types_${country})
CREATE TABLE IF NOT EXISTS custom_procedure_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country VARCHAR(3) NOT NULL,
    procedure_type VARCHAR(100) NOT NULL,
    is_hidden BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(country, procedure_type)
);

-- ==============================================
-- 5. EMAIL CONFIGURATION TABLES
-- ==============================================

-- Email configurations (replaces simplified_email_configs)
CREATE TABLE IF NOT EXISTS email_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country VARCHAR(3) NOT NULL,
    provider VARCHAR(50) NOT NULL, -- 'gmail', 'outlook'
    user_email VARCHAR(200) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    user_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(country, provider)
);

-- Email notification matrix (replaces email-matrix-configs-by-country)
CREATE TABLE IF NOT EXISTS email_notification_matrix (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country VARCHAR(3) NOT NULL,
    status VARCHAR(50) NOT NULL,
    departments TEXT[] DEFAULT '{}',
    notification_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(country, status)
);

-- ==============================================
-- 6. SYSTEM SETTINGS TABLES
-- ==============================================

-- Application settings (replaces app-settings and various settings)
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, setting_key)
);

-- System-wide settings (replaces global settings)
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 7. PERMISSIONS (already created, but including for completeness)
-- ==============================================

-- Note: permissions table already exists from previous work

-- ==============================================
-- 8. INDEXES FOR PERFORMANCE
-- ==============================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_enabled ON users(enabled);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);

-- Case indexes
CREATE INDEX IF NOT EXISTS idx_cases_reference_number ON cases(case_reference_number);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_country ON cases(country);
CREATE INDEX IF NOT EXISTS idx_cases_submitted_by ON cases(submitted_by);
CREATE INDEX IF NOT EXISTS idx_cases_date_of_surgery ON cases(date_of_surgery);
CREATE INDEX IF NOT EXISTS idx_case_status_history_case_id ON case_status_history(case_id);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_case_id ON notifications(case_id);

-- Code table indexes
CREATE INDEX IF NOT EXISTS idx_code_tables_country ON code_tables(country);
CREATE INDEX IF NOT EXISTS idx_code_tables_type ON code_tables(table_type);
CREATE INDEX IF NOT EXISTS idx_categorized_sets_country ON categorized_sets(country);

-- Email configuration indexes
CREATE INDEX IF NOT EXISTS idx_email_config_country ON email_configurations(country);
CREATE INDEX IF NOT EXISTS idx_email_matrix_country ON email_notification_matrix(country);

-- Settings indexes
CREATE INDEX IF NOT EXISTS idx_app_settings_user_id ON app_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(setting_key);

-- ==============================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ==============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorized_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_procedure_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_notification_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 10. TRIGGERS FOR UPDATED_AT
-- ==============================================

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at
    BEFORE UPDATE ON cases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_code_tables_updated_at
    BEFORE UPDATE ON code_tables
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categorized_sets_updated_at
    BEFORE UPDATE ON categorized_sets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_procedure_types_updated_at
    BEFORE UPDATE ON custom_procedure_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_configurations_updated_at
    BEFORE UPDATE ON email_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_notification_matrix_updated_at
    BEFORE UPDATE ON email_notification_matrix
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_roles_updated_at
    BEFORE UPDATE ON custom_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- 11. INSERT DEFAULT DATA
-- ==============================================

-- Insert default admin user (password should be hashed in production)
INSERT INTO users (username, password, role, name, departments, countries, enabled) 
VALUES ('admin', 'admin123', 'admin', 'System Administrator', '{}', '{}', true)
ON CONFLICT (username) DO NOTHING;

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value) VALUES
('sound_enabled', 'true'),
('notification_sound_volume', '0.5'),
('email_notifications_enabled', 'true')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert default countries
INSERT INTO code_tables (country, table_type, code, display_name) VALUES
('SG', 'countries', 'SG', 'Singapore'),
('MY', 'countries', 'MY', 'Malaysia'),
('PH', 'countries', 'PH', 'Philippines'),
('ID', 'countries', 'ID', 'Indonesia'),
('VN', 'countries', 'VN', 'Vietnam'),
('HK', 'countries', 'HK', 'Hong Kong'),
('TH', 'countries', 'TH', 'Thailand')
ON CONFLICT (country, table_type, code) DO NOTHING;

-- Insert default departments
INSERT INTO code_tables (country, table_type, code, display_name) VALUES
('SG', 'departments', 'cardiology', 'Cardiology'),
('SG', 'departments', 'orthopedics', 'Orthopedics'),
('SG', 'departments', 'neurosurgery', 'Neurosurgery'),
('SG', 'departments', 'general_surgery', 'General Surgery'),
('SG', 'departments', 'oncology', 'Oncology')
ON CONFLICT (country, table_type, code) DO NOTHING;

-- Initialize case counters for current year
INSERT INTO case_counters (country, current_counter, year) VALUES
('SG', 0, EXTRACT(YEAR FROM NOW())),
('MY', 0, EXTRACT(YEAR FROM NOW())),
('PH', 0, EXTRACT(YEAR FROM NOW())),
('ID', 0, EXTRACT(YEAR FROM NOW())),
('VN', 0, EXTRACT(YEAR FROM NOW())),
('HK', 0, EXTRACT(YEAR FROM NOW())),
('TH', 0, EXTRACT(YEAR FROM NOW()))
ON CONFLICT (country, year) DO NOTHING;

-- ==============================================
-- 12. COMMENTS FOR DOCUMENTATION
-- ==============================================

COMMENT ON TABLE users IS 'User accounts and authentication data (replaces case-booking-users)';
COMMENT ON TABLE user_sessions IS 'Active user sessions (replaces case-booking-session)';
COMMENT ON TABLE cases IS 'Medical case bookings (replaces case-booking-cases)';
COMMENT ON TABLE case_status_history IS 'Audit trail for case status changes';
COMMENT ON TABLE notifications IS 'User notifications (replaces case-booking-notifications)';
COMMENT ON TABLE code_tables IS 'Configuration data for hospitals, departments, countries';
COMMENT ON TABLE categorized_sets IS 'Surgery sets and implant boxes by procedure type';
COMMENT ON TABLE email_configurations IS 'OAuth email provider settings by country';
COMMENT ON TABLE app_settings IS 'User-specific application settings';
COMMENT ON TABLE system_settings IS 'System-wide configuration settings';