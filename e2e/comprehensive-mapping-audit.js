#!/usr/bin/env node

/**
 * COMPREHENSIVE DATABASE MAPPING AUDIT
 * Scan entire TM-Case-Booking application for ALL database field mappings
 * Generate complete documentation and identify potential issues
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjEzMjgsImV4cCI6MjA2NzUzNzMyOH0.h_NnNbz68anh_EOjgqAL81Lx6IJGw6hlVc0D10XqlLw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function comprehensiveMappingAudit() {
  console.log('🔍 COMPREHENSIVE DATABASE MAPPING AUDIT');
  console.log('=========================================\n');

  const auditResults = {
    timestamp: new Date().toISOString(),
    tables: {},
    mappingIssues: [],
    recommendations: [],
    codeFiles: {}
  };

  try {
    // 1. Get complete database schema
    console.log('1. 📊 SCANNING COMPLETE DATABASE SCHEMA:');
    
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_all_tables_with_columns');

    if (tablesError) {
      // Fallback to manual query
      console.log('Using fallback method to get schema...');
      
      const { data: tableList } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .order('table_name');

      if (tableList) {
        for (const table of tableList) {
          const tableName = table.table_name;
          
          const { data: columns } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable, column_default')
            .eq('table_name', tableName)
            .eq('table_schema', 'public')
            .order('ordinal_position');

          if (columns) {
            auditResults.tables[tableName] = {
              columns: columns,
              totalColumns: columns.length
            };
            console.log(`✅ ${tableName}: ${columns.length} columns`);
          }
        }
      }
    }

    console.log(`\n📋 Found ${Object.keys(auditResults.tables).length} tables in database\n`);

    // 2. Scan all TypeScript/JavaScript files for database operations
    console.log('2. 🔍 SCANNING CODE FILES FOR DATABASE OPERATIONS:');
    
    const codePatterns = [
      /\.from\(['"`]([^'"`]+)['"`]\)/g,           // Supabase .from() calls
      /\.insert\s*\(\s*{([^}]+)}/g,              // Insert operations
      /\.update\s*\(\s*{([^}]+)}/g,              // Update operations  
      /\.select\s*\(['"`]([^'"`]+)['"`]\)/g,     // Select operations
      /\.eq\s*\(['"`]([^'"`]+)['"`]/g,           // Equality filters
      /\.order\s*\(['"`]([^'"`]+)['"`]/g,        // Order by clauses
      /case_reference_number|dateOfSurgery|procedureType|procedureName/g  // Known critical fields
    ];

    const scanDirectory = (dir, results = {}) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          scanDirectory(fullPath, results);
        } else if (entry.name.match(/\.(ts|tsx|js|jsx)$/)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            
            // Check for database operations
            const hasDbOps = codePatterns.some(pattern => pattern.test(content));
            
            if (hasDbOps) {
              results[fullPath] = {
                size: content.length,
                lines: content.split('\n').length,
                dbOperations: [],
                fieldMappings: [],
                potentialIssues: []
              };

              // Extract database operations
              codePatterns.forEach(pattern => {
                let match;
                while ((match = pattern.exec(content)) !== null) {
                  results[fullPath].dbOperations.push({
                    pattern: pattern.source,
                    match: match[0],
                    line: content.substring(0, match.index).split('\n').length
                  });
                }
              });

              // Look for field mappings
              const fieldMappingPatterns = [
                /(\w+):\s*(\w+)\.(\w+)/g,                    // Direct field mapping
                /['"`](\w+)['"`]:\s*\w+\.(\w+)/g,           // Object field mapping
                /case_reference_number|date_of_surgery|procedure_type|procedure_name/g
              ];

              fieldMappingPatterns.forEach(pattern => {
                let match;
                while ((match = pattern.exec(content)) !== null) {
                  results[fullPath].fieldMappings.push({
                    pattern: pattern.source,
                    match: match[0],
                    line: content.substring(0, match.index).split('\n').length
                  });
                }
              });

              console.log(`📄 ${fullPath}: ${results[fullPath].dbOperations.length} DB ops, ${results[fullPath].fieldMappings.length} mappings`);
            }
          } catch (error) {
            console.log(`⚠️  Could not read ${fullPath}: ${error.message}`);
          }
        }
      }
      
      return results;
    };

    auditResults.codeFiles = scanDirectory('/mnt/c/Users/anrong.low/TM-Case-Booking/src');

    console.log(`\n📋 Scanned ${Object.keys(auditResults.codeFiles).length} files with database operations\n`);

    // 3. Cross-reference field mappings with database schema
    console.log('3. 🔗 CROSS-REFERENCING FIELD MAPPINGS:');
    
    const knownCriticalMappings = {
      'case_bookings': {
        'caseReferenceNumber': 'case_reference_number',
        'dateOfSurgery': 'date_of_surgery',
        'procedureType': 'procedure_type', 
        'procedureName': 'procedure_name',
        'doctorName': 'doctor_name',
        'timeOfProcedure': 'time_of_procedure',
        'surgerySetSelection': 'surgery_set_selection',
        'implantBox': 'implant_box',
        'specialInstruction': 'special_instruction',
        'submittedBy': 'submitted_by',
        'submittedAt': 'submitted_at',
        'processedBy': 'processed_by',
        'processedAt': 'processed_at',
        'processOrderDetails': 'process_order_details',
        'isAmended': 'is_amended',
        'amendedBy': 'amended_by',
        'amendedAt': 'amended_at',
        'createdAt': 'created_at',
        'updatedAt': 'updated_at',
        'deliveryImage': 'delivery_image',
        'deliveryDetails': 'delivery_details',
        'orderSummary': 'order_summary',
        'doNumber': 'do_number',
        'quantitiesMigrated': 'quantities_migrated'
      },
      'case_booking_quantities': {
        'caseBookingId': 'case_booking_id',
        'itemType': 'item_type',
        'itemName': 'item_name'
      },
      'status_history': {
        'caseId': 'case_id',
        'processedBy': 'processed_by'
      },
      'amendment_history': {
        'caseId': 'case_id',
        'amendedBy': 'amended_by'
      }
    };

    // Validate critical mappings exist in database
    Object.entries(knownCriticalMappings).forEach(([tableName, mappings]) => {
      const tableSchema = auditResults.tables[tableName];
      
      if (!tableSchema) {
        auditResults.mappingIssues.push({
          type: 'MISSING_TABLE',
          table: tableName,
          message: `Table ${tableName} not found in database schema`
        });
        return;
      }

      Object.entries(mappings).forEach(([tsField, dbField]) => {
        const columnExists = tableSchema.columns.find(col => col.column_name === dbField);
        
        if (!columnExists) {
          auditResults.mappingIssues.push({
            type: 'MISSING_COLUMN',
            table: tableName,
            tsField: tsField,
            dbField: dbField,
            message: `Column ${dbField} not found in table ${tableName}`
          });
        } else {
          console.log(`✅ ${tableName}.${dbField} (${tsField}) - VERIFIED`);
        }
      });
    });

    console.log('\n' + '='.repeat(60) + '\n');

    // 4. Generate recommendations
    console.log('4. 💡 GENERATING RECOMMENDATIONS:');
    
    auditResults.recommendations.push('CREATE: Central field mapping documentation file');
    auditResults.recommendations.push('ADD: Inline comments for all critical field mappings');
    auditResults.recommendations.push('IMPLEMENT: TypeScript strict type checking for database operations');
    auditResults.recommendations.push('CREATE: Database field validation utility functions');
    auditResults.recommendations.push('ADD: Unit tests for all field mapping functions');
    auditResults.recommendations.push('DOCUMENT: Complete API documentation with field mappings');

    // 5. Summary and output
    console.log('5. 📊 AUDIT SUMMARY:');
    console.log(`🔍 Tables analyzed: ${Object.keys(auditResults.tables).length}`);
    console.log(`📄 Code files scanned: ${Object.keys(auditResults.codeFiles).length}`);
    console.log(`⚠️  Mapping issues found: ${auditResults.mappingIssues.length}`);
    console.log(`💡 Recommendations: ${auditResults.recommendations.length}`);

    // Save detailed results
    const outputPath = '/mnt/c/Users/anrong.low/TM-Case-Booking/DATABASE_MAPPING_AUDIT_COMPLETE.json';
    fs.writeFileSync(outputPath, JSON.stringify(auditResults, null, 2));
    console.log(`\n💾 Complete audit results saved to: ${outputPath}`);

    // Generate mapping documentation
    generateMappingDocumentation(auditResults);

    console.log('\n✅ COMPREHENSIVE DATABASE MAPPING AUDIT COMPLETE');

  } catch (error) {
    console.error('💥 AUDIT FAILED:', error);
  }
}

function generateMappingDocumentation(auditResults) {
  const documentation = `# 🗄️ COMPLETE DATABASE MAPPING DOCUMENTATION

## Generated: ${auditResults.timestamp}

## 📊 Database Schema Overview

${Object.entries(auditResults.tables).map(([tableName, info]) => 
  `### ${tableName}
- **Columns**: ${info.totalColumns}
- **Schema**: ${info.columns.map(col => 
    `${col.column_name} (${col.data_type}${col.is_nullable === 'YES' ? ', nullable' : ', required'})`
  ).join(', ')}`
).join('\n\n')}

## 🔗 Critical Field Mappings

### case_bookings
\`\`\`typescript
// ⚠️ CRITICAL: Always use these exact mappings
interface CaseBooking {
  id: string;                           // → id
  caseReferenceNumber: string;          // → case_reference_number ⚠️ CRITICAL
  hospital: string;                     // → hospital
  department: string;                   // → department
  dateOfSurgery: string;               // → date_of_surgery ⚠️ CRITICAL (NOT case_date)
  procedureType: string;               // → procedure_type ⚠️ CRITICAL (NOT procedure)
  procedureName: string;               // → procedure_name ⚠️ CRITICAL
  doctorName?: string;                 // → doctor_name
  timeOfProcedure?: string;            // → time_of_procedure
  surgerySetSelection: string[];       // → surgery_set_selection
  implantBox: string[];               // → implant_box
  specialInstruction?: string;         // → special_instruction
  status: CaseStatus;                 // → status
  submittedBy: string;                // → submitted_by
  submittedAt: string;                // → submitted_at
  processedBy?: string;               // → processed_by
  processedAt?: string;               // → processed_at
  processOrderDetails?: string;        // → process_order_details
  country: string;                    // → country
  isAmended: boolean;                 // → is_amended
  amendedBy?: string;                 // → amended_by
  amendedAt?: string;                 // → amended_at
  createdAt: string;                  // → created_at
  updatedAt: string;                  // → updated_at
}
\`\`\`

### case_booking_quantities
\`\`\`typescript
// ⚠️ CRITICAL: Always use these exact mappings
interface CaseQuantity {
  id?: string;                        // → id
  caseBookingId: string;              // → case_booking_id ⚠️ CRITICAL FK
  itemType: 'surgery_set' | 'implant_box'; // → item_type ⚠️ CRITICAL
  itemName: string;                   // → item_name ⚠️ CRITICAL
  quantity: number;                   // → quantity
}
\`\`\`

## ⚠️ CRITICAL RULES

1. **NEVER use these incorrect field names:**
   - ❌ \`case_date\` → ✅ \`date_of_surgery\`
   - ❌ \`procedure\` → ✅ \`procedure_type\`
   - ❌ \`caseId\` → ✅ \`case_booking_id\`

2. **Always use the fieldMappings.ts utility**
3. **Add comments for all critical mappings**
4. **Test all database operations thoroughly**

## 🔍 Issues Found

${auditResults.mappingIssues.map(issue => 
  `- **${issue.type}**: ${issue.message}`
).join('\n')}

## 💡 Recommendations

${auditResults.recommendations.map(rec => `- ${rec}`).join('\n')}

---
**Generated by**: Comprehensive Database Mapping Audit Tool  
**Files Scanned**: ${Object.keys(auditResults.codeFiles).length}  
**Tables Analyzed**: ${Object.keys(auditResults.tables).length}
`;

  fs.writeFileSync('/mnt/c/Users/anrong.low/TM-Case-Booking/DATABASE_MAPPING_GUIDE.md', documentation);
  console.log('📚 Complete mapping documentation generated: DATABASE_MAPPING_GUIDE.md');
}

comprehensiveMappingAudit();