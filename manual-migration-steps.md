# Manual Database Migration: Production to UAT

## 🎯 Quick Steps

### 1. Get Database Connection Details

**Production Database:**
- Project: `aqzjzjygflmxkcbfnjbe`
- URL: `https://supabase.com/dashboard/project/aqzjzjygflmxkcbfnjbe/settings/database`
- Connection String: `postgresql://postgres:[PASSWORD]@db.aqzjzjygflmxkcbfnjbe.supabase.co:5432/postgres`

**UAT Database:**
- Project: `rqcrsrdlcdpkxxkqwvyo`  
- URL: `https://supabase.com/dashboard/project/rqcrsrdlcdpkxxkqwvyo/settings/database`
- Connection String: `postgresql://postgres:[PASSWORD]@db.rqcrsrdlcdpkxxkqwvyo.supabase.co:5432/postgres`

### 2. Export Production Data

**Option A: Using Supabase Dashboard**
1. Go to Production dashboard → Settings → Database
2. Scroll to "Database backups" section
3. Click "Download backup" 
4. Save as `production_backup.sql`

**Option B: Using SQL Editor**
1. Go to Production dashboard → SQL Editor
2. Run these queries to export your data:

```sql
-- Export all tables (run each separately and save results)

-- Export users table
COPY (SELECT * FROM users) TO STDOUT WITH CSV HEADER;

-- Export cases table  
COPY (SELECT * FROM cases) TO STDOUT WITH CSV HEADER;

-- Export code_tables table
COPY (SELECT * FROM code_tables) TO STDOUT WITH CSV HEADER;

-- Export any other tables you have...
```

### 3. Import to UAT Database

**Option A: Using UAT Dashboard**
1. Go to UAT dashboard → SQL Editor
2. Upload and execute the `production_backup.sql` file

**Option B: Manual Data Insert**
1. Go to UAT dashboard → SQL Editor
2. Create tables first (copy schema from Production)
3. Insert data using the CSV exports from step 2

### 4. Verify Migration

Run these verification queries in UAT SQL Editor:

```sql
-- Check table counts
SELECT 'users' as table_name, count(*) as record_count FROM users
UNION ALL
SELECT 'cases' as table_name, count(*) as record_count FROM cases  
UNION ALL
SELECT 'code_tables' as table_name, count(*) as record_count FROM code_tables;

-- Check sample data
SELECT * FROM users LIMIT 5;
SELECT * FROM cases LIMIT 5;
SELECT * FROM code_tables LIMIT 10;
```

## 🔐 Important Notes

1. **Get Database Passwords**: You need the postgres user passwords from each project's database settings
2. **Schema First**: Make sure UAT database has the same schema as Production
3. **Row Level Security**: RLS policies may need to be recreated in UAT
4. **Indexes**: Custom indexes might need to be recreated
5. **Test After Migration**: Run the application against UAT to verify everything works

## 🚨 Before Migration Checklist

- [ ] Backup existing UAT data (if any)
- [ ] Confirm UAT database is empty or ready to be overwritten
- [ ] Have both database passwords ready
- [ ] Plan for downtime during migration
- [ ] Test credentials and connections first