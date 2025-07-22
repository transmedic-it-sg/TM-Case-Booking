# SQL Scripts for Transmedic Case Booking System

This directory contains SQL scripts that need to be executed in your Supabase database to ensure all features work properly.

## Scripts Overview

### CREATE_SYSTEM_SETTINGS_TABLE.sql
**Required for: System Settings functionality**

This script creates the `system_settings` table that stores application configuration such as:
- Application settings (name, version, maintenance mode)
- Performance settings (cache timeout, session timeout)
- Security settings (password complexity, 2FA)
- Amendment settings (time limits, max amendments)
- Notification and UI preferences

**How to run:**
1. Open your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `CREATE_SYSTEM_SETTINGS_TABLE.sql`
4. Click "Run" to execute the script

**What it does:**
- Creates the `system_settings` table with proper constraints
- Sets up Row Level Security (RLS) policies
- Inserts default configuration values
- Creates necessary indexes for performance

### Other SQL Scripts
The other SQL files (AMENDMENT_HISTORY_RLS_FIX.sql, etc.) are maintenance scripts that fix specific database issues related to Row Level Security policies and amendment history functionality.

## Troubleshooting

### System Settings Not Loading
If you see "Configuration Not Available" in the System Settings page:
1. Check if the `system_settings` table exists in your database
2. Run the `CREATE_SYSTEM_SETTINGS_TABLE.sql` script
3. Ensure your user has proper permissions (admin role required)

### Amendment History Issues
If case amendments are not saving properly:
1. Run the latest `AMENDMENT_HISTORY_RLS_FIX` script
2. Check the RLS policies on the `amendment_history` table

## Security Notes

- All tables use Row Level Security (RLS) to ensure data isolation
- Only authenticated users can access system settings
- Only admin users can modify system configuration
- Regular users can only see settings relevant to their role

## Need Help?

If you encounter issues with any of these scripts:
1. Check the Supabase logs for error messages
2. Ensure you're running the scripts as a user with sufficient privileges
3. Contact your database administrator if permission errors persist