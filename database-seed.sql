-- TM Case Booking System - Initial Data Seeding
-- This script populates the database with initial reference data

-- =============================================================================
-- SEED COUNTRIES
-- =============================================================================

INSERT INTO countries (code, name) VALUES
('SG', 'Singapore'),
('MY', 'Malaysia'),
('PH', 'Philippines'),
('ID', 'Indonesia'),
('VN', 'Vietnam'),
('HK', 'Hong Kong'),
('TH', 'Thailand');

-- =============================================================================
-- SEED ROLES
-- =============================================================================

INSERT INTO roles (name, display_name, description, color) VALUES
('admin', 'Administrator', 'Full system access and configuration', '#ff0000'),
('operations', 'Operations', 'Case processing and management', '#00ff00'),
('operations-manager', 'Operations Manager', 'Operations team supervision', '#0080ff'),
('sales', 'Sales', 'Case submission and client interaction', '#ff8000'),
('sales-manager', 'Sales Manager', 'Sales team supervision', '#ff4080'),
('driver', 'Driver', 'Delivery confirmation and logistics', '#8000ff'),
('it', 'IT Support', 'Technical support and maintenance', '#008080');

-- =============================================================================
-- SEED PERMISSION ACTIONS
-- =============================================================================

INSERT INTO permission_actions (action_id, name, description, category) VALUES
-- Case Management
('create_case', 'Create Case', 'Create new case bookings', 'Case Management'),
('edit_case', 'Edit Case', 'Modify case details', 'Case Management'),
('delete_case', 'Delete Case', 'Remove cases from system', 'Case Management'),
('view_all_cases', 'View All Cases', 'Access to all cases across countries', 'Case Management'),
('view_own_cases', 'View Own Cases', 'Access to own submitted cases only', 'Case Management'),
('amend_case', 'Amend Case', 'Make amendments to existing cases', 'Case Management'),
('view_amendment_history', 'View Amendment History', 'View case amendment logs', 'Case Management'),

-- Status Transitions
('update_to_pending', 'Update to Pending', 'Change status to pending', 'Status Transitions'),
('update_to_confirmed', 'Update to Confirmed', 'Change status to confirmed', 'Status Transitions'),
('update_to_order_placed', 'Update to Order Placed', 'Change status to order placed', 'Status Transitions'),
('update_to_order_processed', 'Update to Order Processed', 'Change status to order processed', 'Status Transitions'),
('update_to_ready_for_delivery', 'Update to Ready for Delivery', 'Change status to ready for delivery', 'Status Transitions'),
('update_to_out_for_delivery', 'Update to Out for Delivery', 'Change status to out for delivery', 'Status Transitions'),
('update_to_delivered', 'Update to Delivered', 'Change status to delivered', 'Status Transitions'),
('update_to_order_received', 'Update to Order Received', 'Change status to order received', 'Status Transitions'),
('update_to_completed', 'Update to Completed', 'Change status to completed', 'Status Transitions'),
('update_to_to_be_billed', 'Update to To Be Billed', 'Change status to to be billed', 'Status Transitions'),
('update_to_cancelled', 'Update to Cancelled', 'Change status to cancelled', 'Status Transitions'),
('update_to_on_hold', 'Update to On Hold', 'Change status to on hold', 'Status Transitions'),

-- Data Operations
('export_data', 'Export Data', 'Export cases and reports', 'Data Operations'),
('import_data', 'Import Data', 'Import data from external sources', 'Data Operations'),
('bulk_operations', 'Bulk Operations', 'Perform bulk actions on multiple cases', 'Data Operations'),

-- User Management
('create_user', 'Create User', 'Add new users to system', 'User Management'),
('edit_user', 'Edit User', 'Modify user accounts and permissions', 'User Management'),
('delete_user', 'Delete User', 'Remove users from system', 'User Management'),
('view_users', 'View Users', 'Access user management interface', 'User Management'),
('manage_permissions', 'Manage Permissions', 'Configure role permissions', 'User Management'),

