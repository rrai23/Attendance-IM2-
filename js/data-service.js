// Minimal Data Service for Bricks Attendance System
// Provides essential methods needed by the dashboard

class DataService {
    constructor() {
        this.isOnline = false;
        this.apiBaseUrl = '/api';
        this.authToken = null;
        this.eventListeners = {}; // Event system for data changes
        this.initializeMockData();
    }

    /**
     * Add event listener for data changes
     */
    addEventListener(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    /**
     * Remove event listener
     */
    removeEventListener(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
        }
    }

    /**
     * Emit event to notify listeners
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
        const attendanceRecords = this.data.attendanceRecords || [];
        const users = this.data.users || [];
        const employeeCount = users.length;
        
        // Calculate today's stats
        const todayRecords = attendanceRecords.filter(record => record.date === today);
        const present = todayRecords.filter(record => record.status === 'present').length;
        const tardy = todayRecords.filter(record => record.status === 'tardy' || record.status === 'late').length;
        const absent = employeeCount - present - tardy;
        
        // Use analytics data from mock-data if available
        if (this.data.analytics && this.data.analytics.attendanceStats) {
            const analyticsStats = this.data.analytics.attendanceStats;
            
            return {
                totalEmployees: employeeCount,
                presentToday: analyticsStats.presentToday || present + tardy,
                absentToday: analyticsStats.absentToday || absent,
                tardyToday: analyticsStats.tardyToday || tardy,
                attendanceRate: analyticsStats.attendanceRate || Math.round(((present + tardy) / employeeCount) * 100),
                tardyRate: analyticsStats.tardyRate || Math.round((tardy / employeeCount) * 100),
                departments: {
                    total: Object.keys(analyticsStats.departmentStats || {}).length,
                    with100Percent: 2,
                    withIssues: 1
                },
                overtime: {
                    requestsToday: 3,
                    pendingApproval: 2,
                    thisWeekTotal: 12.5
                },
                today: {
                    total: employeeCount,
                    present: present,
                    late: tardy,
                    absent: absent,
                    attendanceRate: Math.round(((present + tardy) / employeeCount) * 100)
                }
            };
        }
        
        // Calculate weekly trends - use default if not in analytics
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekRecords = [];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const dayRecords = attendanceRecords.filter(record => record.date === dateStr);
            const dayPresent = dayRecords.filter(record => record.status === 'present').length;
            const dayTardy = dayRecords.filter(record => record.status === 'tardy' || record.status === 'late').length;
            const attendanceRate = employeeCount > 0 ? ((dayPresent + dayTardy) / employeeCount) * 100 : 0;
            weekRecords.push(Math.round(attendanceRate));
        }
        
        // Default response if analytics not available
        return {
            totalEmployees: employeeCount,
            presentToday: present + tardy,
            absentToday: absent,
            tardyToday: tardy,
            attendanceRate: employeeCount > 0 ? Math.round(((present + tardy) / employeeCount) * 100) : 0,
            tardyRate: employeeCount > 0 ? Math.round((tardy / employeeCount) * 100) : 0,
            weeklyTrend: weekRecords,
            lastUpdated: new Date().toISOString(),
            departments: {
                total: 5,
                with100Percent: 2,
                withIssues: 1
            },
            overtime: {
                requestsToday: 3,
                pendingApproval: 2,
                thisWeekTotal: 12.5
            },
            today: {
                total: employeeCount,
                present: present,
                late: tardy,
                absent: absent,
                attendanceRate: Math.round(((present + tardy) / employeeCount) * 100)
            }
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
                // Extract employee data from users array
                const users = this.data.users || [];
                return users.map(user => ({
                    id: user.employee?.id || user.id,
                    employeeCode: user.employee?.id ? `EMP${String(user.employee.id).padStart(3, '0')}` : `EMP${String(user.id).padStart(3, '0')}`,
                    name: user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.name || 'Unknown',
                    firstName: user.employee?.firstName || user.name?.split(' ')[0] || '',
                    lastName: user.employee?.lastName || user.name?.split(' ').slice(1).join(' ') || '',
                    email: user.employee?.email || user.email || '',
                    phone: user.employee?.phone || '',
                    position: user.employee?.position || '',
                    department: user.employee?.department || '',
                    manager: user.employee?.manager || null,
                    hireDate: user.employee?.hireDate || '',
                    hourlyRate: user.employee?.hourlyRate || 0,
                    salary: user.employee?.salary || 0,
                    role: user.role || 'employee',
                    status: user.status || 'active',
                    schedule: user.employee?.schedule || {}
                }));
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
            
            let records = [...(this.data.attendanceRecords || [])];
            
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
        // Extract employee data from users array
        const users = this.data.users || [];
        return users.map(user => ({
            id: user.employee?.id || user.id,
            employeeCode: user.employee?.id ? `EMP${String(user.employee.id).padStart(3, '0')}` : `EMP${String(user.id).padStart(3, '0')}`,
            name: user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.name || 'Unknown',
            firstName: user.employee?.firstName || user.name?.split(' ')[0] || '',
            lastName: user.employee?.lastName || user.name?.split(' ').slice(1).join(' ') || '',
            email: user.employee?.email || user.email || '',
            phone: user.employee?.phone || '',
            position: user.employee?.position || '',
            department: user.employee?.department || '',
            hireDate: user.employee?.hireDate || '',
            status: user.employee?.status || 'active',
            hourlyRate: user.employee?.hourlyRate || 25.00,
            salaryType: user.employee?.salaryType || 'hourly',
            role: user.role || 'employee'
        })).filter(emp => emp.role === 'employee' || emp.role === 'admin' || emp.role === 'manager');
    }

    async getEmployee(employeeId) {
        const employees = await this.getEmployees();
        return employees.find(emp => emp.id === employeeId);
    }

    async getDepartments() {
        await this.simulateDelay(50, 200);
        const users = this.data.users || [];
        const departments = [...new Set(users
            .filter(user => user.employee && user.employee.department)
            .map(user => user.employee.department))];
        return departments.map((name, index) => ({ id: index + 1, name }));
    }

    async getEmployeesByDepartment(departmentId) {
        await this.simulateDelay(100, 300);
        const users = this.data.users || [];
        const departments = await this.getDepartments();
        const department = departments.find(dept => dept.id === parseInt(departmentId));
        
        if (!department) return [];
        
        return users
            .filter(user => user.employee && user.employee.department === department.name)
            .map(user => ({
                id: user.employee.id || user.id,
                employeeCode: user.employee?.id ? `EMP${String(user.employee.id).padStart(3, '0')}` : `EMP${String(user.id).padStart(3, '0')}`,
                name: user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.name || 'Unknown',
                firstName: user.employee?.firstName || user.name?.split(' ')[0] || '',
                lastName: user.employee?.lastName || user.name?.split(' ').slice(1).join(' ') || '',
                email: user.employee?.email || user.email || '',
                phone: user.employee?.phone || '',
                position: user.employee?.position || '',
                department: user.employee?.department || '',
                manager: user.employee?.manager || null,
                hireDate: user.employee?.hireDate || '',
                hourlyRate: user.employee?.hourlyRate || 0,
                salary: user.employee?.salary || 0,
                role: user.role || 'employee',
                status: user.status || 'active',
                schedule: user.employee?.schedule || {}
            }));
    }

    async getEmployeePerformance(employeeId = null) {
        await this.simulateDelay(200, 500);
        
        // Generate mock performance data
        const employees = this.data.employees || [];
        const targetEmployees = employeeId 
            ? employees.filter(emp => emp.id === employeeId)
            : employees;

        return targetEmployees.map(emp => ({
            employeeId: emp.id,
            employeeName: `${emp.firstName} ${emp.lastName}`,
            punctualityScore: Math.floor(Math.random() * 20 + 80), // 80-100
            attendanceScore: Math.floor(Math.random() * 15 + 85),  // 85-100
            overtimeScore: Math.floor(Math.random() * 30 + 70),    // 70-100
            consistencyScore: Math.floor(Math.random() * 25 + 75), // 75-100
            reliabilityScore: Math.floor(Math.random() * 20 + 80), // 80-100
            lastUpdated: new Date().toISOString()
        }));
    }

    async getSettings() {
        await this.simulateDelay(100, 300);
        return this.data.settings || {};
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

    /**
     * Get overtime requests
     */
    async getOvertimeRequests() {
        try {
            // Mock overtime requests data
            return [
                {
                    id: 1,
                    employeeId: 1,
                    employeeName: 'John Doe',
                    date: '2025-07-10',
                    hours: 3,
                    reason: 'Project deadline',
                    status: 'pending',
                    requestedAt: '2025-07-10T16:30:00Z'
                },
                {
                    id: 2,
                    employeeId: 2,
                    employeeName: 'Jane Smith',
                    date: '2025-07-09',
                    hours: 2,
                    reason: 'Client meeting',
                    status: 'approved',
                    requestedAt: '2025-07-09T17:00:00Z',
                    approvedAt: '2025-07-09T18:00:00Z'
                }
            ];
        } catch (error) {
            console.error('Error fetching overtime requests:', error);
            return [];
        }
    }

