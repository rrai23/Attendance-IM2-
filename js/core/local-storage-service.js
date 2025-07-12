/**
 * LocalStorage Data Service Implementation
 * Implements the DataServiceInterface using browser localStorage for data persistence.
 * This is the primary implementation used by the Bricks Attendance System.
 */

class LocalStorageDataService extends DataServiceInterface {
    constructor() {
        super();
        this.storageKey = 'bricks_attendance_data';
        this.authTokenKey = 'bricks_auth_token';
        this.eventListeners = {};
        this.isOnline = navigator.onLine;
        
        // Initialize with empty data structure to prevent undefined errors
        this.data = {
            employees: [],
            attendanceRecords: [],
            payrollRecords: [],
            settings: {},
            analytics: {}
        };
        
        // Initialize data (async)
        this.initializeData();
        
        // Set up online/offline detection
        window.addEventListener('online', () => { 
            this.isOnline = true;
            this.emit('connectionChange', { status: 'online' });
        });
        
        window.addEventListener('offline', () => { 
            this.isOnline = false;
            this.emit('connectionChange', { status: 'offline' });
        });
        
        // Setup cross-tab synchronization
        this.setupCrossTabSync();
    }
    
    /**
     * Initialize data from localStorage or create default data
     */
    async initializeData() {
        try {
            // Try to load from localStorage
            const storedData = localStorage.getItem(this.storageKey);
            if (storedData) {
                this.data = JSON.parse(storedData);
                console.log('Data loaded from localStorage');
                
                // Validate and clean data after loading
                this.validateAndCleanData();
                
                // Ensure we have today's attendance data
                this.ensureTodayAttendanceData();
                return;
            }
            
            // If no stored data, try to load mock data
            await this.loadMockData();
        } catch (error) {
            console.error('Error initializing data:', error);
            // Create default data as a last resort
            await this.createDefaultData();
        }
        
        // Always ensure we have today's attendance data
        this.ensureTodayAttendanceData();
    }
    
    /**
     * Load mock data from JSON file
     */
    async loadMockData() {
        try {
            const response = await fetch('/mock/data.json');
            if (!response.ok) {
                throw new Error(`Failed to load mock data: ${response.status}`);
            }
            
            this.data = await response.json();
            this.saveToStorage();
            console.log('Mock data loaded successfully');
        } catch (error) {
            console.error('Error loading mock data:', error);
            throw error;
        }
    }
    
    /**
     * Create minimal default data
     */
    async createDefaultData() {
        const today = new Date().toISOString().split('T')[0];
        
        this.data = {
            employees: [
                {
                    id: 'emp_001',
                    username: 'admin',
                    password: 'admin123', // In a real app, this would be hashed
                    role: 'admin',
                    fullName: 'John Administrator',
                    email: 'admin@bricks.com',
                    startDate: '2024-01-01',
                    status: 'active',
                    department: 'Management',
                    position: 'System Administrator',
                    hourlyRate: 25.00
                },
                {
                    id: 'emp_002',
                    username: 'employee',
                    password: 'employee123', // In a real app, this would be hashed
                    role: 'employee',
                    fullName: 'Jane Employee',
                    email: 'employee@bricks.com',
                    startDate: '2024-01-15',
                    status: 'active',
                    department: 'Operations',
                    position: 'Staff',
                    hourlyRate: 15.00
                },
                {
                    id: 'emp_003',
                    username: 'worker1',
                    password: 'worker123',
                    role: 'employee',
                    fullName: 'Mike Worker',
                    email: 'mike@bricks.com',
                    startDate: '2024-02-01',
                    status: 'active',
                    department: 'Operations',
                    position: 'Construction Worker',
                    hourlyRate: 18.00
                },
                {
                    id: 'emp_004',
                    username: 'worker2',
                    password: 'worker123',
                    role: 'employee',
                    fullName: 'Sarah Builder',
                    email: 'sarah@bricks.com',
                    startDate: '2024-03-01',
                    status: 'active',
                    department: 'Operations',
                    position: 'Site Supervisor',
                    hourlyRate: 22.00
                },
                {
                    id: 'emp_005',
                    username: 'worker3',
                    password: 'worker123',
                    role: 'employee',
                    fullName: 'Tom Mason',
                    email: 'tom@bricks.com',
                    startDate: '2024-04-01',
                    status: 'active',
                    department: 'Operations',
                    position: 'Mason',
                    hourlyRate: 20.00
                },
                {
                    id: 'emp_006',
                    username: 'worker4',
                    password: 'worker123',
                    role: 'employee',
                    fullName: 'Lisa Crane',
                    email: 'lisa@bricks.com',
                    startDate: '2024-05-01',
                    status: 'active',
                    department: 'Operations',
                    position: 'Crane Operator',
                    hourlyRate: 24.00
                }
            ],
            attendanceRecords: [
                // Today's attendance records
                {
                    id: 'att_001',
                    employeeId: 'emp_001',
                    date: today,
                    timeIn: '08:00',
                    timeOut: null,
                    status: 'present',
                    hours: 0,
                    notes: 'Present'
                },
                {
                    id: 'att_002',
                    employeeId: 'emp_002',
                    date: today,
                    timeIn: '08:15',
                    timeOut: null,
                    status: 'late',
                    hours: 0,
                    notes: 'Late arrival'
                },
                {
                    id: 'att_003',
                    employeeId: 'emp_003',
                    date: today,
                    timeIn: '07:45',
                    timeOut: null,
                    status: 'present',
                    hours: 0,
                    notes: 'Early arrival'
                },
                {
                    id: 'att_004',
                    employeeId: 'emp_004',
                    date: today,
                    timeIn: '08:05',
                    timeOut: null,
                    status: 'present',
                    hours: 0,
                    notes: 'On time'
                },
                // emp_005 and emp_006 are absent today
            ],
            payrollRecords: [],
            settings: {
                company: {
                    name: 'Bricks Company',
                    workingHours: 8,
                    startTime: '08:00',
                    endTime: '17:00'
                },
                payroll: {
                    standardWage: 15.00,
                    overtimeRate: 1.5,
                    minOvertimeHours: 8,
                    frequency: 'biweekly',
                    currency: 'PHP',
                    currencySymbol: '₱'
                },
                preferences: {
                    theme: 'auto',
                    dateFormat: 'YYYY-MM-DD',
                    timeFormat: '24'
                },
                departments: [
                    'Management',
                    'Operations',
                    'Human Resources',
                    'Finance',
                    'IT'
                ]
            },
            analytics: {
                attendanceStats: {}
            }
        };
        
        this.saveToStorage();
        console.log('Default data created successfully with today\'s attendance');
    }
    
