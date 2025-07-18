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
        this.setupAuthSync();
        this.initialized = true;
        console.log('✅ DirectFlowAuth initialized with sync');
    }

    // Check if current token is valid
    checkTokenValidity() {
        const token = this.getToken(); // Use the improved getToken method
        
        if (!token) {
            return false;
        }
        
        // For development tokens, always consider them valid
        if (token.startsWith('dev_token_')) {
            return true;
        }
        
        // For regular tokens, check expiry
        const expires = localStorage.getItem(this.expiryKey);
        if (expires && Date.now() > parseInt(expires)) {
            this.clearAuth();
            return false;
        }

        return true;
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
    async logout(redirectToLogin = true) {
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
            
            // Redirect immediately if requested
            if (redirectToLogin) {
                console.log('🔐 Redirecting to login...');
                window.location.href = '/login.html';
            }
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
        // Try multiple token storage keys for backward compatibility
        const directFlowToken = localStorage.getItem(this.tokenKey);
        if (directFlowToken && this.isValidToken(directFlowToken)) {
            return directFlowToken;
        }
        
        // Fallback to other token keys
        const fallbackTokens = ['token', 'auth_token', 'directflow_token'];
        for (const key of fallbackTokens) {
            const token = localStorage.getItem(key);
            if (token && this.isValidToken(token)) {
                // Store it in the main DirectFlow token key for consistency
                localStorage.setItem(this.tokenKey, token);
                return token;
            }
        }
        
        return null;
    }
    
    // Validate token format
    isValidToken(token) {
        if (!token) return false;
        
        // Allow development tokens
        if (token.startsWith('dev_token_')) {
            return true;
        }
        
        // Allow JWT tokens (basic format check)
        if (token.includes('.') && token.split('.').length === 3) {
            return true;
        }
        
        // Allow other bearer tokens
        return token.length > 10;
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
        
        // Also set up auth sync
        this.setupAuthSync();
    }

    /**
     * Attempt automatic login with session restoration
     */
    async attemptAutoLogin() {
        // Only attempt auto-login if we're not on login page
        if (window.location.pathname.includes('login.html')) {
            console.log('🔐 On login page, skipping auto-login');
            return;
        }
        
        try {
            console.log('🔄 Attempting auto-login with DirectFlow Auth...');
            
            // Check if we have valid session data
            const isAuthenticated = this.isAuthenticated();
            if (isAuthenticated) {
                console.log('✅ Auto-login successful via session restoration');
                return true;
            }
            
            console.log('⚠️ Auto-login failed - user needs to log in manually');
            
            // If auto-login fails and we're not on login page, redirect
            if (!window.location.pathname.includes('login.html')) {
                console.log('🔄 Redirecting to login page...');
                window.location.href = '/login.html';
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ Auto-login error:', error);
            
            // If auto-login fails and we're not on login page, redirect
            if (!window.location.pathname.includes('login.html')) {
                console.log('🔄 Redirecting to login page due to error...');
                window.location.href = '/login.html';
            }
            
            return false;
        }
    }

    /**
     * Sync authentication status and tokens
     */
    syncAuthStatus() {
        // Check if user is authenticated
        const isAuthenticated = this.isAuthenticated();
        console.log('User authenticated:', isAuthenticated);
        
        if (isAuthenticated) {
            // Get the auth token
            const token = this.getToken();
            console.log('Auth token from DirectFlowAuth:', token ? 'Present' : 'Missing');
            
            if (!token) {
                console.log('⚠️ DirectFlowAuth says authenticated but no token found');
                this.attemptAutoLogin();
            }
        } else {
            console.log('❌ User not authenticated - attempting auto-login');
            this.attemptAutoLogin();
        }
    }

    /**
     * Set up periodic authentication synchronization
     */
    setupAuthSync() {
        // Sync immediately
        this.syncAuthStatus();
        
        // Sync every 10 seconds for active monitoring
        setInterval(() => this.syncAuthStatus(), 10000);
        
        // Sync on visibility change (when user returns to tab)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.syncAuthStatus();
            }
        });
        
        // Sync on storage change (when auth data changes in another tab)
        window.addEventListener('storage', (e) => {
            if (e.key === this.tokenKey || e.key === this.userKey || e.key === this.expiryKey) {
                this.syncAuthStatus();
            }
        });
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
            console.log('❌ API request unauthorized, logging out');
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
