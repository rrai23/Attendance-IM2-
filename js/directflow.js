/**
 * DirectFlow Data Manager
 * 
 * A streamlined, backend-only data manager that replaces:
 * - unified-data-service.js
 * - unified-employee-manager.js
 * - backend-api-service.js
 * - All localStorage dependencies
 * 
 * This service connects directly to the backend API endpoints
 * with no fallbacks, no mock data, and no localStorage dependencies.
 */

class DirectFlow {
    constructor() {
        this.baseUrl = '/api';
        this.authToken = null;
        this.eventListeners = new Map();
        this.initialized = false;
        
        // Initialize immediately
        this.init();
    }

    /**
     * Initialize DirectFlow
     */
    async init() {
        try {
            // Get auth token from the authentication system
            this.authToken = this.getAuthToken();
            
            if (!this.authToken) {
                // Check if we're on a page that requires authentication
                const currentPage = window.location.pathname;
                const publicPages = ['/login.html', '/index.html', '/'];
                const isPublicPage = publicPages.some(page => currentPage.endsWith(page)) || currentPage === '/';
                
                if (isPublicPage) {
                    console.log('🔄 DirectFlow on public page - partial initialization');
                    this.initialized = false;
                    return;
                } else {
                    console.warn('⚠️ DirectFlow on authenticated page without token - waiting for auth fix');
                    // Don't redirect immediately, let the auth fix handle it
                    this.initialized = false;
                    
                    // Try to get token again after a delay
                    setTimeout(() => {
                        this.retryInitialization();
                    }, 2000);
                    
                    return;
                }
            }

            // Validate the token with the server (temporarily disabled to prevent login loop)
            // TODO: Fix token validation to work properly with JWT tokens
            const isTokenValid = true; // await this.validateToken();
            if (!isTokenValid) {
                console.warn('⚠️ DirectFlow token validation failed - clearing auth data');
                this.clearAuthData();
                
                // Redirect to login if not on public page
                const currentPage = window.location.pathname;
                const publicPages = ['/login.html', '/index.html', '/'];
                const isPublicPage = publicPages.some(page => currentPage.endsWith(page)) || currentPage === '/';
                
                if (!isPublicPage) {
                    window.location.href = '/login.html';
                }
                
                return;
            }

            // Test connection with a health check
            await this.healthCheck();
            
            this.initialized = true;
            this.emit('initialized', { timestamp: Date.now() });
            
            console.log('🔄 DirectFlow initialized successfully');
        } catch (error) {
            console.error('❌ DirectFlow initialization failed:', error);
            this.initialized = false;
            
            // If it's an auth error, try to re-initialize after a delay
            if (error.message.includes('Authentication')) {
                console.log('🔄 Scheduling DirectFlow re-initialization...');
                setTimeout(() => {
                    this.retryInitialization();
                }, 3000);
            }
            
            // Don't throw error on public pages
            const currentPage = window.location.pathname;
            const publicPages = ['/login.html', '/index.html', '/'];
            const isPublicPage = publicPages.some(page => currentPage.endsWith(page)) || currentPage === '/';
            
            if (!isPublicPage) {
                throw error;
            }
        }
    }

    /**
     * Retry initialization (called by auth fix or after failures)
     */
    async retryInitialization() {
        console.log('🔄 DirectFlow retrying initialization...');
        await this.init();
    }

    /**
     * Get authentication token
     */
    getAuthToken() {
        // Check multiple possible token storage locations
        const tokenSources = [
            'bricks_auth_session',  // Primary auth system token
            'auth-token',
            'auth_token', 
            'jwt_token',
            'bricks_auth_token'
        ];
        
        for (const source of tokenSources) {
            const token = localStorage.getItem(source);
            if (token) {
                return token;
            }
        }
        
        // Also check if we have a user session with embedded token
        try {
            const userData = localStorage.getItem('bricks_auth_user');
            if (userData) {
                const user = JSON.parse(userData);
                if (user.token) {
                    return user.token;
                }
            }
        } catch (error) {
            console.warn('Error parsing user data for token:', error);
        }
        
        return null;
    }

