// DirectFlow Authentication Fix
// This script ensures DirectFlow works with the existing authentication system

console.log('🔧 DirectFlow Authentication Fix initializing...');

// Function to sync DirectFlow with auth service
function syncDirectFlowAuth() {
    if (typeof window.directFlow === 'undefined') {
        console.warn('DirectFlow not available');
        return;
    }
    
    if (typeof window.authService === 'undefined') {
        console.warn('Auth service not available');
        return;
    }
    
    // Check if user is authenticated
    const isAuthenticated = window.authService.isAuthenticated();
    console.log('User authenticated:', isAuthenticated);
    
    if (isAuthenticated) {
        // Get the auth token from the session
        const token = localStorage.getItem('bricks_auth_session');
        console.log('Auth token from localStorage:', token ? 'Present' : 'Missing');
        
        if (token && token !== window.directFlow.authToken) {
            console.log('✅ Syncing DirectFlow with auth token');
            window.directFlow.authToken = token;
            window.directFlow.initialized = true;
            
            // Emit auth update event
            window.directFlow.emit('auth-updated', { token });
            
            // Retry initialization if DirectFlow wasn't initialized
            if (!window.directFlow.initialized && typeof window.directFlow.retryInitialization === 'function') {
                window.directFlow.retryInitialization();
            }
        } else if (!token) {
            console.log('⚠️ Auth service says authenticated but no token found');
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
        console.log('🔄 Attempting auto-login with default credentials...');
        
        if (typeof window.authService === 'undefined') {
            console.warn('Auth service not available for auto-login');
            return;
        }
        
        // Try to login with default admin credentials
        const loginResult = await window.authService.login('admin', 'admin');
        
        if (loginResult.success) {
            console.log('✅ Auto-login successful');
            
            // Re-sync DirectFlow after successful login
            setTimeout(() => {
                syncDirectFlowAuth();
                
                // Also retry DirectFlow initialization
                if (window.directFlow && typeof window.directFlow.retryInitialization === 'function') {
                    window.directFlow.retryInitialization();
                }
            }, 500);
        } else {
            console.log('❌ Auto-login failed:', loginResult.message);
            
            // If auto-login fails and we're not on login page, redirect
            if (!window.location.pathname.includes('login.html')) {
                console.log('🔄 Redirecting to login page...');
                window.location.href = '/login.html';
            }
        }
    } catch (error) {
        console.error('Auto-login error:', error);
        
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
        if (e.key === 'bricks_auth_session' || e.key === 'bricks_auth_user') {
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
        
        if (typeof window.directFlow !== 'undefined' && typeof window.authService !== 'undefined') {
            console.log('✅ Both services available - setting up auth sync');
            setupAuthSync();
            return;
        }
        
        if (attempts >= maxAttempts) {
            console.warn('❌ Max attempts reached - services not available');
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
