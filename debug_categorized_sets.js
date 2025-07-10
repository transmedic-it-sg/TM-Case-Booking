// Debug script to test categorized sets loading
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjEzMjgsImV4cCI6MjA2NzUzNzMyOH0.h_NnNbz68anh_EOjgqAL81Lx6IJGw6hlVc0D10XqlLw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGetCategorizedSets(country = 'SG') {
  try {
    console.log(`Testing getCategorizedSets for country: ${country}...`);
    
    // Simulate the exact query from supabaseCaseService.ts
    const { data, error } = await supabase
      .from('categorized_sets')
      .select('*')
      .eq('country', country);
    
    if (error) {
      console.error('❌ Error fetching categorized sets:', error);
      return {};
    }
    
    console.log('✅ Successfully fetched categorized sets:', data?.length, 'rows');
    
    if (data && data.length > 0) {
      // Transform to expected format (like in supabaseCaseService.ts)
      const result = {};
      
      data.forEach(item => {
        result[item.procedure_type] = {
          surgerySets: item.surgery_sets || [],
          implantBoxes: item.implant_boxes || []
        };
      });
      
      console.log('✅ Transformed categorized sets:', result);
      return result;
    } else {
      console.log('⚠️ No categorized sets found for country:', country);
      return {};
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    return {};
  }
}

// Test for different countries
async function runTests() {
  await testGetCategorizedSets('SG');
  await testGetCategorizedSets('MY');
  await testGetCategorizedSets('PH');
}

runTests();