/**
 * DirectFlow Authentication System
 * Clean, direct backend-only authentication with no fallbacks
 */

class DirectFlowAuth {
    constructor() {
        this.baseURL = '/api/auth';
        this.tokenKey = 'directflow_token';
        this.userKey = 'directflow_user';
        this.expiryKey = 'directflow_expires';
        this.initialized = false;
        
        // Initialize
        this.init();
    }

    // Initialize authentication
    init() {
        this.checkTokenValidity();
        this.startTokenRefreshInterval();
        this.initialized = true;
        console.log('✅ DirectFlowAuth initialized');
    }

    // Check if current token is valid
    checkTokenValidity() {
        const token = localStorage.getItem(this.tokenKey);
        const expires = localStorage.getItem(this.expiryKey);
        
        if (!token || !expires) {
            return false;
        }

        if (Date.now() > parseInt(expires)) {
            this.clearAuth();
            return false;
        }

        return true;
    }

    // Check if token is expired without clearing it
    isTokenExpired() {
        const expires = localStorage.getItem(this.expiryKey);
        if (!expires) return true;
        
        return Date.now() > parseInt(expires);
    }

    // Clear all authentication data
    clearAuth() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        localStorage.removeItem(this.expiryKey);
        
        // Clear any old system data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_expires');
        localStorage.removeItem('bricks_auth_session');
        localStorage.removeItem('bricks_auth_expiry');
        localStorage.removeItem('bricks_auth_user');
        localStorage.removeItem('currentUser');
    }

    // Login with backend
    async login(username, password, rememberMe = false) {
        try {
            console.log('🔐 DirectFlow Login:', username);
            
            const response = await fetch(`${this.baseURL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    password,
                    rememberMe
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('❌ Login failed:', data.message);
                return {
                    success: false,
                    message: data.message || 'Login failed'
                };
            }

            if (data.success && data.data) {
                const { user, token, expiresIn } = data.data;
                
                // Calculate expiry time
                const expiryTime = Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000);
                
                // Store authentication data
                localStorage.setItem(this.tokenKey, token);
                localStorage.setItem(this.userKey, JSON.stringify(user));
                localStorage.setItem(this.expiryKey, expiryTime.toString());
                
                console.log('✅ Login successful:', user.username);
                
                return {
                    success: true,
                    user,
                    token,
                    redirectUrl: this.getRedirectUrl(user.role)
                };
            }

            return {
                success: false,
                message: 'Invalid response format'
            };

        } catch (error) {
            console.error('❌ Login error:', error);
            return {
                success: false,
                message: 'Network error during login'
            };
        }
    }

    // Logout
    async logout() {
        try {
            const token = localStorage.getItem(this.tokenKey);
            
            if (token) {
                // Call backend logout
                await fetch(`${this.baseURL}/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Always clear local data
            this.clearAuth();
            console.log('🔐 Logged out');
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.checkTokenValidity();
    }

    // Get current user
    getCurrentUser() {
        if (!this.isAuthenticated()) {
            return null;
        }

        try {
            const userData = localStorage.getItem(this.userKey);
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Error parsing user data:', error);
            this.clearAuth();
            return null;
        }
    }

    // Get current token
    getToken() {
        return this.isAuthenticated() ? localStorage.getItem(this.tokenKey) : null;
    }

    // Refresh token
    async refreshToken() {
        try {
            const token = localStorage.getItem(this.tokenKey);
            if (!token) {
                return { success: false, message: 'No token to refresh' };
            }

            const response = await fetch(`${this.baseURL}/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success && data.data.needsRefresh) {
                const newToken = data.data.token;
                const expiryTime = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

                localStorage.setItem(this.tokenKey, newToken);
                localStorage.setItem(this.expiryKey, expiryTime.toString());

                console.log('🔄 Token refreshed');
                return { success: true, token: newToken };
            }

            return { success: true, message: 'Token still valid' };

        } catch (error) {
            console.error('Token refresh error:', error);
            return { success: false, message: 'Refresh failed' };
        }
    }

    // Check if token needs refresh (within 2 hours of expiry)
    needsTokenRefresh() {
        const expires = localStorage.getItem(this.expiryKey);
        if (!expires) return false;

        const expiryTime = parseInt(expires);
        const currentTime = Date.now();
        const timeUntilExpiry = expiryTime - currentTime;
        const twoHoursInMs = 2 * 60 * 60 * 1000;

        return timeUntilExpiry <= twoHoursInMs && timeUntilExpiry > 0;
    }

    // Start automatic token refresh
    startTokenRefreshInterval() {
        setInterval(async () => {
            if (this.isAuthenticated() && this.needsTokenRefresh()) {
                const result = await this.refreshToken();
                if (!result.success) {
                    console.log('❌ Token refresh failed, logging out');
                    this.logout();
                }
            }
        }, 30 * 60 * 1000); // Check every 30 minutes
    }

    /**
     * Get redirect URL based on user role
     */
    getRedirectUrl(role) {
        switch (role) {
            case 'admin':
                return '/dashboard.html';
            case 'manager':
                return '/dashboard.html';
            case 'hr':
                return '/employees.html';
            default:
                return '/employee.html';
        }
    }

    // Check user role
    isAdmin() {
        const user = this.getCurrentUser();
        return user && user.role === 'admin';
    }

    isManager() {
        const user = this.getCurrentUser();
        return user && (user.role === 'admin' || user.role === 'manager');
    }

    // Make authenticated API request
    async apiRequest(url, options = {}) {
        const token = this.getToken();
        if (!token) {
            throw new Error('No authentication token');
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        };

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (response.status === 401) {
            console.log('❌ API request unauthorized');
            
            // Check if this is a permission error vs authentication error
            try {
                const errorData = await response.clone().json();
                console.log('🔍 Error response data:', errorData);
                
                // If the error message indicates insufficient permissions, don't logout
                if (errorData.message && 
                    (errorData.message.includes('permission') || 
                     errorData.message.includes('not authorized') ||
                     errorData.message.includes('Access denied') ||
                     errorData.message.includes('Manager or admin'))) {
                    console.log('⚠️ Permission denied, not logging out');
                    throw new Error(errorData.message || 'Access denied');
                }
                
                // If the error is about authentication being required, also don't logout immediately
                if (errorData.message && errorData.message.includes('Authentication required')) {
                    console.log('⚠️ Authentication required, checking token validity...');
                    
                    // Check if we have a valid token
                    const token = this.getToken();
                    if (token && !this.isTokenExpired()) {
                        console.log('⚠️ Token appears valid, not logging out');
                        throw new Error('Authentication issue: ' + errorData.message);
                    }
                }
                
            } catch (parseError) {
                console.log('Could not parse error response:', parseError.message);
                // If we can't parse the error, treat it as a general auth error
            }
            
            // This is likely a token expiration or invalid token
            console.log('❌ Authentication expired, logging out');
            this.logout();
            throw new Error('Authentication expired');
        }

        return response;
    }

    // Handle page protection
    protectPage() {
        const isLoginPage = window.location.pathname.includes('login.html');
        
        if (this.isAuthenticated() && isLoginPage) {
            // Redirect authenticated users away from login page
            window.location.href = this.getRedirectUrl(this.getCurrentUser().role);
            return;
        }

        if (!this.isAuthenticated() && !isLoginPage) {
            // Redirect unauthenticated users to login
            window.location.href = '/login.html';
            return;
        }
    }
}

// Create global instance
window.directFlowAuth = new DirectFlowAuth();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DirectFlowAuth;
}
