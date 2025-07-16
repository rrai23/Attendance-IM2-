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
        this.cachedEmployees = null;
        
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

        // Add cache-busting headers by default
        const defaultHeaders = {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        };

        // Merge with existing headers
        const mergedOptions = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        };

        return await window.directFlowAuth.apiRequest(this.baseUrl + endpoint, mergedOptions);
    }

    /**
     * Employee Management
     */
    async getEmployees() {
        try {
            console.log('DirectFlow: Making request to /employees');
            console.log('DirectFlow: Cached employees:', this.cachedEmployees);
            
            // Use aggressive cache-busting with multiple parameters
            const cacheBuster = Date.now();
            const randomId = Math.random().toString(36).substring(2, 15);
            const endpoint = `/employees?_t=${cacheBuster}&_r=${randomId}&_cache=no`;
            console.log('DirectFlow: Using endpoint:', endpoint);
            
            // Add If-None-Match header to force fresh data
            const options = {
                headers: {
                    'If-None-Match': ''  // Force ignore etag
                }
            };
            
            const response = await this.makeRequest(endpoint, options);
            console.log('DirectFlow: Raw response status:', response.status);
            console.log('DirectFlow: Raw response ok:', response.ok);
            
            // Handle 304 Not Modified by forcing a direct fetch
            if (response.status === 304) {
                console.log('DirectFlow: 304 Not Modified - forcing direct fetch...');
                
                try {
                    // Make a direct fetch request bypassing cache entirely
                    const directUrl = `${this.baseUrl}/employees?_force=${Date.now()}&_direct=${Math.random()}`;
                    const directResponse = await fetch(directUrl, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${window.directFlowAuth.getToken()}`,
                            'Cache-Control': 'no-cache, no-store, must-revalidate',
                            'Pragma': 'no-cache',
                            'Expires': '0',
                            'If-None-Match': ''
                        }
                    });
                    
                    console.log('DirectFlow: Direct fetch response status:', directResponse.status);
                    
                    if (directResponse.ok) {
                        const directData = await directResponse.json();
                        console.log('DirectFlow: Direct fetch success:', directData);
                        
                        // Process the direct response
                        let result;
                        if (Array.isArray(directData)) {
                            result = directData;
                        } else if (directData && directData.success && directData.data && Array.isArray(directData.data.employees)) {
                            // New API structure: { success: true, data: { employees: [...], pagination: {...} } }
                            result = directData.data.employees;
                        } else if (directData && directData.success && Array.isArray(directData.data)) {
                            result = directData.data;
                        } else if (directData && Array.isArray(directData.employees)) {
                            result = directData.employees;
                        } else {
                            console.warn('DirectFlow: Unexpected direct response structure:', directData);
                            result = [];
                        }
                        
                        this.cachedEmployees = result;
                        return result;
                    }
                } catch (directError) {
                    console.error('DirectFlow: Direct fetch failed:', directError);
                }
                
                // Fallback to cached data or empty array
                return this.cachedEmployees || [];
            }
            
            // For successful responses, try to parse JSON
            if (response.ok) {
                const data = await response.json();
                console.log('DirectFlow: Parsed response data:', data);
                console.log('DirectFlow: Response data type:', typeof data);
                console.log('DirectFlow: Response is array:', Array.isArray(data));
                
                if (data && typeof data === 'object') {
                    console.log('DirectFlow: Response keys:', Object.keys(data));
                }
                
                let result;
                if (Array.isArray(data)) {
                    // Direct array response
                    result = data;
                    console.log('DirectFlow: Using direct array response');
                } else if (data && data.success && data.data && Array.isArray(data.data.employees)) {
                    // New API structure: { success: true, data: { employees: [...], pagination: {...} } }
                    result = data.data.employees;
                    console.log('DirectFlow: Using new API structure data.data.employees');
                } else if (data && data.success && Array.isArray(data.data)) {
                    // Wrapped response with success property
                    result = data.data;
                    console.log('DirectFlow: Using wrapped success response');
                } else if (data && Array.isArray(data.employees)) {
                    // Response with employees property
                    result = data.employees;
                    console.log('DirectFlow: Using employees property');
                } else {
                    console.warn('DirectFlow: Unexpected response structure:', data);
                    result = [];
                }
                
                console.log('DirectFlow: Final employees result:', result);
                console.log('DirectFlow: Final result length:', result.length);
                console.log('DirectFlow: Final result type:', typeof result);
                console.log('DirectFlow: Final result is array:', Array.isArray(result));
                
                // Cache the result
                this.cachedEmployees = result;
                
                // Ensure we always return an array
                if (!Array.isArray(result)) {
                    console.warn('DirectFlow: Expected array but got:', typeof result, result);
                    return [];
                }
                
                return result;
            } else {
                console.error('DirectFlow: HTTP error:', response.status, response.statusText);
                return [];
            }
        } catch (error) {
            console.error('DirectFlow: Error getting employees:', error);
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
            console.log('DirectFlow getSettings called');
            
            const response = await this.makeRequest('/settings');
            const data = await response.json();
            
            console.log('Raw settings response:', data);
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to fetch settings');
            }
            
            // Get flat settings from response
            const flatSettings = data.data.settings || data.data || {};
            console.log('Flat settings from API:', flatSettings);
            
            // Organize flat settings into categories for the UI
            const organizedSettings = {
                general: {
                    companyName: flatSettings.companyName || flatSettings.company_name || 'My Company',
                    timezone: flatSettings.timezone || flatSettings.company_timezone || 'UTC',
                    dateFormat: flatSettings.dateFormat || 'MM/DD/YYYY',
                    timeFormat: flatSettings.timeFormat || '24',
                    currency: flatSettings.currency || 'USD',
                    language: flatSettings.language || 'en'
                },
                payroll: {
                    payPeriod: flatSettings.payPeriod || flatSettings.payroll_frequency || 'monthly',
                    payday: flatSettings.payday || 'friday',
                    overtimeRate: parseFloat(flatSettings.overtimeRate || flatSettings.overtime_rate_multiplier || 1.5),
                    overtimeThreshold: parseInt(flatSettings.overtimeThreshold || flatSettings.overtime_threshold_hours || 40),
                    roundingRules: flatSettings.roundingRules || 'none',
                    autoCalculate: flatSettings.autoCalculate === 'true' || flatSettings.autoCalculate === true
                },
                attendance: {
                    clockInGrace: parseInt(flatSettings.clockInGrace || flatSettings.late_grace_period || 15),
                    clockOutGrace: parseInt(flatSettings.clockOutGrace || 15),
                    lunchBreakDuration: parseInt(flatSettings.lunchBreakDuration || 60),
                    autoClockOut: flatSettings.autoClockOut === 'true' || flatSettings.autoClockOut === true,
                    autoClockOutTime: flatSettings.autoClockOutTime || flatSettings.work_end_time || '17:00',
                    requireNotes: flatSettings.requireNotes === 'true' || flatSettings.requireNotes === true
                },
                notifications: {
                    emailNotifications: flatSettings.emailNotifications === 'true' || flatSettings.emailNotifications === true,
                    tardyAlerts: flatSettings.tardyAlerts === 'true' || flatSettings.tardyAlerts === true,
                    overtimeAlerts: flatSettings.overtimeAlerts === 'true' || flatSettings.overtimeAlerts === true,
                    payrollReminders: flatSettings.payrollReminders === 'true' || flatSettings.payrollReminders === true,
                    systemUpdates: flatSettings.systemUpdates === 'true' || flatSettings.systemUpdates === true
                },
                security: {
                    sessionTimeout: parseInt(flatSettings.sessionTimeout || flatSettings.auto_logout_minutes || 60),
                    passwordMinLength: parseInt(flatSettings.passwordMinLength || 6),
                    requirePasswordChange: flatSettings.requirePasswordChange === 'true' || flatSettings.requirePasswordChange === true,
                    passwordChangeInterval: parseInt(flatSettings.passwordChangeInterval || 90),
                    twoFactorAuth: flatSettings.twoFactorAuth === 'true' || flatSettings.twoFactorAuth === true
                },
                theme: {
                    defaultTheme: flatSettings.defaultTheme || 'light',
                    allowUserThemes: flatSettings.allowUserThemes === 'true' || flatSettings.allowUserThemes === true,
                    accentColor: flatSettings.accentColor || '#007bff'
                }
            };
            
            console.log('Organized settings for UI:', organizedSettings);
            return organizedSettings;
            
        } catch (error) {
            console.error('Error fetching settings:', error);
            // Return default settings structure on error
            return {
                general: {
                    companyName: 'My Company',
                    timezone: 'UTC',
                    dateFormat: 'MM/DD/YYYY',
                    timeFormat: '24',
                    currency: 'USD',
                    language: 'en'
                },
                payroll: {
                    payPeriod: 'monthly',
                    payday: 'friday',
                    overtimeRate: 1.5,
                    overtimeThreshold: 40,
                    roundingRules: 'none',
                    autoCalculate: false
                },
                attendance: {
                    clockInGrace: 15,
                    clockOutGrace: 15,
                    lunchBreakDuration: 60,
                    autoClockOut: false,
                    autoClockOutTime: '17:00',
                    requireNotes: false
                },
                notifications: {
                    emailNotifications: false,
                    tardyAlerts: false,
                    overtimeAlerts: false,
                    payrollReminders: false,
                    systemUpdates: false
                },
                security: {
                    sessionTimeout: 60,
                    passwordMinLength: 6,
                    requirePasswordChange: false,
                    passwordChangeInterval: 90,
                    twoFactorAuth: false
                },
                theme: {
                    defaultTheme: 'light',
                    allowUserThemes: true,
                    accentColor: '#007bff'
                }
            };
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

    async saveSettings(flatSettings) {
        try {
            console.log('DirectFlow saveSettings called with flat settings:', flatSettings);
            
            // No conversion needed - settings are already flat
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
// Cache clear: 07/16/2025 23:12:37
