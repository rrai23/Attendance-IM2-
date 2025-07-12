/**
 * Data Service API - Core interface definition for the Bricks Attendance System
 * This file defines the standard interface that all data service implementations must follow.
 * 
 * This approach allows easy switching between different implementations (localStorage, API, PHP)
 * without changing the consuming code.
 */

class DataServiceInterface {
    /**
     * Get all employees
     * @returns {Promise<Array>} Array of employee objects
     */
    async getEmployees() {
        throw new Error('Method not implemented');
    }
    
    /**
     * Get a specific employee by ID
     * @param {string} id - Employee ID
     * @returns {Promise<Object>} Employee object
     */
    async getEmployee(id) {
        throw new Error('Method not implemented');
    }
    
    /**
     * Add a new employee
     * @param {Object} employeeData - Employee data
     * @returns {Promise<Object>} Created employee object
     */
    async addEmployee(employeeData) {
        throw new Error('Method not implemented');
    }
    
    /**
     * Update an existing employee
     * @param {string} id - Employee ID
     * @param {Object} updates - Employee data updates
     * @returns {Promise<Object>} Updated employee object
     */
    async updateEmployee(id, updates) {
        throw new Error('Method not implemented');
    }
    
    /**
     * Delete an employee
     * @param {string} id - Employee ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteEmployee(id) {
        throw new Error('Method not implemented');
    }
    
    /**
     * Get attendance records with optional filtering
     * @param {Object} filters - Filter criteria (employeeId, startDate, endDate)
     * @returns {Promise<Array>} Array of attendance records
     */
    async getAttendanceRecords(filters = {}) {
        throw new Error('Method not implemented');
    }
    
    /**
     * Add a new attendance record
     * @param {Object} record - Attendance record data
     * @returns {Promise<Object>} Created attendance record
     */
    async addAttendanceRecord(record) {
        throw new Error('Method not implemented');
    }
    
    /**
     * Update an existing attendance record
     * @param {string} id - Record ID
     * @param {Object} updates - Record updates
     * @returns {Promise<Object>} Updated attendance record
     */
    async updateAttendanceRecord(id, updates) {
        throw new Error('Method not implemented');
    }
    
    /**
     * Get attendance statistics
     * @param {string} date - Optional date for statistics
     * @returns {Promise<Object>} Attendance statistics
     */
    async getAttendanceStats(date = null) {
        throw new Error('Method not implemented');
    }
    
    /**
     * Get payroll data for an employee or all employees
     * @param {Object} options - Filter options (employeeId, startDate, endDate)
     * @returns {Promise<Array>} Array of payroll records
     */
    async getPayrollData(options = {}) {
        throw new Error('Method not implemented');
    }
    
    /**
     * Calculate payroll for a specific employee and period
     * @param {string} employeeId - Employee ID
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @returns {Promise<Object>} Payroll calculation result
     */
    async calculatePayroll(employeeId, startDate, endDate) {
        throw new Error('Method not implemented');
    }
    
    /**
     * Update an employee's wage
     * @param {string} employeeId - Employee ID
     * @param {number} newRate - New hourly rate
     * @param {string} reason - Reason for change
     * @returns {Promise<Object>} Result of the wage update
     */
    async updateEmployeeWage(employeeId, newRate, reason = '') {
        throw new Error('Method not implemented');
    }
    
    /**
     * Get system settings
     * @returns {Promise<Object>} System settings
     */
    async getSettings() {
        throw new Error('Method not implemented');
    }
    
    /**
     * Save system settings
     * @param {Object} settings - New settings
     * @returns {Promise<Object>} Updated settings
     */
    async saveSettings(settings) {
        throw new Error('Method not implemented');
    }
    
    /**
     * Get employee performance metrics
     * @param {string} employeeId - Optional employee ID
     * @returns {Promise<Array>} Performance metrics
     */
    async getEmployeePerformance(employeeId = null) {
        throw new Error('Method not implemented');
    }
    
    /**
     * Get departments
     * @returns {Promise<Array>} Departments list
     */
    async getDepartments() {
        throw new Error('Method not implemented');
    }
    
    /**
     * Get employees by department
     * @param {string} departmentId - Department ID
     * @returns {Promise<Array>} Employees in department
     */
    async getEmployeesByDepartment(departmentId) {
        throw new Error('Method not implemented');
    }
    
    /**
     * Get overtime requests
     * @param {Object} filters - Filter options
     * @returns {Promise<Array>} Overtime requests
     */
    async getOvertimeRequests(filters = {}) {
        throw new Error('Method not implemented');
    }
    
    /**
     * Get payroll history
     * @param {Object} filters - Filter options
     * @returns {Promise<Array>} Payroll history records
     */
    async getPayrollHistory(filters = {}) {
        throw new Error('Method not implemented');
    }
    
    /**
     * Add event listener for data changes
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     */
    addEventListener(event, callback) {
        throw new Error('Method not implemented');
    }
    
    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event handler to remove
     */
    removeEventListener(event, callback) {
        throw new Error('Method not implemented');
    }
    
    /**
     * Emit event to notify listeners
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        throw new Error('Method not implemented');
    }
    
    /**
     * Get system status
     * @returns {Promise<Object>} System status information
     */
    async getSystemStatus() {
        throw new Error('Method not implemented');
    }
    
    /**
     * Authenticate a user
     * @param {string} username - Username
     * @param {string} password - Password
     * @returns {Promise<Object>} Authentication result
     */
    async authenticate(username, password) {
        throw new Error('Method not implemented');
    }
    
    /**
     * Set authentication token
     * @param {string} token - Auth token
     */
    setAuthToken(token) {
        throw new Error('Method not implemented');
    }
    
    /**
     * Get current authentication token
     * @returns {string} Auth token
     */
    getAuthToken() {
        throw new Error('Method not implemented');
    }
    
    /**
     * Get next payday information
     * @returns {Promise<Object>} Payday information
     */
    async getNextPayday() {
        throw new Error('Method not implemented');
    }
}

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DataServiceInterface };
} else if (typeof window !== 'undefined') {
    window.DataServiceInterface = DataServiceInterface;
}
