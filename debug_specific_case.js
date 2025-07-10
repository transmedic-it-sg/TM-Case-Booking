// Debug specific case TMC-SG-2025-004
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk2MTMyOCwiZXhwIjoyMDY3NTM3MzI4fQ.cUNZC4bvC1Doi4DGhrPpBxoSebz1ad54tLMeYVKq7I4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugSpecificCase() {
  console.log('🔍 Debugging case TMC-SG-2025-004\n');
  
  try {
    // Find the specific case
    const { data: cases, error } = await supabase
      .from('case_bookings')
      .select('*')
      .eq('case_reference_number', 'TMC-SG-2025-004');
    
    if (error) {
      console.error('❌ Error finding case:', error);
      return;
    }
    
    if (!cases || cases.length === 0) {
      console.log('⚠️ Case TMC-SG-2025-004 not found');
      return;
    }
    
    const caseData = cases[0];
    console.log('📋 Case Data:');
    console.log('ID:', caseData.id);
    console.log('Reference:', caseData.case_reference_number);
    console.log('Hospital:', caseData.hospital);
    console.log('Department:', caseData.department);
    console.log('Surgery Sets:', caseData.surgery_set_selection);
    console.log('Implant Box:', caseData.implant_box);
    console.log('Status:', caseData.status);
    console.log('Country:', caseData.country);
    
    // Check for potential data corruption
    console.log('\n🔍 Data Validation:');
    
    const issues = [];
    
    // Check array fields
    if (!Array.isArray(caseData.surgery_set_selection)) {
      issues.push('surgery_set_selection is not an array');
    }
    if (!Array.isArray(caseData.implant_box)) {
      issues.push('implant_box is not an array');
    }
    
    // Check for very long strings that might cause UI issues
    if (caseData.special_instruction && caseData.special_instruction.length > 1000) {
      issues.push('special_instruction is very long');
    }
    if (caseData.process_order_details && caseData.process_order_details.length > 1000) {
      issues.push('process_order_details is very long');
    }
    
    // Check for invalid JSON in text fields
    if (caseData.process_order_details) {
      try {
        JSON.parse(caseData.process_order_details);
        console.log('✅ process_order_details is valid JSON');
      } catch (e) {
        console.log('✅ process_order_details is plain text (not JSON)');
      }
    }
    
    if (issues.length > 0) {
      console.log('❌ Issues found:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    } else {
      console.log('✅ No obvious data corruption found');
    }
    
    // Check status history for this case
    console.log('\n📈 Status History:');
    const { data: history, error: historyError } = await supabase
      .from('status_history')
      .select('*')
      .eq('case_id', caseData.id)
      .order('timestamp');
    
    if (historyError) {
      console.error('❌ Error getting status history:', historyError);
    } else {
      console.log(`Found ${history.length} status history records:`);
      history.forEach((h, i) => {
        console.log(`  ${i + 1}. ${h.status} at ${h.timestamp} by ${h.processed_by}`);
      });
    }
    
    // Check if there are circular references or huge nested data
    console.log('\n🔍 Testing Frontend Query (with status_history join):');
    const { data: fullCase, error: fullError } = await supabase
      .from('case_bookings')
      .select(`
        *,
        status_history (
          id,
          status,
          processed_by,
          timestamp,
          details,
          attachments
        )
      `)
      .eq('case_reference_number', 'TMC-SG-2025-004')
      .single();
    
    if (fullError) {
      console.error('❌ Error with frontend query:', fullError);
      console.log('🔥 THIS COULD BE THE CAUSE OF THE FREEZE!');
    } else {
      console.log('✅ Frontend query successful');
      console.log(`Status history count: ${fullCase.status_history?.length || 0}`);
      
      // Check if status history has any huge data
      if (fullCase.status_history) {
        fullCase.status_history.forEach((h, i) => {
          if (h.details && h.details.length > 500) {
            console.log(`⚠️ History ${i + 1} has long details (${h.details.length} chars)`);
          }
          if (h.attachments && h.attachments.length > 10) {
            console.log(`⚠️ History ${i + 1} has many attachments (${h.attachments.length})`);
          }
        });
      }
    }
    
    return caseData;
    
  } catch (error) {
    console.error('💥 Exception during debugging:', error);
    return null;
  }
}

async function deleteCase() {
  console.log('\n🗑️ Deleting case TMC-SG-2025-004\n');
  
  try {
    // First get the case ID
    const { data: cases, error: findError } = await supabase
      .from('case_bookings')
      .select('id')
      .eq('case_reference_number', 'TMC-SG-2025-004');
    
    if (findError) {
      console.error('❌ Error finding case:', findError);
      return;
    }
    
    if (!cases || cases.length === 0) {
      console.log('⚠️ Case not found - may already be deleted');
      return;
    }
    
    const caseId = cases[0].id;
    
    // Delete status history first (foreign key constraint)
    console.log('Deleting status history...');
    const { error: historyError } = await supabase
      .from('status_history')
      .delete()
      .eq('case_id', caseId);
    
    if (historyError) {
      console.error('❌ Error deleting status history:', historyError);
      return;
    }
    
    console.log('✅ Status history deleted');
    
    // Delete the case
    console.log('Deleting case...');
    const { error: caseError } = await supabase
      .from('case_bookings')
      .delete()
      .eq('id', caseId);
    
    if (caseError) {
      console.error('❌ Error deleting case:', caseError);
      return;
    }
    
    console.log('✅ Case TMC-SG-2025-004 successfully deleted!');
    console.log('\n🎯 You can now create a new case to replace it.');
    
  } catch (error) {
    console.error('💥 Exception during deletion:', error);
  }
}

async function main() {
  const caseData = await debugSpecificCase();
  
  if (caseData) {
    console.log('\n❓ Do you want to delete this case? ');
    console.log('The case will be permanently removed from the database.');
    console.log('Running deletion in 3 seconds...\n');
    
    // Wait 3 seconds then delete
    setTimeout(async () => {
      await deleteCase();
    }, 3000);
  }
}

main();