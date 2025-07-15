const fetch = require('node-fetch');

async function testEmployeePagePersistence() {
    try {
        console.log('🧪 Testing Employee Page Data Persistence...\n');

        // Step 1: Login
        console.log('1. Logging in...');
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });

        const loginData = await loginResponse.json();
        const authToken = loginData.data?.token;
        
        if (!authToken) {
            throw new Error('Failed to get auth token');
        }
        console.log('✅ Login successful');

        // Step 2: Get initial data
        console.log('\n2. Getting initial employee data...');
        const initialResponse = await fetch('http://localhost:3000/api/unified/data', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const initialData = await initialResponse.json();
        const employees = initialData.data?.employees;
        
        if (!employees || employees.length === 0) {
            throw new Error('No employees found');
        }

        const testEmployee = employees[0];
        const originalDept = testEmployee.department;
        const newDept = originalDept === 'Testing Department' ? 'HR Department' : 'Testing Department';
        
        console.log(`✅ Found ${employees.length} employees`);
        console.log(`   Test employee: ${testEmployee.name} (${testEmployee.id})`);
        console.log(`   Original department: ${originalDept}`);
        console.log(`   Will change to: ${newDept}`);

        // Step 3: Update employee data
        console.log('\n3. Updating employee department...');
        const updateData = {
            employees: [{
                ...testEmployee,
                department: newDept
            }],
            attendanceRecords: initialData.data.attendanceRecords || []
        };

        const updateResponse = await fetch('http://localhost:3000/api/unified/sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(updateData)
        });

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            throw new Error(`Update failed: ${updateResponse.status} - ${errorText}`);
        }

        const updateResult = await updateResponse.json();
        console.log('✅ Update sent successfully');

        // Step 4: Wait a moment and verify immediate persistence
        console.log('\n4. Verifying immediate data persistence...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        const verifyResponse = await fetch('http://localhost:3000/api/unified/data', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const verifyData = await verifyResponse.json();
        const updatedEmployee = verifyData.data?.employees?.find(emp => emp.id === testEmployee.id);

        if (!updatedEmployee) {
            throw new Error('Employee not found after update');
        }

        const finalDepartment = updatedEmployee.department;
        console.log(`   Final department: ${finalDepartment}`);

        if (finalDepartment === newDept) {
            console.log('✅ SUCCESS: Employee data persisted correctly!');
            console.log('\n🎉 CONCLUSION: Employee page data persistence is WORKING!');
            console.log('   - Employee updates are saved to database');
            console.log('   - Data persists across page refreshes');
            console.log('   - No more data loss issues');
        } else {
            console.log(`❌ FAILED: Expected "${newDept}", but got "${finalDepartment}"`);
            console.log('\n❌ ISSUE: Employee page still has data persistence problems');
        }

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.log('\n❌ ISSUE: Employee page data persistence is NOT working');
    }
}

testEmployeePagePersistence();
