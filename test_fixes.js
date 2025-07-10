// Test the bug fixes for country/department filtering
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aqzjzjygflmxkcbfnjbe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxemp6anlnZmxteGtjYmZuamJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjEzMjgsImV4cCI6MjA2NzUzNzMyOH0.h_NnNbz68anh_EOjgqAL81Lx6IJGw6hlVc0D10XqlLw';

const supabase = createClient(supabaseUrl, supabaseKey);

// Simulate the fixed filtering logic
function getCountryCode(country) {
  const countryMap = {
    'Singapore': 'SG',
    'Malaysia': 'MY',
    'Philippines': 'PH',
    'Indonesia': 'ID',
    'Vietnam': 'VN',
    'Hong Kong': 'HK',
    'Thailand': 'TH'
  };
  return countryMap[country] || 'SG';
}

function cleanDepartmentName(department) {
  return department.replace(/^[A-Za-z\s]+:/, '').trim();
}

async function testFixedFiltering() {
  console.log('🔧 Testing Fixed Country and Department Filtering\n');
  
  // Get all cases and users
  const { data: allCases, error: casesError } = await supabase
    .from('case_bookings')
    .select('*');
  
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('*');
  
  if (casesError || usersError) {
    console.error('Error fetching data:', casesError || usersError);
    return;
  }
  
  console.log(`📊 Total cases in database: ${allCases.length}`);
  console.log(`👥 Total users: ${users.length}\n`);
  
  // Test each user with fixed filtering logic
  for (const user of users) {
    console.log(`🔍 Testing user: ${user.username} (${user.role})`);
    console.log(`   Countries: [${user.countries.join(', ')}]`);
    console.log(`   Departments: [${user.departments.slice(0, 3).join(', ')}${user.departments.length > 3 ? '...' : ''}]`);
    
    let filteredCases = [...allCases];
    
    // Admin and IT see all cases
    if (user.role === 'admin' || user.role === 'it') {
      console.log(`   ✅ Admin/IT user - sees all ${filteredCases.length} cases`);
    } else {
      // Apply country filtering (FIXED)
      if (user.countries && user.countries.length > 0) {
        const userCountryCodes = user.countries.map(country => getCountryCode(country));
        const beforeCount = filteredCases.length;
        filteredCases = filteredCases.filter(caseItem => 
          userCountryCodes.includes(caseItem.country)
        );
        console.log(`   📍 Country filter: ${beforeCount} → ${filteredCases.length} cases`);
        console.log(`      User countries: [${userCountryCodes.join(', ')}]`);
        console.log(`      Case countries: [${[...new Set(allCases.map(c => c.country))].join(', ')}]`);
      }
      
      // Apply department filtering (FIXED) - exclude operations-manager
      if (user.departments && user.departments.length > 0 && 
          user.role !== 'operations-manager') {
        const beforeCount = filteredCases.length;
        const userDepartments = user.departments.map(cleanDepartmentName);
        
        filteredCases = filteredCases.filter(caseItem => {
          const caseDepartment = cleanDepartmentName(caseItem.department);
          return userDepartments.includes(caseDepartment);
        });
        
        console.log(`   🏢 Department filter: ${beforeCount} → ${filteredCases.length} cases`);
        console.log(`      User departments (cleaned): [${userDepartments.slice(0, 3).join(', ')}${userDepartments.length > 3 ? '...' : ''}]`);
        console.log(`      Case departments: [${[...new Set(allCases.map(c => c.department))].join(', ')}]`);
      }
    }
    
    if (filteredCases.length === 0 && user.role !== 'admin' && user.role !== 'it') {
      console.log(`   ⚠️ WARNING: User still sees NO CASES after fixes!`);
    } else {
      console.log(`   ✅ User will see ${filteredCases.length} cases`);
    }
    
    console.log('');
  }
}

async function testCategorizedSetsFix() {
  console.log('🔧 Testing Fixed Categorized Sets\n');
  
  const { data: users, error } = await supabase
    .from('profiles')
    .select('*');
  
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  
  for (const user of users) {
    console.log(`🔍 Testing categorized sets for: ${user.username}`);
    
    // Test for each of user's countries (with country code conversion)
    for (const countryName of user.countries) {
      const countryCode = getCountryCode(countryName);
      
      const { data: sets, error: setsError } = await supabase
        .from('categorized_sets')
        .select('*')
        .eq('country', countryCode);
      
      if (setsError) {
        console.log(`  ❌ Error loading sets for ${countryName} (${countryCode}): ${setsError.message}`);
        continue;
      }
      
      console.log(`  📍 ${countryName} (${countryCode}): ${sets.length} procedure types`);
      
      if (sets.length === 0) {
        console.log(`    ⚠️ No sets found for ${countryCode}`);
      } else {
        const totalSets = sets.reduce((sum, s) => sum + (s.surgery_sets?.length || 0), 0);
        const totalBoxes = sets.reduce((sum, s) => sum + (s.implant_boxes?.length || 0), 0);
        console.log(`    ✅ Total: ${totalSets} surgery sets, ${totalBoxes} implant boxes`);
      }
    }
    console.log('');
  }
}

async function runFixTests() {
  console.log('🚀 Testing Bug Fixes\n');
  console.log('=' .repeat(80));
  
  await testFixedFiltering();
  await testCategorizedSetsFix();
  
  console.log('🎯 EXPECTED RESULTS AFTER FIXES:');
  console.log('1. Non-admin users should now see cases in their assigned countries');
  console.log('2. Department filtering should work correctly with cleaned names');
  console.log('3. Edit Sets should show data for all countries');
  console.log('4. Calendar should display cases correctly');
  
  console.log('\n🔧 Next Steps:');
  console.log('1. Clear browser cache and refresh');
  console.log('2. Test with different user roles');
  console.log('3. Verify "View All Cases" loads without crashing');
  console.log('4. Check "Edit Sets" shows surgery sets/implant boxes');
  console.log('5. Confirm "Booking Calendar" displays cases');
}

runFixTests();