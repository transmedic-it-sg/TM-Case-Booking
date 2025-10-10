#!/usr/bin/env node

/**
 * COMPREHENSIVE FIELD MAPPING AUDIT
 * Identify and fix all inconsistent field naming conventions across the application
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjEzMjgsImV4cCI6MjA2NzUzNzMyOH0.h_NnNbz68anh_EOjgqAL81Lx6IJGw6hlVc0D10XqlLw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditFieldMappings() {
  console.log('🚨 CRITICAL FIELD MAPPING AUDIT');
  console.log('===============================\n');

  const issues = [];
  const recommendations = [];

  try {
    // 1. Get all table schemas from database
    console.log('1. 📊 ANALYZING DATABASE SCHEMA:');
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (tablesError) {
      console.error('❌ Failed to get tables:', tablesError.message);
      return;
    }

    const tableSchemas = {};
    
    for (const table of tables) {
      const tableName = table.table_name;
      
      const { data: columns, error: colError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', tableName)
        .eq('table_schema', 'public')
        .order('ordinal_position');

      if (!colError && columns) {
        tableSchemas[tableName] = columns;
        console.log(`✅ ${tableName}: ${columns.length} columns`);
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 2. Analyze field naming patterns
    console.log('2. 🔍 ANALYZING FIELD NAMING PATTERNS:');
    
    const patterns = {
      snake_case: new Set(),
      camelCase: new Set(),
      inconsistent: new Set()
    };

    Object.entries(tableSchemas).forEach(([tableName, columns]) => {
      columns.forEach(col => {
        const fieldName = col.column_name;
        
        if (fieldName.includes('_')) {
          patterns.snake_case.add(`${tableName}.${fieldName}`);
        } else if (fieldName !== fieldName.toLowerCase()) {
          patterns.camelCase.add(`${tableName}.${fieldName}`);
        }
      });
    });

    console.log(`📋 Snake_case fields: ${patterns.snake_case.size}`);
    console.log(`📋 CamelCase fields: ${patterns.camelCase.size}`);

    console.log('\n' + '='.repeat(50) + '\n');

    // 3. Check specific problematic mappings
    console.log('3. 🚨 CHECKING KNOWN PROBLEMATIC MAPPINGS:');
    
    const knownIssues = [
      {
        table: 'case_bookings',
        dbField: 'date_of_surgery',
        codeField: 'dateOfSurgery',
        incorrectUsage: 'case_date'
      },
      {
        table: 'case_bookings', 
        dbField: 'procedure_type',
        codeField: 'procedureType',
        incorrectUsage: 'procedure'
      },
      {
        table: 'case_bookings',
        dbField: 'procedure_name', 
        codeField: 'procedureName',
        incorrectUsage: 'procedureName'
      }
    ];

    for (const issue of knownIssues) {
      const tableSchema = tableSchemas[issue.table];
      if (tableSchema) {
        const fieldExists = tableSchema.find(col => col.column_name === issue.dbField);
        if (fieldExists) {
          console.log(`✅ VERIFIED: ${issue.table}.${issue.dbField} exists`);
          console.log(`   ↳ Maps to: ${issue.codeField}`);
          if (issue.incorrectUsage !== issue.dbField) {
            issues.push(`INCORRECT USAGE: Never use "${issue.incorrectUsage}" - use "${issue.dbField}"`);
          }
        } else {
          issues.push(`MISSING FIELD: ${issue.table}.${issue.dbField} not found`);
        }
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // 4. Check for duplicate or similar field names
    console.log('4. 🔍 CHECKING FOR DUPLICATE/SIMILAR FIELD NAMES:');
    
    const allFields = [];
    Object.entries(tableSchemas).forEach(([tableName, columns]) => {
      columns.forEach(col => {
        allFields.push({
          table: tableName,
          field: col.column_name,
          fullName: `${tableName}.${col.column_name}`
        });
      });
    });

    // Group similar field names
    const fieldGroups = {};
    allFields.forEach(field => {
      const normalized = field.field.toLowerCase().replace(/_/g, '');
      if (!fieldGroups[normalized]) fieldGroups[normalized] = [];
      fieldGroups[normalized].push(field);
    });

    const similarFields = Object.entries(fieldGroups).filter(([, fields]) => fields.length > 1);
    
    similarFields.forEach(([normalized, fields]) => {
      if (fields.length > 1) {
        console.log(`🔄 SIMILAR FIELDS (${normalized}):`);
        fields.forEach(field => {
          console.log(`   - ${field.fullName}`);
        });
        
        const uniqueNames = new Set(fields.map(f => f.field));
        if (uniqueNames.size > 1) {
          issues.push(`INCONSISTENT NAMING: Multiple variations of "${normalized}" found`);
        }
      }
    });

    console.log('\n' + '='.repeat(50) + '\n');

    // 5. Generate mapping documentation
    console.log('5. 📋 GENERATING FIELD MAPPING DOCUMENTATION:');
    
    const mappingDoc = {
      case_bookings: {
        database_fields: tableSchemas.case_bookings?.map(col => col.column_name) || [],
        typescript_interface: {
          id: 'id',
          caseReferenceNumber: 'case_reference_number',
          hospital: 'hospital',
          department: 'department',
          dateOfSurgery: 'date_of_surgery',  // ⚠️ CRITICAL MAPPING
          procedureType: 'procedure_type',   // ⚠️ CRITICAL MAPPING  
          procedureName: 'procedure_name',   // ⚠️ CRITICAL MAPPING
          doctorName: 'doctor_name',
          timeOfProcedure: 'time_of_procedure',
          surgerySetSelection: 'surgery_set_selection',
          implantBox: 'implant_box',
          specialInstruction: 'special_instruction',
          status: 'status',
          submittedBy: 'submitted_by',
          submittedAt: 'submitted_at',
          processedBy: 'processed_by',
          processedAt: 'processed_at',
          processOrderDetails: 'process_order_details',
          country: 'country',
          isAmended: 'is_amended',
          amendedBy: 'amended_by',
          amendedAt: 'amended_at',
          createdAt: 'created_at',
          updatedAt: 'updated_at'
        }
      },
      case_booking_quantities: {
        database_fields: tableSchemas.case_booking_quantities?.map(col => col.column_name) || [],
        typescript_interface: {
          id: 'id',
          caseBookingId: 'case_booking_id',
          itemType: 'item_type',
          itemName: 'item_name', 
          quantity: 'quantity'
        }
      }
    };

    console.log('📄 Field mapping documentation generated');

    console.log('\n' + '='.repeat(50) + '\n');

    // 6. Provide recommendations
    console.log('6. 💡 RECOMMENDATIONS:');
    
    recommendations.push('CREATE: Central field mapping utility (fieldMappings.ts)');
    recommendations.push('CREATE: TypeScript interfaces for each table with exact field mappings');
    recommendations.push('ENFORCE: Use only documented field mappings in code');
    recommendations.push('REMOVE: All hardcoded field name strings from code');
    recommendations.push('TEST: Validate all CRUD operations use correct field mappings');
    recommendations.push('DOCUMENT: Add inline comments for critical field mappings');

    console.log('\n' + '='.repeat(50) + '\n');

    // 7. Summary
    console.log('7. 📊 AUDIT SUMMARY:');
    
    console.log(`🔍 Tables analyzed: ${Object.keys(tableSchemas).length}`);
    console.log(`🔍 Total fields: ${allFields.length}`);
    console.log(`⚠️  Issues found: ${issues.length}`);
    console.log(`💡 Recommendations: ${recommendations.length}`);

    if (issues.length > 0) {
      console.log('\n❌ CRITICAL ISSUES FOUND:');
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    }

    console.log('\n✅ NEXT STEPS:');
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });

    // 8. Save audit results
    const auditResults = {
      timestamp: new Date().toISOString(),
      tableSchemas,
      fieldMappings: mappingDoc,
      issues,
      recommendations,
      totalTables: Object.keys(tableSchemas).length,
      totalFields: allFields.length
    };

    const outputPath = '/mnt/c/Users/anrong.low/TM-Case-Booking/e2e/audit-results.json';
    fs.writeFileSync(outputPath, JSON.stringify(auditResults, null, 2));
    console.log(`\n💾 Audit results saved to: ${outputPath}`);

  } catch (error) {
    console.error('💥 AUDIT FAILED:', error);
  }
}

auditFieldMappings();