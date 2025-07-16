// DirectFlow Authentication Fix
// This script ensures DirectFlow works with the existing authentication system

console.log('🔧 DirectFlow Authentication Fix initializing...');

// Function to sync DirectFlow with auth service
function syncDirectFlowAuth() {
    if (typeof window.directFlow === 'undefined') {
        console.warn('DirectFlow not available');
        return;
    }
    
    if (typeof window.directFlowAuth === 'undefined') {
        console.warn('DirectFlow Auth service not available');
        return;
    }
    
    // Check if user is authenticated
    const isAuthenticated = window.directFlowAuth.isAuthenticated();
    console.log('User authenticated:', isAuthenticated);
    
    if (isAuthenticated) {
        // Get the auth token from DirectFlow Auth
        const token = window.directFlowAuth.getToken();
        console.log('Auth token from DirectFlow Auth:', token ? 'Present' : 'Missing');
        
        if (token && !window.directFlow.initialized) {
            console.log('✅ DirectFlow Auth has token, trying to initialize DirectFlow');
            
            // Retry initialization if DirectFlow wasn't initialized
            if (typeof window.directFlow.reinitialize === 'function') {
                window.directFlow.reinitialize();
            }
        } else if (!token) {
            console.log('⚠️ DirectFlow Auth says authenticated but no token found');
            attemptAutoLogin();
        }
    } else {
        console.log('❌ User not authenticated - attempting auto-login');
        attemptAutoLogin();
    }
}

// Attempt automatic login with default credentials
async function attemptAutoLogin() {
    // Only attempt auto-login if we're not on login page
    if (window.location.pathname.includes('login.html')) {
        console.log('🔐 On login page, skipping auto-login');
        return;
    }
    
    try {
        console.log('🔄 Attempting auto-login with DirectFlow Auth...');
        
        if (typeof window.directFlowAuth === 'undefined') {
            console.warn('DirectFlow Auth not available for auto-login');
            return;
        }
        
        // Check if DirectFlow Auth has a session restoration method
        if (typeof window.directFlowAuth.checkAuthStatus === 'function') {
            const result = await window.directFlowAuth.checkAuthStatus();
            if (result.isAuthenticated) {
                console.log('✅ Auto-login successful via session restoration');
                // Trigger DirectFlow initialization
                if (typeof window.directFlow.reinitialize === 'function') {
                    window.directFlow.reinitialize();
                }
                return;
            }
        }
        
        console.log('⚠️ Auto-login failed - user needs to log in manually');
        
        // If auto-login fails and we're not on login page, redirect
        if (!window.location.pathname.includes('login.html')) {
            console.log('🔄 Redirecting to login page...');
            window.location.href = '/login.html';
        }
        
    } catch (error) {
        console.error('❌ Auto-login error:', error);
        
        // If auto-login fails and we're not on login page, redirect
        if (!window.location.pathname.includes('login.html')) {
            console.log('🔄 Redirecting to login page due to error...');
            window.location.href = '/login.html';
        }
    }
}

// Set up periodic sync
function setupAuthSync() {
    // Sync immediately
    syncDirectFlowAuth();
    
    // Sync every 10 seconds
    setInterval(syncDirectFlowAuth, 10000);
    
    // Sync on visibility change
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            syncDirectFlowAuth();
        }
    });
    
    // Sync on storage change
    window.addEventListener('storage', (e) => {
        if (e.key === 'directflow_token' || e.key === 'directflow_user') {
            syncDirectFlowAuth();
        }
    });
}

// Initialize when both services are available
function initializeAuthSync() {
    let attempts = 0;
    const maxAttempts = 50;
    
    function checkAndInit() {
        attempts++;
        
        if (typeof window.directFlow !== 'undefined' && typeof window.directFlowAuth !== 'undefined') {
            console.log('✅ Both DirectFlow services available - setting up auth sync');
            setupAuthSync();
            return;
        }
        
        if (attempts >= maxAttempts) {
            console.warn('❌ Max attempts reached - DirectFlow services not available');
            // Don't block the page, just log the warning
            return;
        }
        
        setTimeout(checkAndInit, 100);
    }
    
    checkAndInit();
}

// Start the initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuthSync);
} else {
    initializeAuthSync();
}

// Export functions for manual use
window.syncDirectFlowAuth = syncDirectFlowAuth;
window.setupAuthSync = setupAuthSync;
window.attemptAutoLogin = attemptAutoLogin;