    /**
     * Save data to localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
            
            // Trigger cross-tab sync
            localStorage.setItem('bricks_data_sync', JSON.stringify({
                timestamp: Date.now(),
                action: 'update'
            }));
            
            // Remove it immediately to trigger storage events on future changes
            localStorage.removeItem('bricks_data_sync');
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            
            // Try to save partial data if storage limit is reached
            if (error.name === 'QuotaExceededError') {
                const { employees, settings } = this.data;
                const minimalData = { employees, settings };
                try {
                    localStorage.setItem(this.storageKey + '_minimal', JSON.stringify(minimalData));
                    console.warn('Saved minimal data due to quota limits');
                } catch (e) {
                    console.error('Failed to save even minimal data:', e);
                }
            }
        }
    }
    
    /**
     * Set up cross-tab synchronization
     */
    setupCrossTabSync() {
        window.addEventListener('storage', (event) => {
            if (event.key === 'bricks_data_sync' && event.newValue) {
                try {
                    const syncData = JSON.parse(event.newValue);
                    console.log('Cross-tab sync event received:', syncData);
                    
                    // Reload data from localStorage
                    const storedData = localStorage.getItem(this.storageKey);
                    if (storedData) {
                        this.data = JSON.parse(storedData);
                        this.emit('dataSync', { source: 'crossTab', timestamp: syncData.timestamp });
                    }
                } catch (error) {
                    console.error('Error processing cross-tab sync:', error);
                }
            }
        });
    }
    