-- System Settings
('access_settings', 'Access Settings', 'Access system configuration', 'System Settings'),
('manage_email_settings', 'Manage Email Settings', 'Configure email notifications', 'System Settings'),
('manage_notification_rules', 'Manage Notification Rules', 'Configure notification settings', 'System Settings'),
('view_audit_logs', 'View Audit Logs', 'Access system audit trail', 'System Settings'),

-- Code Table Management
('manage_hospitals', 'Manage Hospitals', 'Add/edit hospital listings', 'Code Table Management'),
('manage_departments', 'Manage Departments', 'Add/edit department listings', 'Code Table Management'),
('manage_procedure_types', 'Manage Procedure Types', 'Add/edit procedure types', 'Code Table Management'),
('manage_surgery_sets', 'Manage Surgery Sets', 'Add/edit surgery set configurations', 'Code Table Management'),
('manage_implant_boxes', 'Manage Implant Boxes', 'Add/edit implant box configurations', 'Code Table Management'),

-- File Operations
('upload_attachments', 'Upload Attachments', 'Attach files to cases', 'File Operations'),
('download_attachments', 'Download Attachments', 'Download case attachments', 'File Operations'),
('delete_attachments', 'Delete Attachments', 'Remove file attachments', 'File Operations');

-- =============================================================================
-- SEED CASE STATUSES
-- =============================================================================

INSERT INTO case_statuses (status_key, display_name, description, color, icon, sort_order) VALUES
('pending', 'Pending', 'Case submitted and awaiting confirmation', '#ffa500', 'clock', 1),
('confirmed', 'Confirmed', 'Case confirmed by operations team', '#0080ff', 'check', 2),
('order-placed', 'Order Placed', 'Order placed with suppliers', '#8000ff', 'shopping-cart', 3),
('order-processed', 'Order Processed', 'Order processed and prepared', '#ff4080', 'package', 4),
('ready-for-delivery', 'Ready for Delivery', 'Items ready for delivery', '#00ff80', 'truck-loading', 5),
('out-for-delivery', 'Out for Delivery', 'Items currently being delivered', '#ff8000', 'truck', 6),
('delivered', 'Delivered', 'Items delivered to hospital', '#4080ff', 'check-circle', 7),
('order-received', 'Order Received', 'Hospital confirmed receiving items', '#8080ff', 'clipboard-check', 8),
('completed', 'Completed', 'Case successfully completed', '#00ff00', 'check-double', 9),
('to-be-billed', 'To Be Billed', 'Case ready for billing', '#ffff00', 'dollar-sign', 10),
('cancelled', 'Cancelled', 'Case cancelled', '#ff0000', 'times', 11),
('on-hold', 'On Hold', 'Case temporarily on hold', '#808080', 'pause', 12);

-- =============================================================================
-- SEED DEPARTMENTS
-- =============================================================================

DO $$
DECLARE
    country_rec RECORD;
    dept_names TEXT[] := ARRAY['Cardiology', 'Orthopedics', 'Neurosurgery', 'Oncology', 'Emergency', 'Radiology', 'General Surgery', 'Pediatrics'];
    dept_name TEXT;
BEGIN
    -- Insert departments for each country
    FOR country_rec IN SELECT id FROM countries LOOP
        FOREACH dept_name IN ARRAY dept_names LOOP
            INSERT INTO departments (name, country_id) VALUES (dept_name, country_rec.id);
        END LOOP;
    END LOOP;
END $$;

-- =============================================================================
-- SEED PROCEDURE TYPES
-- =============================================================================

DO $$
DECLARE
    country_rec RECORD;
    proc_types TEXT[] := ARRAY['Knee', 'Head', 'Hip', 'Hands', 'Neck', 'Spine'];
    proc_type TEXT;
BEGIN
    -- Insert procedure types for each country
    FOR country_rec IN SELECT id FROM countries LOOP
        FOREACH proc_type IN ARRAY proc_types LOOP
            INSERT INTO procedure_types (name, country_id) VALUES (proc_type, country_rec.id);
        END LOOP;
    END LOOP;
END $$;

-- =============================================================================
-- SEED SURGERY SETS
-- =============================================================================