    /**
     * Get payroll history
     */
    async getPayrollHistory() {
        try {
            const employees = await this.getEmployees();
            const history = [];
            
            // Generate mock payroll history for the last 3 months
            const today = new Date();
            for (let i = 0; i < 3; i++) {
                const payDate = new Date(today.getFullYear(), today.getMonth() - i, 15);
                const payPeriodStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const payPeriodEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
                
                employees.forEach(employee => {
                    const regularHours = 160 + (Math.random() - 0.5) * 20; // ~160 hours ±10
                    const overtimeHours = Math.random() * 20; // 0-20 overtime hours
                    const hourlyRate = employee.hourlyRate || 25;
                    
                    const grossPay = (regularHours * hourlyRate) + (overtimeHours * hourlyRate * 1.5);
                    const taxes = grossPay * 0.20;
                    const netPay = grossPay - taxes;
                    
                    history.push({
                        id: `${employee.id}-${payDate.toISOString().split('T')[0]}`,
                        employeeId: employee.id,
                        employeeName: employee.name,
                        payPeriodStart: payPeriodStart.toISOString().split('T')[0],
                        payPeriodEnd: payPeriodEnd.toISOString().split('T')[0],
                        payDate: payDate.toISOString().split('T')[0],
                        regularHours: Math.round(regularHours * 100) / 100,
                        overtimeHours: Math.round(overtimeHours * 100) / 100,
                        hourlyRate,
                        grossPay: Math.round(grossPay * 100) / 100,
                        taxes: Math.round(taxes * 100) / 100,
                        netPay: Math.round(netPay * 100) / 100,
                        status: 'paid'
                    });
                });
            }
            
            return history.sort((a, b) => new Date(b.payDate) - new Date(a.payDate));
        } catch (error) {
            console.error('Error fetching payroll history:', error);
            return [];
        }
    }

