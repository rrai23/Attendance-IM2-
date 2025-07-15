// Simple test to check data mismatch between tables
console.log('🔍 Checking for data mismatch between user_accounts and employees tables');

// Simulate what we know from server logs
const userAccountEmployeeId = 'emp_001'; // From JWT token
const employeeTableCodes = ['EMP001', 'EMP002', 'EMP003']; // From migrate.js

console.log('\n1. JWT contains employee_id:', userAccountEmployeeId);
console.log('2. Employee table likely has codes:', employeeTableCodes);

// Check if there's a case mismatch
const possibleMatches = employeeTableCodes.filter(code => 
    code.toLowerCase() === userAccountEmployeeId.toLowerCase().replace('emp_', 'emp')
);

console.log('3. Possible case-insensitive matches:', possibleMatches);

// The fix: either update user_accounts to match employee_code format
// or update the JOIN to be case-insensitive
console.log('\n🔧 Suggested fixes:');
console.log('Option 1: Update user_accounts.employee_id from "emp_001" to "EMP001"');
console.log('Option 2: Use case-insensitive JOIN in queries');
console.log('Option 3: Update employees.employee_code from "EMP001" to "emp_001"');

console.log('\n🎯 Most likely issue: Case mismatch between tables');
console.log('   user_accounts.employee_id = "emp_001" (lowercase with underscore)');
console.log('   employees.employee_code = "EMP001" (uppercase without underscore)');
