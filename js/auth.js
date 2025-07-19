// Authentication Service for Bricks Attendance System
// Handles login, session management, role checking, and routing

class AuthService {
    constructor() {
        this.storageKey = 'bricks_auth_session';
        this.tokenExpiryKey = 'bricks_auth_expiry';
        this.userKey = 'bricks_auth_user';
        this.sessionDuration = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
        
        // Default credentials for development
        this.defaultCredentials = {
            admin: { username: 'admin', password: 'admin123', role: 'admin' }
        };
        
        // Initialize authentication state
        this.init();
    }

    // Initialize authentication service
    init() {
        // Clear any corrupted session data first
        this.validateAndCleanSession();
        this.checkSessionValidity();
        this.setupAutoLogout();
        this.startTokenRefreshInterval(); // Start the token refresh interval
    }

    // Validate and clean corrupted session data
    validateAndCleanSession() {
        try {
            const token = localStorage.getItem(this.storageKey);
            const expiry = localStorage.getItem(this.tokenExpiryKey);
            const userData = localStorage.getItem(this.userKey);

            // Check if session data is valid
            if (token && expiry && userData) {
                // Try to parse user data
                JSON.parse(userData);
                // Check if expiry is a valid number
                const expiryTime = parseInt(expiry);
                if (isNaN(expiryTime)) {
                    throw new Error('Invalid expiry time');
                }
            }
        } catch (error) {
            console.warn('Corrupted session data detected, clearing...', error);
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.tokenExpiryKey);
            localStorage.removeItem(this.userKey);
            localStorage.removeItem('currentUser'); // Also clear legacy key
        }
    }

    // Generate a mock JWT-like token for development
    generateToken(user) {
        try {
            // Check if btoa is available (polyfill for older browsers)
            if (typeof btoa === 'undefined') {
                throw new Error('btoa function not available');
            }
            
            const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
            const payload = btoa(JSON.stringify({
                sub: user.id || user.username,
                username: user.username,
                role: user.role,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor((Date.now() + this.sessionDuration) / 1000)
            }));
            const signature = btoa(`mock_signature_${Date.now()}`);
            
            return `${header}.${payload}.${signature}`;
        } catch (error) {
            console.error('Error generating token:', error);
            // Fallback: simple token without base64 encoding
            return `simple_token_${user.username}_${Date.now()}`;
        }
    }

    // Decode token payload (for mock tokens)
    decodeToken(token) {
        try {
            // Check if atob is available
            if (typeof atob === 'undefined') {
                console.warn('atob function not available - cannot decode token');
                return null;
            }
            
            const parts = token.split('.');
            if (parts.length !== 3) {
                console.warn('Invalid token format');
                return null;
            }
            
            const payload = JSON.parse(atob(parts[1]));
            return payload;
        } catch (error) {
            console.error('Error decoding token:', error);
            return null;
        }
    }

    // Validate credentials against backend or fallback
    async validateCredentials(username, password) {
        try {
            // First, try backend authentication API
            try {
                console.log('Trying backend authentication API...');
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: username,
                        password: password
                    })
                });

                const data = await response.json();
                console.log('Backend auth response:', data);
                console.log('Backend auth token:', data.data ? data.data.token : 'No data object');

                if (data.success && data.data) {
                    console.log('Backend auth successful, token length:', data.data.token ? data.data.token.length : 'No token');
                    return {
                        success: true,
                        user: data.data.user,
                        token: data.data.token  // Use the real JWT token from backend
                    };
                }
            } catch (backendError) {
                console.log('Backend authentication failed, trying fallback:', backendError.message);
            }

            // Unified managers removed - now using DirectFlow authentication exclusively
            console.log('Authentication relies on DirectFlow backend API only');

            // Third, fallback: Check default credentials
            for (const [key, creds] of Object.entries(this.defaultCredentials)) {
                if (creds.username === username && creds.password === password) {
                    return {
                        success: true,
                        user: {
                            id: key === 'admin' ? 1 : 2,
                            username: creds.username,
                            role: creds.role,
                            employee: key === 'admin' ? null : {
                                id: 2,
                                firstName: 'John',
                                lastName: 'Employee',
                                department: 'General',
                                position: 'Staff'
                            }
                        }
                        // Note: No token provided for fallback auth
                    };
                }
            }

            // Fourth, if data service is available, check against it
            if (typeof dataService !== 'undefined') {
                const result = await dataService.login(username, password);
                return result;
            }

            return { success: false, message: 'Invalid credentials' };
        } catch (error) {
            console.error('Credential validation error:', error);
            return { success: false, message: 'Authentication failed' };
        }
    }

    // Login function
    async login(username, password, rememberMe = false) {
        try {
            console.log('AuthService: Starting login process...', { username, rememberMe });
            
            const validation = await this.validateCredentials(username, password);
            console.log('AuthService: Validation result:', validation);
            
            if (!validation.success) {
                console.log('AuthService: Login failed - invalid credentials');
                return {
                    success: false,
                    message: validation.message || 'Invalid username or password'
                };
            }

            const user = validation.user;
            console.log('AuthService: User validated:', user);
            
            // Prioritize backend JWT token over generated mock token
            const token = validation.token;
            console.log('AuthService: Token from validation:', token ? token.substring(0, 50) + '...' : 'No token');
            if (!token) {
                console.error('AuthService: No token received from backend - this should not happen');
                return {
                    success: false,
                    message: 'Authentication failed - no token received'
                };
            }
            console.log('AuthService: Using backend JWT token');
            
            const expiryTime = Date.now() + (rememberMe ? this.sessionDuration * 7 : this.sessionDuration);
            console.log('AuthService: Setting expiry time:', new Date(expiryTime));

            // Store authentication data using backend authentication keys (preferred by isAuthenticated)
            localStorage.setItem('auth_token', token);
            localStorage.setItem('auth_user', JSON.stringify(user));
            localStorage.setItem('auth_expires', expiryTime.toString());
            
            // Also store using the old system keys for backward compatibility
            localStorage.setItem(this.storageKey, token);
            localStorage.setItem(this.tokenExpiryKey, expiryTime.toString());
            localStorage.setItem(this.userKey, JSON.stringify(user));
            
            // Also store with legacy key for compatibility with employee.html
            localStorage.setItem('currentUser', JSON.stringify(user));
            console.log('AuthService: Stored authentication data with both keys');

            // Set token in data service if available
            if (typeof dataService !== 'undefined' && dataService && typeof dataService.setAuthToken === 'function') {
                dataService.setAuthToken(token);
                console.log('AuthService: Set token in data service');
            } else {
                console.warn('AuthService: dataService.setAuthToken not available');
            }

            // Trigger login event
            this.triggerAuthEvent('login', user);
            console.log('AuthService: Triggered login event');

            // UnifiedEmployeeManager removed - no longer needed with DirectFlow
            console.log('AuthService: Using DirectFlow authentication - no unified manager initialization required');

            const redirectUrl = this.getRedirectUrl(user.role);
            console.log('AuthService: Redirect URL:', redirectUrl);

            return {
                success: true,
                user,
                token,
                redirectUrl
            };
        } catch (error) {
            console.error('AuthService: Login error details:', error);
            console.error('AuthService: Error stack:', error.stack);
            return {
                success: false,
                message: `Authentication error: ${error.message || 'Unknown error occurred'}`
            };
        }
    }

    // Logout function (clear both auth systems)
    logout(reason = 'user_logout') {
        // Get user data before clearing (avoid circular dependency)
        let user = null;
        try {
            const userData = localStorage.getItem(this.userKey) || localStorage.getItem('auth_user');
            user = userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Error getting user data for logout:', error);
        }
        
        // Clear ALL authentication data (both old and new systems)
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.tokenExpiryKey);
        localStorage.removeItem(this.userKey);
        localStorage.removeItem('currentUser'); // Legacy key
        
        // Clear backend authentication data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_expires');

        // Clear data service token if available
        if (typeof dataService !== 'undefined' && dataService && typeof dataService.setAuthToken === 'function') {
            dataService.setAuthToken(null);
        }

        // Trigger logout event
        this.triggerAuthEvent('logout', { user, reason });

        // Redirect to login page only if we're not already on it
        if (typeof window !== 'undefined' && window.location && !window.location.pathname.includes('login.html')) {
            // Add flag to prevent redirect loops
            const redirectUrl = 'login.html?noRedirect=true&logout=true';
            console.log('🔐 Logout redirect to:', redirectUrl);
            window.location.href = redirectUrl;
        }
    }

    // Check if user is authenticated (check both old and new auth systems)
    isAuthenticated() {
        console.log('🔍 isAuthenticated: Checking authentication status...');
        
        // First, check for backend authentication tokens (preferred)
        const backendToken = localStorage.getItem('auth_token');
        const backendUser = localStorage.getItem('auth_user');
        const backendExpires = localStorage.getItem('auth_expires');
        
        console.log('🔍 Backend auth check:', { 
            hasToken: !!backendToken, 
            hasUser: !!backendUser, 
            hasExpires: !!backendExpires 
        });
        
        if (backendToken && backendUser) {
            // Check if backend token is expired
            if (backendExpires) {
                const expiryTime = parseInt(backendExpires);
                if (Date.now() > expiryTime) {
                    console.log('🔍 Backend token expired, clearing...');
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('auth_user');
                    localStorage.removeItem('auth_expires');
                    return false;
                }
            }
            console.log('✅ Backend authentication found and valid');
            return true;
        }
        
        console.log('🔍 Backend auth not found, checking fallback system...');
        
        // Fallback: Check old authentication system
        const token = localStorage.getItem(this.storageKey);
        const expiry = localStorage.getItem(this.tokenExpiryKey);
        
        console.log('🔍 Fallback auth check:', { 
            hasToken: !!token, 
            hasExpiry: !!expiry 
        });
        
        if (!token || !expiry) {
            console.log('🔍 No fallback tokens found');
            return false;
        }

        // Check if token is expired
        if (Date.now() > parseInt(expiry)) {
            console.log('🔍 Fallback token expired, clearing...');
            // Don't call logout here to avoid circular dependency
            // Just clear the data silently
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.tokenExpiryKey);
            localStorage.removeItem(this.userKey);
            localStorage.removeItem('currentUser'); // Also clear legacy key
            return false;
        }

        console.log('✅ Fallback authentication found and valid');
        return true;
    }

    // Get current user data (check both auth systems)
    getCurrentUser() {
        if (!this.isAuthenticated()) {
            return null;
        }

        try {
            // First, try backend authentication user data
            const backendUser = localStorage.getItem('auth_user');
            if (backendUser) {
                console.log('✅ Using backend user data');
                return JSON.parse(backendUser);
            }
            
            // Fallback: Try old authentication system
            const userData = localStorage.getItem(this.userKey);
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Error parsing user data:', error);
            // Don't call logout here to avoid circular dependency
            // Just clear the invalid data
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.tokenExpiryKey);
            localStorage.removeItem(this.userKey);
            localStorage.removeItem('currentUser'); // Also clear legacy key
            localStorage.removeItem('auth_user'); // Also clear backend user
            return null;
        }
    }

    // Get current user role
    getCurrentRole() {
        const user = this.getCurrentUser();
        return user ? user.role : null;
    }

    // Get current authentication token (check both auth systems)
    getToken() {
        if (!this.isAuthenticated()) {
            return null;
        }
        
        // First, try backend authentication token (preferred)
        const backendToken = localStorage.getItem('auth_token');
        if (backendToken) {
            console.log('✅ Using backend auth token');
            return backendToken;
        }
        
        // Fallback: Use old authentication system token
        return localStorage.getItem(this.storageKey);
    }

    // Check if user has specific role
    hasRole(role) {
        const currentRole = this.getCurrentRole();
        return currentRole === role;
    }

    // Check if user is admin
    isAdmin() {
        return this.hasRole('admin');
    }

    // Check if user is employee
    isEmployee() {
        return this.hasRole('employee');
    }

    // Role-based access control
    canAccess(requiredRole) {
        const currentRole = this.getCurrentRole();
        
        if (!currentRole) {
            return false;
        }

        // Admin can access everything
        if (currentRole === 'admin') {
            return true;
        }

        // Employee can only access employee-specific resources
        if (currentRole === 'employee' && requiredRole === 'employee') {
            return true;
        }

        return false;
    }

    // Get redirect URL based on role
    getRedirectUrl(role) {
        switch (role) {
            case 'admin':
                return '/dashboard.html';
            case 'employee':
                return '/employee.html';
            default:
                return '/login.html';
        }
    }

    // Check session validity and handle expired sessions
    checkSessionValidity() {
        // DISABLE OLD AUTH REDIRECTS - Login page now handles this with BackendAuthService
        if (window.location.pathname.includes('login.html')) {
            console.log('🔐 On login page, skipping old auth redirect check');
            return;
        }
        
        // Skip redirect check if we're using the new backend auth system
        if (typeof window.authService !== 'undefined' && window.authService.constructor.name === 'BackendAuthService') {
            console.log('🔐 Using BackendAuthService, skipping old auth check');
            return;
        }
        
        if (!this.isAuthenticated()) {
            // If we're not on the login page, redirect there
            if (typeof window !== 'undefined' && window.location && 
                !window.location.pathname.includes('login.html') &&
                !window.location.pathname.includes('index.html')) {
                
                // Add noRedirect flag to prevent redirect loops
                const redirectUrl = 'login.html?noRedirect=true&from=' + encodeURIComponent(window.location.pathname);
                console.log('🔐 Old auth system redirecting to:', redirectUrl);
                window.location.href = redirectUrl;
            }
        }
    }

    // Setup automatic logout timer
    setupAutoLogout() {
        const expiry = localStorage.getItem(this.tokenExpiryKey);
        
        if (expiry) {
            const timeUntilExpiry = parseInt(expiry) - Date.now();
            
            if (timeUntilExpiry > 0) {
                setTimeout(() => {
                    this.logout('session_expired');
                }, timeUntilExpiry);
            }
        }
    }

    // Automatic token refresh
    async refreshToken() {
        try {
            console.log('🔄 Attempting to refresh token...');
            
            const token = localStorage.getItem('auth_token') || localStorage.getItem(this.storageKey);
            if (!token) {
                console.log('❌ No token found for refresh');
                return { success: false, message: 'No token available' };
            }
            
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    rememberMe: false // You can make this configurable
                })
            });
            
            const data = await response.json();
            console.log('🔄 Token refresh response:', data);
            
            if (data.success && data.data.needsRefresh) {
                // Update stored token
                const newToken = data.data.token;
                const expiryTime = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
                
                localStorage.setItem('auth_token', newToken);
                localStorage.setItem('auth_expires', expiryTime.toString());
                localStorage.setItem(this.storageKey, newToken);
                localStorage.setItem(this.tokenExpiryKey, expiryTime.toString());
                
                console.log('✅ Token refreshed successfully');
                return { success: true, token: newToken };
            } else if (data.success && !data.data.needsRefresh) {
                console.log('✅ Token still valid, no refresh needed');
                return { success: true, message: 'Token still valid' };
            } else {
                console.log('❌ Token refresh failed:', data.message);
                return { success: false, message: data.message };
            }
            
        } catch (error) {
            console.error('Token refresh error:', error);
            return { success: false, message: 'Network error during refresh' };
        }
    }

    // Check if token needs refresh (within 2 hours of expiry)
    needsTokenRefresh() {
        const backendExpires = localStorage.getItem('auth_expires');
        const fallbackExpires = localStorage.getItem(this.tokenExpiryKey);
        
        const expiryTime = backendExpires || fallbackExpires;
        if (!expiryTime) return false;
        
        const currentTime = Date.now();
        const expiry = parseInt(expiryTime);
        const timeUntilExpiry = expiry - currentTime;
        const twoHoursInMs = 2 * 60 * 60 * 1000;
        
        return timeUntilExpiry <= twoHoursInMs && timeUntilExpiry > 0;
    }

    // Start automatic token refresh interval
    startTokenRefreshInterval() {
        // Check every 30 minutes
        const checkInterval = 30 * 60 * 1000; // 30 minutes
        
        setInterval(async () => {
            if (this.isAuthenticated() && this.needsTokenRefresh()) {
                console.log('🔄 Token needs refresh, attempting automatic refresh...');
                const result = await this.refreshToken();
                
                if (!result.success) {
                    console.log('❌ Automatic token refresh failed, logging out user');
                    this.logout('token_expired');
                }
            }
        }, checkInterval);
    }

    // Refresh session (extend expiry time)
    refreshSession() {
        if (!this.isAuthenticated()) {
            return false;
        }

        const newExpiry = Date.now() + this.sessionDuration;
        localStorage.setItem(this.tokenExpiryKey, newExpiry.toString());
        
        // Reset auto-logout timer
        this.setupAutoLogout();
        
        return true;
    }

    // Update user data in session
    updateUserData(userData) {
        if (!this.isAuthenticated()) {
            return false;
        }

        try {
            const currentUser = this.getCurrentUser();
            const updatedUser = { ...currentUser, ...userData };
            localStorage.setItem(this.userKey, JSON.stringify(updatedUser));
            
            // Trigger user update event
            this.triggerAuthEvent('user_updated', updatedUser);
            
            return true;
        } catch (error) {
            console.error('Error updating user data:', error);
            return false;
        }
    }

    // Change password (using DirectFlow backend API)
    async changePassword(currentPassword, newPassword) {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        try {
            const user = this.getCurrentUser();
            
            // UnifiedAccountManager removed - use DirectFlow backend API for password changes
            console.log('Password change requests now handled by DirectFlow backend API');
            
            // Fallback for demo mode
            if (typeof dataService !== 'undefined') {
                // Mock implementation - in production this would be a secure API call
                console.log('Password change requested for user:', user.username);
                return { success: true, message: 'Password changed successfully' };
            }

            return { success: false, message: 'Password change not available in demo mode' };
        } catch (error) {
            console.error('Password change error:', error);
            throw error;
        }
    }

    // Reset password (admin function)
    async resetPassword(username, newPassword, forceChange = true) {
        if (!this.isAuthenticated() || !this.isAdmin()) {
            throw new Error('Not authorized to reset passwords');
        }

        try {
            // UnifiedAccountManager removed - use DirectFlow backend API for password reset
            console.log('Password reset requests now handled by DirectFlow backend API');

            return { success: false, message: 'Password reset not available' };
        } catch (error) {
            console.error('Password reset error:', error);
            throw error;
        }
    }

    // Get account manager instance - DEPRECATED (unified managers removed)
    getAccountManager() {
        console.warn('getAccountManager() deprecated - unified managers removed');
        return null;
    }

    // Check if password change is required
    mustChangePassword() {
        const user = this.getCurrentUser();
        if (!user) return false;

        // Unified account manager removed - implement via DirectFlow backend API if needed
        console.log('Password change requirements now handled by DirectFlow backend API');
        return false;
    }

    // Create account for new employee (admin function) - DEPRECATED
    async createEmployeeAccount(employee, password = null) {
        if (!this.isAuthenticated() || !this.isAdmin()) {
            throw new Error('Not authorized to create accounts');
        }

        try {
            // UnifiedAccountManager removed - use DirectFlow backend API for account creation
            console.log('Employee account creation now handled by DirectFlow backend API');
            
            return { success: false, message: 'Account creation not available - use DirectFlow backend API' };
        } catch (error) {
            console.error('Error creating employee account:', error);
            throw error;
        }
    }

    // Trigger authentication events
    triggerAuthEvent(eventType, data) {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            const event = new CustomEvent(`auth:${eventType}`, {
                detail: data
            });
            window.dispatchEvent(event);
        }
    }

    // Listen for authentication events
    onAuthEvent(eventType, callback) {
        if (typeof window !== 'undefined' && window.addEventListener) {
            window.addEventListener(`auth:${eventType}`, (event) => {
                callback(event.detail);
            });
        }
    }

    // Route protection middleware
    requireAuth(requiredRole = null) {
        if (!this.isAuthenticated()) {
            this.logout('unauthorized');
            return false;
        }

        if (requiredRole && !this.canAccess(requiredRole)) {
            // Redirect to appropriate page based on current role
            const currentRole = this.getCurrentRole();
            const redirectUrl = this.getRedirectUrl(currentRole);
            
            if (typeof window !== 'undefined' && window.location) {
                window.location.href = redirectUrl;
            }
            
            return false;
        }

        // Refresh session on successful access
        this.refreshSession();
        return true;
    }

    // Initialize page protection
    initPageProtection() {
        if (typeof window === 'undefined') return;

        const currentPath = window.location.pathname;
        const isLoginPage = currentPath.includes('login.html') || currentPath.includes('index.html');

        // If user is authenticated and on login page, redirect to dashboard
        if (this.isAuthenticated() && isLoginPage) {
            const user = this.getCurrentUser();
            const redirectUrl = this.getRedirectUrl(user.role);
            window.location.href = redirectUrl;
            return;
        }

        // If user is not authenticated and not on login page, redirect to login
        if (!this.isAuthenticated() && !isLoginPage) {
            this.logout('no_session');
            return;
        }

        // Role-based page protection
        if (this.isAuthenticated() && !isLoginPage) {
            const currentRole = this.getCurrentRole();
            
            // Admin pages
            if ((currentPath.includes('dashboard.html') || 
                 currentPath.includes('analytics.html') || 
                 currentPath.includes('payroll.html') || 
                 currentPath.includes('settings.html')) && 
                !this.isAdmin()) {
                window.location.href = this.getRedirectUrl(currentRole);
                return;
            }

            // Employee pages
            if (currentPath.includes('employee.html') && !this.isEmployee()) {
                window.location.href = this.getRedirectUrl(currentRole);
                return;
            }
        }
    }

    // Get session info for debugging
    getSessionInfo() {
        return {
            isAuthenticated: this.isAuthenticated(),
            user: this.getCurrentUser(),
            role: this.getCurrentRole(),
            token: this.getToken(),
            expiry: localStorage.getItem(this.tokenExpiryKey),
            timeUntilExpiry: this.isAuthenticated() ? 
                parseInt(localStorage.getItem(this.tokenExpiryKey)) - Date.now() : null
        };
    }
}

// Create and export singleton instance immediately to avoid temporal dead zone issues
const authService = new AuthService();

// Export immediately for both module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = authService;
} else if (typeof window !== 'undefined') {
    window.authService = authService;
}

// Initialize page protection when DOM is loaded
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            authService.initPageProtection();
        });
    } else {
        authService.initPageProtection();
    }
}