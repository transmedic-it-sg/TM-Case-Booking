-- Free Tier Database Migration: Production to UAT
-- Run these queries in your Production Supabase SQL Editor first

-- ===================================================================
-- STEP 1: EXPORT DATA FROM PRODUCTION (Copy results manually)
-- ===================================================================

-- 1. Export Users Table
SELECT 
    'INSERT INTO users (id, username, password, role, name, departments, countries, email, enabled, selected_country, password_reset_required, created_at, updated_at) VALUES (' ||
    '''' || id || ''', ' ||
    '''' || REPLACE(username, '''', '''''') || ''', ' ||
    '''' || REPLACE(password, '''', '''''') || ''', ' ||
    '''' || role || ''', ' ||
    '''' || REPLACE(name, '''', '''''') || ''', ' ||
    '''' || REPLACE(departments::text, '''', '''''') || ''', ' ||
    '''' || REPLACE(countries::text, '''', '''''') || ''', ' ||
    COALESCE('''' || REPLACE(email, '''', '''''') || '''', 'NULL') || ', ' ||
    enabled || ', ' ||
    COALESCE('''' || selected_country || '''', 'NULL') || ', ' ||
    COALESCE(password_reset_required::text, 'false') || ', ' ||
    '''' || created_at || ''', ' ||
    '''' || updated_at || ''');'
FROM users;

-- 2. Export Cases Table
SELECT 
    'INSERT INTO cases (id, case_reference_number, hospital, department, date_of_surgery, procedure_type, procedure_name, doctor_name, time_of_procedure, surgery_set_selection, implant_box, special_instruction, status, submitted_by, submitted_at, processed_by, processed_at, process_order_details, country, status_history, is_amended, amended_by, amended_at, created_at, updated_at) VALUES (' ||
    '''' || id || ''', ' ||
    '''' || REPLACE(case_reference_number, '''', '''''') || ''', ' ||
    '''' || REPLACE(hospital, '''', '''''') || ''', ' ||
    '''' || REPLACE(department, '''', '''''') || ''', ' ||
    '''' || date_of_surgery || ''', ' ||
    '''' || REPLACE(procedure_type, '''', '''''') || ''', ' ||
    '''' || REPLACE(procedure_name, '''', '''''') || ''', ' ||
    COALESCE('''' || REPLACE(doctor_name, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || time_of_procedure || '''', 'NULL') || ', ' ||
    '''' || REPLACE(surgery_set_selection::text, '''', '''''') || ''', ' ||
    '''' || REPLACE(implant_box::text, '''', '''''') || ''', ' ||
    COALESCE('''' || REPLACE(special_instruction, '''', '''''') || '''', 'NULL') || ', ' ||
    '''' || status || ''', ' ||
    '''' || REPLACE(submitted_by, '''', '''''') || ''', ' ||
    '''' || submitted_at || ''', ' ||
    COALESCE('''' || REPLACE(processed_by, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || processed_at || '''', 'NULL') || ', ' ||
    COALESCE('''' || REPLACE(process_order_details, '''', '''''') || '''', 'NULL') || ', ' ||
    '''' || country || ''', ' ||
    '''' || REPLACE(status_history::text, '''', '''''') || ''', ' ||
    COALESCE(is_amended::text, 'false') || ', ' ||
    COALESCE('''' || REPLACE(amended_by, '''', '''''') || '''', 'NULL') || ', ' ||
    COALESCE('''' || amended_at || '''', 'NULL') || ', ' ||
    '''' || created_at || ''', ' ||
    '''' || updated_at || ''');'
FROM cases;

-- 3. Export Code Tables
SELECT 
    'INSERT INTO code_tables (id, table_id, item_value, country_code, created_at, updated_at) VALUES (' ||
    '''' || id || ''', ' ||
    '''' || REPLACE(table_id, '''', '''''') || ''', ' ||
    '''' || REPLACE(item_value, '''', '''''') || ''', ' ||
    COALESCE('''' || country_code || '''', 'NULL') || ', ' ||
    '''' || created_at || ''', ' ||
    '''' || updated_at || ''');'
FROM code_tables;

-- 4. Export Permissions (if you have this table)
SELECT 
    'INSERT INTO permissions (id, role, permission_action, granted, created_at, updated_at) VALUES (' ||
    '''' || id || ''', ' ||
    '''' || role || ''', ' ||
    '''' || permission_action || ''', ' ||
    granted || ', ' ||
    '''' || created_at || ''', ' ||
    '''' || updated_at || ''');'
FROM permissions;

-- ===================================================================
-- STEP 2: SCHEMA SETUP FOR UAT (Run in UAT Supabase SQL Editor)
-- ===================================================================

-- First, ensure your UAT database has the same schema
-- Copy the table creation scripts from your Production database

-- Check existing tables in UAT
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';

-- ===================================================================
-- STEP 3: INSERT DATA INTO UAT
-- ===================================================================
-- Copy the INSERT statements generated from STEP 1 and run them in UAT