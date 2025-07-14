// Application-Level Data Export/Import for Free Tier Migration
// Run this in your browser console on the Production app

// ===================================================================
// STEP 1: EXPORT DATA FROM PRODUCTION APP
// ===================================================================

// Function to export all data from Production
async function exportProductionData() {
    console.log('🔄 Starting Production Data Export...');
    
    try {
        // Get all users (if accessible)
        const users = await window.supabase
            .from('users')
            .select('*')
            .order('created_at');
        
        // Get all cases
        const cases = await window.supabase
            .from('cases')
            .select('*')
            .order('created_at');
        
        // Get all code tables
        const codeTables = await window.supabase
            .from('code_tables')
            .select('*')
            .order('table_id, item_value');
        
        // Get permissions (if exists)
        const permissions = await window.supabase
            .from('permissions')
            .select('*')
            .order('role, permission_action');
        
        const exportData = {
            timestamp: new Date().toISOString(),
            users: users.data || [],
            cases: cases.data || [],
            code_tables: codeTables.data || [],
            permissions: permissions.data || [],
            stats: {
                users_count: users.data?.length || 0,
                cases_count: cases.data?.length || 0,
                code_tables_count: codeTables.data?.length || 0,
                permissions_count: permissions.data?.length || 0
            }
        };
        
        // Download as JSON file
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `production_data_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('✅ Production data exported successfully!');
        console.log('📊 Export Stats:', exportData.stats);
        
        return exportData;
        
    } catch (error) {
        console.error('❌ Export failed:', error);
        throw error;
    }
}

// Run the export
exportProductionData();

// ===================================================================
// STEP 2: IMPORT DATA TO UAT APP
// ===================================================================

// Function to import data to UAT (run this in UAT app console)
async function importToUAT(exportedData) {
    console.log('🔄 Starting UAT Data Import...');
    
    try {
        let results = {
            users: { success: 0, failed: 0 },
            cases: { success: 0, failed: 0 },
            code_tables: { success: 0, failed: 0 },
            permissions: { success: 0, failed: 0 }
        };
        
        // Import Users
        console.log('📥 Importing users...');
        for (const user of exportedData.users) {
            try {
                const { error } = await window.supabase
                    .from('users')
                    .insert(user);
                
                if (error) throw error;
                results.users.success++;
            } catch (error) {
                console.warn('Failed to import user:', user.username, error);
                results.users.failed++;
            }
        }
        
        // Import Cases
        console.log('📥 Importing cases...');
        for (const caseData of exportedData.cases) {
            try {
                const { error } = await window.supabase
                    .from('cases')
                    .insert(caseData);
                
                if (error) throw error;
                results.cases.success++;
            } catch (error) {
                console.warn('Failed to import case:', caseData.case_reference_number, error);
                results.cases.failed++;
            }
        }
        
        // Import Code Tables
        console.log('📥 Importing code tables...');
        for (const codeTable of exportedData.code_tables) {
            try {
                const { error } = await window.supabase
                    .from('code_tables')
                    .insert(codeTable);
                
                if (error) throw error;
                results.code_tables.success++;
            } catch (error) {
                console.warn('Failed to import code table:', codeTable.table_id, codeTable.item_value, error);
                results.code_tables.failed++;
            }
        }
        
        // Import Permissions
        console.log('📥 Importing permissions...');
        for (const permission of exportedData.permissions) {
            try {
                const { error } = await window.supabase
                    .from('permissions')
                    .insert(permission);
                
                if (error) throw error;
                results.permissions.success++;
            } catch (error) {
                console.warn('Failed to import permission:', permission.role, permission.permission_action, error);
                results.permissions.failed++;
            }
        }
        
        console.log('✅ Import completed!');
        console.log('📊 Import Results:', results);
        
        return results;
        
    } catch (error) {
        console.error('❌ Import failed:', error);
        throw error;
    }
}

// Instructions for UAT import:
console.log(`
🔧 To import data to UAT:
1. Save the downloaded JSON file
2. Open your UAT app: https://tm-case-booking-hssy6xw2c-an-rong-lows-projects.vercel.app
3. Open browser console (F12)
4. Load the JSON file and run:
   
   // First, load your exported data (replace with actual file content)
   const exportedData = { /* paste your exported JSON here */ };
   
   // Then run the import
   importToUAT(exportedData);
`);