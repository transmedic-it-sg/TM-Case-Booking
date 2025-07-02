
// Open browser console and run this to inspect localStorage
console.log('=== EMAIL NOTIFICATION MATRIX ===');
const matrix = localStorage.getItem('email-matrix-configs-by-country');
if (matrix) {
  const parsed = JSON.parse(matrix);
  console.log('Countries:', Object.keys(parsed));
  Object.entries(parsed).forEach(([country, config]) => {
    console.log(`
${country}:`);
    const caseBookedRule = config.rules?.find(r => r.status === 'Case Booked');
    if (caseBookedRule) {
      console.log('  Case Booked Rule:');
      console.log('  - Enabled:', caseBookedRule.enabled);
      console.log('  - Roles:', caseBookedRule.recipients?.roles);
      console.log('  - Specific Emails:', caseBookedRule.recipients?.specificEmails);
    } else {
      console.log('  ❌ No Case Booked rule found');
    }
  });
} else {
  console.log('❌ No matrix found');
}

console.log('
=== USERS ===');
const users = localStorage.getItem('case-booking-users');
if (users) {
  const parsed = JSON.parse(users);
  console.log('Total users:', parsed.length);
  parsed.forEach(user => {
    console.log(`- ${user.name} (${user.role}) - Email: ${user.email || 'NO EMAIL'} - Countries: [${user.countries?.join(', ') || 'none'}]`);
  });
} else {
  console.log('❌ No users found');
}
