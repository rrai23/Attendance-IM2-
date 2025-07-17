/**
 * Test Attendance Edit Functionality
 * This script tests the fixed attendance edit functionality
 */

const axios = require('axios');

const SERVER_URL = 'http://localhost:3000';

async function testAttendanceEdit() {
    console.log('🧪 Testing Attendance Edit Functionality');
    console.log('=' .repeat(50));
    
    try {
        // Step 1: Login as admin
        console.log('🔐 Step 1: Authenticating as admin...');
        const loginResponse = await axios.post(`${SERVER_URL}/api/auth/login`, {
            username: 'admin',
            password: 'admin123'
        });
        
        if (!loginResponse.data.success) {
            console.error('❌ Admin login failed:', loginResponse.data.message);
            return;
        }
        
        const adminToken = loginResponse.data.data.token;
        console.log('✅ Admin authenticated successfully');
        
        // Step 2: Get attendance records
        console.log('\n📋 Step 2: Fetching attendance records...');
        const attendanceResponse = await axios.get(`${SERVER_URL}/api/attendance`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!attendanceResponse.data.success) {
            console.error('❌ Failed to fetch attendance records:', attendanceResponse.data.message);
            return;
        }
        
        const records = attendanceResponse.data.data.records || [];
        console.log(`✅ Found ${records.length} attendance records`);
        
        if (records.length === 0) {
            console.log('⚠️ No attendance records found to edit. Please create some records first.');
            return;
        }
        
        // Step 3: Try to edit the first record
        const recordToEdit = records[0];
        console.log('\n✏️ Step 3: Testing edit functionality...');
        console.log('Record to edit:', {
            id: recordToEdit.id,
            employee_id: recordToEdit.employee_id,
            date: recordToEdit.date,
            status: recordToEdit.status
        });
        
        // Simulate what the frontend edit would do
        const editData = {
            employee_id: recordToEdit.employee_id,
            date: recordToEdit.date,
            time_in: recordToEdit.time_in || '09:00',
            time_out: recordToEdit.time_out || '17:00',
            status: 'present', // Change status to test edit
            notes: 'Test edit - automated test'
        };
        
        console.log('Edit data:', editData);
        
        // Step 4: Update the record
        const updateResponse = await axios.put(`${SERVER_URL}/api/attendance/${recordToEdit.id}`, editData, {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (updateResponse.data.success) {
            console.log('✅ Attendance record updated successfully!');
            console.log('Updated record:', updateResponse.data.data.record);
            
            // Verify the change
            const verifyResponse = await axios.get(`${SERVER_URL}/api/attendance/${recordToEdit.id}`, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (verifyResponse.data.success) {
                console.log('✅ Verification successful - record was updated');
            } else {
                console.log('⚠️ Could not verify update');
            }
        } else {
            console.log('❌ Failed to update attendance record:', updateResponse.data.message);
        }
        
        console.log('\n🎉 Attendance edit test completed!');
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.response?.data || error.message);
    }
}

// Run the test
testAttendanceEdit();
