// API Configuration for Backend Connection
class APIConfig {
    constructor() {
        // Determine API base URL
        this.baseURL = this.getBaseURL();
        this.timeout = 30000; // 30 seconds
        this.headers = {
            'Content-Type': 'application/json'
        };
        
        // Auth token handling
        this.token = this.getStoredToken();
        
        console.log('API Configuration initialized:', {
            baseURL: this.baseURL,
            hasToken: !!this.token
        });
    }
    
    getBaseURL() {
        // For development, try to detect if backend is running
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        
        // Common backend ports
        const backendPorts = [3000, 3001, 8000, 8080];
        const defaultPort = 3000;
        
        // If we're on localhost, assume backend is on port 3000
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `${protocol}//${hostname}:${defaultPort}/api`;
        }
        
        // For production, use same domain with /api prefix
        return `${protocol}//${window.location.host}/api`;
    }
    
    getStoredToken() {
        try {
            // First, try backend authentication token (preferred)
            const backendToken = localStorage.getItem('auth_token');
            if (backendToken) {
                console.log('✅ API Config using backend auth token');
                return backendToken;
            }
            
            // Fallback: Try to get token from various storage methods
            return localStorage.getItem('authToken') || 
                   localStorage.getItem('token') ||
                   localStorage.getItem('bricks_auth_session') ||
                   sessionStorage.getItem('authToken') ||
                   sessionStorage.getItem('token');
        } catch (error) {
            console.warn('Error getting stored token:', error);
            return null;
        }
    }
    
    setToken(token) {
        this.token = token;
        try {
            localStorage.setItem('authToken', token);
        } catch (error) {
            console.warn('Error storing token:', error);
        }
    }
    
    clearToken() {
        this.token = null;
        try {
            localStorage.removeItem('authToken');
            localStorage.removeItem('token');
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('token');
        } catch (error) {
            console.warn('Error clearing tokens:', error);
        }
    }
    
    getAuthHeaders() {
        const headers = { ...this.headers };
        if (this.token) {
            headers.Authorization = `Bearer ${this.token}`;
        }
        return headers;
    }
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            method: options.method || 'GET',
            headers: this.getAuthHeaders(),
            ...options
        };
        
        // Add body for non-GET requests
        if (options.data && config.method !== 'GET') {
            config.body = JSON.stringify(options.data);
        }
        
        try {
            console.log(`API Request: ${config.method} ${url}`);
            
            const response = await fetch(url, config);
            const data = await response.json();
            
            // Handle authentication errors
            if (response.status === 401) {
                console.warn('🔐 Authentication failed - clearing tokens and redirecting to login');
                this.clearToken();
                
                // Clear all authentication data from both systems
                localStorage.removeItem('auth_token');
                localStorage.removeItem('auth_user');
                localStorage.removeItem('auth_expires');
                localStorage.removeItem('bricks_auth_session');
                localStorage.removeItem('bricks_auth_expiry');
                localStorage.removeItem('bricks_auth_user');
                localStorage.removeItem('currentUser');
                
                // Only redirect if we're not already on the login page
                if (window.location.pathname !== '/login.html' && !window.location.pathname.includes('login.html')) {
                    console.log('🔐 Redirecting to login due to authentication failure');
                    window.location.href = '/login.html?expired=true';
                }
                throw new Error('Authentication required');
            }
            
            if (!response.ok) {
                throw new Error(data.message || `Request failed with status ${response.status}`);
            }
            
            return data;
            
        } catch (error) {
            console.error(`API Error for ${config.method} ${url}:`, error);
            throw error;
        }
    }
    
    // Convenience methods
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }
    
    async post(endpoint, data) {
        return this.request(endpoint, { method: 'POST', data });
    }
    
    async put(endpoint, data) {
        return this.request(endpoint, { method: 'PUT', data });
    }
    
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
    
    // Test backend connection
    async testConnection() {
        try {
            const response = await this.get('/health');
            console.log('Backend connection successful:', response);
            return true;
        } catch (error) {
            console.error('Backend connection failed:', error);
            return false;
        }
    }
    
    // Check if we should use API or localStorage
    async shouldUseAPI() {
        try {
            const isConnected = await this.testConnection();
            console.log('Backend availability:', isConnected ? 'Available' : 'Not available');
            return isConnected;
        } catch (error) {
            console.warn('Using localStorage fallback due to:', error.message);
            return false;
        }
    }
}

// Export singleton instance
window.API = new APIConfig();

// Auto-test connection on load
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            const isConnected = await window.API.testConnection();
            
            // Show connection status in console
            if (isConnected) {
                console.log('✅ Backend API is available - Using database backend');
            } else {
                console.log('ℹ️ Backend API not available - Using localStorage fallback');
            }
            
            // Optionally show notification to user
            if (window.showNotification) {
                const message = isConnected 
                    ? 'Connected to backend database'
                    : 'Using offline mode (localStorage)';
                window.showNotification(message, isConnected ? 'success' : 'info');
            }
            
        } catch (error) {
            console.warn('Backend connection test failed:', error);
        }
    });
}
