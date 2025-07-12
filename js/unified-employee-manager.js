/**
 * Unified Employee Manager for Bricks Attendance System
 * Central hub for all employee-related operations across the system
 * Eliminates data redundancy and ensures consistency
 */

class UnifiedEmployeeManager {
    constructor() {
        this.employees = [];
        this.attendanceRecords = [];
        this.initialized = false;
        this.storageKey = 'bricks-unified-employee-data';
        this.syncKey = 'bricks-employee-sync';
        
        // Event listeners for real-time updates
        this.eventListeners = {
            employeeUpdate: [],
            attendanceUpdate: [],
            dataSync: []
        };
        
        // Auto-initialize
        this.init();
    }

    async init() {
        if (this.initialized) return;
        
        try {
            console.log('Initializing Unified Employee Manager...');
            
            // Load existing data or create initial data
            await this.loadData();
            
            // Set up cross-tab synchronization
            this.setupCrossTabSync();
            
            this.initialized = true;
            console.log('Unified Employee Manager initialized with:', {
                employees: this.employees.length,
                attendanceRecords: this.attendanceRecords.length
            });
            
            this.emit('dataSync', { action: 'initialized' });
            
        } catch (error) {
            console.error('Failed to initialize Unified Employee Manager:', error);
            throw error;
        }
    }

