// Script to populate categorized sets for all countries
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk2MTMyOCwiZXhwIjoyMDY3NTM3MzI4fQ.cUNZC4bvC1Doi4DGhrPpBxoSebz1ad54tLMeYVKq7I4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const countries = ['SG', 'MY', 'PH', 'ID', 'VN', 'HK', 'TH'];
const procedureTypes = ['Knee', 'Hip', 'Spine', 'Hands', 'Head', 'Neck'];

const defaultSets = {
  'Knee': {
    surgerySets: ['Knee Replacement Set', 'Sports Medicine Set', 'General Orthopedic Set'],
    implantBoxes: ['Knee Implant Box', 'Sports Med Implant Box']
  },
  'Hip': {
    surgerySets: ['Hip Replacement Set', 'General Orthopedic Set'],
    implantBoxes: ['Hip Implant Box']
  },
  'Spine': {
    surgerySets: ['Spine Surgery Set A', 'Spine Surgery Set B', 'Spinal Fusion Set'],
    implantBoxes: ['Spine Implant Box 1', 'Spine Implant Box 2']
  },
  'Hands': {
    surgerySets: ['Hand Surgery Set', 'Microsurgery Set'],
    implantBoxes: ['Hand Implant Box']
  },
  'Head': {
    surgerySets: ['Cranial Surgery Set', 'Neurosurgery Set'],
    implantBoxes: ['Cranial Implant Box']
  },
  'Neck': {
    surgerySets: ['Cervical Spine Set', 'ENT Surgery Set'],
    implantBoxes: ['Cervical Implant Box']
  }
};

async function populateCategorizedSets() {
  console.log('Populating categorized sets for all countries...');
  
  for (const country of countries) {
    console.log(`\nProcessing country: ${country}`);
    
    // Check existing data
    const { data: existing, error: existingError } = await supabase
      .from('categorized_sets')
      .select('procedure_type')
      .eq('country', country);
    
    if (existingError) {
      console.error(`Error checking existing data for ${country}:`, existingError);
      continue;
    }
    
    const existingProcedures = existing ? existing.map(item => item.procedure_type) : [];
    console.log(`Existing procedures for ${country}:`, existingProcedures);
    
    // Insert missing procedure types
    for (const procedureType of procedureTypes) {
      if (!existingProcedures.includes(procedureType)) {
        const setData = defaultSets[procedureType];
        
        const { error: insertError } = await supabase
          .from('categorized_sets')
          .insert([{
            country,
            procedure_type: procedureType,
            surgery_sets: setData.surgerySets,
            implant_boxes: setData.implantBoxes
          }]);
        
        if (insertError) {
          console.error(`Error inserting ${procedureType} for ${country}:`, insertError);
        } else {
          console.log(`✅ Inserted ${procedureType} for ${country}`);
        }
      } else {
        console.log(`⏭️ ${procedureType} already exists for ${country}`);
      }
    }
  }
  
  console.log('\n✅ Categorized sets population completed!');
}

populateCategorizedSets();