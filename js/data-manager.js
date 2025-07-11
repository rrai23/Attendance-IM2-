/**
 * Centralized Data Manager for Bricks Attendance System
 * Handles data persistence, synchronization, and cross-page communication
 */

class DataManager {
    constructor() {
        this.employees = [];
        this.attendanceRecords = [];
        this.initialized = false;
        this.storageKey = 'bricks-attendance-data';
        
        // Event listeners for cross-page communication
        this.listeners = {
            employeeUpdate: [],
            attendanceUpdate: [],
            dataSync: []
        };
        
        this.init();
    }

    async init() {
        if (this.initialized) {
            console.log('DataManager already initialized');
            return true;
        }
        
        try {
            console.log('Initializing DataManager...');
            
            // Load data from localStorage first
            this.loadFromStorage();
            
            // If no stored data, generate initial data
            if (this.employees.length === 0) {
                console.log('No stored data found, generating initial data...');
                await this.generateInitialData();
            }
            
            // Set up storage event listener for cross-tab synchronization
            window.addEventListener('storage', (e) => {
                if (e.key === this.storageKey) {
                    this.loadFromStorage();
                    this.notifyListeners('dataSync', { source: 'storage' });
                }
            });
            
            this.initialized = true;
            console.log('DataManager initialized successfully with:', {
                employees: this.employees.length,
                attendanceRecords: this.attendanceRecords.length
            });
            
            return true;
        } catch (error) {
            console.error('Failed to initialize DataManager:', error);
            this.initialized = false;
            throw error;
        }
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                this.employees = data.employees || [];
                this.attendanceRecords = data.attendanceRecords || [];
                console.log('Data loaded from storage:', {
                    employees: this.employees.length,
                    attendanceRecords: this.attendanceRecords.length
                });
            }
        } catch (error) {
            console.error('Failed to load data from storage:', error);
        }
    }

    saveToStorage() {
        try {
            const data = {
                employees: this.employees,
                attendanceRecords: this.attendanceRecords,
                lastUpdated: new Date().toISOString()
            };
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            console.log('Data saved to storage');
        } catch (error) {
            console.error('Failed to save data to storage:', error);
        }
    }

    async generateInitialData() {
        // Generate employee data
        this.employees = [
            {
                id: 1,
                employeeId: 'EMP001',
                name: 'John Doe',
                department: 'Engineering',
                position: 'Senior Developer',
                email: 'john.doe@company.com'
            },
            {
                id: 2,
                employeeId: 'EMP002',
                name: 'Jane Smith',
                department: 'Marketing',
                position: 'Marketing Manager',
                email: 'jane.smith@company.com'
            },
            {
                id: 3,
                employeeId: 'EMP003',
                name: 'Bob Johnson',
                department: 'Sales',
                position: 'Sales Representative',
                email: 'bob.johnson@company.com'
            },
            {
                id: 4,
                employeeId: 'EMP004',
                name: 'Alice Brown',
                department: 'HR',
                position: 'HR Coordinator',
                email: 'alice.brown@company.com'
            },
            {
                id: 5,
                employeeId: 'EMP005',
                name: 'Charlie Wilson',
                department: 'Engineering',
                position: 'Lead Developer',
                email: 'charlie.wilson@company.com'
            }
        ];

        // Generate attendance data for today and yesterday
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        
        this.attendanceRecords = [
            {
                id: 1,
                employeeId: 1,
                employeeName: 'John Doe',
                employeeCode: 'EMP001',
                department: 'Engineering',
                date: today.toISOString().split('T')[0],
                clockIn: '09:00',
                clockOut: '17:30',
                status: 'present',
                hours: 8.5,
                notes: ''
            },
            {
                id: 2,
                employeeId: 2,
                employeeName: 'Jane Smith',
                employeeCode: 'EMP002',
                department: 'Marketing',
                date: today.toISOString().split('T')[0],
                clockIn: '09:15',
                clockOut: '17:45',
                status: 'late',
                hours: 8.5,
                notes: 'Traffic delay'
            },
            {
                id: 3,
                employeeId: 3,
                employeeName: 'Bob Johnson',
                employeeCode: 'EMP003',
                department: 'Sales',
                date: today.toISOString().split('T')[0],
                clockIn: null,
                clockOut: null,
                status: 'absent',
                hours: 0,
                notes: 'Sick leave'
            },
            {
                id: 4,
                employeeId: 4,
                employeeName: 'Alice Brown',
                employeeCode: 'EMP004',
                department: 'HR',
                date: today.toISOString().split('T')[0],
                clockIn: '08:45',
                clockOut: '19:00',
                status: 'overtime',
                hours: 10.25,
                notes: 'Project deadline'
            },
            {
                id: 5,
                employeeId: 5,
                employeeName: 'Charlie Wilson',
                employeeCode: 'EMP005',
                department: 'Engineering',
                date: yesterday.toISOString().split('T')[0],
                clockIn: '09:00',
                clockOut: '17:00',
                status: 'present',
                hours: 8,
                notes: ''
            }
        ];

        this.saveToStorage();
    }

    // Employee methods
    getEmployees() {
        return [...this.employees];
    }

    getEmployee(id) {
        return this.employees.find(emp => emp.id === id);
    }

    addEmployee(employeeData) {
        const employee = {
            ...employeeData,
            id: this.employees.length > 0 ? Math.max(...this.employees.map(e => e.id)) + 1 : 1
        };
        this.employees.push(employee);
        this.saveToStorage();
        this.notifyListeners('employeeUpdate', { action: 'add', employee });
        return employee;
    }

    updateEmployee(id, employeeData) {
        const index = this.employees.findIndex(emp => emp.id === id);
        if (index >= 0) {
            this.employees[index] = { ...this.employees[index], ...employeeData };
            this.saveToStorage();
            this.notifyListeners('employeeUpdate', { action: 'update', employee: this.employees[index] });
            return this.employees[index];
        }
        throw new Error('Employee not found');
    }

    deleteEmployee(id) {
        const index = this.employees.findIndex(emp => emp.id === id);
        if (index >= 0) {
            const employee = this.employees.splice(index, 1)[0];
            this.saveToStorage();
            this.notifyListeners('employeeUpdate', { action: 'delete', employee });
            return employee;
        }
        throw new Error('Employee not found');
    }

    // Attendance methods
    getAttendanceRecords(filters = {}) {
        let records = [...this.attendanceRecords];
        
        if (filters.employeeId) {
            records = records.filter(r => r.employeeId === filters.employeeId);
        }
        
        if (filters.date) {
            records = records.filter(r => r.date === filters.date);
        }
        
        if (filters.status) {
            records = records.filter(r => r.status === filters.status);
        }
        
        return records.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    getTodayAttendance() {
        const today = new Date().toISOString().split('T')[0];
        return this.getAttendanceRecords({ date: today });
    }

    getAttendanceStats(date = null) {
        const targetDate = date || new Date().toISOString().split('T')[0];
        const records = this.getAttendanceRecords({ date: targetDate });
        
        const stats = {
            total: this.employees.length,
            present: records.filter(r => r.status === 'present').length,
            late: records.filter(r => r.status === 'late').length,
            absent: records.filter(r => r.status === 'absent').length,
            overtime: records.filter(r => r.status === 'overtime').length
        };
        
        stats.presentPercentage = stats.total > 0 ? ((stats.present + stats.late + stats.overtime) / stats.total * 100).toFixed(1) : 0;
        
        return stats;
    }

    saveAttendanceRecord(recordData) {
        try {
            const existingIndex = this.attendanceRecords.findIndex(
                r => r.employeeId === recordData.employeeId && r.date === recordData.date
            );

            const employee = this.getEmployee(recordData.employeeId);
            if (!employee) {
                throw new Error('Employee not found');
            }

            const record = {
                id: recordData.id || (existingIndex >= 0 ? this.attendanceRecords[existingIndex].id : Date.now()),
                employeeId: recordData.employeeId,
                employeeName: employee.name,
                employeeCode: employee.employeeId,
                department: employee.department,
                date: recordData.date,
                clockIn: recordData.clockIn || null,
                clockOut: recordData.clockOut || null,
                status: recordData.status,
                hours: this.calculateHours(recordData.clockIn, recordData.clockOut),
                notes: recordData.notes || '',
                lastModified: new Date().toISOString()
            };

            if (existingIndex >= 0) {
                this.attendanceRecords[existingIndex] = record;
            } else {
                this.attendanceRecords.push(record);
            }

            this.saveToStorage();
            this.notifyListeners('attendanceUpdate', { action: 'save', record });
            console.log('Attendance record saved:', record);
            return record;
        } catch (error) {
            console.error('Failed to save attendance record:', error);
            throw error;
        }
    }

    deleteAttendanceRecord(employeeId, date) {
        const index = this.attendanceRecords.findIndex(
            r => r.employeeId === employeeId && r.date === date
        );
        
        if (index >= 0) {
            const record = this.attendanceRecords.splice(index, 1)[0];
            this.saveToStorage();
            this.notifyListeners('attendanceUpdate', { action: 'delete', record });
            return record;
        }
        
        throw new Error('Attendance record not found');
    }

    updateAttendanceStatus(employeeId, date, status, notes = '') {
        const record = this.attendanceRecords.find(
            r => r.employeeId === employeeId && r.date === date
        );
        
        if (record) {
            record.status = status;
            record.notes = notes || `Status updated to ${status} on ${new Date().toLocaleString()}`;
            record.lastModified = new Date().toISOString();
            
            this.saveToStorage();
            this.notifyListeners('attendanceUpdate', { action: 'statusUpdate', record });
            return record;
        }
        
        throw new Error('Attendance record not found');
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

    // Event handling
    addEventListener(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }

    removeEventListener(event, callback) {
        if (this.listeners[event]) {
            const index = this.listeners[event].indexOf(callback);
            if (index >= 0) {
                this.listeners[event].splice(index, 1);
            }
        }
    }

    notifyListeners(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in event listener:', error);
                }
            });
        }
    }

    // Clear all data (for testing)
    clearAllData() {
        this.employees = [];
        this.attendanceRecords = [];
        localStorage.removeItem(this.storageKey);
        this.notifyListeners('dataSync', { action: 'clear' });
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
