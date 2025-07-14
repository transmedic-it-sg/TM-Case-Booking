# CSV Export/Import Migration Guide (Free Tier)

## 📊 Method 3: CSV Export/Import

### Step 1: Export from Production (SQL Editor)

Go to Production Supabase SQL Editor and run these queries:

#### Export Users as CSV
```sql
COPY (SELECT * FROM users) TO STDOUT WITH CSV HEADER;
```

#### Export Cases as CSV  
```sql
COPY (SELECT * FROM cases) TO STDOUT WITH CSV HEADER;
```

#### Export Code Tables as CSV
```sql
COPY (SELECT * FROM code_tables) TO STDOUT WITH CSV HEADER;
```

#### Export Permissions as CSV (if exists)
```sql
COPY (SELECT * FROM permissions) TO STDOUT WITH CSV HEADER;
```

### Step 2: Save Results as CSV Files
1. Copy each query result
2. Save as separate files:
   - `users.csv`
   - `cases.csv` 
   - `code_tables.csv`
   - `permissions.csv`

### Step 3: Convert CSV to SQL Inserts

Use this online tool or create INSERT statements:
- https://www.convertcsv.com/csv-to-sql.htm
- Select "INSERT" statements
- Set table names correctly

### Step 4: Import to UAT

Go to UAT Supabase SQL Editor and run the INSERT statements.

## 🚀 Automated CSV to SQL Converter

```javascript
// Paste this in browser console to convert CSV to SQL
function csvToInsertStatements(csvText, tableName) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    const inserts = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => {
            v = v.replace(/"/g, '');
            return v === '' || v === 'NULL' ? 'NULL' : `'${v.replace(/'/g, "''")}'`;
        });
        
        inserts.push(`INSERT INTO ${tableName} (${headers.join(', ')}) VALUES (${values.join(', ')});`);
    }
    
    return inserts.join('\n');
}

// Usage:
// const userInserts = csvToInsertStatements(usersCsvText, 'users');
// console.log(userInserts);
```

## ✅ Verification Queries

Run these in UAT after import:

```sql
-- Check record counts
SELECT 'users' as table_name, count(*) as records FROM users
UNION ALL
SELECT 'cases' as table_name, count(*) as records FROM cases  
UNION ALL
SELECT 'code_tables' as table_name, count(*) as records FROM code_tables;

-- Verify sample data
SELECT * FROM users LIMIT 3;
SELECT * FROM cases LIMIT 3;
SELECT * FROM code_tables LIMIT 5;
```