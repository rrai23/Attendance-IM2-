/**
 * Data Manager - Legacy compatibility layer for Unified Employee Manager
 * This provides backward compatibility for existing code that uses dataManager
 */

class DataManager {
    constructor() {
        this.initialized = false;
        this.unifiedManager = null;
        
        // Auto-initialize
        this.init();
    }

    async init() {
        if (this.initialized) {
            console.log('DataManager already initialized');
            return true;
        }
        
        try {
            console.log('Initializing DataManager compatibility layer...');
            
            // Wait for unified manager to be available
            const maxWait = 5000; // 5 seconds
            const interval = 100; // Check every 100ms
            let waited = 0;
            
            while (!window.unifiedEmployeeManager?.initialized && waited < maxWait) {
                await new Promise(resolve => setTimeout(resolve, interval));
                waited += interval;
            }
            
            if (!window.unifiedEmployeeManager?.initialized) {
                console.warn('Unified Employee Manager not available, creating standalone instance');
                // If unified manager isn't available, we'll still provide basic functionality
                this.employees = [];
                this.attendanceRecords = [];
            } else {
                this.unifiedManager = window.unifiedEmployeeManager;
                console.log('DataManager linked to Unified Employee Manager');
            }
            
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize DataManager:', error);
            this.initialized = false;
            throw error;
        }
    }

    // Employee methods - delegate to unified manager or provide fallback
    getEmployees() {
        if (this.unifiedManager) {
            return this.unifiedManager.getEmployees();
        }
        return this.employees || [];
    }

    getEmployee(id) {
        if (this.unifiedManager) {
            return this.unifiedManager.getEmployee(id);
        }
        return this.employees?.find(emp => emp.id === id);
    }

    addEmployee(employeeData) {
        if (this.unifiedManager) {
            return this.unifiedManager.addEmployee(employeeData);
        }
        
        // Fallback implementation
        const employee = {
            ...employeeData,
            id: this.employees.length > 0 ? Math.max(...this.employees.map(e => e.id)) + 1 : 1
        };
        this.employees.push(employee);
        return employee;
    }

    updateEmployee(id, employeeData) {
        if (this.unifiedManager) {
            return this.unifiedManager.updateEmployee(id, employeeData);
        }
        
        // Fallback implementation
        const index = this.employees.findIndex(emp => emp.id === id);
        if (index >= 0) {
            this.employees[index] = { ...this.employees[index], ...employeeData };
            return this.employees[index];
        }
        throw new Error('Employee not found');
    }

    deleteEmployee(id) {
        if (this.unifiedManager) {
            return this.unifiedManager.deleteEmployee(id);
        }
        
        // Fallback implementation
        const index = this.employees.findIndex(emp => emp.id === id);
        if (index >= 0) {
            return this.employees.splice(index, 1)[0];
        }
        throw new Error('Employee not found');
    }

    // Attendance methods
    getAttendanceRecords(filters = {}) {
        if (this.unifiedManager) {
            return this.unifiedManager.getAttendanceRecords(filters);
        }
        return this.attendanceRecords || [];
    }

    getTodayAttendance() {
        if (this.unifiedManager) {
            return this.unifiedManager.getTodayAttendance();
        }
        
        const today = new Date().toISOString().split('T')[0];
        return this.getAttendanceRecords({ date: today });
    }

    getAttendanceStats(date = null) {
        if (this.unifiedManager) {
            return this.unifiedManager.getAttendanceStats(date);
        }
        
        // Fallback implementation
        const targetDate = date || new Date().toISOString().split('T')[0];
        const records = this.getAttendanceRecords({ date: targetDate });
        const employees = this.getEmployees();
        
        const stats = {
            total: employees.length,
            present: records.filter(r => r.status === 'present').length,
            late: records.filter(r => r.status === 'late').length,
            absent: employees.length - records.length,
            overtime: records.filter(r => r.status === 'overtime').length
        };
        
        stats.presentPercentage = stats.total > 0 ? ((stats.present + stats.late + stats.overtime) / stats.total * 100).toFixed(1) : 0;
        
        return stats;
    }

    saveAttendanceRecord(recordData) {
        if (this.unifiedManager) {
            return this.unifiedManager.saveAttendanceRecord(recordData);
        }
        
        // Fallback implementation
        const employee = this.getEmployee(recordData.employeeId);
        if (!employee) {
            throw new Error('Employee not found');
        }

        const record = {
            id: recordData.id || Date.now(),
            employeeId: recordData.employeeId,
            employeeName: employee.fullName || `${employee.firstName} ${employee.lastName}`,
            employeeCode: employee.employeeCode,
            department: employee.department,
            date: recordData.date,
            clockIn: recordData.clockIn || null,
            clockOut: recordData.clockOut || null,
            status: recordData.status,
            hours: this.calculateHours(recordData.clockIn, recordData.clockOut),
            notes: recordData.notes || '',
            lastModified: new Date().toISOString()
        };

        const existingIndex = this.attendanceRecords.findIndex(
            r => r.employeeId === recordData.employeeId && r.date === recordData.date
        );

        if (existingIndex >= 0) {
            this.attendanceRecords[existingIndex] = record;
        } else {
            this.attendanceRecords.push(record);
        }

        return record;
    }

    calculateHours(clockIn, clockOut) {
        if (!clockIn || !clockOut) return 0;
        
        try {
            const start = new Date(`2000-01-01T${clockIn}`);
            const end = new Date(`2000-01-01T${clockOut}`);
            const diffMs = end - start;
            
            if (diffMs < 0) return 0;
            
            return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
        } catch (error) {
            return 0;
        }
    }

    // Event handling - delegate to unified manager if available
    addEventListener(event, callback) {
        if (this.unifiedManager) {
            this.unifiedManager.addEventListener(event, callback);
        }
    }

    removeEventListener(event, callback) {
        if (this.unifiedManager) {
            this.unifiedManager.removeEventListener(event, callback);
        }
    }

    // Storage methods
    saveToStorage() {
        if (this.unifiedManager) {
            this.unifiedManager.saveData();
        }
    }

    loadFromStorage() {
        // This is handled by the unified manager
        console.log('DataManager: Storage loading delegated to Unified Employee Manager');
    }

    // Utility methods
    clearAllData() {
        if (this.unifiedManager) {
            this.unifiedManager.clearAllData();
        } else {
            this.employees = [];
            this.attendanceRecords = [];
        }
    }

    // Legacy methods for backward compatibility
    generateInitialData() {
        console.warn('DataManager.generateInitialData() is deprecated. Data is managed by Unified Employee Manager.');
        return Promise.resolve();
    }

    generateFallbackEmployeeData() {
        console.warn('DataManager.generateFallbackEmployeeData() is deprecated. Data is managed by Unified Employee Manager.');
    }
}

// Global instance
window.dataManager = new DataManager();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.dataManager.init().catch(console.error);
    });
} else {
    window.dataManager.init().catch(console.error);
}
