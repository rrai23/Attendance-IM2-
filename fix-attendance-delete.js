// Attendance Delete Fix - Run this in browser console or create as a script

console.log('=== FIXING ATTENDANCE DELETE FUNCTIONALITY ===');

// 1. Check and fix token issues
function fixTokenIssues() {
    console.log('\n1. Checking token consistency...');
    
    // Get all possible tokens
    const tokens = {
        token: localStorage.getItem('token'),
        directflow_token: localStorage.getItem('directflow_token'),
        auth_token: localStorage.getItem('auth_token')
    };
    
    console.log('Current tokens:', tokens);
    
    // Find the valid token
    let validToken = null;
    if (tokens.directflow_token) {
        validToken = tokens.directflow_token;
        console.log('✅ Using directflow_token');
    } else if (tokens.token) {
        validToken = tokens.token;
        console.log('✅ Using token');
    } else if (tokens.auth_token) {
        validToken = tokens.auth_token;
        console.log('✅ Using auth_token');
    }
    
    if (validToken) {
        // Ensure all token keys have the same value
        localStorage.setItem('token', validToken);
        localStorage.setItem('directflow_token', validToken);
        localStorage.setItem('auth_token', validToken);
        console.log('✅ Token consistency fixed');
        return validToken;
    } else {
        console.log('❌ No valid token found - please login');
        return null;
    }
}

// 2. Test DirectFlow delete method
async function testDirectFlowDelete() {
    console.log('\n2. Testing DirectFlow delete method...');
    
    try {
        if (!window.DirectFlow) {
            console.log('❌ DirectFlow class not available');
            return false;
        }
        
        const directFlow = new window.DirectFlow();
        
        if (typeof directFlow.deleteAttendanceRecord !== 'function') {
            console.log('❌ deleteAttendanceRecord method not available');
            return false;
        }
        
        console.log('✅ DirectFlow delete method available');
        return true;
    } catch (error) {
        console.log('❌ DirectFlow error:', error.message);
        return false;
    }
}

// 3. Test direct API call
async function testDirectAPI(recordId) {
    console.log('\n3. Testing direct API call...');
    
    const token = localStorage.getItem('directflow_token') || localStorage.getItem('token');
    if (!token) {
        console.log('❌ No token for API call');
        return false;
    }
    
    try {
        const response = await fetch(`/api/attendance/${recordId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log(`API Response: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Direct API call successful:', data);
            return true;
        } else {
            const errorData = await response.json();
            console.log('❌ API call failed:', errorData);
            return false;
        }
    } catch (error) {
        console.log('❌ API call error:', error.message);
        return false;
    }
}

// 4. Fix the employee management page delete method
function patchEmployeeManagementDelete() {
    console.log('\n4. Patching employee management delete method...');
    
    if (window.employeeManagement && typeof window.employeeManagement.deleteRecord === 'function') {
        // Store original method
        const originalDelete = window.employeeManagement.deleteRecord;
        
        // Patch with improved error handling
        window.employeeManagement.deleteRecord = async function(id) {
            console.log(`🔄 Attempting to delete attendance record ${id}`);
            
            if (!confirm('Are you sure you want to delete this attendance record?')) {
                return;
            }

            try {
                // Ensure we have a valid token
                const token = localStorage.getItem('directflow_token') || 
                              localStorage.getItem('token') || 
                              localStorage.getItem('auth_token');
                              
                if (!token) {
                    throw new Error('No authentication token found. Please login again.');
                }
                
                // Try DirectFlow method first
                let response;
                if (this.directFlow && typeof this.directFlow.deleteAttendanceRecord === 'function') {
                    console.log('Using DirectFlow deleteAttendanceRecord method');
                    response = await this.directFlow.deleteAttendanceRecord(id);
                } else {
                    // Fallback to direct API call
                    console.log('Using direct API call fallback');
                    const apiResponse = await fetch(`/api/attendance/${id}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (apiResponse.ok) {
                        const data = await apiResponse.json();
                        response = { success: true, data };
                    } else {
                        const errorData = await apiResponse.json();
                        throw new Error(errorData.message || `API request failed: ${apiResponse.status}`);
                    }
                }
                
                if (response && response.success) {
                    this.showSuccess('Attendance record deleted successfully!');
                    
                    // Refresh data
                    if (typeof this.refreshData === 'function') {
                        await this.refreshData();
                    } else {
                        // Remove from local data as fallback
                        this.attendanceData = this.attendanceData.filter(record => record.id !== id);
                        this.filteredData = this.filteredData.filter(record => record.id !== id);
                        if (this.updateStats) this.updateStats();
                        if (this.renderTable) this.renderTable();
                    }
                } else {
                    throw new Error(response?.message || 'Unknown error occurred');
                }
                
            } catch (error) {
                console.error('Delete failed:', error);
                this.showError(`Failed to delete record: ${error.message}`);
            }
        };
        
        console.log('✅ Employee management delete method patched');
        return true;
    } else {
        console.log('❌ Employee management not available or delete method not found');
        return false;
    }
}

// 5. Run comprehensive fix
async function runFix() {
    console.log('Starting attendance delete fix...');
    
    // Fix tokens
    const validToken = fixTokenIssues();
    if (!validToken) {
        console.log('❌ Cannot proceed without valid token');
        return;
    }
    
    // Test systems
    await testDirectFlowDelete();
    
    // Patch the delete method
    patchEmployeeManagementDelete();
    
    console.log('\n✅ Attendance delete fix completed!');
    console.log('Try deleting an attendance record now.');
}

// Run the fix
runFix();
