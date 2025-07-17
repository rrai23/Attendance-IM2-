/**
 * Test using DirectFlow authentication directly
 */

// This script should be run in the browser console where DirectFlow is available
function testDirectFlowEmployeeCreation() {
    // Test data
    const employeeData = {
        employee_id: 'TEST_DF_001',
        username: 'test.df.001',
        password: 'password123',
        role: 'employee',
        full_name: 'Test DirectFlow',
        first_name: 'Test',
        last_name: 'DirectFlow',
        email: 'test.df@example.com',
        department: 'IT',
        position: 'Developer',
        hire_date: '2025-01-15',
        status: 'active',
        wage: 15.00,
        salary_type: 'hourly'
    };

    console.log('Testing employee creation via DirectFlow...');
    console.log('Employee data:', employeeData);

    // Check if DirectFlow is available
    if (typeof window.directFlow === 'undefined') {
        console.error('DirectFlow not available');
        return;
    }

    if (!window.directFlow.initialized) {
        console.error('DirectFlow not initialized');
        return;
    }

    // Test the creation
    window.directFlow.createEmployee(employeeData)
        .then(result => {
            console.log('DirectFlow create result:', result);
        })
        .catch(error => {
            console.error('DirectFlow create error:', error);
        });
}

// Instructions for browser console
console.log('Copy and paste this function into the browser console:');
console.log(testDirectFlowEmployeeCreation.toString());
console.log('Then call: testDirectFlowEmployeeCreation()');

module.exports = { testDirectFlowEmployeeCreation };
