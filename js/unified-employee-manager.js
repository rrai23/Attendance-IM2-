/**
 * Unified Employee Manager - Strict Backend Only Version
 * This version ONLY works with backend authentication - NO fallbacks, NO defaults, NO localStorage
 */

class UnifiedEmployeeManager {
    constructor() {
        this.employees = [];
        this.attendanceRecords = [];
        this.initialized = false;
        
        // Event listeners for real-time updates
        this.eventListeners = {
            employeeUpdate: [],
            attendanceUpdate: [],
            dataSync: [],
            settingsUpdate: []
        };
    }

    // Event Management Methods
    addEventListener(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    removeEventListener(event, callback) {
        if (!this.eventListeners[event]) return;
        const index = this.eventListeners[event].indexOf(callback);
        if (index > -1) {
            this.eventListeners[event].splice(index, 1);
        }
    }

    emit(event, data) {
        if (!this.eventListeners[event]) return;
        this.eventListeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });
    }

    // Alias methods for compatibility
    on(event, callback) {
        return this.addEventListener(event, callback);
    }

    off(event, callback) {
        return this.removeEventListener(event, callback);
    }

    trigger(event, data) {
        return this.emit(event, data);
    }

    async init() {
        if (this.initialized) return;
        
        try {
            console.log('🔐 Initializing Unified Employee Manager (Authentication Required)...');
            
            // Check backend availability first
            if (!window.backendApiService) {
                throw new Error('Backend API service not available - system requires authentication');
            }
            
            // Try to ensure authentication is available
            console.log('🔗 Checking backend authentication...');
            const authAvailable = await window.backendApiService.ensureAuthenticated();
            
            if (!authAvailable) {
                throw new Error('Backend API service not available - system requires authentication');
            }
            
            console.log('🔗 Backend API Service integrated and authenticated');
            
            // Load data from backend (will throw if auth fails)
            await this.loadData();
            
            this.initialized = true;
            console.log('✅ Unified Employee Manager initialized with authenticated data:', {
                employees: this.employees.length,
                attendanceRecords: this.attendanceRecords.length
            });
            
            this.emit('dataSync', { action: 'initialized' });
            
        } catch (error) {
            console.error('❌ Failed to initialize Unified Employee Manager:', error.message);
            
            // Clear any potential cached data
            this.employees = [];
            this.attendanceRecords = [];
            
            throw new Error(`System initialization failed: ${error.message}`);
        }
    }

    async loadData() {
        // ⚠️ STRICT BACKEND ONLY - NO FALLBACKS, NO DEFAULTS, NO LOCALSTORAGE
        // This system ONLY works with valid backend authentication
        
        try {
            // Check if backend API service is available
            if (!window.backendApiService || !window.backendApiService.isAvailable) {
                // Try to initialize the backend service
                console.log('🔄 Backend API service not available, attempting to initialize...');
                if (window.backendApiService) {
                    await window.backendApiService.retryInit();
                }
                
                if (!window.backendApiService || !window.backendApiService.isAvailable) {
                    throw new Error('Backend API service not available - system requires backend connection');
                }
            }

            // Check if user is authenticated
            const authToken = localStorage.getItem('auth_token') || localStorage.getItem('auth-token') || localStorage.getItem('jwt_token');
            if (!authToken) {
                throw new Error('No authentication token found - user must be logged in');
            }

            console.log('🔐 Authentication verified, loading from backend...');
            
            // Set the auth token in the backend service
            window.backendApiService.setAuthToken(authToken);
            
            // Load data from backend (will throw error if auth fails)
            const backendData = await window.backendApiService.loadFromBackend();
            
            if (!backendData || !backendData.employees || !backendData.attendanceRecords) {
                throw new Error('Invalid data received from backend - authentication may have failed');
            }

            this.employees = backendData.employees;
            this.attendanceRecords = backendData.attendanceRecords;
            
            console.log('✅ Successfully loaded data from authenticated backend:', {
                employees: this.employees.length,
                attendance: this.attendanceRecords.length
            });

            return;
            
        } catch (error) {
            console.error('❌ Backend authentication failed or unavailable:', error.message);
            
            // Clear any existing data to prevent unauthorized access
            this.employees = [];
            this.attendanceRecords = [];
            
            // Re-throw the error to fail initialization
            throw new Error(`System initialization failed: ${error.message}`);
        }
    }

    async saveData() {
        try {
            if (!window.backendApiService || !window.backendApiService.isAvailable) {
                throw new Error('Backend not available - cannot save data');
            }

            const authToken = localStorage.getItem('auth_token');
            if (!authToken) {
                throw new Error('No authentication token - cannot save data');
            }

            // Sync to backend - ONLY option
            const result = await this.syncToBackend();
            if (!result.success) {
                throw new Error(`Backend save failed: ${result.message}`);
            }
            
            console.log('✅ Data saved to authenticated backend');
            
        } catch (error) {
            console.error('❌ Failed to save data:', error.message);
            throw error;
        }
    }

    // Employee Management Methods - BACKEND DATA ONLY
    getEmployees() {
        if (!this.initialized) {
            throw new Error('System not initialized - backend connection required');
        }
        
        if (!this.employees) {
            throw new Error('No employee data available from backend');
        }
        
        return this.employees;
    }

    getEmployeeById(id) {
        if (!this.initialized) {
            throw new Error('System not initialized - backend connection required');
        }
        
        if (!this.employees) {
            throw new Error('No employee data available from backend');
        }
        
        return this.employees.find(emp => emp.id == id);
    }

    async addEmployee(employeeData) {
        try {
            if (!this.initialized) {
                throw new Error('System not initialized - backend connection required');
            }

            // Generate ID if not provided
            if (!employeeData.id) {
                employeeData.id = Math.max(...this.employees.map(e => e.id), 0) + 1;
            }

            // Add to local array
            this.employees.push(employeeData);
            
            // Save to backend - REQUIRED
            await this.saveData();
            
            this.emit('employeeUpdate', { action: 'add', employee: employeeData });
            
            return { success: true, employee: employeeData };
        } catch (error) {
            console.error('Failed to add employee:', error);
            throw error;
        }
    }

    async updateEmployee(id, updateData) {
        try {
            if (!this.initialized) {
                throw new Error('System not initialized - backend connection required');
            }

            const index = this.employees.findIndex(emp => emp.id == id);
            if (index === -1) {
                throw new Error('Employee not found');
            }

            // Update local data
            this.employees[index] = { ...this.employees[index], ...updateData };
            
            // Save to backend - REQUIRED
            await this.saveData();
            
            this.emit('employeeUpdate', { action: 'update', employee: this.employees[index] });
            
            return { success: true, employee: this.employees[index] };
        } catch (error) {
            console.error('Failed to update employee:', error);
            throw error;
        }
    }

    async deleteEmployee(id) {
        try {
            if (!this.initialized) {
                throw new Error('System not initialized - backend connection required');
            }

            const index = this.employees.findIndex(emp => emp.id == id);
            if (index === -1) {
                throw new Error('Employee not found');
            }

            const employee = this.employees[index];
            
            // Remove from local array
            this.employees.splice(index, 1);
            
            // Remove related attendance records
            this.attendanceRecords = this.attendanceRecords.filter(record => record.employeeId != id);
            
            // Save to backend - REQUIRED
            await this.saveData();
            
            this.emit('employeeUpdate', { action: 'delete', employee });
            
            return { success: true };
        } catch (error) {
            console.error('Failed to delete employee:', error);
            throw error;
        }
    }

    // Attendance Management Methods - BACKEND DATA ONLY
    getAttendanceRecords() {
        if (!this.initialized) {
            throw new Error('System not initialized - backend connection required');
        }
        
        if (!this.attendanceRecords) {
            throw new Error('No attendance data available from backend');
        }
        
        return this.attendanceRecords;
    }

    getAttendanceByDate(date) {
        if (!this.initialized) {
            throw new Error('System not initialized - backend connection required');
        }
        
        if (!this.attendanceRecords) {
            throw new Error('No attendance data available from backend');
        }
        
        return this.attendanceRecords.filter(record => record.date === date);
    }

    getAttendanceByEmployee(employeeId) {
        if (!this.initialized) {
            throw new Error('System not initialized - backend connection required');
        }
        
        if (!this.attendanceRecords) {
            throw new Error('No attendance data available from backend');
        }
        
        return this.attendanceRecords.filter(record => record.employeeId == employeeId);
    }

    async addAttendanceRecord(recordData) {
        try {
            if (!this.initialized) {
                throw new Error('System not initialized - backend connection required');
            }

            // Generate ID if not provided
            if (!recordData.id) {
                recordData.id = `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }

            // Add to local array
            this.attendanceRecords.push(recordData);
            
            // Save to backend - REQUIRED
            await this.saveData();
            
            this.emit('attendanceUpdate', { action: 'add', record: recordData });
            
            return { success: true, record: recordData };
        } catch (error) {
            console.error('Failed to add attendance record:', error);
            throw error;
        }
    }

    async updateAttendanceRecord(id, updateData) {
        try {
            if (!this.initialized) {
                throw new Error('System not initialized - backend connection required');
            }

            const index = this.attendanceRecords.findIndex(record => record.id === id);
            if (index === -1) {
                throw new Error('Attendance record not found');
            }

            // Update local data
            this.attendanceRecords[index] = { ...this.attendanceRecords[index], ...updateData };
            
            // Save to backend - REQUIRED
            await this.saveData();
            
            this.emit('attendanceUpdate', { action: 'update', record: this.attendanceRecords[index] });
            
            return { success: true, record: this.attendanceRecords[index] };
        } catch (error) {
            console.error('Failed to update attendance record:', error);
            throw error;
        }
    }

    /**
     * Get attendance statistics for a specific date - BACKEND DATA ONLY
     * @param {string} date - Required date (YYYY-MM-DD)
     * @returns {Object} Attendance statistics from backend data only
     */
    getAttendanceStats(date) {
        try {
            if (!this.initialized) {
                throw new Error('System not initialized - backend connection required');
            }

            if (!date) {
                throw new Error('Date parameter is required');
            }

            const employees = this.employees;
            if (!employees || employees.length === 0) {
                throw new Error('No employee data available from backend');
            }

            const employeeCount = employees.filter(emp => emp.status === 'active').length;
            if (employeeCount === 0) {
                throw new Error('No active employees found in backend data');
            }
            
            // Filter attendance records for the target date
            const attendanceRecords = this.attendanceRecords;
            if (!attendanceRecords) {
                throw new Error('No attendance data available from backend');
            }

            const records = attendanceRecords.filter(record => record && record.date === date);
            
            // Calculate attendance statistics - backend data only
            const present = records.filter(record => 
                record.status === 'present'
            ).length;
            
            const late = records.filter(record => 
                record.status === 'late'
            ).length;
            
            const absent = employeeCount - present - late;
            const attendanceRate = Math.round(((present + late) / employeeCount) * 100);
            
            // Calculate weekly trend (last 7 days) - backend data only
            const weeklyTrend = [];
            for (let i = 6; i >= 0; i--) {
                const trendDate = new Date();
                trendDate.setDate(trendDate.getDate() - i);
                const dateStr = trendDate.toISOString().split('T')[0];
                
                const dayRecords = attendanceRecords.filter(record => record && record.date === dateStr);
                const dayPresent = dayRecords.filter(record => 
                    record.status === 'present'
                ).length;
                const dayLate = dayRecords.filter(record => 
                    record.status === 'late'
                ).length;
                
                const dayRate = Math.round(((dayPresent + dayLate) / employeeCount) * 100);
                weeklyTrend.push(dayRate);
            }
            
            return {
                date: date,
                totalEmployees: employeeCount,
                present: present,
                absent: absent,
                late: late,
                presentPercentage: attendanceRate,
                presentToday: present,
                absentToday: absent,
                tardyToday: late,
                attendanceRate: attendanceRate,
                tardyRate: Math.round((late / employeeCount) * 100),
                weeklyTrend,
                lastUpdated: new Date().toISOString(),
                today: {
                    total: employeeCount,
                    present: present,
                    late: late,
                    absent: absent,
                    attendanceRate: attendanceRate
                },
                records: records,
                dataFullyLoaded: true
            };
        } catch (error) {
            console.error('❌ Error calculating attendance stats:', error);
            // Re-throw error instead of returning default values
            throw new Error(`Failed to calculate attendance statistics: ${error.message}`);
        }
    }

    // Backend Integration Methods
    async syncToBackend() {
        if (!window.backendApiService || !window.backendApiService.isAvailable) {
            throw new Error('Backend not available for sync');
        }

        try {
            console.log('🔄 Syncing to backend...', {
                employees: this.employees.length,
                attendance: this.attendanceRecords.length
            });

            const result = await window.backendApiService.syncToBackend(
                this.employees,
                this.attendanceRecords
            );

            if (result.success) {
                console.log('✅ Backend sync completed successfully');
            } else {
                throw new Error(result.message);
            }

            return result;
        } catch (error) {
            console.error('❌ Backend sync error:', error);
            throw new Error(`Backend sync failed: ${error.message}`);
        }
    }

    // Utility Methods - BACKEND DATA ONLY
    calculateHours(clockIn, clockOut) {
        if (!clockIn || !clockOut) {
            throw new Error('Both clock in and clock out times are required');
        }
        
        const start = new Date(clockIn);
        const end = new Date(clockOut);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new Error('Invalid date format for clock times');
        }
        
        const diffMs = end - start;
        if (diffMs < 0) {
            throw new Error('Clock out time cannot be before clock in time');
        }
        
        const hours = diffMs / (1000 * 60 * 60);
        return Math.round(hours * 100) / 100;
    }

    // Statistics Methods - BACKEND DATA ONLY
    getTodayAttendanceStats() {
        if (!this.initialized) {
            throw new Error('System not initialized - backend connection required');
        }

        const today = new Date().toISOString().split('T')[0];
        const todayRecords = this.getAttendanceByDate(today);
        
        if (!this.employees || this.employees.length === 0) {
            throw new Error('No employee data available from backend');
        }
        
        const present = todayRecords.filter(r => r.status === 'present' || r.status === 'late').length;
        const absent = this.employees.length - present;
        const late = todayRecords.filter(r => r.status === 'late').length;
        
        return {
            total: this.employees.length,
            present,
            absent,
            late,
            onTime: present - late
        };
    }

    getEmployeeCount() {
        if (!this.initialized) {
            throw new Error('System not initialized - backend connection required');
        }
        
        if (!this.employees) {
            throw new Error('No employee data available from backend');
        }
        
        return this.employees.length;
    }

    /**
     * Retry initialization after authentication becomes available
     * Call this method after successful login
     */
    async retryInitialization() {
        try {
            console.log('🔄 Retrying UnifiedEmployeeManager initialization after authentication...');
            
            if (this.initialized) {
                console.log('✅ UnifiedEmployeeManager already initialized');
                return true;
            }
            
            await this.init();
            console.log('✅ UnifiedEmployeeManager successfully initialized after authentication');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize UnifiedEmployeeManager even after authentication:', error.message);
            return false;
        }
    }

    // Settings Management Methods - BACKEND ONLY
    async getSettings() {
        try {
            if (!window.backendApiService || !window.backendApiService.isAvailable) {
                throw new Error('Backend API service not available - settings require backend connection');
            }

            const authToken = localStorage.getItem('auth_token');
            if (!authToken) {
                throw new Error('Authentication required - no token available');
            }

            const result = await fetch('/api/settings', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!result.ok) {
                throw new Error(`HTTP ${result.status}: ${result.statusText}`);
            }

            const data = await result.json();
            console.log('✅ Settings loaded from database:', data);
            
            // Map database keys to frontend expected keys - NO defaults or fallbacks
            const dbSettings = data.data?.settings;
            if (!dbSettings) {
                throw new Error('No settings data received from backend');
            }

            const mappedSettings = {
                // Map snake_case database keys to camelCase frontend keys - NO defaults
                companyName: dbSettings.company_name || dbSettings.companyName,
                timezone: dbSettings.timezone,
                dateFormat: dbSettings.dateFormat,
                timeFormat: dbSettings.timeFormat,
                currency: dbSettings.currency,
                currencySymbol: dbSettings.currency_symbol || dbSettings.currencySymbol,
                // Include all other settings as-is
                ...dbSettings
            };
            
            return {
                success: true,
                data: mappedSettings
            };

        } catch (error) {
            console.error('❌ Failed to load settings from database:', error);
            throw new Error(`Settings unavailable: ${error.message}`);
        }
    }

    async saveSettings(settings) {
        try {
            console.log('💾 Saving settings to database:', settings);

            if (!window.backendApiService || !window.backendApiService.isAvailable) {
                throw new Error('Backend API service not available - settings require backend connection');
            }

            const authToken = localStorage.getItem('auth_token');
            if (!authToken) {
                throw new Error('Authentication required - no token available');
            }

            // Map frontend camelCase keys to database snake_case keys
            const dbSettings = {
                ...settings,
                // Map camelCase frontend keys to snake_case database keys
                company_name: settings.companyName || settings.company_name,
                currency_symbol: settings.currencySymbol || settings.currency_symbol,
                // Remove the camelCase versions to avoid duplication
                companyName: undefined,
                currencySymbol: undefined
            };
            
            // Clean up undefined values
            Object.keys(dbSettings).forEach(key => {
                if (dbSettings[key] === undefined) {
                    delete dbSettings[key];
                }
            });

            const result = await fetch('/api/settings', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ settings: dbSettings })
            });

            if (!result.ok) {
                throw new Error(`HTTP ${result.status}: ${result.statusText}`);
            }

            const data = await result.json();
            console.log('✅ Settings saved to database successfully:', data);
            
            return { success: true, data };

        } catch (error) {
            console.error('❌ Failed to save settings to database:', error);
            throw new Error(`Settings save failed: ${error.message}`);
        }
    }
}

// Global instance creation - STRICT BACKEND ONLY
if (typeof window !== 'undefined') {
    // Initialize global instance
    window.unifiedEmployeeManager = new UnifiedEmployeeManager();
    
    // Check if we should auto-initialize based on current page
    const shouldAutoInit = () => {
        const currentPath = window.location.pathname.toLowerCase();
        const skipPages = [
            '/login.html',
            '/auth-demo.html',
            '/test-auth.html'
        ];
        
        // Don't auto-init on login/auth pages
        for (const skipPage of skipPages) {
            if (currentPath.includes(skipPage.toLowerCase()) || currentPath.endsWith(skipPage.toLowerCase())) {
                console.log(`🔄 Skipping auto-initialization on ${currentPath}`);
                return false;
            }
        }
        
        return true;
    };
    
    // Auto-initialize when DOM is ready (but only on appropriate pages)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', async () => {
            if (!shouldAutoInit()) {
                console.log('💡 UnifiedEmployeeManager created but not auto-initialized (login page)');
                return;
            }
            
            try {
                await window.unifiedEmployeeManager.init();
                console.log('✅ Global UnifiedEmployeeManager initialized successfully');
            } catch (error) {
                console.error('❌ UnifiedEmployeeManager initialization failed:', error.message);
                
                // Show error for ALL failures - no hiding authentication issues
                if (document.body && shouldAutoInit()) {
                    const errorDiv = document.createElement('div');
                    errorDiv.style.cssText = `
                        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
                        background: #ff4444; color: white; padding: 15px 25px;
                        border-radius: 5px; z-index: 10000; font-family: Arial, sans-serif;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    `;
                    errorDiv.innerHTML = `
                        <strong>System Error</strong><br>
                        ${error.message}<br>
                        <small>Backend connection required - please ensure proper authentication</small>
                    `;
                    document.body.appendChild(errorDiv);
                    
                    // Auto-remove error after 8 seconds
                    setTimeout(() => {
                        if (errorDiv.parentNode) {
                            errorDiv.parentNode.removeChild(errorDiv);
                        }
                    }, 8000);
                }
            }
        });
    } else {
        // DOM already loaded
        if (shouldAutoInit()) {
            setTimeout(async () => {
                try {
                    await window.unifiedEmployeeManager.init();
                    console.log('✅ Global UnifiedEmployeeManager initialized successfully');
                } catch (error) {
                    console.error('❌ UnifiedEmployeeManager initialization failed:', error.message);
                    
                    // Show error for ALL failures - no graceful degradation
                    if (document.body) {
                        const errorDiv = document.createElement('div');
                        errorDiv.style.cssText = `
                            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
                            background: #ff4444; color: white; padding: 15px 25px;
                            border-radius: 5px; z-index: 10000; font-family: Arial, sans-serif;
                            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        `;
                        errorDiv.innerHTML = `
                            <strong>System Error</strong><br>
                            ${error.message}<br>
                            <small>Backend connection required - please ensure proper authentication</small>
                        `;
                        document.body.appendChild(errorDiv);
                        
                        // Auto-remove error after 8 seconds
                        setTimeout(() => {
                            if (errorDiv.parentNode) {
                                errorDiv.parentNode.removeChild(errorDiv);
                            }
                        }, 8000);
                    }
                }
            }, 100);
        } else {
            console.log('💡 UnifiedEmployeeManager created but not auto-initialized (login page)');
        }
    }
}
