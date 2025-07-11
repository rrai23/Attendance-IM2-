// Data Service Layer for Bricks Attendance System
// This module provides a centralized interface for all data operations
// Currently uses local mock data but structured for easy PHP backend integration

class DataService {
    constructor() {
        this.isOnline = false; // Flag for future backend integration
        this.apiBaseUrl = '/api'; // Future API endpoint base
        this.authToken = null;
        
        // Initialize with mock data
        this.initializeMockData();
    }

    // Initialize mock data (will be replaced with API calls)
    initializeMockData() {
        if (typeof mockData === 'undefined') {
            console.error('Mock data not loaded. Please ensure mock-data.js is included.');
            return;
        }
        this.data = JSON.parse(JSON.stringify(mockData)); // Deep copy to avoid mutations
    }

    // Set authentication token for API calls
    setAuthToken(token) {
        this.authToken = token;
    }

    // Generic API call wrapper (for future backend integration)
    async apiCall(endpoint, method = 'GET', data = null) {
        if (this.isOnline) {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.authToken ? `Bearer ${this.authToken}` : ''
                }
            };

            if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                options.body = JSON.stringify(data);
            }

            try {
                const response = await fetch(`${this.apiBaseUrl}${endpoint}`, options);
                if (!response.ok) {
                    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
                }
                return await response.json();
            } catch (error) {
                console.error('API call error:', error);
                throw error;
            }
        } else {
            // Simulate API delay for realistic behavior
            await this.simulateDelay();
            return this.handleMockApiCall(endpoint, method, data);
        }
    }

    // Simulate network delay
    async simulateDelay(min = 100, max = 500) {
        const delay = Math.random() * (max - min) + min;
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    // Handle mock API calls (local data operations)
    handleMockApiCall(endpoint, method, data) {
        // This method simulates what the backend API would return
        // In production, this entire method would be removed
        
        const parts = endpoint.split('/').filter(p => p);
        const resource = parts[0];
        const id = parts[1] ? parseInt(parts[1]) : null;
        const subResource = parts[2]; // For handling sub-resources like /employees/{id}/wage

        switch (resource) {
            case 'auth':
                return this.handleAuthMock(parts[1], method, data);
            case 'employees':
                // Handle employee wage updates specifically
                if (subResource === 'wage' && method === 'PATCH') {
                    return this.handleEmployeeWageUpdate(id, data);
                }
                return this.handleEmployeesMock(id, method, data);
            case 'attendance':
                return this.handleAttendanceMock(id, method, data);
            case 'payroll':
                return this.handlePayrollMock(id, method, data);
            case 'overtime':
                return this.handleOvertimeMock(id, method, data);
            case 'settings':
                return this.handleSettingsMock(method, data);
            case 'analytics':
                return this.handleAnalyticsMock(parts[1], method, data);
            case 'calendar':
                return this.handleCalendarMock(id, method, data);
            default:
                throw new Error(`Unknown endpoint: ${endpoint}`);
        }
    }

    // Authentication Methods
    async login(username, password) {
        return this.apiCall('/auth/login', 'POST', { username, password });
    }

    async logout() {
        return this.apiCall('/auth/logout', 'POST');
    }

    async validateToken(token) {
        return this.apiCall('/auth/validate', 'POST', { token });
    }

    // Employee CRUD Operations
    async getEmployees() {
        return this.apiCall('/employees');
    }

    async getEmployee(id) {
        return this.apiCall(`/employees/${id}`);
    }

    async createEmployee(employeeData) {
        return this.apiCall('/employees', 'POST', employeeData);
    }

    async updateEmployee(id, employeeData) {
        return this.apiCall(`/employees/${id}`, 'PUT', employeeData);
    }

    async deleteEmployee(id) {
        return this.apiCall(`/employees/${id}`, 'DELETE');
    }

    async getEmployeesByDepartment(department) {
        return this.apiCall(`/employees?department=${encodeURIComponent(department)}`);
    }

    // Attendance Operations
    async getAttendanceRecords(employeeId = null, startDate = null, endDate = null) {
        let endpoint = '/attendance';
        const params = new URLSearchParams();
        
        if (employeeId) params.append('employeeId', employeeId);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        if (params.toString()) {
            endpoint += `?${params.toString()}`;
        }
        
        return this.apiCall(endpoint);
    }

    async clockIn(employeeId, timestamp = null) {
        return this.apiCall('/attendance/clock-in', 'POST', {
            employeeId,
            timestamp: timestamp || new Date().toISOString()
        });
    }

    async clockOut(employeeId, timestamp = null) {
        return this.apiCall('/attendance/clock-out', 'POST', {
            employeeId,
            timestamp: timestamp || new Date().toISOString()
        });
    }

    async startLunch(employeeId, timestamp = null) {
        return this.apiCall('/attendance/lunch-start', 'POST', {
            employeeId,
            timestamp: timestamp || new Date().toISOString()
        });
    }

    async endLunch(employeeId, timestamp = null) {
        return this.apiCall('/attendance/lunch-end', 'POST', {
            employeeId,
            timestamp: timestamp || new Date().toISOString()
        });
    }

    async updateAttendanceRecord(recordId, updates) {
        return this.apiCall(`/attendance/${recordId}`, 'PATCH', updates);
    }

    async deleteAttendanceRecord(recordId) {
        return this.apiCall(`/attendance/${recordId}`, 'DELETE');
    }

    // Payroll Operations
    async getPayrollHistory(employeeId = null, limit = null) {
        let endpoint = '/payroll';
        const params = new URLSearchParams();
        
        if (employeeId) params.append('employeeId', employeeId);
        if (limit) params.append('limit', limit);
        
        if (params.toString()) {
            endpoint += `?${params.toString()}`;
        }
        
        return this.apiCall(endpoint);
    }

    async calculatePayroll(employeeId, startDate, endDate) {
        return this.apiCall('/payroll/calculate', 'POST', {
            employeeId,
            startDate,
            endDate
        });
    }

    async processPayroll(payrollData) {
        return this.apiCall('/payroll/process', 'POST', payrollData);
    }

    async updateEmployeeWage(employeeId, hourlyRate) {
        return this.apiCall(`/employees/${employeeId}/wage`, 'PATCH', { hourlyRate });
    }

    // Overtime Operations
    async getOvertimeRequests(employeeId = null, status = null) {
        let endpoint = '/overtime';
        const params = new URLSearchParams();
        
        if (employeeId) params.append('employeeId', employeeId);
        if (status) params.append('status', status);
        
        if (params.toString()) {
            endpoint += `?${params.toString()}`;
        }
        
        return this.apiCall(endpoint);
    }

    async createOvertimeRequest(requestData) {
        return this.apiCall('/overtime', 'POST', requestData);
    }

    async updateOvertimeRequest(requestId, updates) {
        return this.apiCall(`/overtime/${requestId}`, 'PATCH', updates);
    }

    async approveOvertimeRequest(requestId, approverId) {
        return this.apiCall(`/overtime/${requestId}/approve`, 'POST', { approverId });
    }

    async denyOvertimeRequest(requestId, approverId, reason) {
        return this.apiCall(`/overtime/${requestId}/deny`, 'POST', { approverId, reason });
    }

    // Settings Operations
    async getSettings() {
        return this.apiCall('/settings');
    }

    async updateSettings(settingsData) {
        return this.apiCall('/settings', 'PUT', settingsData);
    }

    async getCompanySettings() {
        return this.apiCall('/settings/company');
    }

    async updateCompanySettings(companyData) {
        return this.apiCall('/settings/company', 'PUT', companyData);
    }

    async getPayrollSettings() {
        return this.apiCall('/settings/payroll');
    }

    async updatePayrollSettings(payrollData) {
        return this.apiCall('/settings/payroll', 'PUT', payrollData);
    }

    // Analytics Operations
    async getAttendanceStats() {
        return this.apiCall('/analytics/attendance');
    }

    async getEmployeePerformance(employeeId = null) {
        const endpoint = employeeId ? `/analytics/performance/${employeeId}` : '/analytics/performance';
        return this.apiCall(endpoint);
    }

    async getMonthlyTrends(months = 3) {
        return this.apiCall(`/analytics/trends?months=${months}`);
    }

    async getAttendanceSummary() {
        return this.apiCall('/analytics/summary');
    }

    async getDepartmentStats() {
        return this.apiCall('/analytics/departments');
    }

    // Calendar Operations
    async getCalendarNotes(startDate = null, endDate = null) {
        let endpoint = '/calendar';
        const params = new URLSearchParams();
        
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        if (params.toString()) {
            endpoint += `?${params.toString()}`;
        }
        
        return this.apiCall(endpoint);
    }

    async createCalendarNote(noteData) {
        return this.apiCall('/calendar', 'POST', noteData);
    }

    async updateCalendarNote(noteId, updates) {
        return this.apiCall(`/calendar/${noteId}`, 'PATCH', updates);
    }

    async deleteCalendarNote(noteId) {
        return this.apiCall(`/calendar/${noteId}`, 'DELETE');
    }

    async getNextPayday() {
        return this.apiCall('/calendar/next-payday');
    }

    // Utility Methods
    async getDepartments() {
        return this.apiCall('/departments');
    }

    async getPositions() {
        return this.apiCall('/positions');
    }

    async getAuditLog(limit = 50) {
        return this.apiCall(`/audit?limit=${limit}`);
    }

    // Mock API Handlers (will be removed in production)
    handleAuthMock(action, method, data) {
        switch (action) {
            case 'login':
                const user = this.data.users.find(u => 
                    u.username === data.username && u.password === data.password
                );
                if (user) {
                    const token = `mock_token_${user.id}_${Date.now()}`;
                    return {
                        success: true,
                        token,
                        user: {
                            id: user.id,
                            username: user.username,
                            role: user.role,
                            employee: user.employee
                        }
                    };
                } else {
                    throw new Error('Invalid credentials');
                }
            
            case 'logout':
                return { success: true };
            
            case 'validate':
                return { valid: true, user: { id: 1, role: 'admin' } };
            
            default:
                throw new Error(`Unknown auth action: ${action}`);
        }
    }

    // Handle employee wage updates specifically
    handleEmployeeWageUpdate(employeeId, data) {
        const userIndex = this.data.users.findIndex(u => u.employee.id === employeeId);
        if (userIndex === -1) {
            throw new Error('Employee not found');
        }

        // Update the employee's hourly rate in the mock data
        this.data.users[userIndex].employee.hourlyRate = data.hourlyRate;
        
        // Return the updated employee data
        return {
            success: true,
            employee: this.data.users[userIndex].employee,
            message: 'Wage updated successfully'
        };
    }

    handleEmployeesMock(id, method, data) {
        switch (method) {
            case 'GET':
                if (id) {
                    const user = this.data.users.find(u => u.employee.id === id);
                    return user ? user.employee : null;
                } else {
                    return this.data.users.map(u => u.employee);
                }
            
            case 'POST':
                const newId = Math.max(...this.data.users.map(u => u.employee.id)) + 1;
                const newEmployee = { ...data, id: newId };
                const newUser = {
                    id: newId,
                    username: data.username || `${data.firstName.toLowerCase()}.${data.lastName.toLowerCase()}`,
                    password: data.password || 'password123',
                    role: data.role || 'employee',
                    employee: newEmployee
                };
                this.data.users.push(newUser);
                return newEmployee;
            
            case 'PUT':
                const userIndex = this.data.users.findIndex(u => u.employee.id === id);
                if (userIndex !== -1) {
                    this.data.users[userIndex].employee = { ...this.data.users[userIndex].employee, ...data };
                    return this.data.users[userIndex].employee;
                }
                throw new Error('Employee not found');
            
            case 'DELETE':
                const deleteIndex = this.data.users.findIndex(u => u.employee.id === id);
                if (deleteIndex !== -1) {
                    this.data.users.splice(deleteIndex, 1);
                    return { success: true };
                }
                throw new Error('Employee not found');
            
            default:
                throw new Error(`Unsupported method: ${method}`);
        }
    }

    handleAttendanceMock(id, method, data) {
        switch (method) {
            case 'GET':
                if (id) {
                    return this.data.attendanceRecords.find(r => r.id === id);
                } else {
                    let records = [...this.data.attendanceRecords];
                    
                    // Apply filters from query parameters (simulated)
                    if (data && data.employeeId) {
                        records = records.filter(r => r.employeeId === parseInt(data.employeeId));
                    }
                    if (data && data.startDate) {
                        records = records.filter(r => r.date >= data.startDate);
                    }
                    if (data && data.endDate) {
                        records = records.filter(r => r.date <= data.endDate);
                    }
                    
                    return records.sort((a, b) => new Date(b.date) - new Date(a.date));
                }
            
            case 'POST':
                const newRecordId = Math.max(...this.data.attendanceRecords.map(r => r.id)) + 1;
                const newRecord = { ...data, id: newRecordId };
                this.data.attendanceRecords.push(newRecord);
                return newRecord;
            
            case 'PATCH':
                const recordIndex = this.data.attendanceRecords.findIndex(r => r.id === id);
                if (recordIndex !== -1) {
                    this.data.attendanceRecords[recordIndex] = { 
                        ...this.data.attendanceRecords[recordIndex], 
                        ...data 
                    };
                    return this.data.attendanceRecords[recordIndex];
                }
                throw new Error('Attendance record not found');
            
            case 'DELETE':
                const deleteIndex = this.data.attendanceRecords.findIndex(r => r.id === id);
                if (deleteIndex !== -1) {
                    this.data.attendanceRecords.splice(deleteIndex, 1);
                    return { success: true };
                }
                throw new Error('Attendance record not found');
            
            default:
                throw new Error(`Unsupported method: ${method}`);
        }
    }

    handlePayrollMock(id, method, data) {
        switch (method) {
            case 'GET':
                let records = [...this.data.payrollHistory];
                
                if (data && data.employeeId) {
                    records = records.filter(r => r.employeeId === parseInt(data.employeeId));
                }
                if (data && data.limit) {
                    records = records.slice(0, parseInt(data.limit));
                }
                
                return records.sort((a, b) => new Date(b.payPeriodEnd) - new Date(a.payPeriodEnd));
            
            case 'POST':
                if (data.action === 'calculate') {
                    // Mock payroll calculation
                    const employee = this.data.users.find(u => u.employee.id === data.employeeId);
                    if (!employee) throw new Error('Employee not found');
                    
                    const attendanceRecords = this.data.attendanceRecords.filter(r => 
                        r.employeeId === data.employeeId &&
                        r.date >= data.startDate &&
                        r.date <= data.endDate
                    );
                    
                    const totalRegularHours = attendanceRecords.reduce((sum, r) => sum + r.regularHours, 0);
                    const totalOvertimeHours = attendanceRecords.reduce((sum, r) => sum + r.overtimeHours, 0);
                    const regularPay = totalRegularHours * employee.employee.hourlyRate;
                    const overtimePay = totalOvertimeHours * employee.employee.hourlyRate * 1.5;
                    const grossPay = regularPay + overtimePay;
                    
                    return {
                        employeeId: data.employeeId,
                        payPeriodStart: data.startDate,
                        payPeriodEnd: data.endDate,
                        regularHours: totalRegularHours,
                        overtimeHours: totalOvertimeHours,
                        regularPay,
                        overtimePay,
                        grossPay,
                        taxes: grossPay * 0.2, // Simplified tax calculation
                        deductions: 35.00, // Fixed deductions
                        netPay: grossPay * 0.8 - 35.00
                    };
                } else {
                    // Process payroll
                    const newPayrollId = Math.max(...this.data.payrollHistory.map(p => p.id)) + 1;
                    const newPayroll = { ...data, id: newPayrollId, status: 'processed' };
                    this.data.payrollHistory.push(newPayroll);
                    return newPayroll;
                }
            
            default:
                throw new Error(`Unsupported method: ${method}`);
        }
    }

    handleOvertimeMock(id, method, data) {
        switch (method) {
            case 'GET':
                let requests = [...this.data.overtimeRequests];
                
                if (data && data.employeeId) {
                    requests = requests.filter(r => r.employeeId === parseInt(data.employeeId));
                }
                if (data && data.status) {
                    requests = requests.filter(r => r.status === data.status);
                }
                
                return requests.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));
            
            case 'POST':
                if (data.action === 'approve') {
                    const requestIndex = this.data.overtimeRequests.findIndex(r => r.id === id);
                    if (requestIndex !== -1) {
                        this.data.overtimeRequests[requestIndex].status = 'approved';
                        this.data.overtimeRequests[requestIndex].approvedBy = data.approverId;
                        this.data.overtimeRequests[requestIndex].approvedDate = new Date().toISOString().split('T')[0];
                        return this.data.overtimeRequests[requestIndex];
                    }
                    throw new Error('Overtime request not found');
                } else if (data.action === 'deny') {
                    const requestIndex = this.data.overtimeRequests.findIndex(r => r.id === id);
                    if (requestIndex !== -1) {
                        this.data.overtimeRequests[requestIndex].status = 'denied';
                        this.data.overtimeRequests[requestIndex].approvedBy = data.approverId;
                        this.data.overtimeRequests[requestIndex].approvedDate = new Date().toISOString().split('T')[0];
                        this.data.overtimeRequests[requestIndex].notes = data.reason;
                        return this.data.overtimeRequests[requestIndex];
                    }
                    throw new Error('Overtime request not found');
                } else {
                    // Create new request
                    const newRequestId = Math.max(...this.data.overtimeRequests.map(r => r.id)) + 1;
                    const newRequest = { 
                        ...data, 
                        id: newRequestId, 
                        status: 'pending',
                        requestDate: new Date().toISOString().split('T')[0]
                    };
                    this.data.overtimeRequests.push(newRequest);
                    return newRequest;
                }
            
            case 'PATCH':
                const requestIndex = this.data.overtimeRequests.findIndex(r => r.id === id);
                if (requestIndex !== -1) {
                    this.data.overtimeRequests[requestIndex] = { 
                        ...this.data.overtimeRequests[requestIndex], 
                        ...data 
                    };
                    return this.data.overtimeRequests[requestIndex];
                }
                throw new Error('Overtime request not found');
            
            default:
                throw new Error(`Unsupported method: ${method}`);
        }
    }

    handleSettingsMock(method, data) {
        switch (method) {
            case 'GET':
                return this.data.settings;
            
            case 'PUT':
                this.data.settings = { ...this.data.settings, ...data };
                return this.data.settings;
            
            default:
                throw new Error(`Unsupported method: ${method}`);
        }
    }

    handleAnalyticsMock(type, method, data) {
        switch (type) {
            case 'attendance':
                return this.data.analytics.attendanceStats;
            
            case 'performance':
                if (data && data.employeeId) {
                    return this.data.analytics.employeePerformance.find(p => p.employeeId === parseInt(data.employeeId));
                }
                return this.data.analytics.employeePerformance;
            
            case 'trends':
                return this.data.analytics.monthlyTrends;
            
            case 'summary':
                return mockDataHelpers.getAttendanceSummary();
            
            case 'departments':
                return this.data.departments;
            
            default:
                throw new Error(`Unknown analytics type: ${type}`);
        }
    }

    handleCalendarMock(id, method, data) {
        // Handle next-payday special endpoint
        if (id === 'next-payday' && method === 'GET') {
            return this.getNextPaydayMock();
        }

        switch (method) {
            case 'GET':
                if (id) {
                    return this.data.calendarNotes.find(n => n.id === id);
                } else {
                    let notes = [...this.data.calendarNotes];
                    
                    if (data && data.startDate) {
                        notes = notes.filter(n => n.date >= data.startDate);
                    }
                    if (data && data.endDate) {
                        notes = notes.filter(n => n.date <= data.endDate);
                    }
                    
                    return notes.sort((a, b) => new Date(a.date) - new Date(b.date));
                }
            
            case 'POST':
                const newNoteId = Math.max(...this.data.calendarNotes.map(n => n.id)) + 1;
                const newNote = { ...data, id: newNoteId };
                this.data.calendarNotes.push(newNote);
                return newNote;
            
            case 'PATCH':
                const noteIndex = this.data.calendarNotes.findIndex(n => n.id === id);
                if (noteIndex !== -1) {
                    this.data.calendarNotes[noteIndex] = { 
                        ...this.data.calendarNotes[noteIndex], 
                        ...data 
                    };
                    return this.data.calendarNotes[noteIndex];
                }
                throw new Error('Calendar note not found');
            
            case 'DELETE':
                const deleteIndex = this.data.calendarNotes.findIndex(n => n.id === id);
                if (deleteIndex !== -1) {
                    this.data.calendarNotes.splice(deleteIndex, 1);
                    return { success: true };
                }
                throw new Error('Calendar note not found');
            
            default:
                throw new Error(`Unsupported method: ${method}`);
        }
    }

    /**
     * Get next payday (weekly)
     */
    getNextPaydayMock() {
        const today = new Date();
        const nextFriday = new Date(today);
        
        // Calculate days until next Friday
        const daysUntilFriday = (5 - today.getDay() + 7) % 7;
        
        // If today is Friday, get next Friday
        if (daysUntilFriday === 0) {
            nextFriday.setDate(today.getDate() + 7);
        } else {
            nextFriday.setDate(today.getDate() + daysUntilFriday);
        }
        
        // Ensure we have a valid date
        if (isNaN(nextFriday.getTime())) {
            nextFriday.setTime(today.getTime() + (7 * 24 * 60 * 60 * 1000));
        }
        
        const daysRemaining = Math.max(1, Math.ceil((nextFriday - today) / (1000 * 60 * 60 * 24)));
        
        return {
            date: nextFriday.toISOString().split('T')[0],
            daysRemaining: daysRemaining,
            amount: 15000.00, // Example weekly salary in PHP
            period: 'Weekly'
        };
    }
}

// Create and export singleton instance
const dataService = new DataService();

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = dataService;
} else {
    window.dataService = dataService;
}