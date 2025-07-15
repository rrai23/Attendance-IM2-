/**
 * Unified Employee Manager - Authentication Required Version
 * This version requires backend authentication and provides NO fallbacks
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
        // ⚠️ AUTHENTICATION REQUIRED - NO FALLBACKS
        // This system requires valid backend authentication to function
        
        try {
            // Check if backend API service is available
            if (!window.backendApiService || !window.backendApiService.isAvailable) {
                throw new Error('Backend API service not available - authentication required');
            }

            // Check if user is authenticated
            const authToken = localStorage.getItem('auth_token') || localStorage.getItem('jwt_token');
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
            console.error('❌ Authentication failed or backend unavailable:', error.message);
            
            // Clear any existing data to prevent unauthorized access
            this.employees = [];
            this.attendanceRecords = [];
            
            // Clear localStorage to prevent cached data access
            localStorage.removeItem('bricks-unified-employee-data');
            localStorage.removeItem('employees');
            localStorage.removeItem('attendanceRecords');
            
            // Re-throw the error to fail initialization
            throw new Error(`System initialization failed: ${error.message}`);
        }
    }

    /**
     * Save data - only to backend with authentication
     */
    async saveData() {
        try {
            if (!window.backendApiService || !window.backendApiService.isAvailable) {
                throw new Error('Backend not available - cannot save data');
            }

            const authToken = localStorage.getItem('auth_token') || localStorage.getItem('jwt_token');
            if (!authToken) {
                throw new Error('No authentication token - cannot save data');
            }

            // Sync to backend
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

    // Employee Management Methods
    getEmployees() {
        return this.employees;
    }

    getEmployeeById(id) {
        return this.employees.find(emp => emp.id == id);
    }

    async addEmployee(employeeData) {
        try {
            // Generate ID if not provided
            if (!employeeData.id) {
                employeeData.id = Math.max(...this.employees.map(e => e.id), 0) + 1;
            }

            // Add to local array
            this.employees.push(employeeData);
            
            // Save to backend
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
            const index = this.employees.findIndex(emp => emp.id == id);
            if (index === -1) {
                throw new Error('Employee not found');
            }

            // Update local data
            this.employees[index] = { ...this.employees[index], ...updateData };
            
            // Save to backend
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
            const index = this.employees.findIndex(emp => emp.id == id);
            if (index === -1) {
                throw new Error('Employee not found');
            }

            const employee = this.employees[index];
            
            // Remove from local array
            this.employees.splice(index, 1);
            
            // Remove related attendance records
            this.attendanceRecords = this.attendanceRecords.filter(record => record.employeeId != id);
            
            // Save to backend
            await this.saveData();
            
            this.emit('employeeUpdate', { action: 'delete', employee });
            
            return { success: true };
        } catch (error) {
            console.error('Failed to delete employee:', error);
            throw error;
        }
    }

    // Attendance Management Methods
    getAttendanceRecords() {
        return this.attendanceRecords;
    }

    getAttendanceByDate(date) {
        return this.attendanceRecords.filter(record => record.date === date);
    }

    getAttendanceByEmployee(employeeId) {
        return this.attendanceRecords.filter(record => record.employeeId == employeeId);
    }

    async addAttendanceRecord(recordData) {
        try {
            // Generate ID if not provided
            if (!recordData.id) {
                recordData.id = `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }

            // Add to local array
            this.attendanceRecords.push(recordData);
            
            // Save to backend
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
            const index = this.attendanceRecords.findIndex(record => record.id === id);
            if (index === -1) {
                throw new Error('Attendance record not found');
            }

            // Update local data
            this.attendanceRecords[index] = { ...this.attendanceRecords[index], ...updateData };
            
            // Save to backend
            await this.saveData();
            
            this.emit('attendanceUpdate', { action: 'update', record: this.attendanceRecords[index] });
            
            return { success: true, record: this.attendanceRecords[index] };
        } catch (error) {
            console.error('Failed to update attendance record:', error);
            throw error;
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

    // Utility Methods
    calculateHours(clockIn, clockOut) {
        if (!clockIn || !clockOut) return 0;
        
        const start = new Date(clockIn);
        const end = new Date(clockOut);
        const diffMs = end - start;
        const hours = diffMs / (1000 * 60 * 60);
        
        return Math.max(0, Math.round(hours * 100) / 100);
    }

    // Statistics Methods
    getTodayAttendanceStats() {
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = this.getAttendanceByDate(today);
        
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
}

// Global instance creation with authentication requirement
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
                console.warn('⚠️ UnifiedEmployeeManager initialization deferred:', error.message);
                
                // Don't show intrusive error messages for authentication issues
                // The user can log in and the system will retry initialization
                if (error.message.includes('authentication') || error.message.includes('Backend API service not available')) {
                    console.log('💡 System requires authentication - UnifiedEmployeeManager will initialize after login');
                } else {
                    console.error('❌ Unexpected initialization error:', error.message);
                    // Only show error for unexpected issues, not auth requirements
                    if (document.body && shouldAutoInit() && !error.message.includes('authentication')) {
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
                            <small>Please refresh the page or contact support</small>
                        `;
                        document.body.appendChild(errorDiv);
                        
                        // Auto-remove error after 10 seconds
                        setTimeout(() => {
                            if (errorDiv.parentNode) {
                                errorDiv.parentNode.removeChild(errorDiv);
                            }
                        }, 10000);
                    }
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
                    console.warn('⚠️ UnifiedEmployeeManager initialization deferred:', error.message);
                    
                    // Don't show intrusive error messages for authentication issues
                    if (error.message.includes('authentication') || error.message.includes('Backend API service not available')) {
                        console.log('💡 System requires authentication - UnifiedEmployeeManager will initialize after login');
                    } else {
                        console.error('❌ Unexpected initialization error:', error.message);
                    }
                }
            }, 100);
        } else {
            console.log('💡 UnifiedEmployeeManager created but not auto-initialized (login page)');
        }
    }
}
