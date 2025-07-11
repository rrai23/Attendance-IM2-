// Data store abstraction layer for the Bricks Attendance System
class DataStore {
    static instance = null;
    static adapter = null;

    constructor() {
        if (DataStore.instance) {
            return DataStore.instance;
        }
        
        // Initialize with LocalStorage adapter for now
        DataStore.adapter = new LocalStorageAdapter();
        DataStore.instance = this;
        
        // Initialize with mock data if first time
        this.initializeData();
    }

    static getInstance() {
        if (!DataStore.instance) {
            new DataStore();
        }
        return DataStore.instance;
    }

    // Initialize mock data if not present
    async initializeData() {
        const existingData = await DataStore.adapter.get('employees');
        if (!existingData || existingData.length === 0) {
            await this.loadMockData();
        }
    }

    // Load mock data from JSON
    async loadMockData() {
        try {
            const response = await fetch('mock/data.json');
            const mockData = await response.json();
            
            // Store each data type
            await DataStore.adapter.set('employees', mockData.employees);
            await DataStore.adapter.set('attendance', mockData.attendance);
            await DataStore.adapter.set('payroll', mockData.payroll);
            await DataStore.adapter.set('settings', mockData.settings);
            await DataStore.adapter.set('calendar_notes', mockData.calendar_notes || []);
            
            console.log('Mock data loaded successfully');
        } catch (error) {
            console.error('Error loading mock data:', error);
            await this.createDefaultData();
        }
    }

    // Create minimal default data if mock data fails to load
    async createDefaultData() {
        const defaultEmployees = [
            {
                id: 'emp_001',
                username: 'admin',
                role: 'admin',
                fullName: 'Administrator',
                email: 'admin@bricks.com',
                startDate: '2024-01-01',
                status: 'active'
            },
            {
                id: 'emp_002',
                username: 'employee',
                role: 'employee',
                fullName: 'Employee User',
                email: 'employee@bricks.com',
                startDate: '2024-01-15',
                status: 'active'
            }
        ];

        const defaultSettings = {
            company: {
                name: 'Bricks Company',
                workingHours: 8,
                startTime: '09:00',
                endTime: '17:00'
            },
            payroll: {
                standardWage: 15.00,
                overtimeRate: 1.5,
                minOvertimeHours: 8,
                frequency: 'biweekly'
            },
            preferences: {
                theme: 'auto',
                dateFormat: 'YYYY-MM-DD',
                timeFormat: '24'
            }
        };

        await DataStore.adapter.set('employees', defaultEmployees);
        await DataStore.adapter.set('attendance', []);
        await DataStore.adapter.set('payroll', []);
        await DataStore.adapter.set('settings', defaultSettings);
        await DataStore.adapter.set('calendar_notes', []);
    }

    // Employee methods
    async getEmployees() {
        return await DataStore.adapter.get('employees') || [];
    }

    async getEmployee(id) {
        const employees = await this.getEmployees();
        return employees.find(emp => emp.id === id);
    }

    async addEmployee(employee) {
        const employees = await this.getEmployees();
        employee.id = `emp_${Date.now()}`;
        employee.createdAt = new Date().toISOString();
        employees.push(employee);
        await DataStore.adapter.set('employees', employees);
        return employee;
    }

    async updateEmployee(id, updates) {
        const employees = await this.getEmployees();
        const index = employees.findIndex(emp => emp.id === id);
        if (index !== -1) {
            employees[index] = { ...employees[index], ...updates, updatedAt: new Date().toISOString() };
            await DataStore.adapter.set('employees', employees);
            return employees[index];
        }
        return null;
    }

    async deleteEmployee(id) {
        const employees = await this.getEmployees();
        const filteredEmployees = employees.filter(emp => emp.id !== id);
        await DataStore.adapter.set('employees', filteredEmployees);
        return true;
    }