    /**
     * Calculate payroll for an employee for a specific period
     */
    async calculatePayroll(employeeId, startDate, endDate) {
        try {
            const employee = await this.getEmployee(employeeId);
            if (!employee) {
                throw new Error('Employee not found');
            }

            // Mock attendance data for the period
            const start = new Date(startDate);
            const end = new Date(endDate);
            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            
            let regularHours = 0;
            let overtimeHours = 0;
            let presentDays = 0;
            let lateDays = 0;
            let absentDays = 0;

            // Generate mock work data for each day
            for (let i = 0; i < days; i++) {
                const currentDate = new Date(start);
                currentDate.setDate(start.getDate() + i);
                
                // Skip weekends
                if (currentDate.getDay() === 0 || currentDate.getDay() === 6) continue;
                
                // Random attendance scenarios
                const scenario = Math.random();
                if (scenario < 0.8) { // 80% present
                    presentDays++;
                    const dailyHours = 8 + (Math.random() - 0.5) * 2; // 7-9 hours
                    if (dailyHours > 8) {
                        regularHours += 8;
                        overtimeHours += dailyHours - 8;
                    } else {
                        regularHours += dailyHours;
                    }
                    
                    if (Math.random() < 0.1) lateDays++; // 10% late even if present
                } else if (scenario < 0.9) { // 10% late
                    lateDays++;
                    presentDays++;
                    regularHours += 7; // Slightly less hours due to being late
                } else { // 10% absent
                    absentDays++;
                }
            }

            const hourlyRate = employee.hourlyRate || 25;
            const grossPay = (regularHours * hourlyRate) + (overtimeHours * hourlyRate * 1.5);
            const taxes = grossPay * 0.20;
            const netPay = grossPay - taxes;

            return {
                employeeId,
                employeeName: employee.name,
                payPeriodStart: startDate,
                payPeriodEnd: endDate,
                regularHours: Math.round(regularHours * 100) / 100,
                overtimeHours: Math.round(overtimeHours * 100) / 100,
                totalHours: Math.round((regularHours + overtimeHours) * 100) / 100,
                hourlyRate,
                grossPay: Math.round(grossPay * 100) / 100,
                taxes: Math.round(taxes * 100) / 100,
                netPay: Math.round(netPay * 100) / 100,
                presentDays,
                lateDays,
                absentDays,
                totalWorkDays: presentDays + lateDays + absentDays,
                attendanceRate: Math.round(((presentDays + lateDays) / (presentDays + lateDays + absentDays)) * 100)
            };
        } catch (error) {
            console.error('Error calculating payroll:', error);
            throw error;
        }
    }

    /**
     * Get settings
     */
    async getSettings() {
        try {
            return {
                payrollSettings: {
                    payPeriod: 'biweekly', // weekly, biweekly, monthly
                    overtimeThreshold: 40, // hours per week
                    overtimeMultiplier: 1.5,
                    taxRate: 0.20,
                    currency: 'PHP',
                    currencySymbol: '₱'
                },
                workSettings: {
                    standardWorkHours: 8,
                    workDaysPerWeek: 5,
                    lateThreshold: 15 // minutes
                }
            };
        } catch (error) {
            console.error('Error fetching settings:', error);
            return {};
        }
    }

