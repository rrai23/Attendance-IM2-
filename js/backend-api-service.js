/**
 * Backend API Service for Unified Employee Manager
 * Handles communication between frontend and MySQL backend
 */

class BackendApiService {
    constructor() {
        this.baseUrl = '/api';
        this.isAvailable = false;
        this.authToken = null;
        
        this.init();
    }

    async init() {
        try {
            // Check authentication first
            const authToken = localStorage.getItem('auth-token') || localStorage.getItem('auth_token') || localStorage.getItem('jwt_token');
            if (!authToken) {
                console.log('🔗 Backend API Service: No authentication token - service unavailable');
                this.isAvailable = false;
                return;
            }

            // Set auth token
            this.setAuthToken(authToken);

            // Check if backend is available with authentication
            const response = await this.fetch('/unified/data', { 
                method: 'GET'
            });
            
            this.isAvailable = response.success !== false;
            console.log('🔗 Backend API Service:', this.isAvailable ? 'Available (Authenticated)' : 'Authentication Failed');
        } catch (error) {
            console.log('🔗 Backend API Service: Authentication failed or backend unavailable');
            this.isAvailable = false;
        }
    }

    /**
     * Retry initialization when authentication becomes available
     */
    async retryInit() {
        await this.init();
        return this.isAvailable;
    }

    /**
     * Check if authentication is available and retry init if needed
     */
    async ensureAuthenticated() {
        if (this.isAvailable) {
            return true;
        }

        // Try to initialize again
        await this.retryInit();
        return this.isAvailable;
    }

    async fetch(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        // Authentication is ALWAYS required
        if (!this.authToken) {
            throw new Error('Authentication required - no auth token available');
        }

        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.authToken}`,
                ...options.headers
            },
            ...options
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        const response = await fetch(url, config);
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Authentication failed - please log in again');
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    setAuthToken(token) {
        this.authToken = token;
    }

    // Sync frontend data to backend
    async syncToBackend(employees, attendanceRecords) {
        if (!this.isAvailable) {
            console.log('⚠️ Backend not available, skipping sync to backend');
            return { success: false, message: 'Backend not available' };
        }

        try {
            console.log('📤 Syncing data to backend...', {
                employees: employees.length,
                attendance: attendanceRecords.length
            });

            const response = await this.fetch('/unified/sync', {
                method: 'POST',
                body: {
                    employees,
                    attendanceRecords
                }
            });

            console.log('✅ Data synced to backend successfully');
            return response;
        } catch (error) {
            console.error('❌ Failed to sync data to backend:', error);
            return { success: false, message: error.message };
        }
    }

    // Load data from backend
    async loadFromBackend() {
        if (!this.isAvailable) {
            console.log('⚠️ Backend not available, cannot load from backend');
            return null;
        }

        try {
            console.log('📥 Loading data from backend...');

            const response = await this.fetch('/unified/data', {
                method: 'GET'
            });

            if (response.success) {
                console.log('✅ Data loaded from backend:', {
                    employees: response.data.employees.length,
                    attendance: response.data.attendanceRecords.length
                });
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to load data');
            }
        } catch (error) {
            console.error('❌ Failed to load data from backend:', error);
            return null;
        }
    }

    // Save individual employee
    async saveEmployee(employeeData) {
        if (!this.isAvailable) {
            console.log('⚠️ Backend not available for employee save');
            return { success: false, message: 'Backend not available' };
        }

        try {
            const response = await this.fetch('/unified/employees', {
                method: 'POST',
                body: employeeData
            });

            return response;
        } catch (error) {
            console.error('❌ Failed to save employee to backend:', error);
            return { success: false, message: error.message };
        }
    }

    // Save individual attendance record
    async saveAttendanceRecord(recordData) {
        if (!this.isAvailable) {
            console.log('⚠️ Backend not available for attendance save');
            return { success: false, message: 'Backend not available' };
        }

        try {
            const response = await this.fetch('/unified/attendance', {
                method: 'POST',
                body: recordData
            });

            return response;
        } catch (error) {
            console.error('❌ Failed to save attendance record to backend:', error);
            return { success: false, message: error.message };
        }
    }

    // Delete employee
    async deleteEmployee(employeeId) {
        if (!this.isAvailable) {
            console.log('⚠️ Backend not available for employee deletion');
            return { success: false, message: 'Backend not available' };
        }

        try {
            const response = await this.fetch(`/unified/employees/${employeeId}`, {
                method: 'DELETE'
            });

            return response;
        } catch (error) {
            console.error('❌ Failed to delete employee from backend:', error);
            return { success: false, message: error.message };
        }
    }

    // Login/Authentication
    async login(username, password) {
        try {
            const response = await this.fetch('/auth/login', {
                method: 'POST',
                skipAuth: true,
                body: {
                    username,
                    password
                }
            });

            if (response.success && response.token) {
                this.setAuthToken(response.token);
                this.isAvailable = true; // Ensure availability after successful auth
            }

            return response;
        } catch (error) {
            console.error('❌ Login failed:', error);
            return { success: false, message: error.message };
        }
    }

    // Logout
    logout() {
        this.authToken = null;
    }

    // Health check
    async healthCheck() {
        try {
            const response = await this.fetch('/unified/data', {
                method: 'GET',
                skipAuth: true
            });
            
            this.isAvailable = response.success;
            return this.isAvailable;
        } catch (error) {
            this.isAvailable = false;
            return false;
        }
    }

    // Auto-sync functionality
    async autoSync(employees, attendanceRecords, interval = 300000) { // 5 minutes default
        if (!this.isAvailable) {
            console.log('⚠️ Backend not available, auto-sync disabled');
            return;
        }

        const syncData = async () => {
            try {
                await this.syncToBackend(employees, attendanceRecords);
                console.log('🔄 Auto-sync completed');
            } catch (error) {
                console.error('❌ Auto-sync failed:', error);
            }
        };

        // Initial sync
        await syncData();

        // Set up periodic sync
        setInterval(syncData, interval);
        console.log(`🔄 Auto-sync enabled (every ${interval / 1000} seconds)`);
    }
}

// Create global instance
window.backendApiService = new BackendApiService();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BackendApiService;
}