    async loadData() {
        try {
            // First try to load from localStorage
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                this.employees = data.employees || [];
                this.attendanceRecords = data.attendanceRecords || [];
                console.log('Loaded data from localStorage');
                return;
            }

            // If no stored data, migrate from existing sources
            await this.migrateFromExistingSources();
            
        } catch (error) {
            console.error('Error loading data:', error);
            // Fallback to creating initial data
            await this.createInitialData();
        }
    }

    async migrateFromExistingSources() {
        console.log('Migrating data from existing sources...');
        
        // Try to get data from dataService if available
        if (typeof dataService !== 'undefined') {
            try {
                const serviceEmployees = await dataService.getEmployees();
                this.employees = this.normalizeEmployeeData(serviceEmployees);
                
                // Try to get attendance records
                const serviceAttendance = await dataService.getAttendanceRecords();
                this.attendanceRecords = this.normalizeAttendanceData(serviceAttendance);
                
                console.log('Migrated data from dataService');
                this.saveData();
                return;
            } catch (error) {
                console.warn('Failed to migrate from dataService:', error);
            }
        }

        // Try to get data from dataManager if available
        if (typeof dataManager !== 'undefined' && dataManager.initialized) {
            try {
                const managerEmployees = dataManager.getEmployees();
                this.employees = this.normalizeEmployeeData(managerEmployees);
                
                const managerAttendance = dataManager.getAttendanceRecords();
                this.attendanceRecords = this.normalizeAttendanceData(managerAttendance);
                
                console.log('Migrated data from dataManager');
                this.saveData();
                return;
            } catch (error) {
                console.warn('Failed to migrate from dataManager:', error);
            }
        }

        // Fallback to creating initial data
        await this.createInitialData();
    }

    normalizeEmployeeData(employees) {
        return employees.map(emp => ({
            id: emp.id,
            employeeCode: emp.employeeCode || emp.employeeId || `EMP${String(emp.id).padStart(3, '0')}`,
            firstName: emp.firstName || emp.name?.split(' ')[0] || 'Unknown',
            lastName: emp.lastName || emp.name?.split(' ').slice(1).join(' ') || 'Employee',
            fullName: emp.fullName || emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
            email: emp.email || '',
            phone: emp.phone || '',
            department: emp.department || 'General',
            position: emp.position || 'Employee',
            manager: emp.manager || null,
            hireDate: emp.hireDate || new Date().toISOString().split('T')[0],
            hourlyRate: emp.hourlyRate || 25.00,
            salaryType: emp.salaryType || 'hourly',
            status: emp.status || 'active',
            role: emp.role || 'employee',
            schedule: emp.schedule || this.getDefaultSchedule(),
            createdAt: emp.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }));
    }

    normalizeAttendanceData(records) {
        return records.map(record => ({
            id: record.id || Date.now() + Math.random(),
            employeeId: record.employeeId,
            employeeCode: record.employeeCode,
            employeeName: record.employeeName,
            department: record.department,
            date: record.date,
            clockIn: record.clockIn,
            clockOut: record.clockOut,
            status: record.status || 'present',
            hours: record.hours || this.calculateHours(record.clockIn, record.clockOut),
            notes: record.notes || '',
            lastModified: record.lastModified || new Date().toISOString()
        }));
    }

    getDefaultSchedule() {
        return {
            monday: { active: true, start: "08:00", end: "17:00" },
            tuesday: { active: true, start: "08:00", end: "17:00" },
            wednesday: { active: true, start: "08:00", end: "17:00" },
            thursday: { active: true, start: "08:00", end: "17:00" },
            friday: { active: true, start: "08:00", end: "17:00" },
            saturday: { active: false, start: "08:00", end: "17:00" },
            sunday: { active: false, start: "08:00", end: "17:00" }
        };
    }

    async createInitialData() {
        console.log('Creating initial employee data...');
        
        this.employees = [
            {
                id: 1,
                employeeCode: 'EMP001',
                firstName: 'John',
                lastName: 'Doe',
                fullName: 'John Doe',
                email: 'john.doe@company.com',
                phone: '(555) 123-4567',
                department: 'Engineering',
                position: 'Senior Developer',
                manager: null,
                hireDate: '2023-01-15',
                hourlyRate: 45.00,
                salaryType: 'hourly',
                status: 'active',
                role: 'employee',
                schedule: this.getDefaultSchedule(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 2,
                employeeCode: 'EMP002',
                firstName: 'Jane',
                lastName: 'Smith',
                fullName: 'Jane Smith',
                email: 'jane.smith@company.com',
                phone: '(555) 234-5678',
                department: 'Marketing',
                position: 'Marketing Manager',
                manager: null,
                hireDate: '2023-02-20',
                hourlyRate: 40.00,
                salaryType: 'hourly',
                status: 'active',
                role: 'employee',
                schedule: this.getDefaultSchedule(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 3,
                employeeCode: 'EMP003',
                firstName: 'Bob',
                lastName: 'Johnson',
                fullName: 'Bob Johnson',
                email: 'bob.johnson@company.com',
                phone: '(555) 345-6789',
                department: 'Sales',
                position: 'Sales Representative',
                manager: null,
                hireDate: '2023-03-10',
                hourlyRate: 35.00,
                salaryType: 'hourly',
                status: 'active',
                role: 'employee',
                schedule: this.getDefaultSchedule(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 4,
                employeeCode: 'EMP004',
                firstName: 'Alice',
                lastName: 'Brown',
                fullName: 'Alice Brown',
                email: 'alice.brown@company.com',
                phone: '(555) 456-7890',
                department: 'HR',
                position: 'HR Coordinator',
                manager: null,
                hireDate: '2023-04-05',
                hourlyRate: 38.00,
                salaryType: 'hourly',
                status: 'active',
                role: 'employee',
                schedule: this.getDefaultSchedule(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 5,
                employeeCode: 'EMP005',
                firstName: 'Charlie',
                lastName: 'Wilson',
                fullName: 'Charlie Wilson',
                email: 'charlie.wilson@company.com',
                phone: '(555) 567-8901',
                department: 'Engineering',
                position: 'Lead Developer',
                manager: 'John Doe',
                hireDate: '2023-05-15',
                hourlyRate: 50.00,
                salaryType: 'hourly',
                status: 'active',
                role: 'employee',
                schedule: this.getDefaultSchedule(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];

        // Create some sample attendance records
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        this.attendanceRecords = [
            {
                id: 1,
                employeeId: 1,
                employeeCode: 'EMP001',
                employeeName: 'John Doe',
                department: 'Engineering',
                date: today,
                clockIn: '09:00',
                clockOut: '17:30',
                status: 'present',
                hours: 8.5,
                notes: '',
                lastModified: new Date().toISOString()
            },
            {
                id: 2,
                employeeId: 2,
                employeeCode: 'EMP002',
                employeeName: 'Jane Smith',
                department: 'Marketing',
                date: today,
                clockIn: '09:15',
                clockOut: '17:45',
                status: 'late',
                hours: 8.5,
                notes: 'Traffic delay',
                lastModified: new Date().toISOString()
            }
        ];

        this.saveData();
    }

    saveData() {
        try {
            const data = {
                employees: this.employees,
                attendanceRecords: this.attendanceRecords,
                lastUpdated: new Date().toISOString(),
                version: '1.0'
            };
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            
            // Trigger sync event
            localStorage.setItem(this.syncKey, JSON.stringify({
                action: 'update',
                timestamp: Date.now()
            }));
            
            console.log('Data saved to localStorage');
        } catch (error) {
            console.error('Failed to save data:', error);
        }
    }

    deleteEmployee(id) {
        try {
            const index = this.employees.findIndex(emp => emp.id === parseInt(id));
            if (index === -1) {
                throw new Error('Employee not found');
            }

            const deletedEmployee = this.employees.splice(index, 1)[0];
            
            // Also remove their attendance records
            const removedAttendanceCount = this.attendanceRecords.length;
            this.attendanceRecords = this.attendanceRecords.filter(record => record.employeeId !== parseInt(id));
            const currentAttendanceCount = this.attendanceRecords.length;
            
            this.saveData();
            
            // Broadcast employee deletion to all systems
            this.emit('employeeUpdate', { 
                action: 'delete', 
                employee: deletedEmployee,
                removedAttendanceRecords: removedAttendanceCount - currentAttendanceCount
            });
            
            // Also emit specific delete event for systems that need it
            this.emit('employeeDeleted', { 
                employeeId: parseInt(id),
                employee: deletedEmployee,
                removedAttendanceRecords: removedAttendanceCount - currentAttendanceCount
            });
            
            // Broadcast data sync event for cross-tab/page updates
            this.broadcastSystemWide('employeeDeleted', {
                employeeId: parseInt(id),
                employee: deletedEmployee,
                timestamp: new Date().toISOString()
            });
            
            console.log('Employee deleted:', deletedEmployee);
            console.log(`Removed ${removedAttendanceCount - currentAttendanceCount} attendance records`);
            return deletedEmployee;
        } catch (error) {
            console.error('Error deleting employee:', error);
            throw error;
        }
    }

    /**
     * Enhanced system-wide broadcasting for critical updates
     */
    broadcastSystemWide(eventType, data) {
        // Local page broadcast
        this.emit(eventType, data);
        
        // Cross-tab/window broadcast using BroadcastChannel
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                if (!this.broadcastChannel) {
                    this.broadcastChannel = new BroadcastChannel('bricks-attendance-sync');
                }
                
                this.broadcastChannel.postMessage({
                    type: eventType,
                    data: data,
                    timestamp: new Date().toISOString(),
                    source: 'UnifiedEmployeeManager'
                });
            } catch (error) {
                console.warn('BroadcastChannel not available:', error);
            }
        }
        
        // Local storage sync for cross-tab communication fallback
        try {
            const syncData = {
                type: eventType,
                data: data,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('bricks-system-event', JSON.stringify(syncData));
            // Clear it immediately to trigger storage event
            setTimeout(() => localStorage.removeItem('bricks-system-event'), 100);
        } catch (error) {
            console.warn('LocalStorage sync failed:', error);
        }
        
        // DOM event for same-page components
        try {
            const customEvent = new CustomEvent('bricksSystemUpdate', {
                detail: {
                    type: eventType,
                    data: data,
                    timestamp: new Date().toISOString()
                }
            });
            document.dispatchEvent(customEvent);
        } catch (error) {
            console.warn('DOM event dispatch failed:', error);
        }
    }

    /**
     * Setup cross-tab synchronization listeners
     */
    setupCrossTabSync() {
        // BroadcastChannel listener
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                this.broadcastChannel = new BroadcastChannel('bricks-attendance-sync');
                this.broadcastChannel.addEventListener('message', (event) => {
                    if (event.data.source !== 'UnifiedEmployeeManager') return;
                    
                    console.log('Received cross-tab sync:', event.data);
                    
                    // Handle different event types
                    switch (event.data.type) {
                        case 'employeeDeleted':
                        case 'employeeAdded':
                        case 'employeeUpdated':
                            this.handleCrossTabEmployeeUpdate(event.data);
                            break;
                        case 'attendanceUpdated':
                            this.handleCrossTabAttendanceUpdate(event.data);
                            break;
                    }
                });
            } catch (error) {
                console.warn('BroadcastChannel setup failed:', error);
            }
        }
        
        // Storage event listener for fallback
        window.addEventListener('storage', (event) => {
            if (event.key === 'bricks-system-event' && event.newValue) {
                try {
                    const syncData = JSON.parse(event.newValue);
                    console.log('Received storage sync:', syncData);
                    
                    // Handle the sync event
                    switch (syncData.type) {
                        case 'employeeDeleted':
                        case 'employeeAdded':
                        case 'employeeUpdated':
                            this.handleCrossTabEmployeeUpdate(syncData);
                            break;
                        case 'attendanceUpdated':
                            this.handleCrossTabAttendanceUpdate(syncData);
                            break;
                    }
                } catch (error) {
                    console.warn('Failed to parse storage sync data:', error);
                }
            }
        });
    }

    /**
     * Handle cross-tab employee updates
     */
    handleCrossTabEmployeeUpdate(syncData) {
        // Reload data from storage to ensure consistency
        this.loadData().then(() => {
            // Emit local events to update UI
            this.emit('dataSync', { 
                action: syncData.type, 
                data: syncData.data,
                source: 'crossTab'
            });
            
            // Emit specific event type
            this.emit(syncData.type, syncData.data);
        }).catch(error => {
            console.error('Failed to reload data after cross-tab sync:', error);
        });
    }

    /**
     * Handle cross-tab attendance updates
     */
    handleCrossTabAttendanceUpdate(syncData) {
        // Reload attendance data
        this.loadData().then(() => {
            this.emit('attendanceUpdate', syncData.data);
            this.emit('dataSync', { 
                action: 'attendanceUpdate', 
                data: syncData.data,
                source: 'crossTab'
            });
        }).catch(error => {
            console.error('Failed to reload attendance data after cross-tab sync:', error);
        });
    }

    // Employee CRUD Operations
    getEmployees() {
        return [...this.employees];
    }

    getEmployee(id) {
        return this.employees.find(emp => emp.id === parseInt(id));
    }

    getEmployeeByCode(code) {
        return this.employees.find(emp => emp.employeeCode === code);
    }

    addEmployee(employeeData) {
        try {
            const newId = this.employees.length > 0 ? Math.max(...this.employees.map(e => e.id)) + 1 : 1;
            const newEmployee = {
                id: newId,
                employeeCode: employeeData.employeeCode || `EMP${String(newId).padStart(3, '0')}`,
                ...employeeData,
                fullName: `${employeeData.firstName} ${employeeData.lastName}`.trim(),
                schedule: employeeData.schedule || this.getDefaultSchedule(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            this.employees.push(newEmployee);
            this.saveData();
            
            // Broadcast employee addition to all systems
            this.emit('employeeUpdate', { action: 'add', employee: newEmployee });
            this.emit('employeeAdded', { employee: newEmployee });
            
            // System-wide broadcast
            this.broadcastSystemWide('employeeAdded', {
                employee: newEmployee,
                timestamp: new Date().toISOString()
            });
            
            console.log('Employee added:', newEmployee);
            return newEmployee;
        } catch (error) {
            console.error('Error adding employee:', error);
            throw error;
        }
    }

    updateEmployee(id, employeeData) {
        try {
            const index = this.employees.findIndex(emp => emp.id === parseInt(id));
            if (index === -1) {
                throw new Error('Employee not found');
            }

            const oldEmployee = { ...this.employees[index] };
            const updatedEmployee = {
                ...this.employees[index],
                ...employeeData,
                fullName: `${employeeData.firstName || this.employees[index].firstName} ${employeeData.lastName || this.employees[index].lastName}`.trim(),
                updatedAt: new Date().toISOString()
            };

            this.employees[index] = updatedEmployee;
            this.saveData();
            
            // Broadcast employee update to all systems
            this.emit('employeeUpdate', { action: 'update', employee: updatedEmployee, oldEmployee });
            this.emit('employeeUpdated', { employee: updatedEmployee, oldEmployee });
            
            // System-wide broadcast
            this.broadcastSystemWide('employeeUpdated', {
                employee: updatedEmployee,
                oldEmployee: oldEmployee,
                timestamp: new Date().toISOString()
            });
            
            console.log('Employee updated:', updatedEmployee);
            return updatedEmployee;
        } catch (error) {
            console.error('Error updating employee:', error);
            throw error;
        }
    }

    deleteEmployee(id) {
        try {
            const index = this.employees.findIndex(emp => emp.id === parseInt(id));
            if (index === -1) {
                throw new Error('Employee not found');
            }

            const deletedEmployee = this.employees.splice(index, 1)[0];
            
            // Also remove their attendance records
            const removedAttendanceCount = this.attendanceRecords.length;
            this.attendanceRecords = this.attendanceRecords.filter(record => record.employeeId !== parseInt(id));
            const currentAttendanceCount = this.attendanceRecords.length;
            
            this.saveData();
            
            // Broadcast employee deletion to all systems
            this.emit('employeeUpdate', { 
                action: 'delete', 
                employee: deletedEmployee,
                removedAttendanceRecords: removedAttendanceCount - currentAttendanceCount
            });
            
            // Also emit specific delete event for systems that need it
            this.emit('employeeDeleted', { 
                employeeId: parseInt(id),
                employee: deletedEmployee,
                removedAttendanceRecords: removedAttendanceCount - currentAttendanceCount
            });
            
            // Broadcast data sync event for cross-tab/page updates
            this.broadcastSystemWide('employeeDeleted', {
                employeeId: parseInt(id),
                employee: deletedEmployee,
                timestamp: new Date().toISOString()
            });
            
            console.log('Employee deleted:', deletedEmployee);
            console.log(`Removed ${removedAttendanceCount - currentAttendanceCount} attendance records`);
            return deletedEmployee;
        } catch (error) {
            console.error('Error deleting employee:', error);
            throw error;
        }
    }

    // Attendance Operations
    getAttendanceRecords(filters = {}) {
        let records = [...this.attendanceRecords];
        
        if (filters.employeeId) {
            records = records.filter(r => r.employeeId === parseInt(filters.employeeId));
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

    saveAttendanceRecord(recordData) {
        try {
            const employee = this.getEmployee(recordData.employeeId);
            if (!employee) {
                throw new Error('Employee not found');
            }

            const existingIndex = this.attendanceRecords.findIndex(
                r => r.employeeId === recordData.employeeId && r.date === recordData.date
            );

            const record = {
                id: recordData.id || (existingIndex >= 0 ? this.attendanceRecords[existingIndex].id : Date.now()),
                employeeId: recordData.employeeId,
                employeeCode: employee.employeeCode,
                employeeName: employee.fullName,
                department: employee.department,
                date: recordData.date,
                clockIn: recordData.clockIn || null,
                clockOut: recordData.clockOut || null,
                status: recordData.status,
                hours: this.calculateHours(recordData.clockIn, recordData.clockOut),
                notes: recordData.notes || '',
                lastModified: new Date().toISOString()
            };

            const isUpdate = existingIndex >= 0;
            if (isUpdate) {
                this.attendanceRecords[existingIndex] = record;
            } else {
                this.attendanceRecords.push(record);
            }

            this.saveData();
            
            // Broadcast attendance update to all systems
            this.emit('attendanceUpdate', { action: isUpdate ? 'update' : 'add', record });
            this.emit('attendanceRecordSaved', { record, isUpdate });
            
            // System-wide broadcast
            this.broadcastSystemWide('attendanceUpdated', {
                record: record,
                action: isUpdate ? 'update' : 'add',
                timestamp: new Date().toISOString()
            });
            
            console.log('Attendance record saved:', record);
            return record;
        } catch (error) {
            console.error('Error saving attendance record:', error);
            throw error;
        }
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

    // Statistics and Analytics
    getEmployeeStats() {
        const total = this.employees.length;
        const active = this.employees.filter(emp => emp.status === 'active').length;
        const departments = [...new Set(this.employees.map(emp => emp.department))];
        
        return {
            total,
            active,
            inactive: total - active,
            departments: departments.length,
            departmentBreakdown: departments.map(dept => ({
                name: dept,
                count: this.employees.filter(emp => emp.department === dept).length
            }))
        };
    }

    getAttendanceStats(date = null) {
        const targetDate = date || new Date().toISOString().split('T')[0];
        const records = this.getAttendanceRecords({ date: targetDate });
        const totalEmployees = this.employees.filter(emp => emp.status === 'active').length;
        
        const present = records.filter(r => r.status === 'present').length;
        const late = records.filter(r => r.status === 'late').length;
        const absent = totalEmployees - present - late;
        const overtime = records.filter(r => r.status === 'overtime').length;
        
        return {
            total: totalEmployees,
            present,
            late,
            absent,
            overtime,
            attendanceRate: totalEmployees > 0 ? ((present + late + overtime) / totalEmployees * 100).toFixed(1) : 0
        };
    }

    // Event System
    addEventListener(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    removeEventListener(event, callback) {
        if (this.eventListeners[event]) {
            const index = this.eventListeners[event].indexOf(callback);
            if (index >= 0) {
                this.eventListeners[event].splice(index, 1);
            }
        }
    }

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

    // Utility Methods
    searchEmployees(query) {
        if (!query) return this.employees;
        
        const searchTerm = query.toLowerCase();
        return this.employees.filter(emp => 
            emp.fullName.toLowerCase().includes(searchTerm) ||
            emp.firstName.toLowerCase().includes(searchTerm) ||
            emp.lastName.toLowerCase().includes(searchTerm) ||
            emp.employeeCode.toLowerCase().includes(searchTerm) ||
            emp.email.toLowerCase().includes(searchTerm) ||
            emp.department.toLowerCase().includes(searchTerm) ||
            emp.position.toLowerCase().includes(searchTerm)
        );
    }

    getEmployeesByDepartment(department) {
        return this.employees.filter(emp => emp.department === department);
    }

    getDepartments() {
        const departments = [...new Set(this.employees.map(emp => emp.department))];
        return departments.sort();
    }

    // Data Migration and Cleanup
    migrateOldData() {
        // Clean up old storage keys
        const oldKeys = ['bricks-attendance-data', 'employee-data', 'attendance-data'];
        oldKeys.forEach(key => {
            if (localStorage.getItem(key)) {
                console.log(`Removing old storage key: ${key}`);
                localStorage.removeItem(key);
            }
        });
        
        this.saveData();
    }

    clearAllData() {
        this.employees = [];
        this.attendanceRecords = [];
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.syncKey);
        this.emit('dataSync', { action: 'clear' });
        console.log('All data cleared');
    }
}

// Global instance
window.unifiedEmployeeManager = new UnifiedEmployeeManager();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.unifiedEmployeeManager.init().catch(console.error);
    });
} else {
    window.unifiedEmployeeManager.init().catch(console.error);
}