    /**
     * Add event listener for data changes
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     */
    addEventListener(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }
    
    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event handler to remove
     */
    removeEventListener(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
        }
    }
    
    /**
     * Emit event to notify listeners
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
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
    
    /**
     * Helper to simulate API delay
     * @param {number} min - Minimum delay in ms
     * @param {number} max - Maximum delay in ms
     */
    async simulateDelay(min = 50, max = 200) {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    /**
     * Get all employees
     * @returns {Promise<Array>} Array of employee objects
     */
    async getEmployees() {
        await this.simulateDelay();
        return this.data.employees || [];
    }
    
    /**
     * Get a specific employee by ID
     * @param {string} id - Employee ID
     * @returns {Promise<Object>} Employee object
     */
    async getEmployee(id) {
        await this.simulateDelay();
        const employee = this.data.employees.find(emp => emp.id === id);
        if (!employee) {
            throw new Error(`Employee with ID ${id} not found`);
        }
        return employee;
    }
    
    /**
     * Add a new employee
     * @param {Object} employeeData - Employee data
     * @returns {Promise<Object>} Created employee object
     */
    async addEmployee(employeeData) {
        await this.simulateDelay();
        
        const newEmployee = {
            ...employeeData,
            id: employeeData.id || `emp_${Date.now().toString(36)}`,
            createdAt: new Date().toISOString(),
            status: employeeData.status || 'active'
        };
        
        this.data.employees.push(newEmployee);
        this.saveToStorage();
        
        // Emit event for synchronization
        this.emit('employeeAdded', { employee: newEmployee });
        
        return newEmployee;
    }
    
    /**
     * Update an existing employee
     * @param {string} id - Employee ID
     * @param {Object} updates - Employee data updates
     * @returns {Promise<Object>} Updated employee object
     */
    async updateEmployee(id, updates) {
        await this.simulateDelay();
        
        const index = this.data.employees.findIndex(emp => emp.id === id);
        if (index === -1) {
            throw new Error(`Employee with ID ${id} not found`);
        }
        
        const oldData = { ...this.data.employees[index] };
        this.data.employees[index] = { 
            ...oldData, 
            ...updates,
            lastModified: new Date().toISOString() 
        };
        
        this.saveToStorage();
        
        // Emit event for synchronization
        this.emit('employeeUpdated', { 
            employeeId: id, 
            oldData, 
            newData: this.data.employees[index], 
            changes: updates 
        });
        
        return this.data.employees[index];
    }
    
    /**
     * Update an employee's wage
     * @param {string} employeeId - Employee ID
     * @param {number} newRate - New hourly rate
     * @param {string} reason - Reason for change
     * @returns {Promise<Object>} Result of the wage update
     */
    async updateEmployeeWage(employeeId, newRate, reason = '') {
        await this.simulateDelay();
        
        const index = this.data.employees.findIndex(emp => emp.id === employeeId);
        if (index === -1) {
            throw new Error(`Employee with ID ${employeeId} not found`);
        }
        
        const oldRate = this.data.employees[index].hourlyRate;
        this.data.employees[index].hourlyRate = newRate;
        this.data.employees[index].lastWageUpdate = {
            date: new Date().toISOString(),
            oldRate,
            newRate,
            reason,
            by: this.getAuthToken() ? 'admin' : 'system'
        };
        
        this.saveToStorage();
        
        // Emit event for synchronization
        this.emit('employeeWageUpdated', { 
            employeeId, 
            oldRate, 
            newRate, 
            reason 
        });
        
        return {
            success: true,
            employee: this.data.employees[index],
            oldRate,
            newRate
        };
    }
    
    /**
     * Delete an employee
     * @param {string} id - Employee ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteEmployee(id) {
        await this.simulateDelay();
        
        const index = this.data.employees.findIndex(emp => emp.id === id);
        if (index === -1) {
            throw new Error(`Employee with ID ${id} not found`);
        }
        
        const deletedEmployee = this.data.employees.splice(index, 1)[0];
        this.saveToStorage();
        
        // Emit event for synchronization
        this.emit('employeeDeleted', { 
            employeeId: id, 
            employee: deletedEmployee 
        });
        
        return true;
    }
    
    /**
     * Get attendance records with optional filtering
     * @param {Object} filters - Filter criteria (employeeId, startDate, endDate)
     * @returns {Promise<Array>} Array of attendance records
     */
    async getAttendanceRecords(filters = {}) {
        await this.simulateDelay();
        
        let records = this.data.attendanceRecords || [];
        
        // Filter out null, undefined, or invalid records first
        records = records.filter(record => 
            record && 
            typeof record === 'object' && 
            record.employeeId && 
            record.date
        );
        
        // Apply filters
        if (filters.employeeId) {
            records = records.filter(record => record.employeeId === filters.employeeId);
        }
        
        if (filters.startDate) {
            records = records.filter(record => record.date >= filters.startDate);
        }
        
        if (filters.endDate) {
            records = records.filter(record => record.date <= filters.endDate);
        }
        
        if (filters.status) {
            records = records.filter(record => record.status === filters.status);
        }
        
        // Apply date filter if provided (for backward compatibility)
        if (filters.date) {
            records = records.filter(record => record.date === filters.date);
        }
        
        return records;
    }
    
    /**
     * Add a new attendance record
     * @param {Object} record - Attendance record data
     * @returns {Promise<Object>} Created attendance record
     */
    async addAttendanceRecord(record) {
        await this.simulateDelay();
        
        // Validate employee exists
        const employees = this.data.employees || [];
        const employeeExists = employees.some(emp => emp.id === record.employeeId);
        if (!employeeExists) {
            throw new Error(`Employee with ID ${record.employeeId} not found`);
        }
        
        // Ensure attendanceRecords array exists
        if (!this.data.attendanceRecords) {
            this.data.attendanceRecords = [];
        }
        
        const newRecord = {
            ...record,
            id: record.id || `att_${Date.now().toString(36)}`,
            createdAt: new Date().toISOString(),
            hours: this.calculateHours(record.clockIn, record.clockOut)
        };
        
        // Check for existing record for the same employee and date
        const existingIndex = this.data.attendanceRecords.findIndex(
            r => r && r.employeeId === record.employeeId && r.date === record.date
        );
        
        if (existingIndex >= 0) {
            // Update existing record
            this.data.attendanceRecords[existingIndex] = newRecord;
            this.emit('attendanceUpdated', { 
                action: 'update', 
                record: newRecord 
            });
        } else {
            // Add new record
            this.data.attendanceRecords.push(newRecord);
            this.emit('attendanceUpdated', { 
                action: 'add', 
                record: newRecord 
            });
        }
        
        this.saveToStorage();
        
        return newRecord;
    }
    
    /**
     * Calculate hours between two time strings
     * @param {string} clockIn - Clock in time (HH:MM)
     * @param {string} clockOut - Clock out time (HH:MM)
     * @returns {number} Hours worked
     */
    calculateHours(clockIn, clockOut) {
        if (!clockIn || !clockOut) return 0;
        
        const [inHour, inMinute] = clockIn.split(':').map(Number);
        const [outHour, outMinute] = clockOut.split(':').map(Number);
        
        const inMinutes = inHour * 60 + inMinute;
        const outMinutes = outHour * 60 + outMinute;
        
        // Handle overnight shifts
        const totalMinutes = outMinutes >= inMinutes 
            ? outMinutes - inMinutes 
            : (24 * 60 - inMinutes) + outMinutes;
        
        return parseFloat((totalMinutes / 60).toFixed(2));
    }
    
    /**
     * Update an existing attendance record
     * @param {string} id - Record ID
     * @param {Object} updates - Record updates
     * @returns {Promise<Object>} Updated attendance record
     */
    async updateAttendanceRecord(id, updates) {
        await this.simulateDelay();
        
        const index = this.data.attendanceRecords.findIndex(record => record.id === id);
        if (index === -1) {
            throw new Error(`Attendance record with ID ${id} not found`);
        }
        
        const oldData = { ...this.data.attendanceRecords[index] };
        this.data.attendanceRecords[index] = { 
            ...oldData, 
            ...updates,
            lastModified: new Date().toISOString() 
        };
        
        // Recalculate hours if clock times were updated
        if (updates.clockIn || updates.clockOut) {
            const clockIn = updates.clockIn || oldData.clockIn;
            const clockOut = updates.clockOut || oldData.clockOut;
            this.data.attendanceRecords[index].hours = this.calculateHours(clockIn, clockOut);
        }
        
        this.saveToStorage();
        
        // Emit event for synchronization
        this.emit('attendanceUpdated', { 
            action: 'update', 
            record: this.data.attendanceRecords[index],
            oldData
        });
        
        return this.data.attendanceRecords[index];
    }
    
    /**
     * Get attendance statistics
     * @param {string} date - Optional date for statistics
     * @returns {Promise<Object>}
     */
    async getAttendanceStats(date = null) {
        await this.simulateDelay();
        
        const targetDate = date || new Date().toISOString().split('T')[0];
        const employees = this.data.employees || [];
        const employeeCount = employees.filter(emp => emp.status === 'active').length;
        
        // Ensure attendanceRecords exists before filtering
        const attendanceRecords = this.data.attendanceRecords || [];
        
        // Calculate stats for the target date
        const records = attendanceRecords.filter(record => record && record.date === targetDate);
        const present = records.filter(record => record.status === 'present').length;
        const tardy = records.filter(record => record.status === 'tardy' || record.status === 'late').length;
        const absent = employeeCount - present - tardy;
        
        // Calculate weekly trend
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weeklyTrend = [];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            
            const dayRecords = attendanceRecords.filter(record => record && record.date === dateStr);
            const dayPresent = dayRecords.filter(record => record.status === 'present').length;
            const dayTardy = dayRecords.filter(record => record.status === 'tardy' || record.status === 'late').length;
            
            const attendanceRate = employeeCount > 0 
                ? Math.round(((dayPresent + dayTardy) / employeeCount) * 100) 
                : 0;
                
            weeklyTrend.push(attendanceRate);
        }
        
        return {
            date: targetDate,
            totalEmployees: employeeCount,
            // Dashboard compatibility - map to expected property names
            present: present,
            absent: absent,
            late: tardy,
            overtime: 0, // Default for now
            presentPercentage: employeeCount > 0 ? Math.round(((present + tardy) / employeeCount) * 100) : 0,
            // Original property names for backward compatibility
            presentToday: present,
            absentToday: absent,
            tardyToday: tardy,
            attendanceRate: employeeCount > 0 ? Math.round(((present + tardy) / employeeCount) * 100) : 0,
            tardyRate: employeeCount > 0 ? Math.round((tardy / employeeCount) * 100) : 0,
            weeklyTrend,
            lastUpdated: new Date().toISOString(),
            departments: {
                total: this.getDepartmentCount(),
                with100Percent: this.getDepartmentsWith100PercentAttendance(targetDate),
                withIssues: this.getDepartmentsWithIssues(targetDate)
            },
            overtime: this.getOvertimeStats(targetDate),
            today: {
                total: employeeCount,
                present: present,
                late: tardy,
                absent: absent,
                attendanceRate: employeeCount > 0 ? Math.round(((present + tardy) / employeeCount) * 100) : 0
            }
        };
    }
    
    /**
     * Get departments count
     * @returns {number} Number of departments
     */
    getDepartmentCount() {
        const departments = new Set();
        this.data.employees.forEach(emp => {
            if (emp.department) departments.add(emp.department);
        });
        return departments.size;
    }
    
    /**
     * Get departments with 100% attendance
     * @param {string} date - Target date
     * @returns {number} Number of departments with 100% attendance
     */
    getDepartmentsWith100PercentAttendance(date) {
        // Group employees by department
        const departments = {};
        this.data.employees.forEach(emp => {
            if (emp.department && emp.status === 'active') {
                if (!departments[emp.department]) {
                    departments[emp.department] = { total: 0, present: 0 };
                }
                departments[emp.department].total++;
            }
        });
        
        // Count attendance by department
        this.data.attendanceRecords
            .filter(record => record.date === date)
            .forEach(record => {
                const employee = this.data.employees.find(emp => emp.id === record.employeeId);
                if (employee && employee.department && departments[employee.department]) {
                    if (record.status === 'present' || record.status === 'tardy' || record.status === 'late') {
                        departments[employee.department].present++;
                    }
                }
            });
        
        // Count departments with 100% attendance
        let perfect = 0;
        Object.values(departments).forEach(dept => {
            if (dept.total > 0 && dept.present === dept.total) {
                perfect++;
            }
        });
        
        return perfect;
    }
    
    /**
     * Get departments with attendance issues
     * @param {string} date - Target date
     * @returns {number} Number of departments with issues
     */
    getDepartmentsWithIssues(date) {
        // Group employees by department
        const departments = {};
        this.data.employees.forEach(emp => {
            if (emp.department && emp.status === 'active') {
                if (!departments[emp.department]) {
                    departments[emp.department] = { total: 0, present: 0 };
                }
                departments[emp.department].total++;
            }
        });
        
        // Count attendance by department
        this.data.attendanceRecords
            .filter(record => record.date === date)
            .forEach(record => {
                const employee = this.data.employees.find(emp => emp.id === record.employeeId);
                if (employee && employee.department && departments[employee.department]) {
                    if (record.status === 'present' || record.status === 'tardy' || record.status === 'late') {
                        departments[employee.department].present++;
                    }
                }
            });
        
        // Count departments with < 75% attendance
        let issueCount = 0;
        Object.values(departments).forEach(dept => {
            if (dept.total > 0 && (dept.present / dept.total) < 0.75) {
                issueCount++;
            }
        });
        
        return issueCount;
    }
    
    /**
     * Get overtime statistics
     * @param {string} date - Target date
     * @returns {Object} Overtime statistics
     */
    getOvertimeStats(date) {
        // In a real system, this would be based on actual overtime records
        // Here we're just using mock data
        return {
            requestsToday: 3,
            pendingApproval: 2,
            thisWeekTotal: 12.5
        };
    }
    
    /**
     * Get payroll data for an employee or all employees
     * @param {Object} options - Filter options (employeeId, startDate, endDate)
     * @returns {Promise<Array>} Array of payroll records
     */
    async getPayrollData(options = {}) {
        await this.simulateDelay();
        
        let records = this.data.payrollRecords || [];
        
        // Apply filters
        if (options.employeeId) {
            records = records.filter(record => record.employeeId === options.employeeId);
        }
        
        if (options.startDate) {
            records = records.filter(record => record.periodStart >= options.startDate);
        }
        
        if (options.endDate) {
            records = records.filter(record => record.periodEnd <= options.endDate);
        }
        
        return records;
    }
    
    /**
     * Calculate payroll for a specific employee and period
     * @param {string} employeeId - Employee ID
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @returns {Promise<Object>} Payroll calculation result
     */
    async calculatePayroll(employeeId, startDate, endDate) {
        await this.simulateDelay();
        
        // Get employee data
        const employee = this.data.employees.find(emp => emp.id === employeeId);
        if (!employee) {
            throw new Error(`Employee with ID ${employeeId} not found`);
        }
        
        // Get attendance records for the period
        const records = this.data.attendanceRecords.filter(
            record => record.employeeId === employeeId && 
                    record.date >= startDate && 
                    record.date <= endDate
        );
        
        // Get settings
        const settings = this.data.settings || {};
        const hourlyRate = employee.hourlyRate || settings.payroll?.standardWage || 15;
        const overtimeRate = settings.payroll?.overtimeRate || 1.5;
        const standardHours = settings.company?.workingHours || 8;
        
        // Calculate totals
        let totalRegularHours = 0;
        let totalOvertimeHours = 0;
        let daysWorked = 0;
        let daysLate = 0;
        
        records.forEach(record => {
            if (record.status === 'present' || record.status === 'tardy' || record.status === 'late') {
                daysWorked++;
                
                if (record.status === 'tardy' || record.status === 'late') {
                    daysLate++;
                }
                
                if (record.hours) {
                    if (record.hours <= standardHours) {
                        totalRegularHours += record.hours;
                    } else {
                        totalRegularHours += standardHours;
                        totalOvertimeHours += (record.hours - standardHours);
                    }
                }
            }
        });
        
        // Calculate pay
        const regularPay = totalRegularHours * hourlyRate;
        const overtimePay = totalOvertimeHours * hourlyRate * overtimeRate;
        const grossPay = regularPay + overtimePay;
        
        // Apply taxes (simplified)
        const taxRate = settings.payroll?.taxRate || 0.2;
        const taxAmount = grossPay * taxRate;
        const netPay = grossPay - taxAmount;
        
        const result = {
            employeeId,
            employeeName: employee.fullName,
            periodStart: startDate,
            periodEnd: endDate,
            hourlyRate,
            regularHours: totalRegularHours,
            overtimeHours: totalOvertimeHours,
            regularPay,
            overtimePay,
            grossPay,
            taxAmount,
            netPay,
            daysWorked,
            daysLate,
            currency: settings.payroll?.currency || 'PHP',
            currencySymbol: settings.payroll?.currencySymbol || '₱',
            calculatedAt: new Date().toISOString()
        };
        
        // Store the payroll record
        if (!this.data.payrollRecords) {
            this.data.payrollRecords = [];
        }
        
        this.data.payrollRecords.push({
            ...result,
            id: `pay_${Date.now().toString(36)}`,
            status: 'calculated'
        });
        
        this.saveToStorage();
        
        return result;
    }
    
    /**
     * Get payroll history
     * @param {Object} filters - Filter options
     * @returns {Promise<Array>} Payroll history records
     */
    async getPayrollHistory(filters = {}) {
        return this.getPayrollData(filters);
    }
    
    /**
     * Get system settings
     * @returns {Promise<Object>} System settings
     */
    async getSettings() {
        await this.simulateDelay();
        return this.data.settings || {};
    }
    
    /**
     * Save system settings
     * @param {Object} settings - New settings
     * @returns {Promise<Object>} Updated settings
     */
    async saveSettings(settings) {
        await this.simulateDelay();
        
        // Merge with existing settings
        this.data.settings = {
            ...this.data.settings,
            ...settings,
            lastUpdated: new Date().toISOString()
        };
        
        this.saveToStorage();
        
        // Emit event for synchronization
        this.emit('settingsUpdated', { settings: this.data.settings });
        
        return this.data.settings;
    }
    
    /**
     * Get employee performance metrics
     * @param {string} employeeId - Optional employee ID
     * @returns {Promise<Array} Performance metrics
     */
    async getEmployeePerformance(employeeId = null) {
        await this.simulateDelay();
        
        let employees = this.data.employees;
        
        if (employeeId) {
            employees = employees.filter(emp => emp.id === employeeId);
        }
        
        // Calculate performance metrics
        return employees.map(employee => {
            const attendanceRecords = this.data.attendanceRecords.filter(
                record => record.employeeId === employee.id
            );
            
            const totalRecords = attendanceRecords.length;
            const presentRecords = attendanceRecords.filter(
                record => record.status === 'present'
            ).length;
            
            const tardyRecords = attendanceRecords.filter(
                record => record.status === 'tardy' || record.status === 'late'
            ).length;
            
            const attendanceRate = totalRecords > 0 
                ? ((presentRecords + tardyRecords) / totalRecords * 100).toFixed(1)
                : '100.0';
                
            const punctualityRate = totalRecords > 0
                ? ((presentRecords) / totalRecords * 100).toFixed(1)
                : '100.0';
                
            return {
                employeeId: employee.id,
                name: employee.fullName,
                department: employee.department,
                attendanceRate: parseFloat(attendanceRate),
                punctualityRate: parseFloat(punctualityRate),
                productivity: Math.floor(Math.random() * 30) + 70, // Mock data
                recentProjects: Math.floor(Math.random() * 5) + 1,  // Mock data
                lastUpdated: new Date().toISOString()
            };
        });
    }
    
    /**
     * Get departments
     * @returns {Promise<Array>} Departments list
     */
    async getDepartments() {
        await this.simulateDelay();
        
        // Collect unique departments from employees
        const departmentsSet = new Set();
        
        // Add departments from settings if available
        if (this.data.settings && this.data.settings.departments) {
            this.data.settings.departments.forEach(dept => departmentsSet.add(dept));
        }
        
        // Add departments from employees
        this.data.employees.forEach(emp => {
            if (emp.department) {
                departmentsSet.add(emp.department);
            }
        });
        
        return Array.from(departmentsSet);
    }
    
    /**
     * Get employees by department
     * @param {string} departmentId - Department ID
     * @returns {Promise<Array>} Employees in department
     */
    async getEmployeesByDepartment(departmentId) {
        await this.simulateDelay();
        return this.data.employees.filter(emp => emp.department === departmentId);
    }
    
    /**
     * Get overtime requests
     * @param {Object} filters - Filter options
     * @returns {Promise<Array>} Overtime requests
     */
    async getOvertimeRequests(filters = {}) {
        await this.simulateDelay();
        
        // In a real system, this would fetch actual overtime request records
        // Here we're returning mock data
        return [
            {
                id: 'ot_001',
                employeeId: this.data.employees[0]?.id,
                employeeName: this.data.employees[0]?.fullName,
                date: new Date().toISOString().split('T')[0],
                hours: 2.5,
                reason: 'Project deadline',
                status: 'approved',
                approvedBy: 'admin',
                requestedAt: new Date(Date.now() - 86400000).toISOString() // Yesterday
            },
            {
                id: 'ot_002',
                employeeId: this.data.employees[1]?.id,
                employeeName: this.data.employees[1]?.fullName,
                date: new Date().toISOString().split('T')[0],
                hours: 1.5,
                reason: 'System maintenance',
                status: 'pending',
                requestedAt: new Date().toISOString()
            }
        ];
    }
    
    /**
     * Get system status
     * @returns {Promise<Object>} System status information
     */
    async getSystemStatus() {
        await this.simulateDelay();
        
        return {
            server: {
                status: 'online',
                uptime: '99.9%',
                lastRestart: new Date(Date.now() - 86400000).toISOString()
            },
            database: {
                status: 'connected',
                size: '2.5 GB',
                lastBackup: new Date(Date.now() - 3600000).toISOString()
            },
            backup: {
                status: 'active',
                lastBackup: new Date(Date.now() - 3600000).toISOString(),
                nextBackup: new Date(Date.now() + 3600000).toISOString()
            },
            users: {
                total: this.data.employees?.length || 0,
                active: Math.floor((this.data.employees?.length || 0) * 0.8),
                online: Math.floor((this.data.employees?.length || 0) * 0.3)
            },
            version: '2.0.0',
            lastUpdated: new Date().toISOString()
        };
    }
    
    /**
     * Authenticate a user
     * @param {string} username - Username
     * @param {string} password - Password
     * @returns {Promise<Object>} Authentication result
     */
    async authenticate(username, password) {
        await this.simulateDelay(300, 800);
        
        // Find the user
        const user = this.data.employees.find(emp => 
            emp.username === username && 
            emp.password === password // In a real app, this would be a hash comparison
        );
        
        if (!user) {
            throw new Error('Invalid username or password');
        }
        
        // Create a simple token (in a real app, this would be a JWT)
        const token = btoa(`${username}:${Date.now()}:${Math.random().toString(36).slice(2)}`);
        this.setAuthToken(token);
        
        return {
            success: true,
            token,
            user: {
                id: user.id,
                fullName: user.fullName,
                role: user.role,
                email: user.email
            }
        };
    }
    
    /**
     * Set authentication token
     * @param {string} token - Auth token
     */
    setAuthToken(token) {
        this.authToken = token;
        if (token) {
            localStorage.setItem(this.authTokenKey, token);
        } else {
            localStorage.removeItem(this.authTokenKey);
        }
    }
    
    /**
     * Get current authentication token
     * @returns {string} Auth token
     */
    getAuthToken() {
        if (!this.authToken) {
            this.authToken = localStorage.getItem(this.authTokenKey);
        }
        return this.authToken;
    }
    
    /**
     * Get next payday information
     * @returns {Promise<Object>} Payday information
     */
    async getNextPayday() {
        try {
            // Get settings to determine payday frequency
            const settings = await this.getSettings();
            const frequency = settings?.payroll?.frequency || 'biweekly';
            
            const today = new Date();
            let nextPayday;
            let lastPayday;
            
            // Calculate next payday based on frequency
            switch(frequency) {
                case 'weekly':
                    // Weekly on Friday
                    nextPayday = new Date(today);
                    const dayToFriday = (5 - nextPayday.getDay() + 7) % 7; // 5 is Friday
                    nextPayday.setDate(nextPayday.getDate() + dayToFriday);
                    
                    lastPayday = new Date(nextPayday);
                    lastPayday.setDate(lastPayday.getDate() - 7);
                    break;
                    
                case 'biweekly':
                    // Biweekly on the 15th and last day of month
                    nextPayday = new Date(today);
                    const currentDay = nextPayday.getDate();
                    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                    
                    if (currentDay < 15) {
                        nextPayday.setDate(15);
                    } else if (currentDay < lastDayOfMonth) {
                        nextPayday.setDate(lastDayOfMonth);
                    } else {
                        // Move to the 15th of next month
                        nextPayday.setMonth(nextPayday.getMonth() + 1);
                        nextPayday.setDate(15);
                    }
                    
                    // Last payday
                    if (currentDay < 15) {
                        lastPayday = new Date(today);
                        lastPayday.setMonth(lastPayday.getMonth() - 1);
                        lastPayday.setDate(new Date(today.getFullYear(), today.getMonth(), 0).getDate());
                    } else {
                        lastPayday = new Date(today);
                        lastPayday.setDate(15);
                    }
                    break;
                    
                case 'monthly':
                    // Monthly on the last day of month
                    nextPayday = new Date(today);
                    nextPayday.setMonth(nextPayday.getMonth() + 1);
                    nextPayday.setDate(0); // Last day of current month
                    
                    lastPayday = new Date(today);
                    lastPayday.setDate(0); // Last day of previous month
                    break;
                    
                default:
                    // Default to biweekly
                    nextPayday = new Date(today);
                    nextPayday.setDate(today.getDate() + 14);
                    
                    lastPayday = new Date(today);
                    lastPayday.setDate(today.getDate() - 14);
            }
            
            // Calculate remaining days and hours
            const daysRemaining = Math.ceil((nextPayday - today) / (1000 * 60 * 60 * 24));
            const hoursRemaining = Math.ceil((nextPayday - today) / (1000 * 60 * 60));
            
            return {
                nextPayday: nextPayday.toISOString().split('T')[0],
                frequency,
                daysRemaining,
                hoursRemaining,
                lastPayday: lastPayday.toISOString().split('T')[0]
            };
        } catch (error) {
            console.error('Error getting next payday:', error);
            throw error;
        }
    }
    
    /**
     * Ensure we have sample attendance data for today
     */
    ensureTodayAttendanceData() {
        const today = new Date().toISOString().split('T')[0];
        
        // Ensure arrays exist
        if (!this.data.attendanceRecords) {
            this.data.attendanceRecords = [];
        }
        if (!this.data.employees) {
            this.data.employees = [];
        }
        
        // Check if we have any attendance records for today
        const todayRecords = this.data.attendanceRecords.filter(record => record && record.date === today);
        
        if (todayRecords.length === 0 && this.data.employees.length > 0) {
            console.log('No attendance records for today, creating sample data');
            
            // Create sample attendance for today
            const sampleAttendance = [];
            this.data.employees.forEach((employee, index) => {
                if (employee.status === 'active') {
                    let status = 'present';
                    let timeIn = '08:00';
                    let notes = 'On time';
                    
                    // Make some employees late or absent for realistic data
                    if (index % 3 === 1) {
                        status = 'late';
                        timeIn = '08:20';
                        notes = 'Traffic delay';
                    } else if (index % 4 === 3) {
                        status = 'absent';
                        timeIn = null;
                        notes = 'Sick leave';
                    }
                    
                    const record = {
                        id: `att_${Date.now()}_${index}`,
                        employeeId: employee.id,
                        date: today,
                        timeIn: timeIn,
                        timeOut: null,
                        status: status,
                        hours: 0,
                        notes: notes
                    };
                    
                    sampleAttendance.push(record);
                }
            });
            
            // Add the sample attendance records
            this.data.attendanceRecords.push(...sampleAttendance);
            this.saveToStorage();
            
            console.log(`Created ${sampleAttendance.length} sample attendance records for today`);
        }
    }
    
    /**
     * Validate and clean data to remove any corrupted records
     */
    validateAndCleanData() {
        if (!this.data) {
            console.warn('No data to validate');
            return;
        }
        
        // Clean employees array
        if (this.data.employees) {
            const originalEmployeeCount = this.data.employees.length;
            this.data.employees = this.data.employees.filter(emp => 
                emp && 
                typeof emp === 'object' && 
                emp.id && 
                emp.fullName
            );
            
            if (this.data.employees.length !== originalEmployeeCount) {
                console.warn(`Removed ${originalEmployeeCount - this.data.employees.length} invalid employee records`);
            }
        }
        
        // Clean attendance records array
        if (this.data.attendanceRecords) {
            const originalRecordCount = this.data.attendanceRecords.length;
            this.data.attendanceRecords = this.data.attendanceRecords.filter(record => 
                record && 
                typeof record === 'object' && 
                record.employeeId && 
                record.date && 
                record.id
            );
            
            if (this.data.attendanceRecords.length !== originalRecordCount) {
                console.warn(`Removed ${originalRecordCount - this.data.attendanceRecords.length} invalid attendance records`);
                this.saveToStorage(); // Save the cleaned data
            }
        }
        
        // Initialize missing arrays
        if (!this.data.employees) this.data.employees = [];
        if (!this.data.attendanceRecords) this.data.attendanceRecords = [];
        if (!this.data.payrollRecords) this.data.payrollRecords = [];
        if (!this.data.settings) this.data.settings = {};
        if (!this.data.analytics) this.data.analytics = {};
    }
}

// Export the class for use by the unified data service
// Note: Global instance creation is handled by the unified data service
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LocalStorageDataService;
} else if (typeof window !== 'undefined') {
    window.LocalStorageDataService = LocalStorageDataService;
}
