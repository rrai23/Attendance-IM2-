/**
 * API Data Service Implementation
 * Implements the DataServiceInterface using API calls for data persistence.
 * This implementation can work with a PHP backend API.
 */

class ApiDataService extends DataServiceInterface {
    constructor(apiBaseUrl = '/api') {
        super();
        this.apiBaseUrl = apiBaseUrl;
        this.authTokenKey = 'bricks_auth_token';
        this.authToken = null;
        this.eventListeners = {};
        this.isOnline = navigator.onLine;
        
        // Set up online/offline detection
        window.addEventListener('online', () => { 
            this.isOnline = true;
            this.emit('connectionChange', { status: 'online' });
        });
        
        window.addEventListener('offline', () => { 
            this.isOnline = false;
            this.emit('connectionChange', { status: 'offline' });
        });
        
        // Attempt to load the auth token
        this.authToken = localStorage.getItem(this.authTokenKey);
    }
    
    /**
     * Make an API call
     * @param {string} endpoint - API endpoint
     * @param {string} method - HTTP method
     * @param {Object} data - Request data
     * @returns {Promise<any>} Response data
     */
    async apiCall(endpoint, method = 'GET', data = null) {
        const url = `${this.apiBaseUrl}${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
        };
        
        // Add authorization header if token exists
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        
        const options = {
            method,
            headers,
            credentials: 'include'
        };
        
        // Add body for methods that support it
        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }
        
        try {
            // Check if we're online
            if (!this.isOnline) {
                throw new Error('Network offline');
            }
            
            const response = await fetch(url, options);
            
            // Handle non-2xx responses
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `API Error: ${response.status}`);
            }
            
            // Parse response
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            
            // Handle authentication errors
            if (error.message.includes('401') || error.message.includes('Authentication')) {
                this.setAuthToken(null);
                this.emit('authError', { message: 'Authentication failed' });
            }
            
            throw error;
        }
    }
    
    /**
     * Add event listener for data changes
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     */
    addEventListener(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }
    
    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event handler to remove
     */
    removeEventListener(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
        }
    }
    
    /**
     * Emit event to notify listeners
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }
    
    /**
     * Get all employees
     * @returns {Promise<Array>} Array of employee objects
     */
    async getEmployees() {
        return await this.apiCall('/employees');
    }
    
    /**
     * Get a specific employee by ID
     * @param {string} id - Employee ID
     * @returns {Promise<Object>} Employee object
     */
    async getEmployee(id) {
        return await this.apiCall(`/employees/${id}`);
    }
    
    /**
     * Add a new employee
     * @param {Object} employeeData - Employee data
     * @returns {Promise<Object>} Created employee object
     */
    async addEmployee(employeeData) {
        const result = await this.apiCall('/employees', 'POST', employeeData);
        this.emit('employeeAdded', { employee: result });
        return result;
    }
    
    /**
     * Update an existing employee
     * @param {string} id - Employee ID
     * @param {Object} updates - Employee data updates
     * @returns {Promise<Object>} Updated employee object
     */
    async updateEmployee(id, updates) {
        const result = await this.apiCall(`/employees/${id}`, 'PUT', updates);
        this.emit('employeeUpdated', { 
            employeeId: id, 
            newData: result, 
            changes: updates 
        });
        return result;
    }
    
    /**
     * Update an employee's wage
     * @param {string} employeeId - Employee ID
     * @param {number} newRate - New hourly rate
     * @param {string} reason - Reason for change
     * @returns {Promise<Object>} Result of the wage update
     */
    async updateEmployeeWage(employeeId, newRate, reason = '') {
        const result = await this.apiCall(`/employees/${employeeId}/wage`, 'PUT', {
            hourlyRate: newRate,
            reason
        });
        
        this.emit('employeeWageUpdated', { 
            employeeId, 
            newRate, 
            reason 
        });
        
        return result;
    }
    
    /**
     * Delete an employee
     * @param {string} id - Employee ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteEmployee(id) {
        const result = await this.apiCall(`/employees/${id}`, 'DELETE');
        this.emit('employeeDeleted', { employeeId: id });
        return result;
    }
    
    /**
     * Get attendance records with optional filtering
     * @param {Object} filters - Filter criteria (employeeId, startDate, endDate)
     * @returns {Promise<Array>} Array of attendance records
     */
    async getAttendanceRecords(filters = {}) {
        // Convert filters to query parameters
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                params.append(key, value);
            }
        });
        
        const queryString = params.toString() ? `?${params.toString()}` : '';
        return await this.apiCall(`/attendance${queryString}`);
    }
    
    /**
     * Add a new attendance record
     * @param {Object} record - Attendance record data
     * @returns {Promise<Object>} Created attendance record
     */
    async addAttendanceRecord(record) {
        const result = await this.apiCall('/attendance', 'POST', record);
        this.emit('attendanceUpdated', { 
            action: 'add', 
            record: result 
        });
        return result;
    }
    
    /**
     * Update an existing attendance record
     * @param {string} id - Record ID
     * @param {Object} updates - Record updates
     * @returns {Promise<Object>} Updated attendance record
     */
    async updateAttendanceRecord(id, updates) {
        const result = await this.apiCall(`/attendance/${id}`, 'PUT', updates);
        this.emit('attendanceUpdated', { 
            action: 'update', 
            record: result
        });
        return result;
    }
    
    /**
     * Get attendance statistics
     * @param {string} date - Optional date for statistics
     * @returns {Promise<Object>} Attendance statistics
     */
    async getAttendanceStats(date = null) {
        const queryString = date ? `?date=${date}` : '';
        return await this.apiCall(`/attendance/stats${queryString}`);
    }
    
    /**
     * Get payroll data for an employee or all employees
     * @param {Object} options - Filter options (employeeId, startDate, endDate)
     * @returns {Promise<Array>} Array of payroll records
     */
    async getPayrollData(options = {}) {
        // Convert options to query parameters
        const params = new URLSearchParams();
        Object.entries(options).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                params.append(key, value);
            }
        });
        
        const queryString = params.toString() ? `?${params.toString()}` : '';
        return await this.apiCall(`/payroll${queryString}`);
    }
    
    /**
     * Calculate payroll for a specific employee and period
     * @param {string} employeeId - Employee ID
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @returns {Promise<Object>} Payroll calculation result
     */
    async calculatePayroll(employeeId, startDate, endDate) {
        return await this.apiCall('/payroll/calculate', 'POST', {
            employeeId,
            startDate,
            endDate
        });
    }
    
    /**
     * Get payroll history
     * @param {Object} filters - Filter options
     * @returns {Promise<Array>} Payroll history records
     */
    async getPayrollHistory(filters = {}) {
        // Convert filters to query parameters
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                params.append(key, value);
            }
        });
        
        const queryString = params.toString() ? `?${params.toString()}` : '';
        return await this.apiCall(`/payroll/history${queryString}`);
    }
    
    /**
     * Get system settings
     * @returns {Promise<Object>} System settings
     */
    async getSettings() {
        return await this.apiCall('/settings');
    }
    
    /**
     * Save system settings
     * @param {Object} settings - New settings
     * @returns {Promise<Object>} Updated settings
     */
    async saveSettings(settings) {
        const result = await this.apiCall('/settings', 'PUT', settings);
        this.emit('settingsUpdated', { settings: result });
        return result;
    }
    
    /**
     * Get employee performance metrics
     * @param {string} employeeId - Optional employee ID
     * @returns {Promise<Array>} Performance metrics
     */
    async getEmployeePerformance(employeeId = null) {
        const queryString = employeeId ? `?employeeId=${employeeId}` : '';
        return await this.apiCall(`/employees/performance${queryString}`);
    }
    
    /**
     * Get departments
     * @returns {Promise<Array>} Departments list
     */
    async getDepartments() {
        return await this.apiCall('/departments');
    }
    
    /**
     * Get employees by department
     * @param {string} departmentId - Department ID
     * @returns {Promise<Array>} Employees in department
     */
    async getEmployeesByDepartment(departmentId) {
        return await this.apiCall(`/departments/${departmentId}/employees`);
    }
    
    /**
     * Get overtime requests
     * @param {Object} filters - Filter options
     * @returns {Promise<Array>} Overtime requests
     */
    async getOvertimeRequests(filters = {}) {
        // Convert filters to query parameters
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                params.append(key, value);
            }
        });
        
        const queryString = params.toString() ? `?${params.toString()}` : '';
        return await this.apiCall(`/overtime${queryString}`);
    }
    
    /**
     * Get system status
     * @returns {Promise<Object>} System status information
     */
    async getSystemStatus() {
        return await this.apiCall('/system/status');
    }
    
    /**
     * Authenticate a user
     * @param {string} username - Username
     * @param {string} password - Password
     * @returns {Promise<Object>} Authentication result
     */
    async authenticate(username, password) {
        const result = await this.apiCall('/auth/login', 'POST', { username, password });
        
        if (result.token) {
            this.setAuthToken(result.token);
        }
        
        return result;
    }
    
    /**
     * Set authentication token
     * @param {string} token - Auth token
     */
    setAuthToken(token) {
        this.authToken = token;
        if (token) {
            localStorage.setItem(this.authTokenKey, token);
        } else {
            localStorage.removeItem(this.authTokenKey);
        }
    }
    
    /**
     * Get current authentication token
     * @returns {string} Auth token
     */
    getAuthToken() {
        if (!this.authToken) {
            this.authToken = localStorage.getItem(this.authTokenKey);
        }
        return this.authToken;
    }
    
    /**
     * Get next payday information
     * @returns {Promise<Object>} Payday information
     */
    async getNextPayday() {
        try {
            return await this.apiCall('/payroll/nextpayday');
        } catch (error) {
            console.error('Error getting next payday:', error);
            
            // Fallback calculation if API fails
            const settings = await this.getSettings();
            const frequency = settings?.payroll?.frequency || 'biweekly';
            
            const today = new Date();
            const nextPayday = new Date(today);
            nextPayday.setDate(today.getDate() + 14); // Default to 2 weeks
            
            const lastPayday = new Date(today);
            lastPayday.setDate(today.getDate() - 14);
            
            return {
                nextPayday: nextPayday.toISOString().split('T')[0],
                frequency,
                daysRemaining: 14,
                hoursRemaining: 14 * 24,
                lastPayday: lastPayday.toISOString().split('T')[0]
            };
        }
    }
}

// Don't create an instance by default - this will be instantiated when needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ApiDataService };
} else if (typeof window !== 'undefined') {
    window.ApiDataService = ApiDataService;
}
