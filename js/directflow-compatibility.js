/**
 * DirectFlow Compatibility Shim
 * 
 * Provides backward compatibility for old unified data service calls
 * This ensures existing code continues to work with DirectFlow
 */

(function() {
    'use strict';
    
    // Wait for DirectFlow to be available
    function waitForDirectFlow() {
        return new Promise((resolve) => {
            if (window.directFlow && window.directFlow.isReady()) {
                resolve();
            } else {
                // Check every 100ms
                const interval = setInterval(() => {
                    if (window.directFlow && window.directFlow.isReady()) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 100);
            }
        });
    }

    // Initialize compatibility layer
    waitForDirectFlow().then(() => {
        console.log('🔄 Initializing DirectFlow compatibility layer...');
        
        // Alias for backward compatibility
        window.dataService = window.directFlow;
        window.unifiedDataService = window.directFlow;
        window.dataManager = window.directFlow;
        
        // Create UnifiedEmployeeManager compatibility
        window.UnifiedEmployeeManager = class {
            constructor() {
                this.directFlow = window.directFlow;
            }
            
            async getEmployees() {
                return await this.directFlow.getEmployees();
            }
            
            async getAttendanceRecords() {
                return await this.directFlow.getAttendanceRecords();
            }
            
            async getAttendanceOverview() {
                return await this.directFlow.getAttendanceOverview();
            }
            
            async getSettings() {
                return await this.directFlow.getSettings();
            }
            
            async saveEmployee(employee) {
                if (employee.id) {
                    return await this.directFlow.updateEmployee(employee.id, employee);
                } else {
                    return await this.directFlow.createEmployee(employee);
                }
            }
            
            async deleteEmployee(employeeId) {
                return await this.directFlow.deleteEmployee(employeeId);
            }
            
            async saveAttendanceRecord(record) {
                if (record.id) {
                    return await this.directFlow.updateAttendanceRecord(record.id, record);
                } else {
                    return await this.directFlow.createAttendanceRecord(record);
                }
            }
            
            async deleteAttendanceRecord(recordId) {
                return await this.directFlow.deleteAttendanceRecord(recordId);
            }
            
            async getAllData() {
                return await this.directFlow.getAllData();
            }
            
            async syncData(data) {
                return await this.directFlow.syncData(data);
            }
            
            addEventListener(event, callback) {
                this.directFlow.addEventListener(event, callback);
            }
            
            removeEventListener(event, callback) {
                this.directFlow.removeEventListener(event, callback);
            }
            
            emit(event, data) {
                this.directFlow.emit(event, data);
            }
        };
        
        // Create instance for backward compatibility
        window.unifiedEmployeeManager = new window.UnifiedEmployeeManager();
        
        // BackendApiService compatibility
        window.BackendApiService = class {
            constructor() {
                this.directFlow = window.directFlow;
                this.isAvailable = this.directFlow.isReady();
            }
            
            async ensureAuthenticated() {
                return this.directFlow.isReady();
            }
            
            async syncToBackend(employees, attendance) {
                return await this.directFlow.syncData({ employees, attendance });
            }
            
            async getDataFromBackend() {
                return await this.directFlow.getAllData();
            }
            
            setAuthToken(token) {
                this.directFlow.setAuthToken(token);
            }
        };
        
        // Create instance for backward compatibility
        window.backendApiService = new window.BackendApiService();
        
        // LocalStorageDataService compatibility (deprecated - shows warning)
        window.LocalStorageDataService = class {
            constructor() {
                console.warn('⚠️  LocalStorageDataService is deprecated. Use DirectFlow instead.');
                this.directFlow = window.directFlow;
            }
            
            async getEmployees() {
                console.warn('⚠️  Using deprecated LocalStorageDataService. Redirecting to DirectFlow.');
                return await this.directFlow.getEmployees();
            }
            
            async getAttendanceRecords() {
                console.warn('⚠️  Using deprecated LocalStorageDataService. Redirecting to DirectFlow.');
                return await this.directFlow.getAttendanceRecords();
            }
            
            async getSettings() {
                console.warn('⚠️  Using deprecated LocalStorageDataService. Redirecting to DirectFlow.');
                return await this.directFlow.getSettings();
            }
        };
        
        // Mock localStorage dependencies to show deprecation warnings
        const originalGetItem = localStorage.getItem;
        const originalSetItem = localStorage.setItem;
        
        localStorage.getItem = function(key) {
            if (key.includes('bricks_') || key.includes('employee_') || key.includes('attendance_')) {
                console.warn(`⚠️  Deprecated localStorage access for ${key}. Use DirectFlow instead.`);
            }
            return originalGetItem.call(this, key);
        };
        
        localStorage.setItem = function(key, value) {
            if (key.includes('bricks_') || key.includes('employee_') || key.includes('attendance_')) {
                console.warn(`⚠️  Deprecated localStorage write for ${key}. Use DirectFlow instead.`);
            }
            return originalSetItem.call(this, key, value);
        };
        
        console.log('✅ DirectFlow compatibility layer initialized');
        
        // Emit event for pages waiting for initialization
        window.dispatchEvent(new CustomEvent('directflow-compatibility-ready'));
    });
})();