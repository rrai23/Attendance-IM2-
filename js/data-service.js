// Minimal Data Service for Bricks Attendance System
// Provides essential methods needed by the dashboard

class DataService {
    constructor() {
        this.isOnline = false;
        this.apiBaseUrl = '/api';
        this.authToken = null;
        this.initializeMockData();
    }

    initializeMockData() {
        if (typeof mockData === 'undefined') {
            console.error('Mock data not loaded. Please ensure mock-data.js is included.');
            return;
        }
        this.data = JSON.parse(JSON.stringify(mockData));
        
        // Load saved settings from localStorage if available
        try {
            const savedSettings = localStorage.getItem('bricks_settings');
            if (savedSettings) {
                const parsedSettings = JSON.parse(savedSettings);
                this.data.settings = {
                    ...this.data.settings,
                    ...parsedSettings
                };
                console.log('Loaded settings from localStorage');
            }
        } catch (error) {
            console.warn('Failed to load settings from localStorage:', error);
        }
    }

    async simulateDelay(min = 100, max = 500) {
        const delay = Math.random() * (max - min) + min;
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        if (this.isOnline) {
            // API implementation would go here
            throw new Error('Online API not implemented');
        } else {
            await this.simulateDelay();
            return this.handleMockApiCall(endpoint, method, data);
        }
    }

    handleMockApiCall(endpoint, method, data) {
        const parts = endpoint.split('/').filter(p => p);
        const resource = parts[0];
        const id = parts[1];
        
        switch (resource) {
            case 'attendance':
                if (id === 'stats' && method === 'GET') {
                    return this.getAttendanceStatsData();
                }
                return this.handleAttendanceMock(id, method, data);
            case 'employees':
                return this.handleEmployeesMock(id, method, data);
            default:
                throw new Error(`Unknown endpoint: ${endpoint}`);
        }
    }

    getAttendanceStatsData() {
        const today = new Date().toISOString().split('T')[0];
        const attendance = this.data.attendance || [];
        const employees = this.data.employees || [];
        
        // Calculate today's stats
        const todayRecords = attendance.filter(record => record.date === today);
        const present = todayRecords.filter(record => record.status === 'present').length;
        const absent = employees.length - present;
        const late = todayRecords.filter(record => 
            record.status === 'present' && record.timeIn && record.timeIn > '09:00'
        ).length;
        
        // Calculate weekly trends
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekRecords = [];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const dayRecords = attendance.filter(record => record.date === dateStr);
            const dayPresent = dayRecords.filter(record => record.status === 'present').length;
            const attendanceRate = employees.length > 0 ? (dayPresent / employees.length) * 100 : 0;
            weekRecords.push(Math.round(attendanceRate));
        }
        