DO $$
DECLARE
    country_rec RECORD;
    surgery_sets_data TEXT[] := ARRAY[
        'Comprehensive Spine Fusion Set',
        'Advanced Joint Replacement Kit',
        'Precision Sports Medicine Collection',
        'Complete Trauma Surgery Package',
        'Specialized Minimally Invasive Set',
        'Elite Orthopedic Reconstruction Kit',
        'Premium Surgical Navigation Tools'
    ];
    set_name TEXT;
BEGIN
    -- Insert surgery sets for each country
    FOR country_rec IN SELECT id FROM countries LOOP
        FOREACH set_name IN ARRAY surgery_sets_data LOOP
            INSERT INTO surgery_sets (name, country_id) VALUES (set_name, country_rec.id);
        END LOOP;
    END LOOP;
END $$;

-- =============================================================================
-- SEED IMPLANT BOXES
-- =============================================================================

DO $$
DECLARE
    country_rec RECORD;
    implant_boxes_data TEXT[] := ARRAY[
        'Spinal Implant Collection Box',
        'Joint Replacement Implant Set',
        'Sports Medicine Implant Kit',
        'Trauma Implant System Box',
        'Minimally Invasive Implant Set',
        'Reconstruction Implant Package',
        'Specialized Implant Collection'
    ];
    box_name TEXT;
BEGIN
    -- Insert implant boxes for each country
    FOR country_rec IN SELECT id FROM countries LOOP
        FOREACH box_name IN ARRAY implant_boxes_data LOOP
            INSERT INTO implant_boxes (name, country_id) VALUES (box_name, country_rec.id);
        END LOOP;
    END LOOP;
END $$;

-- =============================================================================
-- SEED PROCEDURE MAPPINGS
-- =============================================================================

DO $$
DECLARE
    country_rec RECORD;
    proc_spine_id UUID;
    proc_knee_id UUID;
    proc_hip_id UUID;
    set_spine_id UUID;
    set_joint_id UUID;
    set_sports_id UUID;
    box_spine_id UUID;
    box_joint_id UUID;
    box_sports_id UUID;
BEGIN
    FOR country_rec IN SELECT id FROM countries LOOP
        -- Get procedure type IDs
        SELECT id INTO proc_spine_id FROM procedure_types WHERE name = 'Spine' AND country_id = country_rec.id;
        SELECT id INTO proc_knee_id FROM procedure_types WHERE name = 'Knee' AND country_id = country_rec.id;
        SELECT id INTO proc_hip_id FROM procedure_types WHERE name = 'Hip' AND country_id = country_rec.id;
        
        -- Get surgery set IDs
        SELECT id INTO set_spine_id FROM surgery_sets WHERE name = 'Comprehensive Spine Fusion Set' AND country_id = country_rec.id;
        SELECT id INTO set_joint_id FROM surgery_sets WHERE name = 'Advanced Joint Replacement Kit' AND country_id = country_rec.id;
        SELECT id INTO set_sports_id FROM surgery_sets WHERE name = 'Precision Sports Medicine Collection' AND country_id = country_rec.id;
        
        -- Get implant box IDs
        SELECT id INTO box_spine_id FROM implant_boxes WHERE name = 'Spinal Implant Collection Box' AND country_id = country_rec.id;
        SELECT id INTO box_joint_id FROM implant_boxes WHERE name = 'Joint Replacement Implant Set' AND country_id = country_rec.id;
        SELECT id INTO box_sports_id FROM implant_boxes WHERE name = 'Sports Medicine Implant Kit' AND country_id = country_rec.id;
        
        -- Create mappings
        IF proc_spine_id IS NOT NULL AND set_spine_id IS NOT NULL AND box_spine_id IS NOT NULL THEN
            INSERT INTO procedure_mappings (procedure_type_id, surgery_set_id, implant_box_id, country_id)
            VALUES (proc_spine_id, set_spine_id, box_spine_id, country_rec.id);
        END IF;
        
        IF proc_knee_id IS NOT NULL AND set_joint_id IS NOT NULL AND box_joint_id IS NOT NULL THEN
            INSERT INTO procedure_mappings (procedure_type_id, surgery_set_id, implant_box_id, country_id)
            VALUES (proc_knee_id, set_joint_id, box_joint_id, country_rec.id);
        END IF;
        
        IF proc_hip_id IS NOT NULL AND set_sports_id IS NOT NULL AND box_sports_id IS NOT NULL THEN
            INSERT INTO procedure_mappings (procedure_type_id, surgery_set_id, implant_box_id, country_id)
            VALUES (proc_hip_id, set_sports_id, box_sports_id, country_rec.id);
        END IF;
    END LOOP;
