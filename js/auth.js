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
            admin: { username: 'admin', password: 'admin', role: 'admin' },
            employee: { username: 'employee', password: 'employee', role: 'employee' }
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

    // Validate credentials against default or data service
    async validateCredentials(username, password) {
        try {
            // First check default credentials
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
                    };
                }
            }

            // If data service is available, check against it
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
            
            const token = validation.token || this.generateToken(user);
            console.log('AuthService: Token generated');
            
            const expiryTime = Date.now() + (rememberMe ? this.sessionDuration * 7 : this.sessionDuration);
            console.log('AuthService: Setting expiry time:', new Date(expiryTime));

            // Store authentication data
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

    // Logout function
    logout(reason = 'user_logout') {
        // Get user data before clearing (avoid circular dependency)
        let user = null;
        try {
            const userData = localStorage.getItem(this.userKey);
            user = userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Error getting user data for logout:', error);
        }
        
        // Clear all authentication data
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.tokenExpiryKey);
        localStorage.removeItem(this.userKey);
        localStorage.removeItem('currentUser'); // Also clear legacy key

        // Clear data service token if available
        if (typeof dataService !== 'undefined' && dataService && typeof dataService.setAuthToken === 'function') {
            dataService.setAuthToken(null);
        }

        // Trigger logout event
        this.triggerAuthEvent('logout', { user, reason });

        // Redirect to login page only if we're not already on it
        if (typeof window !== 'undefined' && window.location && !window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        const token = localStorage.getItem(this.storageKey);
        const expiry = localStorage.getItem(this.tokenExpiryKey);
        
        if (!token || !expiry) {
            return false;
        }

        // Check if token is expired
        if (Date.now() > parseInt(expiry)) {
            // Don't call logout here to avoid circular dependency
            // Just clear the data silently
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.tokenExpiryKey);
            localStorage.removeItem(this.userKey);
            localStorage.removeItem('currentUser'); // Also clear legacy key
            return false;
        }

        return true;
    }

    // Get current user data
    getCurrentUser() {
        if (!this.isAuthenticated()) {
            return null;
        }

        try {
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
            return null;
        }
    }

    // Get current user role
    getCurrentRole() {
        const user = this.getCurrentUser();
        return user ? user.role : null;
    }

    // Get current authentication token
    getToken() {
        return this.isAuthenticated() ? localStorage.getItem(this.storageKey) : null;
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
        if (!this.isAuthenticated()) {
            // If we're not on the login page, redirect there
            if (typeof window !== 'undefined' && window.location && 
                !window.location.pathname.includes('login.html') &&
                !window.location.pathname.includes('index.html')) {
                // Don't call logout to avoid circular dependency, just redirect
                window.location.href = 'login.html';
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

    // Change password (for future backend integration)
    async changePassword(currentPassword, newPassword) {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        try {
            // This would call the backend API in production
            if (typeof dataService !== 'undefined') {
                const user = this.getCurrentUser();
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