        return {
            totalEmployees: employees.length,
            presentToday: present,
            absentToday: absent,
            lateToday: late,
            attendanceRate: employees.length > 0 ? Math.round((present / employees.length) * 100) : 0,
            weeklyTrend: weekRecords,
            lastUpdated: new Date().toISOString()
        };
    }

    handleAttendanceMock(id, method, data) {
        switch (method) {
            case 'GET':
                return this.getAttendanceRecords();
            default:
                throw new Error(`Unsupported method: ${method}`);
        }
    }

    handleEmployeesMock(id, method, data) {
        switch (method) {
            case 'GET':
                return this.data.employees || [];
            default:
                throw new Error(`Unsupported method: ${method}`);
        }
    }

    // Public API methods
    async getAttendanceStats() {
        return this.apiCall('/attendance/stats');
    }

    async getAttendanceRecords(employeeId = null, startDate = null, endDate = null) {
        try {
            await this.simulateDelay(50, 200);
            
            let records = [...(this.data.attendance || [])];
            
            if (employeeId) {
                records = records.filter(record => record.employeeId === employeeId);
            }
            
            if (startDate) {
                records = records.filter(record => record.date >= startDate);
            }
            
            if (endDate) {
                records = records.filter(record => record.date <= endDate);
            }
            
            return records;
        } catch (error) {
            console.error('Error getting attendance records:', error);
            return [];
        }
    }

    async getPhilippineHolidays() {
        try {
            await this.simulateDelay(50, 150);
            
            return [
                { date: '2025-01-01', name: 'New Year\'s Day', type: 'regular' },
                { date: '2025-04-09', name: 'Araw ng Kagitingan', type: 'regular' },
                { date: '2025-05-01', name: 'Labor Day', type: 'regular' },
                { date: '2025-06-12', name: 'Independence Day', type: 'regular' },
                { date: '2025-08-21', name: 'Ninoy Aquino Day', type: 'special' },
                { date: '2025-08-26', name: 'National Heroes Day', type: 'regular' },
                { date: '2025-11-30', name: 'Bonifacio Day', type: 'regular' },
                { date: '2025-12-25', name: 'Christmas Day', type: 'regular' },
                { date: '2025-12-30', name: 'Rizal Day', type: 'regular' },
                { date: '2025-12-31', name: 'New Year\'s Eve', type: 'special' }
            ];
        } catch (error) {
            console.error('Error getting Philippine holidays:', error);
            return [];
        }
    }

    // Authentication token management
    setAuthToken(token) {
        this.authToken = token;
        console.log('Auth token updated:', token ? 'Token set' : 'Token cleared');
    }

    getAuthToken() {
        return this.authToken;
    }

    async getAttendanceOverview(startDate, endDate) {
        try {
            await this.simulateDelay(100, 300);
            
            const records = await this.getAttendanceRecords(null, startDate, endDate);
            const overview = {};
            
            records.forEach(record => {
                const date = record.date;
                if (!overview[date]) {
                    overview[date] = {
                        date: date,
                        present: 0,
                        absent: 0,
                        late: 0,
                        total: 0
                    };
                }
                
                overview[date].total++;
                
                if (record.status === 'present') {
                    overview[date].present++;
                    
                    if (record.timeIn && record.timeIn > '09:00') {
                        overview[date].late++;
                    }
                } else if (record.status === 'absent') {
                    overview[date].absent++;
                }
            });
            
            return Object.values(overview);
        } catch (error) {
            console.error('Error getting attendance overview:', error);
            return [];
        }
    }

    calculateNextPayday() {
        const today = new Date();
        const dayOfWeek = today.getDay();
        let daysUntilFriday = 5 - dayOfWeek;
        
        if (daysUntilFriday <= 0) {
            daysUntilFriday += 7;
        }
        
        const nextFriday = new Date(today);
        nextFriday.setDate(today.getDate() + daysUntilFriday);
        
        const daysRemaining = Math.max(1, Math.ceil((nextFriday - today) / (1000 * 60 * 60 * 24)));
        
        return {
            date: nextFriday.toISOString().split('T')[0],
            daysRemaining: daysRemaining,
            amount: 15000.00,
            period: 'Weekly'
        };
    }

    async getNextPayday() {
        await this.simulateDelay(50, 200);
        return this.calculateNextPayday();
    }

    async getEmployees() {
        await this.simulateDelay(100, 300);
        
        // Extract employee data from users array if needed
        if (!this.data.employees && this.data.users) {
            this.data.employees = this.data.users.map(user => ({
                id: user.employee?.id || user.id,
                firstName: user.employee?.firstName || 'Unknown',
                lastName: user.employee?.lastName || 'User',
                email: user.employee?.email || '',
                phone: user.employee?.phone || '',
                position: user.employee?.position || '',
                department: user.employee?.department || '',
                hireDate: user.employee?.hireDate || '',
                status: user.employee?.status || 'active',
                role: user.role || 'employee',
                hourlyRate: user.employee?.hourlyRate || 15.00,
                salaryType: user.employee?.salaryType || 'hourly',
                salary: user.employee?.salary || (user.employee?.hourlyRate * 40 * 52) || 31200 // Annual estimate
            }));
        }
        
        return this.data.employees || [];
    }

    async getEmployee(employeeId) {
        await this.simulateDelay(50, 150);
        
        const employees = await this.getEmployees();
        return employees.find(emp => emp.id == employeeId) || null;
    }

    async updateEmployeeWage(employeeId, newHourlyRate, notes = '') {
        await this.simulateDelay(100, 300);
        
        // Update in users array if employee data is stored there
        if (this.data.users) {
            const user = this.data.users.find(u => u.employee?.id == employeeId || u.id == employeeId);
            if (user && user.employee) {
                user.employee.hourlyRate = parseFloat(newHourlyRate);
                // Update annual salary estimate if it exists
                if (user.employee.salary) {
                    user.employee.salary = parseFloat(newHourlyRate) * 40 * 52; // 40 hours/week * 52 weeks
                }
            }
        }
        
        // Update in employees array if it exists
        if (this.data.employees) {
            const employee = this.data.employees.find(emp => emp.id == employeeId);
            if (employee) {
                employee.hourlyRate = parseFloat(newHourlyRate);
                // Update annual salary estimate if it exists
                if (employee.salary) {
                    employee.salary = parseFloat(newHourlyRate) * 40 * 52;
                }
            }
        }
        
        // Log the wage change
        if (!this.data.wageHistory) {
            this.data.wageHistory = [];
        }
        
        this.data.wageHistory.push({
            employeeId: employeeId,
            previousRate: null, // Would be tracked in real system
            newRate: parseFloat(newHourlyRate),
            notes: notes,
            updatedBy: 'admin', // Would come from session in real system
            updatedAt: new Date().toISOString()
        });
        
        return {
            success: true,
            employeeId: employeeId,
            newHourlyRate: parseFloat(newHourlyRate),
            message: 'Employee wage updated successfully'
        };
    }

    async updateEmployee(employeeId, employeeData) {
        await this.simulateDelay(100, 300);
        
        // Update in users array
        if (this.data.users) {
            const user = this.data.users.find(u => u.employee?.id == employeeId || u.id == employeeId);
            if (user && user.employee) {
                Object.assign(user.employee, employeeData);
            }
        }
        
        // Update in employees array
        if (this.data.employees) {
            const employeeIndex = this.data.employees.findIndex(emp => emp.id == employeeId);
            if (employeeIndex !== -1) {
                this.data.employees[employeeIndex] = {
                    ...this.data.employees[employeeIndex],
                    ...employeeData
                };
            }
        }
        
        return {
            success: true,
            employeeId: employeeId,
            message: 'Employee updated successfully'
        };
    }

    async addEmployee(employeeData) {
        await this.simulateDelay(200, 400);
        
        const newId = Math.max(...(this.data.employees?.map(e => e.id) || [0])) + 1;
        const newEmployee = {
            id: newId,
            ...employeeData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        if (!this.data.employees) {
            this.data.employees = [];
        }
        
        this.data.employees.push(newEmployee);
        
        return {
            success: true,
            employee: newEmployee,
            message: 'Employee added successfully'
        };
    }

    async deleteEmployee(employeeId) {
        await this.simulateDelay(100, 300);
        
        // Remove from employees array
        if (this.data.employees) {
            this.data.employees = this.data.employees.filter(emp => emp.id != employeeId);
        }
        
        // Remove from users array
        if (this.data.users) {
            this.data.users = this.data.users.filter(user => 
                user.employee?.id != employeeId && user.id != employeeId
            );
        }
        
        return {
            success: true,
            employeeId: employeeId,
            message: 'Employee deleted successfully'
        };
    }

    // Payroll calculation method
    async calculatePayroll(employeeId, startDate, endDate) {
        await this.simulateDelay(200, 500);
        
        const employee = await this.getEmployee(employeeId);
        if (!employee) {
            throw new Error('Employee not found');
        }
        
        // Get attendance records for the period
        const attendanceRecords = await this.getAttendanceRecords(employeeId, startDate, endDate);
        
        // Calculate total hours worked
        let totalHours = 0;
        let workDays = 0;
        
        attendanceRecords.forEach(record => {
            if (record.hoursWorked && record.hoursWorked > 0) {
                totalHours += record.hoursWorked;
                workDays++;
            }
        });
        
        // Calculate regular and overtime hours
        const standardHours = 8; // hours per day
        const expectedHours = workDays * standardHours;
        const regularHours = Math.min(totalHours, expectedHours);
        const overtimeHours = Math.max(0, totalHours - expectedHours);
        
        // Calculate pay
        const hourlyRate = employee.hourlyRate || 15.00;
        const overtimeRate = 1.5;
        
        const regularPay = regularHours * hourlyRate;
        const overtimePay = overtimeHours * hourlyRate * overtimeRate;
        const grossPay = regularPay + overtimePay;
        
        // Calculate basic deductions (simplified)
        const taxRate = 0.20; // 20% tax
        const taxes = grossPay * taxRate;
        const netPay = grossPay - taxes;
        
        return {
            employeeId: employeeId,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            periodStart: startDate,
            periodEnd: endDate,
            totalHours: Math.round(totalHours * 100) / 100,
            regularHours: Math.round(regularHours * 100) / 100,
            overtimeHours: Math.round(overtimeHours * 100) / 100,
            hourlyRate: hourlyRate,
            regularPay: Math.round(regularPay * 100) / 100,
            overtimePay: Math.round(overtimePay * 100) / 100,
            grossPay: Math.round(grossPay * 100) / 100,
            taxes: Math.round(taxes * 100) / 100,
            deductions: Math.round(taxes * 100) / 100, // Only taxes for now
            netPay: Math.round(netPay * 100) / 100,
            workDays: workDays
        };
    }

    // Overtime Management Methods
    async getOvertimeRequests() {
        await this.simulateDelay(100, 300);
        
        if (!this.data.overtimeRequests) {
            this.data.overtimeRequests = [];
        }
        
        return this.data.overtimeRequests;
    }

    async addOvertimeRequest(requestData) {
        await this.simulateDelay(100, 300);
        
        if (!this.data.overtimeRequests) {
            this.data.overtimeRequests = [];
        }
        
        const newRequest = {
            id: Math.max(...(this.data.overtimeRequests.map(r => r.id) || [0])) + 1,
            ...requestData,
            status: 'pending',
            submittedAt: new Date().toISOString()
        };
        
        this.data.overtimeRequests.push(newRequest);
        
        return {
            success: true,
            request: newRequest,
            message: 'Overtime request submitted successfully'
        };
    }

    async updateOvertimeRequest(requestId, updates) {
        await this.simulateDelay(100, 300);
        
        if (!this.data.overtimeRequests) {
            this.data.overtimeRequests = [];
        }
        
        const requestIndex = this.data.overtimeRequests.findIndex(r => r.id == requestId);
        if (requestIndex === -1) {
            throw new Error('Overtime request not found');
        }
        
        this.data.overtimeRequests[requestIndex] = {
            ...this.data.overtimeRequests[requestIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        return {
            success: true,
            request: this.data.overtimeRequests[requestIndex],
            message: 'Overtime request updated successfully'
        };
    }

    // Payroll History Methods
    async getPayrollHistory(employeeId = null) {
        await this.simulateDelay(100, 300);
        
        if (!this.data.payrollHistory) {
            this.data.payrollHistory = [];
        }
        
        let history = this.data.payrollHistory;
        
        if (employeeId) {
            history = history.filter(record => record.employeeId == employeeId);
        }
        
        return history.sort((a, b) => new Date(b.payDate) - new Date(a.payDate));
    }

    async addPayrollRecord(payrollData) {
        await this.simulateDelay(100, 300);
        
        if (!this.data.payrollHistory) {
            this.data.payrollHistory = [];
        }
        
        const newRecord = {
            id: Math.max(...(this.data.payrollHistory.map(r => r.id) || [0])) + 1,
            ...payrollData,
            processedAt: new Date().toISOString()
        };
        
        this.data.payrollHistory.push(newRecord);
        
        return {
            success: true,
            record: newRecord,
            message: 'Payroll record added successfully'
        };
    }

    // Settings Methods
    async getSettings() {
        await this.simulateDelay(50, 150);
        
        return this.data.settings || {
            company: {
                name: "Bricks Construction Co.",
                workingHours: 8
            },
            payroll: {
                frequency: 'biweekly',
                standardWage: 15.00,
                overtimeRate: 1.5
            }
        };
    }

    async saveSettings(settings) {
        await this.simulateDelay(200, 500);
        
        // Merge with existing settings
        this.data.settings = {
            ...this.data.settings,
            ...settings,
            lastUpdated: new Date().toISOString()
        };
        
        // Save to localStorage for persistence
        try {
            localStorage.setItem('bricks_settings', JSON.stringify(this.data.settings));
            console.log('Settings saved to localStorage');
        } catch (error) {
            console.warn('Failed to save settings to localStorage:', error);
        }
        
        return this.data.settings;
    }

    async getSystemStatus() {
        await this.simulateDelay(50, 200);
        
        return {
            server: {
                status: 'online',
                uptime: '99.9%',
                lastRestart: '2024-01-01T00:00:00Z'
            },
            database: {
                status: 'connected',
                size: '2.5 GB',
                lastBackup: new Date(Date.now() - 86400000).toISOString() // 24 hours ago
            },
            backup: {
                status: 'active',
                lastBackup: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                nextBackup: new Date(Date.now() + 3600000).toISOString()  // 1 hour from now
            },
            users: {
                total: this.data.employees?.length || 0,
                active: Math.floor((this.data.employees?.length || 0) * 0.8),
                online: Math.floor((this.data.employees?.length || 0) * 0.3)
            }
        };
    }
}

// Create singleton instance and export immediately
const dataService = new DataService();

// Export immediately for both module systems to avoid temporal dead zone issues
if (typeof module !== 'undefined' && module.exports) {
    module.exports = dataService;
} else if (typeof window !== 'undefined') {
    window.dataService = dataService;
}

// Ensure methods exist for compatibility (defensive programming)
if (!dataService.setAuthToken) {
    dataService.setAuthToken = function(token) {
        this.authToken = token;
        console.log('Auth token updated:', token ? 'Token set' : 'Token cleared');
    };
}

if (!dataService.getAuthToken) {
    dataService.getAuthToken = function() {
        return this.authToken;
    };
}

// Add a global verification function for debugging
if (typeof window !== 'undefined') {
    window.verifyDataService = function() {
        console.log('DataService verification:', {
            exists: typeof dataService !== 'undefined',
            hasSetAuthToken: typeof dataService.setAuthToken === 'function',
            hasGetAuthToken: typeof dataService.getAuthToken === 'function'
        });
    };
}