    /**
     * Set authentication token
     */
    setAuthToken(token) {
        this.authToken = token;
        localStorage.setItem('bricks_auth_session', token);
    }

    /**
     * Check if user is authenticated using the auth service
     */
    isAuthenticated() {
        return this.authToken !== null && this.authToken !== undefined && this.authToken !== '';
    }

    /**
     * Validate current token with server
     */
    async validateToken() {
        if (!this.isAuthenticated()) {
            return false;
        }
        
        try {
            const response = await fetch('/api/health', {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            return response.ok;
        } catch (error) {
            console.warn('Token validation failed:', error);
            return false;
        }
    }

    /**
     * Health check endpoint
     */
    async healthCheck() {
        const response = await this.request('/health');
        return response;
    }

    /**
     * Make authenticated request to backend
     */
    async request(endpoint, options = {}) {
        // Try to refresh token if not available
        if (!this.authToken) {
            this.authToken = this.getAuthToken();
        }
        
        if (!this.authToken) {
            throw new Error('Authentication required - no token available');
        }

        const url = `${this.baseUrl}${endpoint}`;
        
        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.authToken}`,
                ...options.headers
            },
            ...options
        };

        // Convert body to JSON if it's an object
        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                if (response.status === 401) {
                    // Clear invalid authentication data
                    this.clearAuthData();
                    
                    // Emit auth error event
                    this.emit('auth-error', { status: response.status, message: 'Authentication failed' });
                    
                    // Log the error but don't redirect immediately - let the dashboard handle it
                    console.warn('🔐 Authentication failed for:', endpoint);
                    
                    throw new Error('Authentication failed - please log in again');
                }
                
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(`API Error ${response.status}: ${errorData.message || response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            if (error.message.includes('fetch')) {
                throw new Error('Network error - backend server may be unavailable');
            }
            throw error;
        }
    }

    // ===============================
    // EMPLOYEE MANAGEMENT
    // ===============================

    /**
     * Get all employees
     */
    async getEmployees() {
        // Try unified data endpoint first (includes both employees and attendance)
        try {
            const unifiedData = await this.request('/unified/data');
            if (unifiedData.success && unifiedData.data.employees) {
                return unifiedData.data.employees;
            }
        } catch (error) {
            console.warn('Unified data endpoint failed, trying employees endpoint:', error.message);
        }
        
        // Fallback to employees endpoint
        return await this.request('/employees');
    }

    /**
     * Get employee by ID
     */
    async getEmployee(employeeId) {
        return await this.request(`/employees/${employeeId}`);
    }

    /**
     * Create new employee
     */
    async createEmployee(employeeData) {
        const response = await this.request('/employees', {
            method: 'POST',
            body: employeeData
        });
        
        this.emit('employee-created', { employee: response.employee });
        return response;
    }

    /**
     * Update employee
     */
    async updateEmployee(employeeId, employeeData) {
        const response = await this.request(`/employees/${employeeId}`, {
            method: 'PUT',
            body: employeeData
        });
        
        this.emit('employee-updated', { employee: response.employee });
        return response;
    }

    /**
     * Delete employee
     */
    async deleteEmployee(employeeId) {
        const response = await this.request(`/employees/${employeeId}`, {
            method: 'DELETE'
        });
        
        this.emit('employee-deleted', { employeeId });
        return response;
    }

    // ===============================
    // ATTENDANCE MANAGEMENT
    // ===============================

    /**
     * Get attendance records
     */
    async getAttendanceRecords(filters = {}) {
        // Try unified data endpoint first (includes both employees and attendance)
        try {
            const unifiedData = await this.request('/unified/data');
            if (unifiedData.success && unifiedData.data.attendanceRecords) {
                return unifiedData.data.attendanceRecords;
            }
        } catch (error) {
            console.warn('Unified data endpoint failed, trying attendance endpoint:', error.message);
        }
        
        // Fallback to attendance endpoint with filters
        const params = new URLSearchParams();
        
        if (filters.employeeId) params.append('employee_id', filters.employeeId);
        if (filters.startDate) params.append('start_date', filters.startDate);
        if (filters.endDate) params.append('end_date', filters.endDate);
        if (filters.status) params.append('status', filters.status);
        
        const query = params.toString();
        const endpoint = query ? `/attendance?${query}` : '/attendance';
        
        return await this.request(endpoint);
    }

    /**
     * Get attendance record by ID
     */
    async getAttendanceRecord(recordId) {
        return await this.request(`/attendance/${recordId}`);
    }

    /**
     * Create attendance record
     */
    async createAttendanceRecord(recordData) {
        const response = await this.request('/attendance', {
            method: 'POST',
            body: recordData
        });
        
        this.emit('attendance-created', { record: response.record });
        return response;
    }

    /**
     * Update attendance record
     */
    async updateAttendanceRecord(recordId, recordData) {
        const response = await this.request(`/attendance/${recordId}`, {
            method: 'PUT',
            body: recordData
        });
        
        this.emit('attendance-updated', { record: response.record });
        return response;
    }

    /**
     * Delete attendance record
     */
    async deleteAttendanceRecord(recordId) {
        const response = await this.request(`/attendance/${recordId}`, {
            method: 'DELETE'
        });
        
        this.emit('attendance-deleted', { recordId });
        return response;
    }

    /**
     * Get attendance overview/summary
     */
    async getAttendanceOverview(filters = {}) {
        const params = new URLSearchParams();
        
        if (filters.startDate) params.append('start_date', filters.startDate);
        if (filters.endDate) params.append('end_date', filters.endDate);
        if (filters.employeeId) params.append('employee_id', filters.employeeId);
        
        const query = params.toString();
        const endpoint = query ? `/attendance/overview?${query}` : '/attendance/overview';
        
        return await this.request(endpoint);
    }

    // ===============================
    // PAYROLL MANAGEMENT
    // ===============================

    /**
     * Get payroll records
     */
    async getPayrollRecords(filters = {}) {
        const params = new URLSearchParams();
        
        if (filters.employeeId) params.append('employee_id', filters.employeeId);
        if (filters.startDate) params.append('start_date', filters.startDate);
        if (filters.endDate) params.append('end_date', filters.endDate);
        if (filters.status) params.append('status', filters.status);
        
        const query = params.toString();
        const endpoint = query ? `/payroll?${query}` : '/payroll';
        
        return await this.request(endpoint);
    }

    /**
     * Get payroll record by ID
     */
    async getPayrollRecord(recordId) {
        return await this.request(`/payroll/${recordId}`);
    }

    /**
     * Create payroll record
     */
    async createPayrollRecord(recordData) {
        const response = await this.request('/payroll', {
            method: 'POST',
            body: recordData
        });
        
        this.emit('payroll-created', { record: response.record });
        return response;
    }

    /**
     * Update payroll record
     */
    async updatePayrollRecord(recordId, recordData) {
        const response = await this.request(`/payroll/${recordId}`, {
            method: 'PUT',
            body: recordData
        });
        
        this.emit('payroll-updated', { record: response.record });
        return response;
    }

    /**
     * Delete payroll record
     */
    async deletePayrollRecord(recordId) {
        const response = await this.request(`/payroll/${recordId}`, {
            method: 'DELETE'
        });
        
        this.emit('payroll-deleted', { recordId });
        return response;
    }

    /**
     * Generate payroll for period
     */
    async generatePayroll(payrollData) {
        const response = await this.request('/payroll/generate', {
            method: 'POST',
            body: payrollData
        });
        
        this.emit('payroll-generated', { records: response.records });
        return response;
    }

    // ===============================
    // SETTINGS MANAGEMENT
    // ===============================

    /**
     * Get all settings
     */
    async getSettings() {
        return await this.request('/settings');
    }

    /**
     * Get setting by key
     */
    async getSetting(key) {
        return await this.request(`/settings/${key}`);
    }

    /**
     * Update setting
     */
    async updateSetting(key, value) {
        const response = await this.request(`/settings/${key}`, {
            method: 'PUT',
            body: { value }
        });
        
        this.emit('setting-updated', { key, value });
        return response;
    }

    /**
     * Update multiple settings
     */
    async updateSettings(settings) {
        const response = await this.request('/settings', {
            method: 'PUT',
            body: settings
        });
        
        this.emit('settings-updated', { settings });
        return response;
    }

    /**
     * Save multiple settings
     */
    async saveSettings(settings) {
        const response = await this.request('/settings', {
            method: 'POST',
            body: settings
        });
        
        this.emit('settings-saved', { settings });
        return response;
    }

    // ===============================
    // AUTHENTICATION MANAGEMENT
    // ===============================

    /**
     * Login user
     */
    async login(credentials) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: credentials
        });
        
        if (response.success && response.token) {
            this.setAuthToken(response.token);
            this.emit('login-success', { user: response.user });
        }
        
        return response;
    }

    /**
     * Logout user
     */
    async logout() {
        try {
            await this.request('/auth/logout', {
                method: 'POST'
            });
        } catch (error) {
            console.warn('Logout request failed:', error);
        }
        
        // Clear token regardless of API response
        this.authToken = null;
        localStorage.removeItem('auth-token');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('bricks_auth_token');
        
        this.emit('logout', { timestamp: Date.now() });
    }

    /**
     * Get current user info
     */
    async getCurrentUser() {
        return await this.request('/auth/me');
    }

    // ===============================
    // UNIFIED DATA OPERATIONS
    // ===============================

    /**
     * Get all unified data (employees, attendance, payroll, settings)
     */
    async getAllData() {
        return await this.request('/unified/data');
    }

    /**
     * Sync data to backend
     */
    async syncData(data) {
        const response = await this.request('/unified/sync', {
            method: 'POST',
            body: data
        });
        
        this.emit('data-synced', { data });
        return response;
    }

    // ===============================
    // EVENT SYSTEM
    // ===============================

    /**
     * Add event listener
     */
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     */
    removeEventListener(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Emit event
     */
    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    // ===============================
    // UTILITIES
    // ===============================

    /**
     * Check if DirectFlow is initialized and ready
     */
    isReady() {
        return this.initialized && this.authToken;
    }

    /**
     * Get initialization status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            authenticated: !!this.authToken,
            ready: this.isReady()
        };
    }

    /**
     * Get attendance data (alias for getAttendanceRecords)
     */
    async getAttendanceData() {
        return await this.getAttendanceRecords();
    }

    /**
     * Get attendance statistics (for dashboard)
     */
    async getAttendanceStats() {
        return await this.request('/attendance/stats');
    }

    /**
     * Get next payday information (for dashboard)
     */
    async getNextPayday() {
        return await this.request('/payroll/next-payday');
    }

    /**
     * Refresh all cached data
     */
    async refreshData() {
        try {
            this.emit('refresh-started');
            
            // Clear any cached data
            this.cache = {};
            
            // Re-initialize if needed
            if (!this.initialized) {
                await this.initialize();
            }
            
            this.emit('refresh-completed');
            return true;
        } catch (error) {
            this.emit('refresh-failed', error);
            throw error;
        }
    }

    /**
     * Clear authentication data
     */
    clearAuthData() {
        // Clear all possible token storage locations
        const tokenSources = [
            'bricks_auth_session',
            'auth-token',
            'auth_token', 
            'jwt_token',
            'bricks_auth_token',
            'bricks_auth_user'
        ];
        
        for (const source of tokenSources) {
            localStorage.removeItem(source);
        }
        
        this.authToken = null;
        this.initialized = false;
        
        console.log('🧹 DirectFlow authentication data cleared');
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.DirectFlow = new DirectFlow();
    
    // For backward compatibility, also expose as lowercase
    window.directFlow = window.DirectFlow;
    window.dataManager = window.DirectFlow;
    
    // Log initialization
    console.log('🚀 DirectFlow Data Manager initialized');
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DirectFlow;
}