    /**
     * Update employee wage
     */
    async updateEmployeeWage(employeeId, newRate) {
        try {
            await this.simulateDelay(200, 400);
            
            // Find the user containing this employee
            const user = this.data.users.find(user => user.employee && user.employee.id === employeeId);
            if (!user || !user.employee) {
                throw new Error('Employee not found');
            }

            const oldRate = user.employee.hourlyRate;
            user.employee.hourlyRate = newRate;
            user.employee.salary = newRate * 40 * 52; // Update annual salary
            
            console.log(`Employee ${user.employee.name} wage updated from ₱${oldRate} to ₱${newRate}`);
            
            // Emit event for data synchronization
            this.emit('employeeWageUpdated', {
                employeeId,
                oldRate,
                newRate,
                employee: user.employee
            });
            
            return true;
        } catch (error) {
            console.error('Error updating employee wage:', error);
            throw error;
        }
    }

    /**
     * Update employee data
     */
    async updateEmployee(employeeId, updateData) {
        try {
            await this.simulateDelay(200, 400);
            
            // Find the user containing this employee
            const user = this.data.users.find(user => user.employee && user.employee.id === employeeId);
            if (!user || !user.employee) {
                throw new Error('Employee not found');
            }

            const oldData = { ...user.employee };
            
            // Update employee data
            Object.assign(user.employee, updateData);
            
            console.log(`Employee ${user.employee.name} data updated`);
            
            // Emit event for data synchronization
            this.emit('employeeDataUpdated', {
                employeeId,
                oldData,
                newData: user.employee,
                changes: updateData
            });
            
            return user.employee;
        } catch (error) {
            console.error('Error updating employee:', error);
            throw error;
        }
    }

    /**
     * Get employee by ID
     */
    async getEmployee(employeeId) {
        try {
            await this.simulateDelay(100, 200);
            
            const user = this.data.users.find(user => user.employee && user.employee.id === employeeId);
            if (!user || !user.employee) {
                throw new Error('Employee not found');
            }
            
            return {
                id: user.employee.id,
                name: user.employee.name,
                firstName: user.employee.name.split(' ')[0],
                lastName: user.employee.name.split(' ').slice(1).join(' '),
                email: user.email,
                phone: user.employee.phone,
                department: user.employee.department,
                position: user.employee.position,
                manager: user.employee.manager,
                hireDate: user.employee.hireDate,
                hourlyRate: user.employee.hourlyRate,
                salary: user.employee.salary,
                role: user.role,
                status: user.status,
                schedule: user.employee.schedule || {}
            };
        } catch (error) {
            console.error('Error fetching employee:', error);
            throw error;
        }
    }

    /**
     * Add new employee
     */
    async addEmployee(employeeData) {
        try {
            await this.simulateDelay(300, 500);
            
            // Generate new ID
            const maxId = Math.max(...this.data.users.map(user => user.id || 0));
            const newId = maxId + 1;
            
            // Create new user with employee data
            const newUser = {
                id: newId,
                username: employeeData.email.split('@')[0],
                email: employeeData.email,
                role: employeeData.role || 'employee',
                status: employeeData.status || 'active',
                employee: {
                    id: newId,
                    name: `${employeeData.firstName} ${employeeData.lastName}`,
                    phone: employeeData.phone,
                    department: employeeData.department,
                    position: employeeData.position,
                    manager: employeeData.manager,
                    hireDate: employeeData.hireDate,
                    hourlyRate: employeeData.hourlyRate,
                    salary: employeeData.salary || (employeeData.hourlyRate * 40 * 52),
                    schedule: employeeData.schedule || {}
                }
            };
            
            this.data.users.push(newUser);
            
            console.log(`New employee ${newUser.employee.name} added`);
            
            // Emit event for data synchronization
            this.emit('employeeAdded', {
                employee: newUser.employee
            });
            
            return newUser.employee;
        } catch (error) {
            console.error('Error adding employee:', error);
            throw error;
        }
    }

    /**
     * Delete employee
     */
    async deleteEmployee(employeeId) {
        try {
            await this.simulateDelay(200, 400);
            
            const userIndex = this.data.users.findIndex(user => user.employee && user.employee.id === employeeId);
            if (userIndex === -1) {
                throw new Error('Employee not found');
            }
            
            const deletedEmployee = this.data.users[userIndex].employee;
            this.data.users.splice(userIndex, 1);
            
            console.log(`Employee ${deletedEmployee.name} deleted`);
            
            // Emit event for data synchronization
            this.emit('employeeDeleted', {
                employeeId,
                employee: deletedEmployee
            });
            
            return true;
        } catch (error) {
            console.error('Error deleting employee:', error);
            throw error;
        }
    }

    // ...existing code...
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
