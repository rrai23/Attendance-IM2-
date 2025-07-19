// Test Role-Based Access Control
// This script tests the access control functionality

console.log('Testing Role-Based Access Control...');

// Test function to simulate different user roles
async function testAccessControl() {
    try {
        // Check if access control is available
        if (!window.accessControl) {
            console.error('❌ Access control not available');
            return;
        }

        console.log('✅ Access control system loaded');

        // Test admin page detection
        const testPages = [
            '/dashboard.html',
            '/employees.html', 
            '/employee-management.html',
            '/payroll.html',
            '/settings.html',
            '/analytics.html',
            '/employee.html'
        ];

        console.log('\nTesting admin page detection:');
        testPages.forEach(page => {
            // Temporarily change the pathname for testing
            const originalPath = window.location.pathname;
            Object.defineProperty(window.location, 'pathname', {
                writable: true,
                value: page
            });

            const isAdmin = window.accessControl.isAdminPage();
            const expected = !page.includes('employee.html');
            
            console.log(`${page}: ${isAdmin ? '🔒 Admin' : '👤 Employee'} ${isAdmin === expected ? '✅' : '❌'}`);
            
            // Restore original path
            Object.defineProperty(window.location, 'pathname', {
                writable: true,
                value: originalPath
            });
        });

        // Test user info retrieval
        console.log('\nTesting user authentication...');
        const userInfo = await window.accessControl.getUserInfo();
        
        if (userInfo) {
            console.log('✅ User authenticated:', userInfo.username, '- Role:', userInfo.role);
            
            // Test role checks
            console.log('\nTesting role checks:');
            console.log('Is Admin:', window.accessControl.isAdmin() ? '✅ Yes' : '❌ No');
            console.log('Is Manager:', window.accessControl.isManager() ? '✅ Yes' : '❌ No');
            
            // Test access levels
            const testLevels = ['admin', 'manager', 'employee'];
            console.log('\nTesting access levels:');
            testLevels.forEach(level => {
                const hasAccess = window.accessControl.checkRoleAccess(level);
                console.log(`${level} access: ${hasAccess ? '✅ Granted' : '❌ Denied'}`);
            });
            
        } else {
            console.log('❌ User not authenticated or failed to get user info');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run tests when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for access control to initialize
    setTimeout(testAccessControl, 1000);
});

// Manual test function
window.testAccessControl = testAccessControl;
