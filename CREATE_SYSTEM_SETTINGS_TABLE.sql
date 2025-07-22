-- Create system_settings table for storing application configuration
CREATE TABLE IF NOT EXISTS public.system_settings (
    id integer NOT NULL DEFAULT 1,
    app_name text DEFAULT 'Transmedic Case Booking',
    app_version text DEFAULT '1.2.2',
    maintenance_mode boolean DEFAULT false,
    cache_timeout integer DEFAULT 300,
    max_file_size integer DEFAULT 10,
    session_timeout integer DEFAULT 3600,
    password_complexity boolean DEFAULT true,
    two_factor_auth boolean DEFAULT false,
    audit_log_retention integer DEFAULT 90,
    amendment_time_limit integer DEFAULT 1440,
    max_amendments_per_case integer DEFAULT 5,
    email_notifications boolean DEFAULT true,
    system_alerts boolean DEFAULT true,
    backup_frequency text DEFAULT 'daily' CHECK (backup_frequency IN ('daily', 'weekly', 'monthly')),
    auto_cleanup boolean DEFAULT true,
    default_theme text DEFAULT 'light' CHECK (default_theme IN ('light', 'dark', 'auto')),
    default_language text DEFAULT 'en',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT system_settings_pkey PRIMARY KEY (id),
    CONSTRAINT system_settings_single_row CHECK (id = 1)
);

-- Insert default configuration if not exists
INSERT INTO public.system_settings (id) 
VALUES (1) 
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read system settings
CREATE POLICY "Allow authenticated users to read system settings" ON public.system_settings
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy for admin users to update system settings
CREATE POLICY "Allow admin users to update system settings" ON public.system_settings
    FOR ALL USING (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.auth_id = auth.uid()::text 
            AND users.role = 'admin'
        )
    );

-- Grant permissions
GRANT SELECT ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_at ON public.system_settings(updated_at);

-- Add comments
COMMENT ON TABLE public.system_settings IS 'System configuration and settings';
COMMENT ON COLUMN public.system_settings.id IS 'Always 1 - single row table';
COMMENT ON COLUMN public.system_settings.amendment_time_limit IS 'Time limit in minutes for amendments';
COMMENT ON COLUMN public.system_settings.max_amendments_per_case IS 'Maximum number of amendments allowed per case';
COMMENT ON COLUMN public.system_settings.audit_log_retention IS 'Number of days to retain audit logs';