END $$;

-- =============================================================================
-- SEED BASIC PERMISSIONS (Admin gets all permissions)
-- =============================================================================

DO $$
DECLARE
    admin_role_id UUID;
    action_rec RECORD;
BEGIN
    -- Get admin role ID
    SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
    
    -- Grant all permissions to admin
    FOR action_rec IN SELECT id FROM permission_actions LOOP
        INSERT INTO permissions (role_id, action_id, allowed)
        VALUES (admin_role_id, action_rec.id, true);
    END LOOP;
END $$;

-- =============================================================================
-- SEED SYSTEM SETTINGS
-- =============================================================================

INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('file_upload_max_size', '10485760', 'Maximum file upload size in bytes (10MB)'),
('file_upload_max_files', '5', 'Maximum number of files per upload'),
('case_reference_prefix', '"TM"', 'Prefix for case reference numbers'),
('notification_sound_enabled', 'true', 'Enable notification sounds by default'),
('auto_save_drafts', 'true', 'Enable automatic draft saving'),
('session_timeout_minutes', '60', 'User session timeout in minutes');

-- =============================================================================
-- SEED SAMPLE HOSPITALS (for Singapore as example)
-- =============================================================================

DO $$
DECLARE
    sg_country_id UUID;
    cardio_dept_id UUID;
    ortho_dept_id UUID;
BEGIN
    -- Get Singapore country ID
    SELECT id INTO sg_country_id FROM countries WHERE code = 'SG';
    
    -- Get department IDs
    SELECT id INTO cardio_dept_id FROM departments WHERE name = 'Cardiology' AND country_id = sg_country_id;
    SELECT id INTO ortho_dept_id FROM departments WHERE name = 'Orthopedics' AND country_id = sg_country_id;
    
    -- Insert sample hospitals
    INSERT INTO hospitals (name, country_id, department_id) VALUES
    ('Singapore General Hospital', sg_country_id, cardio_dept_id),
    ('National University Hospital', sg_country_id, ortho_dept_id),
    ('Tan Tock Seng Hospital', sg_country_id, cardio_dept_id),
    ('Changi General Hospital', sg_country_id, ortho_dept_id),
    ('Khoo Teck Puat Hospital', sg_country_id, cardio_dept_id);
END $$;

-- =============================================================================
-- SEED NOTIFICATION RULES (Basic email notifications)
-- =============================================================================

DO $$
DECLARE
    country_rec RECORD;
    status_rec RECORD;
BEGIN
    FOR country_rec IN SELECT id FROM countries LOOP
        FOR status_rec IN SELECT status_key FROM case_statuses WHERE status_key IN ('confirmed', 'delivered', 'completed') LOOP
            INSERT INTO notification_rules (country_id, status_key, enabled, recipients, email_template) VALUES
            (country_rec.id, status_rec.status_key, true, 
             '{"roles": ["operations", "sales"], "specificEmails": [], "includeSubmitter": true, "departmentFilter": [], "requireSameDepartment": false}',
             '{"subject": "Case Status Update: {{caseReferenceNumber}}", "body": "Dear Team,\n\nCase {{caseReferenceNumber}} has been updated to {{status}}.\n\nBest regards,\nTM Case Booking System"}');
        END LOOP;
    END LOOP;
END $$;

-- =============================================================================
-- CREATE STORAGE BUCKETS (Supabase Storage)
-- =============================================================================

-- Note: These commands need to be run in Supabase dashboard or using the API
-- Included here for reference

/*
-- Create storage bucket for case attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('case-attachments', 'case-attachments', false);

-- Create storage policy for case attachments
CREATE POLICY "Authenticated users can upload case attachments" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'case-attachments');

CREATE POLICY "Authenticated users can view case attachments" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'case-attachments');

CREATE POLICY "Users can delete own attachments" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'case-attachments');
*/

-- End of seed data