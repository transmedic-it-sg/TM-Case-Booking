-- Supabase Database Schema for Case Booking Application
-- This schema supports multi-user authentication and cloud storage

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated;

-- Create custom types
CREATE TYPE case_status AS ENUM (
  'Case Booked',
  'Order Preparation', 
  'Order Prepared',
  'Pending Delivery (Hospital)',
  'Delivered (Hospital)',
  'Case Completed',
  'Pending Delivery (Office)',
  'Delivered (Office)',
  'To be billed',
  'Case Closed',
  'Case Cancelled'
);

CREATE TYPE user_role AS ENUM (
  'admin',
  'operations',
  'operations-manager',
  'sales',
  'sales-manager',
  'driver',
  'it'
);

CREATE TYPE notification_type AS ENUM (
  'success',
  'error', 
  'warning',
  'info'
);

-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'operations',
  departments TEXT[] DEFAULT '{}',
  countries TEXT[] DEFAULT '{}',
  selected_country TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Case bookings table
CREATE TABLE case_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_reference_number TEXT UNIQUE NOT NULL,
  hospital TEXT NOT NULL,
  department TEXT NOT NULL,
  date_of_surgery DATE NOT NULL,
  procedure_type TEXT NOT NULL,
  procedure_name TEXT NOT NULL,
  doctor_name TEXT,
  time_of_procedure TIME,
  surgery_set_selection TEXT[] DEFAULT '{}',
  implant_box TEXT[] DEFAULT '{}',
  special_instruction TEXT,
  status case_status DEFAULT 'Case Booked',
  submitted_by UUID REFERENCES profiles(id) NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  processed_by UUID REFERENCES profiles(id),
  processed_at TIMESTAMPTZ,
  process_order_details TEXT,
  country TEXT NOT NULL,
  amended_by UUID REFERENCES profiles(id),
  amended_at TIMESTAMPTZ,
  is_amended BOOLEAN DEFAULT false,
  delivery_image TEXT, -- Base64 encoded image
  delivery_details TEXT,
  attachments TEXT[], -- Array of base64 encoded files
  order_summary TEXT,
  do_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Status history table
CREATE TABLE status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES case_bookings(id) ON DELETE CASCADE,
  status case_status NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  processed_by UUID REFERENCES profiles(id) NOT NULL,
  details TEXT,
  attachments TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Amendment history table  
CREATE TABLE amendment_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID REFERENCES case_bookings(id) ON DELETE CASCADE,
  amended_by UUID REFERENCES profiles(id) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  changes JSONB NOT NULL, -- Array of {field, oldValue, newValue}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  duration INTEGER DEFAULT 5000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email configurations table (for email notification settings)
CREATE TABLE email_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  country TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'google' or 'microsoft'
  is_active BOOLEAN DEFAULT false,
  config JSONB NOT NULL, -- OAuth tokens and settings
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(country, provider)
);

-- Email notification matrix table
CREATE TABLE email_notification_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  country TEXT NOT NULL,
  status case_status NOT NULL,
  enabled BOOLEAN DEFAULT true,
  recipients JSONB NOT NULL, -- {roles: [], specificEmails: [], includeSubmitter: bool, etc.}
  template JSONB NOT NULL, -- {subject: '', body: ''}
  conditions JSONB DEFAULT '{}', -- Additional conditions
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(country, status)
);

-- Case reference counter table
CREATE TABLE case_counters (
  id SERIAL PRIMARY KEY,
  last_number INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize counter
INSERT INTO case_counters (last_number) VALUES (0);

-- Row Level Security Policies

-- Profiles: Users can view their own profile and admins can view all
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Case bookings: Users can see cases from their assigned countries
ALTER TABLE case_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cases from their countries" ON case_bookings
  FOR SELECT USING (
    country = ANY(
      SELECT unnest(countries) FROM profiles WHERE id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can create cases" ON case_bookings
  FOR INSERT WITH CHECK (
    country = ANY(
      SELECT unnest(countries) FROM profiles WHERE id = auth.uid()
    ) AND submitted_by = auth.uid()
  );

CREATE POLICY "Users can update cases from their countries" ON case_bookings
  FOR UPDATE USING (
    country = ANY(
      SELECT unnest(countries) FROM profiles WHERE id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Status history: Same as case bookings
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view status history" ON status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM case_bookings cb
      WHERE cb.id = case_id AND (
        cb.country = ANY(
          SELECT unnest(countries) FROM profiles WHERE id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Users can create status history" ON status_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM case_bookings cb
      WHERE cb.id = case_id AND (
        cb.country = ANY(
          SELECT unnest(countries) FROM profiles WHERE id = auth.uid()
        )
      )
    ) AND processed_by = auth.uid()
  );

-- Amendment history: Same as case bookings
ALTER TABLE amendment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view amendment history" ON amendment_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM case_bookings cb
      WHERE cb.id = case_id AND (
        cb.country = ANY(
          SELECT unnest(countries) FROM profiles WHERE id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Users can create amendment history" ON amendment_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM case_bookings cb
      WHERE cb.id = case_id AND (
        cb.country = ANY(
          SELECT unnest(countries) FROM profiles WHERE id = auth.uid()
        )
      )
    ) AND amended_by = auth.uid()
  );

-- Notifications: Users can only see their own notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create notifications" ON notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Email configs: Only admins can manage
ALTER TABLE email_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email configs" ON email_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Email notification rules: Only admins can manage
ALTER TABLE email_notification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notification rules" ON email_notification_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Case counters: Only system can access
ALTER TABLE case_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System access only for counters" ON case_counters
  FOR ALL USING (false); -- Will be accessed via functions only

-- Functions

-- Generate case reference number
CREATE OR REPLACE FUNCTION generate_case_reference()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
BEGIN
  UPDATE case_counters 
  SET last_number = last_number + 1, updated_at = NOW()
  WHERE id = 1
  RETURNING last_number INTO next_number;
  
  RETURN 'TMC' || LPAD(next_number::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_case_bookings_updated_at
  BEFORE UPDATE ON case_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_configs_updated_at
  BEFORE UPDATE ON email_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_notification_rules_updated_at
  BEFORE UPDATE ON email_notification_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate case reference number
CREATE OR REPLACE FUNCTION set_case_reference_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.case_reference_number IS NULL OR NEW.case_reference_number = '' THEN
    NEW.case_reference_number = generate_case_reference();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_case_reference_trigger
  BEFORE INSERT ON case_bookings
  FOR EACH ROW EXECUTE FUNCTION set_case_reference_number();

-- Auto-create status history entry
CREATE OR REPLACE FUNCTION create_initial_status_history()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO status_history (case_id, status, processed_by, details)
  VALUES (NEW.id, NEW.status, NEW.submitted_by, 'Case initially submitted');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_status_history_trigger
  AFTER INSERT ON case_bookings
  FOR EACH ROW EXECUTE FUNCTION create_initial_status_history();

-- Indexes for performance
CREATE INDEX idx_case_bookings_country ON case_bookings(country);
CREATE INDEX idx_case_bookings_status ON case_bookings(status);
CREATE INDEX idx_case_bookings_submitted_by ON case_bookings(submitted_by);
CREATE INDEX idx_case_bookings_date_surgery ON case_bookings(date_of_surgery);
CREATE INDEX idx_case_bookings_reference ON case_bookings(case_reference_number);
CREATE INDEX idx_status_history_case_id ON status_history(case_id);
CREATE INDEX idx_status_history_timestamp ON status_history(timestamp);
CREATE INDEX idx_amendment_history_case_id ON amendment_history(case_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_role ON profiles(role);