    // Attendance methods
    async getAttendance(filters = {}) {
        let attendance = await DataStore.adapter.get('attendance') || [];
        
        // Apply filters
        if (filters.employeeId) {
            attendance = attendance.filter(record => record.employeeId === filters.employeeId);
        }
        
        if (filters.startDate) {
            attendance = attendance.filter(record => record.date >= filters.startDate);
        }
        
        if (filters.endDate) {
            attendance = attendance.filter(record => record.date <= filters.endDate);
        }
        
        if (filters.status) {
            attendance = attendance.filter(record => record.status === filters.status);
        }

        return attendance.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    async addAttendanceRecord(record) {
        const attendance = await DataStore.adapter.get('attendance') || [];
        record.id = `att_${Date.now()}`;
        record.createdAt = new Date().toISOString();
        attendance.push(record);
        await DataStore.adapter.set('attendance', attendance);
        return record;
    }

    async updateAttendanceRecord(id, updates) {
        const attendance = await DataStore.adapter.get('attendance') || [];
        const index = attendance.findIndex(record => record.id === id);
        if (index !== -1) {
            attendance[index] = { ...attendance[index], ...updates, updatedAt: new Date().toISOString() };
            await DataStore.adapter.set('attendance', attendance);
            return attendance[index];
        }
        return null;
    }

    async deleteAttendanceRecord(id) {
        const attendance = await DataStore.adapter.get('attendance') || [];
        const filteredAttendance = attendance.filter(record => record.id !== id);
        await DataStore.adapter.set('attendance', filteredAttendance);
        return true;
    }

    // Clock in/out methods
    async clockIn(employeeId) {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        // Check if already clocked in today
        const existingRecord = await this.getTodayAttendance(employeeId);
        if (existingRecord && existingRecord.timeIn) {
            throw new Error('Already clocked in today');
        }

        const record = {
            employeeId,
            date: today,
            timeIn: now.toTimeString().split(' ')[0],
            timeOut: null,
            hoursWorked: 0,
            status: 'present',
            notes: ''
        };

        if (existingRecord) {
            return await this.updateAttendanceRecord(existingRecord.id, record);
        } else {
            return await this.addAttendanceRecord(record);
        }
    }

    async clockOut(employeeId) {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        const record = await this.getTodayAttendance(employeeId);
        if (!record || !record.timeIn) {
            throw new Error('Must clock in first');
        }

        if (record.timeOut) {
            throw new Error('Already clocked out today');
        }

        const timeOut = now.toTimeString().split(' ')[0];
        const hoursWorked = this.calculateHoursWorked(record.timeIn, timeOut);

        return await this.updateAttendanceRecord(record.id, {
            timeOut,
            hoursWorked,
            status: hoursWorked >= 8 ? 'present' : 'partial'
        });
    }

    async getTodayAttendance(employeeId) {
        const today = new Date().toISOString().split('T')[0];
        const attendance = await this.getAttendance({ employeeId, startDate: today, endDate: today });
        return attendance.length > 0 ? attendance[0] : null;
    }

    // Payroll methods
    async getPayroll(filters = {}) {
        let payroll = await DataStore.adapter.get('payroll') || [];
        
        if (filters.employeeId) {
            payroll = payroll.filter(record => record.employeeId === filters.employeeId);
        }
        
        return payroll.sort((a, b) => new Date(b.payPeriodEnd) - new Date(a.payPeriodEnd));
    }

    async addPayrollRecord(record) {
        const payroll = await DataStore.adapter.get('payroll') || [];
        record.id = `pay_${Date.now()}`;
        record.createdAt = new Date().toISOString();
        payroll.push(record);
        await DataStore.adapter.set('payroll', payroll);
        return record;
    }

    // Settings methods
    async getSettings() {
        return await DataStore.adapter.get('settings') || {};
    }

    async updateSettings(updates) {
        const settings = await this.getSettings();
        const newSettings = { ...settings, ...updates };
        await DataStore.adapter.set('settings', newSettings);
        return newSettings;
    }

    // Calendar notes methods
    async getCalendarNotes() {
        return await DataStore.adapter.get('calendar_notes') || [];
    }

    async addCalendarNote(note) {
        const notes = await this.getCalendarNotes();
        note.id = `note_${Date.now()}`;
        note.createdAt = new Date().toISOString();
        notes.push(note);
        await DataStore.adapter.set('calendar_notes', notes);
        return note;
    }

    async updateCalendarNote(id, updates) {
        const notes = await this.getCalendarNotes();
        const index = notes.findIndex(note => note.id === id);
        if (index !== -1) {
            notes[index] = { ...notes[index], ...updates, updatedAt: new Date().toISOString() };
            await DataStore.adapter.set('calendar_notes', notes);
            return notes[index];
        }
        return null;
    }

    async deleteCalendarNote(id) {
        const notes = await this.getCalendarNotes();
        const filteredNotes = notes.filter(note => note.id !== id);
        await DataStore.adapter.set('calendar_notes', filteredNotes);
        return true;
    }

    // Utility methods
    calculateHoursWorked(timeIn, timeOut) {
        const inTime = new Date(`1970-01-01T${timeIn}`);
        const outTime = new Date(`1970-01-01T${timeOut}`);
        const diffMs = outTime - inTime;
        return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places
    }

    // Analytics methods
    async getEmployeeStats(employeeId, startDate = null, endDate = null) {
        const filters = { employeeId };
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        
        const attendance = await this.getAttendance(filters);
        
        const totalDays = attendance.length;
        const presentDays = attendance.filter(record => record.status === 'present').length;
        const absentDays = attendance.filter(record => record.status === 'absent').length;
        const lateDays = attendance.filter(record => record.status === 'late').length;
        const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
        const totalHours = attendance.reduce((sum, record) => sum + (record.hoursWorked || 0), 0);
        
        return {
            totalDays,
            presentDays,
            absentDays,
            lateDays,
            attendanceRate,
            totalHours
        };
    }

    async getOverallStats() {
        const today = new Date().toISOString().split('T')[0];
        const todayAttendance = await this.getAttendance({ startDate: today, endDate: today });
        
        const presentCount = todayAttendance.filter(record => record.status === 'present' || record.timeIn).length;
        const absentCount = todayAttendance.filter(record => record.status === 'absent').length;
        const lateCount = todayAttendance.filter(record => record.status === 'late').length;
        
        return {
            presentCount,
            absentCount,
            lateCount,
            totalEmployees: (await this.getEmployees()).length
        };
    }
}

// LocalStorage adapter implementation
class LocalStorageAdapter {
    async get(key) {
        try {
            const data = localStorage.getItem(`bricks_${key}`);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Error getting ${key} from localStorage:`, error);
            return null;
        }
    }

    async set(key, value) {
        try {
            localStorage.setItem(`bricks_${key}`, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error setting ${key} in localStorage:`, error);
            return false;
        }
    }

    async remove(key) {
        try {
            localStorage.removeItem(`bricks_${key}`);
            return true;
        } catch (error) {
            console.error(`Error removing ${key} from localStorage:`, error);
            return false;
        }
    }

    async clear() {
        try {
            const keys = Object.keys(localStorage).filter(key => key.startsWith('bricks_'));
            keys.forEach(key => localStorage.removeItem(key));
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    }
}

// API adapter stub for future implementation
class ApiAdapter {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    async get(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}/${endpoint}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`API GET error for ${endpoint}:`, error);
            throw error;
        }
    }

    async set(endpoint, data) {
        try {
            const response = await fetch(`${this.baseUrl}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`API POST error for ${endpoint}:`, error);
            throw error;
        }
    }

    async remove(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}/${endpoint}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return true;
        } catch (error) {
            console.error(`API DELETE error for ${endpoint}:`, error);
            throw error;
        }
    }

    async clear() {
        // Implementation depends on API design
        throw new Error('Clear method not implemented for API adapter');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DataStore, LocalStorageAdapter, ApiAdapter };
} else if (typeof window !== 'undefined') {
    window.DataStore = DataStore;
    window.LocalStorageAdapter = LocalStorageAdapter;
    window.ApiAdapter = ApiAdapter;
}
