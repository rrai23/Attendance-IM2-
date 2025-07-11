// Mock data for the Bricks Attendance System
// This data structure mimics what would be returned from a PHP API

const mockData = {
    // System settings and configuration
    settings: {
        company: {
            name: "Bricks Construction Co.",
            address: "123 Industrial Ave, Construction City, CC 12345",
            phone: "(555) 123-4567",
            email: "info@bricksconstruction.com"
        },
        payroll: {
            payPeriod: "weekly", // weekly, biweekly, monthly
            payday: "friday", // day of week for weekly, or date for monthly
            overtimeThreshold: 40, // hours per week
            overtimeMultiplier: 1.5,
            currency: "PHP",
            timezone: "America/New_York"
        },
        attendance: {
            workDayStart: "08:00",
            workDayEnd: "17:00",
            lunchBreakDuration: 60, // minutes
            tardyThreshold: 15, // minutes
            earlyLeaveThreshold: 15 // minutes
        },
        notifications: {
            emailEnabled: true,
            smsEnabled: false,
            tardyNotifications: true,
            overtimeAlerts: true
        }
    },

    // User accounts and employee data
    users: [
        {
            id: 1,
            username: "admin",
            password: "admin", // In real system, this would be hashed
            role: "admin",
            employee: {
                id: 1,
                firstName: "John",
                lastName: "Administrator",
                email: "admin@bricksconstruction.com",
                phone: "(555) 123-4567",
                position: "System Administrator",
                department: "IT",
                hireDate: "2020-01-15",
                status: "active",
                hourlyRate: 35.00,
                salaryType: "hourly", // hourly, salary
                profileImage: null
            }
        },
        {
            id: 2,
            username: "mike.foreman",
            password: "password123",
            role: "employee",
            employee: {
                id: 2,
                firstName: "Mike",
                lastName: "Foreman",
                email: "mike.foreman@bricksconstruction.com",
                phone: "(555) 234-5678",
                position: "Site Foreman",
                department: "Construction",
                hireDate: "2019-03-20",
                status: "active",
                hourlyRate: 28.50,
                salaryType: "hourly",
                profileImage: null
            }
        },
        {
            id: 3,
            username: "sarah.mason",
            password: "password123",
            role: "employee",
            employee: {
                id: 3,
                firstName: "Sarah",
                lastName: "Mason",
                email: "sarah.mason@bricksconstruction.com",
                phone: "(555) 345-6789",
                position: "Brick Mason",
                department: "Construction",
                hireDate: "2021-06-10",
                status: "active",
                hourlyRate: 25.00,
                salaryType: "hourly",
                profileImage: null
            }
        },
        {
            id: 4,
            username: "david.carpenter",
            password: "password123",
            role: "employee",
            employee: {
                id: 4,
                firstName: "David",
                lastName: "Carpenter",
                email: "david.carpenter@bricksconstruction.com",
                phone: "(555) 456-7890",
                position: "Carpenter",
                department: "Construction",
                hireDate: "2020-09-15",
                status: "active",
                hourlyRate: 26.75,
                salaryType: "hourly",
                profileImage: null
            }
        },
        {
            id: 5,
            username: "lisa.accountant",
            password: "password123",
            role: "employee",
            employee: {
                id: 5,
                firstName: "Lisa",
                lastName: "Johnson",
                email: "lisa.johnson@bricksconstruction.com",
                phone: "(555) 567-8901",
                position: "Accountant",
                department: "Finance",
                hireDate: "2018-11-05",
                status: "active",
                hourlyRate: 32.00,
                salaryType: "hourly",
                profileImage: null
            }
        },
        {
            id: 6,
            username: "robert.laborer",
            password: "password123",
            role: "employee",
            employee: {
                id: 6,
                firstName: "Robert",
                lastName: "Wilson",
                email: "robert.wilson@bricksconstruction.com",
                phone: "(555) 678-9012",
                position: "General Laborer",
                department: "Construction",
                hireDate: "2022-02-28",
                status: "active",
                hourlyRate: 18.50,
                salaryType: "hourly",
                profileImage: null
            }
        }
    ],

    // Attendance records for the past 3 months
    attendanceRecords: [
        // Week of December 16-20, 2024
        {
            id: 1,
            employeeId: 2,
            date: "2024-12-16",
            timeIn: "07:45:00",
            timeOut: "17:15:00",
            lunchStart: "12:00:00",
            lunchEnd: "13:00:00",
            hoursWorked: 8.5,
            regularHours: 8.5,
            overtimeHours: 0,
            status: "present",
            notes: "Early arrival for project setup"
        },
        {
            id: 2,
            employeeId: 3,
            date: "2024-12-16",
            timeIn: "08:10:00",
            timeOut: "17:00:00",
            lunchStart: "12:30:00",
            lunchEnd: "13:30:00",
            hoursWorked: 7.83,
            regularHours: 7.83,
            overtimeHours: 0,
            status: "tardy",
            notes: "Traffic delay"
        },
        {
            id: 3,
            employeeId: 4,
            date: "2024-12-16",
            timeIn: "08:00:00",
            timeOut: "18:30:00",
            lunchStart: "12:00:00",
            lunchEnd: "13:00:00",
            hoursWorked: 9.5,
            regularHours: 8,
            overtimeHours: 1.5,
            status: "overtime",
            notes: "Finishing urgent repairs"
        },
        {
            id: 4,
            employeeId: 5,
            date: "2024-12-16",
            timeIn: "08:30:00",
            timeOut: "17:30:00",
            lunchStart: "12:00:00",
            lunchEnd: "13:00:00",
            hoursWorked: 8,
            regularHours: 8,
            overtimeHours: 0,
            status: "present",
            notes: ""
        },
        {
            id: 5,
            employeeId: 6,
            date: "2024-12-16",
            timeIn: "07:55:00",
            timeOut: "16:45:00",
            lunchStart: "12:00:00",
            lunchEnd: "13:00:00",
            hoursWorked: 7.83,
            regularHours: 7.83,
            overtimeHours: 0,
            status: "early_leave",
            notes: "Doctor appointment"
        },
        // December 17, 2024
        {
            id: 6,
            employeeId: 2,
            date: "2024-12-17",
            timeIn: "08:00:00",
            timeOut: "17:00:00",
            lunchStart: "12:00:00",
            lunchEnd: "13:00:00",
            hoursWorked: 8,
            regularHours: 8,
            overtimeHours: 0,
            status: "present",
            notes: ""
        },
        {
            id: 7,
            employeeId: 3,
            date: "2024-12-17",
            timeIn: "08:05:00",
            timeOut: "17:00:00",
            lunchStart: "12:30:00",
            lunchEnd: "13:30:00",
            hoursWorked: 7.92,
            regularHours: 7.92,
            overtimeHours: 0,
            status: "present",
            notes: ""
        },
        {
            id: 8,
            employeeId: 4,
            date: "2024-12-17",
            timeIn: "07:45:00",
            timeOut: "19:00:00",
            lunchStart: "12:00:00",
            lunchEnd: "13:00:00",
            hoursWorked: 10.25,
            regularHours: 8,
            overtimeHours: 2.25,
            status: "overtime",
            notes: "Emergency repair work"
        },
        {
            id: 9,
            employeeId: 5,
            date: "2024-12-17",
            timeIn: "08:30:00",
            timeOut: "17:30:00",
            lunchStart: "12:00:00",
            lunchEnd: "13:00:00",
            hoursWorked: 8,
            regularHours: 8,
            overtimeHours: 0,
            status: "present",
            notes: ""
        },
        {
            id: 10,
            employeeId: 6,
            date: "2024-12-17",
            timeIn: null,
            timeOut: null,
            lunchStart: null,
            lunchEnd: null,
            hoursWorked: 0,
            regularHours: 0,
            overtimeHours: 0,
            status: "absent",
            notes: "Sick day"
        },
        // December 18, 2024
        {
            id: 11,
            employeeId: 2,
            date: "2024-12-18",
            timeIn: "08:00:00",
            timeOut: "17:30:00",
            lunchStart: "12:00:00",
            lunchEnd: "13:00:00",
            hoursWorked: 8.5,
            regularHours: 8.5,
            overtimeHours: 0,
            status: "present",
            notes: ""
        },
        {
            id: 12,
            employeeId: 3,
            date: "2024-12-18",
            timeIn: "08:20:00",
            timeOut: "17:00:00",
            lunchStart: "12:30:00",
            lunchEnd: "13:30:00",
            hoursWorked: 7.67,
            regularHours: 7.67,
            overtimeHours: 0,
            status: "tardy",
            notes: "Car trouble"
        },
        {
            id: 13,
            employeeId: 4,
            date: "2024-12-18",
            timeIn: "08:00:00",
            timeOut: "17:00:00",
            lunchStart: "12:00:00",
            lunchEnd: "13:00:00",
            hoursWorked: 8,
            regularHours: 8,
            overtimeHours: 0,
            status: "present",
            notes: ""
        },
        {
            id: 14,
            employeeId: 5,
            date: "2024-12-18",
            timeIn: "08:30:00",
            timeOut: "17:30:00",
            lunchStart: "12:00:00",
            lunchEnd: "13:00:00",
            hoursWorked: 8,
            regularHours: 8,
            overtimeHours: 0,
            status: "present",
            notes: ""
        },
        {
            id: 15,
            employeeId: 6,
            date: "2024-12-18",
            timeIn: "08:00:00",
            timeOut: "17:00:00",
            lunchStart: "12:00:00",
            lunchEnd: "13:00:00",
            hoursWorked: 8,
            regularHours: 8,
            overtimeHours: 0,
            status: "present",
            notes: ""
        },
        // Today's attendance records (2025-07-11)
        {
            id: 15.5,
            employeeId: 1,
            date: "2025-07-11",
            timeIn: "07:45:00",
            timeOut: null,
            lunchStart: null,
            lunchEnd: null,
            hoursWorked: 0,
            regularHours: 0,
            overtimeHours: 0,
            status: "present",
            notes: "Admin - early arrival"
        },
        {
            id: 16,
            employeeId: 2,
            date: "2025-07-11",
            timeIn: "08:00:00",
            timeOut: null,
            lunchStart: null,
            lunchEnd: null,
            hoursWorked: 0,
            regularHours: 0,
            overtimeHours: 0,
            status: "present",
            notes: "On time"
        },
        {
            id: 17,
            employeeId: 3,
            date: "2025-07-11",
            timeIn: "08:15:00",
            timeOut: null,
            lunchStart: null,
            lunchEnd: null,
            hoursWorked: 0,
            regularHours: 0,
            overtimeHours: 0,
            status: "present",
            isLate: true,
            notes: "15 minutes late"
        },
        {
            id: 18,
            employeeId: 4,
            date: "2025-07-11",
            timeIn: "07:55:00",
            timeOut: null,
            lunchStart: null,
            lunchEnd: null,
            hoursWorked: 0,
            regularHours: 0,
            overtimeHours: 0,
            status: "present",
            notes: "Early arrival"
        },
        {
            id: 19,
            employeeId: 5,
            date: "2025-07-11",
            timeIn: "08:10:00",
            timeOut: null,
            lunchStart: null,
            lunchEnd: null,
            hoursWorked: 0,
            regularHours: 0,
            overtimeHours: 0,
            status: "present",
            isLate: true,
            notes: "10 minutes late"
        },
        {
            id: 20,
            employeeId: 6,
            date: "2025-07-11",
            timeIn: null,
            timeOut: null,
            lunchStart: null,
            lunchEnd: null,
            hoursWorked: 0,
            regularHours: 0,
            overtimeHours: 0,
            status: "absent",
            notes: "Sick leave"
        }
    ],

    // Payroll history for the past 3 months
    payrollHistory: [
        {
            id: 1,
            employeeId: 2,
            payPeriodStart: "2024-12-09",
            payPeriodEnd: "2024-12-15",
            regularHours: 40,
            overtimeHours: 3.5,
            regularPay: 1140.00,
            overtimePay: 149.63,
            grossPay: 1289.63,
            taxes: 258.00,
            deductions: 45.00,
            netPay: 986.63,
            payDate: "2024-12-20",
            status: "paid"
        },
        {
            id: 2,
            employeeId: 3,
            payPeriodStart: "2024-12-09",
            payPeriodEnd: "2024-12-15",
            regularHours: 38.5,
            overtimeHours: 0,
            regularPay: 962.50,
            overtimePay: 0,
            grossPay: 962.50,
            taxes: 192.50,
            deductions: 35.00,
            netPay: 735.00,
            payDate: "2024-12-20",
            status: "paid"
        },
        {
            id: 3,
            employeeId: 4,
            payPeriodStart: "2024-12-09",
            payPeriodEnd: "2024-12-15",
            regularHours: 40,
            overtimeHours: 6.25,
            regularPay: 1070.00,
            overtimePay: 250.31,
            grossPay: 1320.31,
            taxes: 264.00,
            deductions: 40.00,
            netPay: 1016.31,
            payDate: "2024-12-20",
            status: "paid"
        },
        {
            id: 4,
            employeeId: 5,
            payPeriodStart: "2024-12-09",
            payPeriodEnd: "2024-12-15",
            regularHours: 40,
            overtimeHours: 0,
            regularPay: 1280.00,
            overtimePay: 0,
            grossPay: 1280.00,
            taxes: 256.00,
            deductions: 50.00,
            netPay: 974.00,
            payDate: "2024-12-20",
            status: "paid"
        },
        {
            id: 5,
            employeeId: 6,
            payPeriodStart: "2024-12-09",
            payPeriodEnd: "2024-12-15",
            regularHours: 37.5,
            overtimeHours: 0,
            regularPay: 693.75,
            overtimePay: 0,
            grossPay: 693.75,
            taxes: 138.75,
            deductions: 25.00,
            netPay: 530.00,
            payDate: "2024-12-20",
            status: "paid"
        }
    ],

    // Overtime requests
    overtimeRequests: [
        {
            id: 1,
            employeeId: 4,
            requestDate: "2024-12-15",
            workDate: "2024-12-17",
            requestedHours: 2.5,
            reason: "Emergency repair work on Building A foundation",
            status: "approved",
            approvedBy: 1,
            approvedDate: "2024-12-16",
            actualHours: 2.25,
            notes: "Completed ahead of schedule"
        },
        {
            id: 2,
            employeeId: 2,
            requestDate: "2024-12-16",
            workDate: "2024-12-19",
            requestedHours: 4,
            reason: "Weekend concrete pour for new project",
            status: "pending",
            approvedBy: null,
            approvedDate: null,
            actualHours: null,
            notes: ""
        },
        {
            id: 3,
            employeeId: 3,
            requestDate: "2024-12-14",
            workDate: "2024-12-16",
            requestedHours: 2,
            reason: "Finish brick work before weather change",
            status: "denied",
            approvedBy: 1,
            approvedDate: "2024-12-15",
            actualHours: null,
            notes: "Weather forecast changed, work postponed"
        },
        {
            id: 4,
            employeeId: 6,
            requestDate: "2024-12-17",
            workDate: "2024-12-20",
            requestedHours: 3,
            reason: "Site cleanup for inspection",
            status: "pending",
            approvedBy: null,
            approvedDate: null,
            actualHours: null,
            notes: ""
        }
    ],

    // Calendar notes and events
    calendarNotes: [
        {
            id: 1,
            date: "2024-12-20",
            title: "Payday",
            description: "Weekly payroll distribution",
            type: "payroll",
            createdBy: 1
        },
        {
            id: 2,
            date: "2024-12-23",
            title: "Holiday - Christmas Eve (Half Day)",
            description: "Office closes at 12:00 PM",
            type: "holiday",
            createdBy: 1
        },
        {
            id: 3,
            date: "2024-12-24",
            title: "Holiday - Christmas Day",
            description: "Office closed",
            type: "holiday",
            createdBy: 1
        },
        {
            id: 4,
            date: "2024-12-25",
            title: "Holiday - Christmas Day",
            description: "Office closed",
            type: "holiday",
            createdBy: 1
        },
        {
            id: 5,
            date: "2024-12-31",
            title: "Holiday - New Year's Eve (Half Day)",
            description: "Office closes at 12:00 PM",
            type: "holiday",
            createdBy: 1
        },
        {
            id: 6,
            date: "2025-01-01",
            title: "Holiday - New Year's Day",
            description: "Office closed",
            type: "holiday",
            createdBy: 1
        },
        {
            id: 7,
            date: "2024-12-19",
            title: "Safety Meeting",
            description: "Monthly safety training - 3:00 PM",
            type: "meeting",
            createdBy: 1
        },
        {
            id: 8,
            date: "2024-12-27",
            title: "Payday",
            description: "Weekly payroll distribution",
            type: "payroll",
            createdBy: 1
        }
    ],

    // Department and position data
    departments: [
        {
            id: 1,
            name: "Construction",
            description: "Field construction and building operations",
            manager: 2
        },
        {
            id: 2,
            name: "Finance",
            description: "Accounting and financial operations",
            manager: 5
        },
        {
            id: 3,
            name: "IT",
            description: "Information technology and systems",
            manager: 1
        }
    ],

    positions: [
        {
            id: 1,
            title: "System Administrator",
            department: "IT",
            baseHourlyRate: 35.00,
            description: "Manages IT systems and user accounts"
        },
        {
            id: 2,
            title: "Site Foreman",
            department: "Construction",
            baseHourlyRate: 28.50,
            description: "Supervises construction site operations"
        },
        {
            id: 3,
            title: "Brick Mason",
            department: "Construction",
            baseHourlyRate: 25.00,
            description: "Specialized in brick and masonry work"
        },
        {
            id: 4,
            title: "Carpenter",
            department: "Construction",
            baseHourlyRate: 26.75,
            description: "Skilled in wood construction and finishing"
        },
        {
            id: 5,
            title: "Accountant",
            department: "Finance",
            baseHourlyRate: 32.00,
            description: "Handles financial records and payroll"
        },
        {
            id: 6,
            title: "General Laborer",
            department: "Construction",
            baseHourlyRate: 18.50,
            description: "General construction support and labor"
        }
    ],

    // Analytics data for charts and reports
    analytics: {
        attendanceStats: {
            totalEmployees: 6,
            presentToday: 5,
            absentToday: 1,
            tardyToday: 2,
            overtimeToday: 0,
            averageHoursPerDay: 7.8,
            attendanceRate: 83.3,
            tardyRate: 33.3,
            overtimeRate: 0,
            today: {
                total: 6,
                present: 3,
                late: 2,
                absent: 1,
                attendanceRate: 83.3
            },
            weekly: {
                present: 25,
                late: 3,
                absent: 2,
                onLeave: 0,
                attendanceRate: [85, 92, 88, 90, 87, 75, 70]
            },
            monthly: {
                present: 120,
                late: 8,
                absent: 12,
                onLeave: 2,
                attendanceRate: Array.from({length: 30}, (_, i) => Math.floor(Math.random() * 15) + 80)
            }
        },
        monthlyTrends: [
            {
                month: "2024-10",
                totalHours: 960,
                regularHours: 864,
                overtimeHours: 96,
                attendanceRate: 94.2,
                tardyRate: 6.8
            },
            {
                month: "2024-11",
                totalHours: 920,
                regularHours: 832,
                overtimeHours: 88,
                attendanceRate: 91.8,
                tardyRate: 9.2
            },
            {
                month: "2024-12",
                totalHours: 756,
                regularHours: 680,
                overtimeHours: 76,
                attendanceRate: 92.5,
                tardyRate: 8.3
            }
        ],
        employeePerformance: [
            {
                employeeId: 2,
                attendanceRate: 98.5,
                tardyRate: 2.1,
                overtimeHours: 12.5,
                averageHoursPerDay: 8.2
            },
            {
                employeeId: 3,
                attendanceRate: 89.2,
                tardyRate: 12.5,
                overtimeHours: 0,
                averageHoursPerDay: 7.6
            },
            {
                employeeId: 4,
                attendanceRate: 95.8,
                tardyRate: 4.2,
                overtimeHours: 28.75,
                averageHoursPerDay: 8.8
            },
            {
                employeeId: 5,
                attendanceRate: 100,
                tardyRate: 0,
                overtimeHours: 0,
                averageHoursPerDay: 8.0
            },
            {
                employeeId: 6,
                attendanceRate: 87.5,
                tardyRate: 8.3,
                overtimeHours: 0,
                averageHoursPerDay: 7.4
            }
        ]
    },

    // System audit log
    auditLog: [
        {
            id: 1,
            timestamp: "2024-12-18T09:15:00Z",
            userId: 1,
            action: "login",
            details: "Admin user logged in",
            ipAddress: "192.168.1.100"
        },
        {
            id: 2,
            timestamp: "2024-12-18T09:20:00Z",
            userId: 1,
            action: "approve_overtime",
            details: "Approved overtime request #1 for employee #4",
            ipAddress: "192.168.1.100"
        },
        {
            id: 3,
            timestamp: "2024-12-18T10:30:00Z",
            userId: 4,
            action: "clock_in",
            details: "Employee clocked in",
            ipAddress: "192.168.1.105"
        },
        {
            id: 4,
            timestamp: "2024-12-18T11:45:00Z",
            userId: 1,
            action: "update_employee",
            details: "Updated hourly rate for employee #6",
            ipAddress: "192.168.1.100"
        }
    ]
};

