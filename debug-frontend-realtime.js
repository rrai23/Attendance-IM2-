console.log('🔧 REAL-TIME FRONTEND DEBUG MONITOR');
console.log('This will show you exactly what happens when you try to save data...\n');

// Monitor authentication status
function checkAuth() {
    const tokens = {
        'auth_token': localStorage.getItem('auth_token'),
        'auth-token': localStorage.getItem('auth-token'),
        'jwt_token': localStorage.getItem('jwt_token')
    };
    
    console.log('🔐 Authentication Status:');
    const hasToken = Object.values(tokens).some(token => token !== null);
    
    if (hasToken) {
        console.log('✅ Authentication tokens found:');
        Object.entries(tokens).forEach(([key, value]) => {
            if (value) {
                console.log(`   ${key}: ${value.substring(0, 20)}...`);
            }
        });
    } else {
        console.log('❌ NO authentication tokens found!');
        console.log('   This is likely why your changes don\'t save');
    }
    
    return hasToken;
}

// Monitor backend API service
function checkBackendService() {
    console.log('\n🔗 Backend API Service Status:');
    
    if (!window.backendApiService) {
        console.log('❌ BackendApiService not found');
        return false;
    }
    
    console.log(`✅ BackendApiService found`);
    console.log(`   Available: ${window.backendApiService.isAvailable}`);
    console.log(`   Has Auth Token: ${!!window.backendApiService.authToken}`);
    
    return window.backendApiService.isAvailable;
}

// Monitor unified employee manager
function checkUnifiedManager() {
    console.log('\n👥 Unified Employee Manager Status:');
    
    if (!window.unifiedEmployeeManager) {
        console.log('❌ UnifiedEmployeeManager not found');
        return false;
    }
    
    console.log(`✅ UnifiedEmployeeManager found`);
    console.log(`   Initialized: ${window.unifiedEmployeeManager.initialized}`);
    console.log(`   Employees: ${window.unifiedEmployeeManager.employees ? window.unifiedEmployeeManager.employees.length : 'undefined'}`);
    
    return window.unifiedEmployeeManager.initialized;
}

// Override console methods to capture API calls
const originalFetch = window.fetch;
window.fetch = function(...args) {
    const [url, options] = args;
    
    if (url.includes('/api/')) {
        console.log(`\n🌐 API CALL DETECTED:`);
        console.log(`   URL: ${url}`);
        console.log(`   Method: ${options?.method || 'GET'}`);
        console.log(`   Headers:`, options?.headers);
        
        const result = originalFetch.apply(this, args);
        
        result.then(response => {
            console.log(`   Response Status: ${response.status} ${response.statusText}`);
            if (!response.ok) {
                console.log(`   ❌ API call failed!`);
            } else {
                console.log(`   ✅ API call successful`);
            }
        }).catch(error => {
            console.log(`   ❌ API call error:`, error.message);
        });
        
        return result;
    }
    
    return originalFetch.apply(this, args);
};

// Monitor UnifiedEmployeeManager method calls
if (window.unifiedEmployeeManager) {
    const originalAddEmployee = window.unifiedEmployeeManager.addEmployee;
    const originalUpdateEmployee = window.unifiedEmployeeManager.updateEmployee;
    const originalSaveData = window.unifiedEmployeeManager.saveData;
    
    window.unifiedEmployeeManager.addEmployee = function(...args) {
        console.log('\n➕ ADD EMPLOYEE CALLED:', args[0]);
        return originalAddEmployee.apply(this, args);
    };
    
    window.unifiedEmployeeManager.updateEmployee = function(...args) {
        console.log('\n✏️ UPDATE EMPLOYEE CALLED:', args[0], args[1]);
        return originalUpdateEmployee.apply(this, args);
    };
    
    window.unifiedEmployeeManager.saveData = function(...args) {
        console.log('\n💾 SAVE DATA CALLED');
        return originalSaveData.apply(this, args);
    };
}

// Run initial checks
checkAuth();
checkBackendService();
checkUnifiedManager();

console.log('\n📋 INSTRUCTIONS:');
console.log('1. Now try to add or edit an employee in the UI');
console.log('2. Watch this console for real-time debugging info');
console.log('3. Look for any errors or failed API calls');
console.log('4. If no API calls appear, the frontend isn\'t trying to save');

// Set up periodic monitoring
setInterval(() => {
    // Silent check every 5 seconds
    if (!localStorage.getItem('auth_token') && !localStorage.getItem('auth-token') && !localStorage.getItem('jwt_token')) {
        if (!window._authWarningShown) {
            console.log('\n⚠️ AUTHENTICATION LOST - this is why changes don\'t save!');
            window._authWarningShown = true;
        }
    }
}, 5000);
