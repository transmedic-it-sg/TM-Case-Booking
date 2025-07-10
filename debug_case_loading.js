// Debug script to test case loading
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjEzMjgsImV4cCI6MjA2NzUzNzMyOH0.h_NnNbz68anh_EOjgqAL81Lx6IJGw6hlVc0D10XqlLw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGetSupabaseCases() {
  try {
    console.log('Testing the getSupabaseCases function...');
    
    // Simulate the exact query from supabaseCaseService.ts
    let query = supabase
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
      .order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ Error fetching cases:', error);
      return;
    }
    
    console.log('✅ Successfully fetched cases:', data?.length, 'rows');
    
    if (data && data.length > 0) {
      // Transform data like the function does
      const transformedCases = data.map(caseData => ({
        id: caseData.id,
        caseReferenceNumber: caseData.case_reference_number,
        hospital: caseData.hospital,
        department: caseData.department,
        dateOfSurgery: caseData.date_of_surgery,
        procedureType: caseData.procedure_type,
        procedureName: caseData.procedure_name,
        doctorName: caseData.doctor_name,
        timeOfProcedure: caseData.time_of_procedure,
        surgerySetSelection: caseData.surgery_set_selection || [],
        implantBox: caseData.implant_box || [],
        specialInstruction: caseData.special_instruction,
        status: caseData.status,
        submittedBy: caseData.submitted_by,
        submittedAt: caseData.submitted_at,
        processedBy: caseData.processed_by,
        processedAt: caseData.processed_at,
        processOrderDetails: caseData.process_order_details,
        country: caseData.country,
        isAmended: caseData.is_amended,
        amendedBy: caseData.amended_by,
        amendedAt: caseData.amended_at,
        statusHistory: caseData.status_history?.map((history) => ({
          status: history.status,
          timestamp: history.timestamp,
          processedBy: history.processed_by,
          details: history.details,
          attachments: history.attachments
        })) || []
      }));
      
      console.log('✅ Successfully transformed first case:', transformedCases[0]);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testGetSupabaseCases();