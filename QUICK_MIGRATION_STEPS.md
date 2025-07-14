# 🚀 Quick Migration Steps (Free Tier)

## Method 1: Browser Console Export (Recommended)

### Production Export (5 minutes)
1. Open https://tm-case-booking.vercel.app
2. Login as Admin
3. Press F12 → Console tab
4. Copy/paste this code:

```javascript
// Export all data
async function quickExport() {
    const users = await window.supabase.from('users').select('*');
    const cases = await window.supabase.from('cases').select('*');
    const codeTables = await window.supabase.from('code_tables').select('*');
    
    const data = {
        users: users.data || [],
        cases: cases.data || [],
        code_tables: codeTables.data || []
    };
    
    // Download JSON
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'production_export.json';
    a.click();
    
    console.log('✅ Exported:', data);
}

quickExport();
```

### UAT Import (5 minutes)
1. Open https://tm-case-booking-hssy6xw2c-an-rong-lows-projects.vercel.app
2. Login as Admin  
3. Press F12 → Console tab
4. Load your exported data and run:

```javascript
// Paste your exported JSON data here
const exportedData = { /* PASTE YOUR JSON HERE */ };

// Import function
async function quickImport(data) {
    console.log('Starting import...');
    
    // Import users
    for (const user of data.users) {
        await window.supabase.from('users').insert(user);
    }
    
    // Import cases
    for (const case_ of data.cases) {
        await window.supabase.from('cases').insert(case_);
    }
    
    // Import code tables
    for (const table of data.code_tables) {
        await window.supabase.from('code_tables').insert(table);
    }
    
    console.log('✅ Import completed!');
}

quickImport(exportedData);
```

## Method 2: SQL Editor (Alternative)

### From Production
1. Go to: https://supabase.com/dashboard/project/aqzjzjygflmxkcbfnjbe/sql
2. Run: `SELECT * FROM users;` → Copy results
3. Run: `SELECT * FROM cases;` → Copy results  
4. Run: `SELECT * FROM code_tables;` → Copy results

### To UAT
1. Go to: https://supabase.com/dashboard/project/rqcrsrdlcdpkxxkqwvyo/sql
2. Create INSERT statements from copied data
3. Execute INSERT statements

## ✅ Verify Migration

Run in UAT SQL Editor:
```sql
SELECT 
  'users' as table_name, 
  count(*) as count 
FROM users
UNION ALL
SELECT 
  'cases' as table_name, 
  count(*) as count 
FROM cases
UNION ALL  
SELECT 
  'code_tables' as table_name, 
  count(*) as count 
FROM code_tables;
```

## 🎯 Expected Results
- Users: Should match production count
- Cases: Should match production count  
- Code Tables: Should match production count

**Total Time: ~10-15 minutes**