/**
 * DirectFlow Data Manager
 * 
 * A streamlined, backend-only data manager that works directly with DirectFlowAuth
 * No fallbacks, no mock data, no localStorage dependencies.
 */

class DirectFlow {
    constructor() {
        this.baseUrl = '/api';
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
            // Wait for DirectFlowAuth to be available
            if (typeof window.directFlowAuth === 'undefined') {
                console.log('⏳ Waiting for DirectFlowAuth...');
                setTimeout(() => this.init(), 100);
                return;
            }

            // Check if user is authenticated
            if (!window.directFlowAuth.isAuthenticated()) {
                console.log('🔄 DirectFlow: User not authenticated');
                this.initialized = false;
                return;
            }

            console.log('✅ DirectFlow initialized with authentication');
            this.initialized = true;
            
            // Test connection
            await this.testConnection();
            
            // Emit initialized event
            this.emit('initialized', { timestamp: new Date().toISOString() });
            
        } catch (error) {
            console.error('❌ DirectFlow initialization error:', error);
            this.initialized = false;
        }
    }

    /**
     * Test backend connection
     */
    async testConnection() {
        try {
            const response = await this.makeRequest('/health');
            console.log('✅ DirectFlow backend connection verified:', response);
        } catch (error) {
            console.error('❌ DirectFlow backend connection failed:', error);
        }
    }

    /**
     * Make authenticated API request
     */
    async makeRequest(endpoint, options = {}) {
        if (!window.directFlowAuth.isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        return await window.directFlowAuth.apiRequest(this.baseUrl + endpoint, options);
    }

    /**
     * Employee Management
     */
    async getEmployees() {
        try {
            const response = await this.makeRequest('/employees');
            const data = await response.json();
            return data.success ? data.data : [];
        } catch (error) {
            console.error('Error getting employees:', error);
            return [];
        }
    }

    async getEmployee(id) {
        try {
            const response = await this.makeRequest(`/employees/${id}`);
            const data = await response.json();
            return data.success ? data.data : null;
        } catch (error) {
            console.error('Error getting employee:', error);
            return null;
        }
    }

    async createEmployee(employeeData) {
        try {
            const response = await this.makeRequest('/employees', {
                method: 'POST',
                body: JSON.stringify(employeeData)
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error creating employee:', error);
            return { success: false, message: 'Failed to create employee' };
        }
    }

    async updateEmployee(id, employeeData) {
        try {
            const response = await this.makeRequest(`/employees/${id}`, {
                method: 'PUT',
                body: JSON.stringify(employeeData)
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error updating employee:', error);
            return { success: false, message: 'Failed to update employee' };
        }
    }

    async deleteEmployee(id) {
        try {
            const response = await this.makeRequest(`/employees/${id}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error deleting employee:', error);
            return { success: false, message: 'Failed to delete employee' };
        }
    }

    /**
     * Attendance Management
     */
    async getAttendance(employeeId = null, date = null) {
        try {
            let endpoint = '/attendance';
            const params = new URLSearchParams();
            
            if (employeeId) params.append('employeeId', employeeId);
            if (date) params.append('date', date);
            
            if (params.toString()) {
                endpoint += '?' + params.toString();
            }
            
            const response = await this.makeRequest(endpoint);
            const data = await response.json();
            return data.success ? data.data : [];
        } catch (error) {
            console.error('Error getting attendance:', error);
            return [];
        }
    }

    async clockIn(employeeId, location = null) {
        try {
            const response = await this.makeRequest('/attendance/clock-in', {
                method: 'POST',
                body: JSON.stringify({ employeeId, location })
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error clocking in:', error);
            return { success: false, message: 'Failed to clock in' };
        }
    }

    async clockOut(employeeId) {
        try {
            const response = await this.makeRequest('/attendance/clock-out', {
                method: 'POST',
                body: JSON.stringify({ employeeId })
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error clocking out:', error);
            return { success: false, message: 'Failed to clock out' };
        }
    }

    /**
     * Statistics
     */
    async getStats() {
        try {
            const response = await this.makeRequest('/attendance/stats');
            const data = await response.json();
            return data.success ? data.data : {};
        } catch (error) {
            console.error('Error getting stats:', error);
            return {};
        }
    }

    /**
     * Settings
     */
    async getSettings() {
        try {
            const response = await this.makeRequest('/settings');
            const data = await response.json();
            return data.success ? data.data.settings : {};
        } catch (error) {
            console.error('Error getting settings:', error);
            return {};
        }
    }

    async updateSettings(settings) {
        try {
            console.log('DirectFlow updateSettings called with:', settings);
            const response = await this.makeRequest('/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });
            
            console.log('Update settings response status:', response.status);
            
            if (!response.ok) {
                let errorMessage = 'Server error updating settings';
                try {
                    const errorData = await response.json();
                    console.error('Update settings error response:', errorData);
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    // If response is not JSON, try to get text
                    try {
                        const errorText = await response.text();
                        console.error('Update settings error text:', errorText);
                        errorMessage = errorText || errorMessage;
                    } catch (textError) {
                        console.error('Could not parse error response:', textError);
                    }
                }
                
                if (response.status === 403) {
                    errorMessage = 'Admin privileges required to update settings';
                } else if (response.status === 401) {
                    errorMessage = 'Authentication required to update settings';
                }
                
                return { success: false, message: errorMessage };
            }
            
            const data = await response.json();
            console.log('Update settings success response:', data);
            return data;
        } catch (error) {
            console.error('Error updating settings:', error);
            return { success: false, message: 'Failed to update settings: ' + error.message };
        }
    }

    async saveSettings(categorizedSettings) {
        try {
            console.log('DirectFlow saveSettings called with:', categorizedSettings);
            
            // Convert categorized settings to flat key-value pairs for database
            const flatSettings = {};
            
            if (categorizedSettings.general) {
                flatSettings.companyName = categorizedSettings.general.companyName;
                flatSettings.company_name = categorizedSettings.general.companyName; // Also save with database key
                flatSettings.timezone = categorizedSettings.general.timezone;
                flatSettings.company_timezone = categorizedSettings.general.timezone;
                flatSettings.dateFormat = categorizedSettings.general.dateFormat;
                flatSettings.timeFormat = categorizedSettings.general.timeFormat;
                flatSettings.currency = categorizedSettings.general.currency;
                flatSettings.language = categorizedSettings.general.language;
            }
            
            if (categorizedSettings.payroll) {
                flatSettings.payPeriod = categorizedSettings.payroll.payPeriod;
                flatSettings.payroll_frequency = categorizedSettings.payroll.payPeriod;
                flatSettings.payday = categorizedSettings.payroll.payday;
                flatSettings.overtimeRate = categorizedSettings.payroll.overtimeRate;
                flatSettings.overtime_rate_multiplier = categorizedSettings.payroll.overtimeRate;
                flatSettings.overtimeThreshold = categorizedSettings.payroll.overtimeThreshold;
                flatSettings.overtime_threshold_hours = categorizedSettings.payroll.overtimeThreshold;
                flatSettings.roundingRules = categorizedSettings.payroll.roundingRules;
                flatSettings.autoCalculate = categorizedSettings.payroll.autoCalculate;
            }
            
            if (categorizedSettings.attendance) {
                flatSettings.clockInGrace = categorizedSettings.attendance.clockInGrace;
                flatSettings.late_grace_period = categorizedSettings.attendance.clockInGrace;
                flatSettings.clockOutGrace = categorizedSettings.attendance.clockOutGrace;
                flatSettings.lunchBreakDuration = categorizedSettings.attendance.lunchBreakDuration;
                flatSettings.autoClockOut = categorizedSettings.attendance.autoClockOut;
                flatSettings.autoClockOutTime = categorizedSettings.attendance.autoClockOutTime;
                flatSettings.work_end_time = categorizedSettings.attendance.autoClockOutTime;
                flatSettings.requireNotes = categorizedSettings.attendance.requireNotes;
            }
            
            if (categorizedSettings.notifications) {
                flatSettings.emailNotifications = categorizedSettings.notifications.emailNotifications;
                flatSettings.tardyAlerts = categorizedSettings.notifications.tardyAlerts;
                flatSettings.overtimeAlerts = categorizedSettings.notifications.overtimeAlerts;
                flatSettings.payrollReminders = categorizedSettings.notifications.payrollReminders;
                flatSettings.systemUpdates = categorizedSettings.notifications.systemUpdates;
            }
            
            if (categorizedSettings.security) {
                flatSettings.sessionTimeout = categorizedSettings.security.sessionTimeout;
                flatSettings.auto_logout_minutes = categorizedSettings.security.sessionTimeout;
                flatSettings.passwordMinLength = categorizedSettings.security.passwordMinLength;
                flatSettings.requirePasswordChange = categorizedSettings.security.requirePasswordChange;
                flatSettings.passwordChangeInterval = categorizedSettings.security.passwordChangeInterval;
                flatSettings.twoFactorAuth = categorizedSettings.security.twoFactorAuth;
            }
            
            if (categorizedSettings.users) {
                flatSettings.defaultRole = categorizedSettings.users.defaultRole;
                flatSettings.defaultHourlyRate = categorizedSettings.users.defaultHourlyRate;
                flatSettings.autoEnableAccounts = categorizedSettings.users.autoEnableAccounts;
                flatSettings.requireEmailVerification = categorizedSettings.users.requireEmailVerification;
                flatSettings.lockoutAttempts = categorizedSettings.users.lockoutAttempts;
                flatSettings.lockoutDuration = categorizedSettings.users.lockoutDuration;
                flatSettings.autoInactivate = categorizedSettings.users.autoInactivate;
                flatSettings.inactiveThreshold = categorizedSettings.users.inactiveThreshold;
            }
            
            console.log('Converted to flat settings:', flatSettings);
            
            // Call updateSettings with the flat settings structure
            const result = await this.updateSettings({ settings: flatSettings });
            console.log('Update settings result:', result);
            
            return result;
        } catch (error) {
            console.error('Error saving settings:', error);
            return { success: false, message: 'Failed to save settings' };
        }
    }

    /**
     * Dashboard-specific data methods
     */
    async getAttendanceStats() {
        try {
            const response = await this.makeRequest('/attendance/stats');
            const data = await response.json();
            return data.success ? data.data : {
                present: 0,
                absent: 0,
                late: 0,
                onLeave: 0,
                total: 0,
                attendanceRate: 0
            };
        } catch (error) {
            console.error('Error getting attendance stats:', error);
            return {
                present: 0,
                absent: 0,
                late: 0,
                onLeave: 0,
                total: 0,
                attendanceRate: 0
            };
        }
    }

    async getAttendanceRecords(options = {}) {
        try {
            let endpoint = '/attendance';
            const params = new URLSearchParams();
            
            if (options.date) params.append('date', options.date);
            if (options.employeeId) params.append('employeeId', options.employeeId);
            if (options.startDate) params.append('startDate', options.startDate);
            if (options.endDate) params.append('endDate', options.endDate);
            
            if (params.toString()) {
                endpoint += '?' + params.toString();
            }
            
            const response = await this.makeRequest(endpoint);
            const data = await response.json();
            return data.success ? data.data : [];
        } catch (error) {
            console.error('Error getting attendance records:', error);
            return [];
        }
    }

    async getNextPayday() {
        try {
            const response = await this.makeRequest('/payroll/next-payday');
            const data = await response.json();
            return data.success ? data.data : {
                date: null,
                daysUntil: null,
                period: null
            };
        } catch (error) {
            console.error('Error getting next payday:', error);
            return {
                date: null,
                daysUntil: null,
                period: null
            };
        }
    }

    async getDashboardData() {
        try {
            const response = await this.makeRequest('/dashboard/data');
            const data = await response.json();
            return data.success ? data.data : {
                stats: {},
                todayAttendance: [],
                employees: [],
                payday: {},
                charts: {}
            };
        } catch (error) {
            console.error('Error getting dashboard data:', error);
            return {
                stats: {},
                todayAttendance: [],
                employees: [],
                payday: {},
                charts: {}
            };
        }
    }

    async getQuickStats() {
        try {
            const response = await this.makeRequest('/dashboard/quick-stats');
            const data = await response.json();
            return data.success ? data.data : {
                totalEmployees: 0,
                presentToday: 0,
                totalHoursToday: 0,
                avgHoursPerEmployee: 0,
                pendingApprovals: 0,
                lateArrivals: 0
            };
        } catch (error) {
            console.error('Error getting quick stats:', error);
            return {
                totalEmployees: 0,
                presentToday: 0,
                totalHoursToday: 0,
                avgHoursPerEmployee: 0,
                pendingApprovals: 0,
                lateArrivals: 0
            };
        }
    }

    async getChartData(chartType, period = 'week') {
        try {
            const response = await this.makeRequest(`/dashboard/charts/${chartType}?period=${period}`);
            const data = await response.json();
            return data.success ? data.data : {
                labels: [],
                datasets: []
            };
        } catch (error) {
            console.error('Error getting chart data:', error);
            return {
                labels: [],
                datasets: []
            };
        }
    }

    /**
     * Event System
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => callback(data));
        }
    }

    /**
     * Event System (DOM-style compatibility)
     */
    addEventListener(event, callback) {
        this.on(event, callback);
    }

    removeEventListener(event, callback) {
        this.off(event, callback);
    }

    /**
     * Utility Methods
     */
    isInitialized() {
        return this.initialized;
    }

    getCurrentUser() {
        return window.directFlowAuth ? window.directFlowAuth.getCurrentUser() : null;
    }

    isAuthenticated() {
        return window.directFlowAuth ? window.directFlowAuth.isAuthenticated() : false;
    }
}

// Create global instance
window.directFlow = new DirectFlow();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DirectFlow;
}