// Helper functions for data manipulation
const mockDataHelpers = {
    // Get employee by ID
    getEmployeeById: (id) => {
        const user = mockData.users.find(u => u.employee.id === id);
        return user ? user.employee : null;
    },

    // Get user by username
    getUserByUsername: (username) => {
        return mockData.users.find(u => u.username === username);
    },

    // Get attendance records for employee
    getAttendanceByEmployee: (employeeId, startDate = null, endDate = null) => {
        let records = mockData.attendanceRecords.filter(r => r.employeeId === employeeId);
        
        if (startDate) {
            records = records.filter(r => r.date >= startDate);
        }
        if (endDate) {
            records = records.filter(r => r.date <= endDate);
        }
        
        return records.sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    // Get payroll history for employee
    getPayrollByEmployee: (employeeId, limit = null) => {
        let records = mockData.payrollHistory.filter(p => p.employeeId === employeeId);
        records = records.sort((a, b) => new Date(b.payPeriodEnd) - new Date(a.payPeriodEnd));
        
        if (limit) {
            records = records.slice(0, limit);
        }
        
        return records;
    },

    // Get overtime requests for employee
    getOvertimeRequestsByEmployee: (employeeId, status = null) => {
        let requests = mockData.overtimeRequests.filter(r => r.employeeId === employeeId);
        
        if (status) {
            requests = requests.filter(r => r.status === status);
        }
        
        return requests.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));
    },

    // Get calendar notes for date range
    getCalendarNotes: (startDate = null, endDate = null) => {
        let notes = mockData.calendarNotes;
        
        if (startDate) {
            notes = notes.filter(n => n.date >= startDate);
        }
        if (endDate) {
            notes = notes.filter(n => n.date <= endDate);
        }
        
        return notes.sort((a, b) => new Date(a.date) - new Date(b.date));
    },

    // Calculate next payday
    getNextPayday: () => {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday, 5 = Friday
        const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
        const nextPayday = new Date(today);
        nextPayday.setDate(today.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
        return nextPayday.toISOString().split('T')[0];
    },

    // Generate attendance summary for dashboard
    getAttendanceSummary: () => {
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = mockData.attendanceRecords.filter(r => r.date === today);
        
        return {
            totalEmployees: mockData.users.filter(u => u.role === 'employee').length,
            present: todayRecords.filter(r => r.status === 'present' || r.status === 'tardy' || r.status === 'overtime').length,
            absent: todayRecords.filter(r => r.status === 'absent').length,
            tardy: todayRecords.filter(r => r.status === 'tardy').length,
            overtime: todayRecords.filter(r => r.overtimeHours > 0).length
        };
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { mockData, mockDataHelpers };
} else {
    window.mockData = mockData;
    window.mockDataHelpers = mockDataHelpers;
}