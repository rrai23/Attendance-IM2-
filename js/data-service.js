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
        return this.data.employees || [];
    }

    async getDepartments() {
        await this.simulateDelay(50, 200);
        const employees = this.data.employees || [];
        const departments = [...new Set(employees.map(emp => emp.department))];
        return departments.map((name, index) => ({ id: index + 1, name }));
    }

    async getEmployeesByDepartment(departmentId) {
        await this.simulateDelay(100, 300);
        const employees = this.data.employees || [];
        const departments = await this.getDepartments();
        const department = departments.find(dept => dept.id === parseInt(departmentId));
        
        if (!department) return [];
        
        return employees.filter(emp => emp.department === department.name);
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
}

// Create singleton instance
const dataService = new DataService();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = dataService;
} else {
    window.dataService = dataService;
}
