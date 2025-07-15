// Create SQL migration to standardize employee IDs
console.log('🔧 Creating SQL to fix employee ID mismatch...');

// The issue: user_accounts has 'emp_001' but employees likely has 'EMP001'
// Solution: Update one table to match the other

const fixQuery = `
-- Fix employee ID mismatch between tables
-- Option 1: Update user_accounts to match employees format
UPDATE user_accounts 
SET employee_id = CASE 
    WHEN employee_id = 'emp_001' THEN 'EMP001'
    WHEN employee_id = 'emp_002' THEN 'EMP002'
    WHEN employee_id = 'emp_003' THEN 'EMP003'
    ELSE employee_id
END
WHERE employee_id LIKE 'emp_%';

-- Also update user_sessions to match
UPDATE user_sessions 
SET employee_id = CASE 
    WHEN employee_id = 'emp_001' THEN 'EMP001'
    WHEN employee_id = 'emp_002' THEN 'EMP002'
    WHEN employee_id = 'emp_003' THEN 'EMP003'
    ELSE employee_id
END
WHERE employee_id LIKE 'emp_%';

-- Update attendance_records if needed
UPDATE attendance_records 
SET employee_id = CASE 
    WHEN employee_id = 'emp_001' THEN 'EMP001'
    WHEN employee_id = 'emp_002' THEN 'EMP002'
    WHEN employee_id = 'emp_003' THEN 'EMP003'
    ELSE employee_id
END
WHERE employee_id LIKE 'emp_%';
`;

console.log('📝 SQL to standardize employee IDs:');
console.log(fixQuery);

console.log('\n🚨 This will:');
console.log('1. Change emp_001 → EMP001 in user_accounts');
console.log('2. Change emp_001 → EMP001 in user_sessions');
console.log('3. Change emp_001 → EMP001 in attendance_records');
console.log('4. Make all tables use the same employee_code format');

console.log('\n💡 Run this SQL in your database to fix the mismatch!');
