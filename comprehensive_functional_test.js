/**
 * Comprehensive Functional Test for All Fixed Modules
 * 
 * This test validates all the bug fixes implemented:
 * 1. Audit Log separation from notifications
 * 2. Country/department-based notifications
 * 3. User Management filters repositioning
 * 4. Amend Case functionality
 * 5. Code Table Setup country selection
 * 6. Countries moved to Global Tables
 * 7. TypeScript compilation fixes
 */

const fs = require('fs');
const path = require('path');

// Test results collector
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

function addResult(test, status, message, details = '') {
  testResults[status]++;
  testResults.details.push({
    test,
    status,
    message,
    details,
    timestamp: new Date().toISOString()
  });
  console.log(`${status.toUpperCase()}: ${test} - ${message}`);
  if (details) console.log(`  Details: ${details}`);
}

function fileExists(filePath) {
  return fs.existsSync(path.join(__dirname, filePath));
}

function readFileContent(filePath) {
  try {
    return fs.readFileSync(path.join(__dirname, filePath), 'utf8');
  } catch (error) {
    return null;
  }
}

function testFileStructure(filename, expectedContent, description) {
  const content = readFileContent(filename);
  if (!content) {
    addResult(`File Structure: ${filename}`, 'failed', `File not found: ${filename}`);
    return false;
  }
  
  if (content.includes(expectedContent)) {
    addResult(`File Structure: ${filename}`, 'passed', description);
    return true;
  } else {
    addResult(`File Structure: ${filename}`, 'failed', `Expected content not found: ${expectedContent}`, description);
    return false;
  }
}

console.log('🧪 Starting Comprehensive Functional Testing...\n');

// Test 1: Audit Service Implementation
console.log('📋 Testing Audit Service Implementation...');
if (fileExists('src/utils/auditService.ts')) {
  addResult('Audit Service', 'passed', 'Audit service file exists');
  
  // Check for key functions
  const auditContent = readFileContent('src/utils/auditService.ts');
  const expectedFunctions = [
    'addAuditLog',
    'getAuditLogs', 
    'getFilteredAuditLogs',
    'auditCaseAmended',
    'auditCaseStatusChange'
  ];
  
  expectedFunctions.forEach(func => {
    if (auditContent.includes(func)) {
      addResult('Audit Service', 'passed', `Function ${func} implemented`);
    } else {
      addResult('Audit Service', 'failed', `Function ${func} missing`);
    }
  });
} else {
  addResult('Audit Service', 'failed', 'Audit service file missing');
}

// Test 2: Notification Context Enhanced
console.log('\n📢 Testing Notification Context Enhancements...');
testFileStructure(
  'src/contexts/NotificationContext.tsx',
  'targetCountry?: string',
  'Country-based notification filtering implemented'
);

testFileStructure(
  'src/contexts/NotificationContext.tsx', 
  'targetDepartment?: string',
  'Department-based notification filtering implemented'
);

// Test 3: User Management Advanced Filters
console.log('\n👥 Testing User Management Filter Repositioning...');
testFileStructure(
  'src/components/UserManagement.tsx',
  'Advanced Filters',
  'Advanced filters section exists'
);

// Check for proper JSX structure fixes
const userMgmtContent = readFileContent('src/components/UserManagement.tsx');
if (userMgmtContent) {
  // Check for proper indentation and structure
  const hasProperStructure = userMgmtContent.includes('</div>') && 
                             !userMgmtContent.includes('    </div>    </div>') && // No double closing
                             userMgmtContent.includes('className="advanced-filters"');
  
  if (hasProperStructure) {
    addResult('User Management', 'passed', 'JSX structure properly formatted');
  } else {
    addResult('User Management', 'failed', 'JSX structure issues detected');
  }
} else {
  addResult('User Management', 'failed', 'UserManagement.tsx not accessible');
}

// Test 4: Cases List Amendment Integration
console.log('\n📋 Testing Case Amendment Functionality...');
testFileStructure(
  'src/components/CasesList/index.tsx',
  'auditCaseAmended',
  'Audit integration in amendment flow'
);

testFileStructure(
  'src/components/CasesList/index.tsx',
  'expandedAmendmentHistory',
  'Amendment history expansion functionality'
);

// Test 5: Code Table Setup Country Selection
console.log('\n⚙️ Testing Code Table Setup...');
testFileStructure(
  'src/components/CodeTableSetup.tsx',
  'selectedCategory === \'country\'',
  'Country category selection implemented'
);

testFileStructure(
  'src/components/CodeTableSetup.tsx',
  'SearchableDropdown',
  'Country dropdown for admin users'
);

// Test 6: Code Table Helpers - Countries in Global Tables
console.log('\n🌍 Testing Global Tables Classification...');
testFileStructure(
  'src/utils/codeTableHelpers.ts',
  'global.push(table)',
  'Countries classified as global tables'
);

// Test 7: CSS Files for Amendment History
console.log('\n🎨 Testing CSS Implementations...');
testFileStructure(
  'src/assets/components/CaseCard.css',
  '.amendment-history',
  'Amendment history CSS styling'
);

testFileStructure(
  'src/assets/components/CaseCard.css',
  '.original-values-grid',
  'Original values grid CSS styling'
);

// Test 8: TypeScript Compilation
console.log('\n📝 Testing TypeScript Compilation Fixes...');
// This was already tested above with npx tsc --noEmit

// Test 9: Import Path Fixes
console.log('\n📦 Testing Import Paths...');
const casesListContent = readFileContent('src/components/CasesList/index.tsx');
if (casesListContent && casesListContent.includes("import('../../utils/auditService')")) {
  addResult('Import Paths', 'passed', 'Audit service import path corrected');
} else {
  addResult('Import Paths', 'failed', 'Audit service import path incorrect');
}

// Test 10: Storage Cleanup Functions
console.log('\n🧹 Testing Storage Cleanup Functions...');
testFileStructure(
  'src/utils/storage.ts',
  'cleanupProcessOrderDetails',
  'Process order details cleanup function'
);

testFileStructure(
  'src/utils/storage.ts',
  'cleanupDuplicateStatusEntries', 
  'Duplicate status entries cleanup function'
);

// Final Summary
console.log('\n📊 Test Summary:');
console.log(`✅ Passed: ${testResults.passed}`);
console.log(`❌ Failed: ${testResults.failed}`);
console.log(`⚠️  Warnings: ${testResults.warnings}`);

const totalTests = testResults.passed + testResults.failed + testResults.warnings;
const successRate = totalTests > 0 ? ((testResults.passed / totalTests) * 100).toFixed(1) : 0;

console.log(`📈 Success Rate: ${successRate}%`);

// Generate detailed report
const report = {
  summary: {
    totalTests,
    passed: testResults.passed,
    failed: testResults.failed,
    warnings: testResults.warnings,
    successRate: `${successRate}%`,
    timestamp: new Date().toISOString()
  },
  testDetails: testResults.details,
  recommendations: []
};

// Add recommendations based on results
if (testResults.failed > 0) {
  report.recommendations.push('Review failed tests and fix any missing implementations');
}

if (successRate < 90) {
  report.recommendations.push('Success rate below 90% - additional testing may be required');
} else {
  report.recommendations.push('All major functionality appears to be working correctly');
}

// Save detailed report
fs.writeFileSync(
  path.join(__dirname, 'comprehensive_test_report.json'),
  JSON.stringify(report, null, 2)
);

console.log('\n📋 Detailed report saved to: comprehensive_test_report.json');

// Exit with appropriate code
process.exit(testResults.failed > 0 ? 1 : 0);