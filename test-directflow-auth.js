// Test DirectFlow Authentication
console.log('Testing DirectFlow Authentication...');

// Test 1: Check if DirectFlow exists
if (typeof DirectFlow === 'undefined') {
    console.error('❌ DirectFlow class not found');
} else {
    console.log('✅ DirectFlow class available');
}

// Test 2: Create DirectFlow instance
try {
    const directFlow = new DirectFlow();
    console.log('✅ DirectFlow instance created');
    
    // Test 3: Check initial authentication
    setTimeout(() => {
        console.log('DirectFlow initialized:', directFlow.initialized);
        console.log('DirectFlow authenticated:', directFlow.isAuthenticated());
        
        // Test 4: Try to get attendance stats
        if (directFlow.initialized && directFlow.isAuthenticated()) {
            directFlow.getAttendanceStats()
                .then(stats => {
                    console.log('✅ Attendance stats retrieved:', stats);
                })
                .catch(error => {
                    console.error('❌ Error getting attendance stats:', error);
                });
        } else {
            console.warn('⚠️ DirectFlow not ready for API calls');
        }
    }, 3000);
    
} catch (error) {
    console.error('❌ Error creating DirectFlow:', error);
}
