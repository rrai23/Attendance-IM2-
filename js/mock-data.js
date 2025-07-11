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
            status: "active",
            employee: {
                id: 1,
                name: "John Administrator",
                firstName: "John",
                lastName: "Administrator",
                email: "admin@bricksconstruction.com",
                phone: "(555) 123-4567",
                position: "System Administrator",
                department: "IT",
                manager: null,
                hireDate: "2023-01-15",
                hourlyRate: 45.00,
                salary: 93600, // 45 * 40 * 52
                role: "admin",
                status: "active",
                schedule: {
                    monday: { active: true, start: "08:00", end: "17:00" },
                    tuesday: { active: true, start: "08:00", end: "17:00" },
                    wednesday: { active: true, start: "08:00", end: "17:00" },
                    thursday: { active: true, start: "08:00", end: "17:00" },
                    friday: { active: true, start: "08:00", end: "17:00" }
                }
            }
        },
        {
            id: 2,
            username: "m.garcia",
            password: "password123",
            role: "manager",
            status: "active",
            employee: {
                id: 2,
                name: "Maria Garcia",
                firstName: "Maria",
                lastName: "Garcia",
                email: "maria.garcia@bricksconstruction.com",
                phone: "(555) 234-5678",
                position: "Operations Manager",
                department: "Operations",
                manager: "John Administrator",
                hireDate: "2023-02-20",
                hourlyRate: 38.50,
                salary: 80080, // 38.50 * 40 * 52
                role: "manager",
                status: "active",
                schedule: {
                    monday: { active: true, start: "07:30", end: "16:30" },
                    tuesday: { active: true, start: "07:30", end: "16:30" },
                    wednesday: { active: true, start: "07:30", end: "16:30" },
                    thursday: { active: true, start: "07:30", end: "16:30" },
                    friday: { active: true, start: "07:30", end: "16:30" }
                }
            }
        },
        {
            id: 3,
            username: "d.chen",
            password: "password123",
            role: "employee",
            status: "active",
            employee: {
                id: 3,
                name: "David Chen",
                firstName: "David",
                lastName: "Chen",
                email: "david.chen@bricksconstruction.com",
                phone: "(555) 345-6789",
                position: "Senior Construction Worker",
                department: "Construction",
                manager: "Maria Garcia",
                hireDate: "2023-04-10",
                hourlyRate: 28.75,
                salary: 59800, // 28.75 * 40 * 52
                role: "employee",
                status: "active",
                schedule: {
                    monday: { active: true, start: "08:00", end: "17:00" },
                    tuesday: { active: true, start: "08:00", end: "17:00" },
                    wednesday: { active: true, start: "08:00", end: "17:00" },
                    thursday: { active: true, start: "08:00", end: "17:00" },
                    friday: { active: true, start: "08:00", end: "17:00" }
                }
            }
        },
        {
            id: 4,
            username: "s.patel",
            password: "password123",
            role: "employee",
            status: "active",
            employee: {
                id: 4,
                name: "Samantha Patel",
                firstName: "Samantha",
                lastName: "Patel",
                email: "samantha.patel@bricksconstruction.com",
                phone: "(555) 456-7890",
                position: "Quality Control Specialist",
                department: "Quality Assurance",
                manager: "Maria Garcia",
                hireDate: "2023-06-15",
                hourlyRate: 32.00,
                salary: 66560, // 32.00 * 40 * 52
                role: "employee",
                status: "active",
                schedule: {
                    monday: { active: true, start: "08:30", end: "17:30" },
                    tuesday: { active: true, start: "08:30", end: "17:30" },
                    wednesday: { active: true, start: "08:30", end: "17:30" },
                    thursday: { active: true, start: "08:30", end: "17:30" },
                    friday: { active: true, start: "08:30", end: "17:30" }
                }
            }
        },
        {
            id: 5,
            username: "r.johnson",
            password: "password123",
            role: "employee",
            status: "active",
            employee: {
                id: 5,
                name: "Robert Johnson",
                firstName: "Robert",
                lastName: "Johnson",
                email: "robert.johnson@bricksconstruction.com",
                phone: "(555) 567-8901",
                position: "Equipment Operator",
                department: "Operations",
                manager: "Maria Garcia",
                hireDate: "2023-08-01",
                hourlyRate: 26.50,
                salary: 55120, // 26.50 * 40 * 52
                role: "employee",
                status: "active",
                schedule: {
                    monday: { active: true, start: "07:00", end: "16:00" },
                    tuesday: { active: true, start: "07:00", end: "16:00" },
                    wednesday: { active: true, start: "07:00", end: "16:00" },
                    thursday: { active: true, start: "07:00", end: "16:00" },
                    friday: { active: true, start: "07:00", end: "16:00" }
                }
            }
        },
        {
            id: 6,
            username: "l.martinez",
            password: "password123",
            role: "employee",
            status: "active",
            employee: {
                id: 6,
                name: "Lisa Martinez",
                firstName: "Lisa",
                lastName: "Martinez",
                email: "lisa.martinez@bricksconstruction.com",
                phone: "(555) 678-9012",
                position: "Safety Inspector",
                department: "Safety",
                manager: "Maria Garcia",
                hireDate: "2023-09-20",
                hourlyRate: 30.25,
                salary: 62920, // 30.25 * 40 * 52
                role: "employee",
                status: "active",
                schedule: {
                    monday: { active: true, start: "08:00", end: "17:00" },
                    tuesday: { active: true, start: "08:00", end: "17:00" },
                    wednesday: { active: true, start: "08:00", end: "17:00" },
                    thursday: { active: true, start: "08:00", end: "17:00" },
                    friday: { active: true, start: "08:00", end: "17:00" }
                }
            }
        }
    ],

    // Attendance records for current month (July 2025)
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
        },
        // July 12, 2025 (Today - Current attendance)
        {
            id: 1,
            employeeId: 1,
            date: "2025-07-12",
            timeIn: "08:00",
            timeOut: null, // Still working
            breakStart: "12:00",
            breakEnd: "13:00",
            status: "present",
            hoursWorked: 0, // Will calculate at end of day
            overtimeHours: 0,
            notes: "System administrator duties"
        },
        {
            id: 2,
            employeeId: 2,
            date: "2025-07-12",
            timeIn: "07:30",
            timeOut: null, // Still working
            breakStart: "12:00",
            breakEnd: "13:00",
            status: "present",
            hoursWorked: 0,
            overtimeHours: 0,
            notes: "Operations management"
        },
        {
            id: 3,
            employeeId: 3,
            date: "2025-07-12",
            timeIn: "08:00",
            timeOut: null,
            breakStart: "12:00",
            breakEnd: "13:00",
            status: "present",
            hoursWorked: 0,
            overtimeHours: 0,
            notes: "Construction project work"
        },
        {
            id: 4,
            employeeId: 4,
            date: "2025-07-12",
            timeIn: "08:30",
            timeOut: null,
            breakStart: "12:30",
            breakEnd: "13:30",
            status: "present",
            hoursWorked: 0,
            overtimeHours: 0,
            notes: "Quality control inspections"
        },
        {
            id: 5,
            employeeId: 5,
            date: "2025-07-12",
            timeIn: "07:00",
            timeOut: null,
            breakStart: "12:00",
            breakEnd: "13:00",
            status: "present",
            hoursWorked: 0,
            overtimeHours: 0,
            notes: "Equipment operation"
        },
        {
            id: 6,
            employeeId: 6,
            date: "2025-07-12",
            timeIn: "08:00",
            timeOut: null,
            breakStart: "12:00",
            breakEnd: "13:00",
            status: "present",
            hoursWorked: 0,
            overtimeHours: 0,
            notes: "Safety inspections"
        },

        // July 11, 2025 (Yesterday)
        {
            id: 7,
            employeeId: 1,
            date: "2025-07-11",
            timeIn: "08:00",
            timeOut: "17:00",
            breakStart: "12:00",
            breakEnd: "13:00",
            status: "present",
            hoursWorked: 8.0,
            overtimeHours: 0,
            notes: "Regular shift"
        },
        {
            id: 8,
            employeeId: 2,
            date: "2025-07-11",
            timeIn: "07:30",
            timeOut: "16:30",
            breakStart: "12:00",
            breakEnd: "13:00",
            status: "present",
            hoursWorked: 8.0,
            overtimeHours: 0,
            notes: "Management duties"
        },
        {
            id: 9,
            employeeId: 3,
            date: "2025-07-11",
            timeIn: "08:00",
            timeOut: "18:00",
            breakStart: "12:00",
            breakEnd: "13:00",
            status: "present",
            hoursWorked: 9.0,
            overtimeHours: 1.0,
            notes: "Project deadline work"
        },
        {
            id: 10,
            employeeId: 4,
            date: "2025-07-11",
            timeIn: "08:30",
            timeOut: "17:30",
            breakStart: "12:30",
            breakEnd: "13:30",
            status: "present",
            hoursWorked: 8.0,
            overtimeHours: 0,
            notes: "Quality inspections"
        },
        {
            id: 11,
            employeeId: 5,
            date: "2025-07-11",
            timeIn: "07:00",
            timeOut: "16:00",
            breakStart: "12:00",
            breakEnd: "13:00",
            status: "present",
            hoursWorked: 8.0,
            overtimeHours: 0,
            notes: "Equipment maintenance"
        },
        {
            id: 12,
            employeeId: 6,
            date: "2025-07-11",
            timeIn: null,
            timeOut: null,
            breakStart: null,
            breakEnd: null,
            status: "absent",
            hoursWorked: 0,
            overtimeHours: 0,
            notes: "Sick leave"
        },

        // July 10, 2025
        {
            id: 13,
            employeeId: 1,
            date: "2025-07-10",
            timeIn: "08:00",
            timeOut: "17:00",
            breakStart: "12:00",
            breakEnd: "13:00",
            status: "present",
            hoursWorked: 8.0,
            overtimeHours: 0,
            notes: "System maintenance"
        },
        {
            id: 14,
            employeeId: 2,
            date: "2025-07-10",
            timeIn: "07:30",
            timeOut: "16:30",
            breakStart: "12:00",
            breakEnd: "13:00",
            status: "present",
            hoursWorked: 8.0,
            overtimeHours: 0,
            notes: "Operations oversight"
        },
        {
            id: 15,
            employeeId: 3,
            date: "2025-07-10",
            timeIn: "08:15",
            timeOut: "17:15",
            breakStart: "12:00",
            breakEnd: "13:00",
            status: "late",
            hoursWorked: 8.0,
            overtimeHours: 0,
            notes: "Traffic delay"
        },
        {
            id: 16,
            employeeId: 4,
            date: "2025-07-10",
            timeIn: "08:30",
            timeOut: "17:30",
            breakStart: "12:30",
            breakEnd: "13:30",
            status: "present",
            hoursWorked: 8.0,
            overtimeHours: 0,
            notes: "Regular inspections"
        },
        {
            id: 17,
            employeeId: 5,
            date: "2025-07-10",
            timeIn: "07:00",
            timeOut: "17:30",
            breakStart: "12:00",
            breakEnd: "13:00",
            status: "present",
            hoursWorked: 9.5,
            overtimeHours: 1.5,
            notes: "Equipment repairs overtime"
        },
        {
            id: 18,
            employeeId: 6,
            date: "2025-07-10",
            timeIn: "08:00",
            timeOut: "17:00",
            breakStart: "12:00",
            breakEnd: "13:00",
            status: "present",
            hoursWorked: 8.0,
            overtimeHours: 0,
            notes: "Site safety checks"
        },

        // July 9, 2025
        {
            id: 19,
            employeeId: 1,
            date: "2025-07-09",
            timeIn: "08:00",
            timeOut: "17:00",
            breakStart: "12:00",
            breakEnd: "13:00",
            status: "present",
            hoursWorked: 8.0,
            overtimeHours: 0,
            notes: "Regular duties"
        },
        {
            id: 20,
            employeeId: 2,
            date: "2025-07-09",
            timeIn: "07:30",
            timeOut: "18:00",
            breakStart: "12:00",
            breakEnd: "13:00",
            status: "present",
            hoursWorked: 9.5,
            overtimeHours: 1.5,
            notes: "Monthly report preparation"
        },
        {
            id: 21,
            employeeId: 3,
            date: "2025-07-09",
            timeIn: "08:00",
            timeOut: "17:00",
            breakStart: "12:00",
            breakEnd: "13:00",
            status: "present",
            hoursWorked: 8.0,
            overtimeHours: 0,
            notes: "Construction work"
        },
        {
            id: 22,
            employeeId: 4,
            date: "2025-07-09",
            timeIn: "08:30",
            timeOut: "17:30",
            breakStart: "12:30",
            breakEnd: "13:30",
            status: "present",
            hoursWorked: 8.0,
            overtimeHours: 0,
            notes: "Quality control"
        },
        {
            id: 23,
            employeeId: 5,
            date: "2025-07-09",
            timeIn: "07:00",
            timeOut: "16:00",
            breakStart: "12:00",
            breakEnd: "13:00",
            status: "present",
            hoursWorked: 8.0,
            overtimeHours: 0,
            notes: "Regular operations"
        },
        {
            id: 24,
            employeeId: 6,
            date: "2025-07-09",
            timeIn: "08:05",
            timeOut: "17:05",
            breakStart: "12:00",
            breakEnd: "13:00",
            status: "late",
            hoursWorked: 8.0,
            overtimeHours: 0,
            notes: "Minor delay"
        }
    ],

    // Payroll history for the past 3 months
    payrollHistory: [
        // Week ending July 7, 2025
        {
            id: 1,
            employeeId: 1,
            payPeriodStart: "2025-07-01",
            payPeriodEnd: "2025-07-07",
            regularHours: 40,
            overtimeHours: 0,
            regularPay: 1800.00, // 45.00 * 40
            overtimePay: 0,
            grossPay: 1800.00,
            taxes: 360.00,
            deductions: 50.00,
            netPay: 1390.00,
            payDate: "2025-07-11",
            status: "paid"
        },
        {
            id: 2,
            employeeId: 2,
            payPeriodStart: "2025-07-01",
            payPeriodEnd: "2025-07-07",
            regularHours: 40,
            overtimeHours: 2.0,
            regularPay: 1540.00, // 38.50 * 40
            overtimePay: 115.50, // 38.50 * 1.5 * 2
            grossPay: 1655.50,
            taxes: 331.10,
            deductions: 45.00,
            netPay: 1279.40,
            payDate: "2025-07-11",
            status: "paid"
        },
        {
            id: 3,
            employeeId: 3,
            payPeriodStart: "2025-07-01",
            payPeriodEnd: "2025-07-07",
            regularHours: 40,
            overtimeHours: 1.5,
            regularPay: 1150.00, // 28.75 * 40
            overtimePay: 64.69, // 28.75 * 1.5 * 1.5
            grossPay: 1214.69,
            taxes: 242.94,
            deductions: 40.00,
            netPay: 931.75,
            payDate: "2025-07-11",
            status: "paid"
        },
        {
            id: 4,
            employeeId: 4,
            payPeriodStart: "2025-07-01",
            payPeriodEnd: "2025-07-07",
            regularHours: 40,
            overtimeHours: 0,
            regularPay: 1280.00, // 32.00 * 40
            overtimePay: 0,
            grossPay: 1280.00,
            taxes: 256.00,
            deductions: 42.00,
            netPay: 982.00,
            payDate: "2025-07-11",
            status: "paid"
        },
        {
            id: 5,
            employeeId: 5,
            payPeriodStart: "2025-07-01",
            payPeriodEnd: "2025-07-07",
            regularHours: 40,
            overtimeHours: 3.0,
            regularPay: 1060.00, // 26.50 * 40
            overtimePay: 119.25, // 26.50 * 1.5 * 3
            grossPay: 1179.25,
            taxes: 235.85,
            deductions: 38.00,
            netPay: 905.40,
            payDate: "2025-07-11",
            status: "paid"
        },
        {
            id: 6,
            employeeId: 6,
            payPeriodStart: "2025-07-01",
            payPeriodEnd: "2025-07-07",
            regularHours: 40,
            overtimeHours: 0,
            regularPay: 1210.00, // 30.25 * 40
            overtimePay: 0,
            grossPay: 1210.00,
            taxes: 242.00,
            deductions: 40.00,
            netPay: 928.00,
            payDate: "2025-07-11",
            status: "paid"
        }
    ],

    // Overtime requests
    overtimeRequests: [
        {
            id: 1,
            employeeId: 3,
            requestDate: "2025-07-10",
            workDate: "2025-07-11",
            requestedHours: 1.0,
            reason: "Complete project milestone deadline",
            status: "approved",
            approvedBy: 2,
            approvedDate: "2025-07-10",
            actualHours: 1.0,
            notes: "Project completed successfully"
        },
        {
            id: 2,
            employeeId: 5,
            requestDate: "2025-07-09",
            workDate: "2025-07-10",
            requestedHours: 1.5,
            reason: "Equipment maintenance and repairs",
            status: "approved",
            approvedBy: 2,
            approvedDate: "2025-07-09",
            actualHours: 1.5,
            notes: "Equipment fully operational"
        },
        {
            id: 3,
            employeeId: 2,
            requestDate: "2025-07-08",
            workDate: "2025-07-09",
            requestedHours: 1.5,
            reason: "Monthly report preparation",
            status: "approved",
            approvedBy: 1,
            approvedDate: "2025-07-08",
            actualHours: 1.5,
            notes: "Reports submitted on time"
        },
        {
            id: 4,
            employeeId: 4,
            requestDate: "2025-07-12",
            workDate: "2025-07-15",
            requestedHours: 2.0,
            reason: "Special quality inspection for new client",
            status: "pending",
            approvedBy: null,
            approvedDate: null,
            actualHours: null,
            notes: "Awaiting manager approval"
        },
        {
            id: 5,
            employeeId: 6,
            requestDate: "2025-07-11",
            workDate: "2025-07-13",
            requestedHours: 1.0,
            reason: "Additional safety training session",
            status: "pending",
            approvedBy: null,
            approvedDate: null,
            actualHours: null,
            notes: "Training materials being prepared"
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
            presentToday: 6, // All employees present today (July 12, 2025)
            absentToday: 0,
            tardyToday: 0,
            overtimeToday: 0,
            averageHoursPerDay: 8.0,
            attendanceRate: 95.8, // 23 present out of 24 employee-days this week
            tardyRate: 8.3, // 2 late instances out of 24
            overtimeRate: 12.5, // 3 overtime instances out of 24
            today: {
                total: 6,
                present: 6,
                late: 0,
                absent: 0,
                attendanceRate: 100.0
            },
            weekly: {
                present: 22, // 4 days * 6 employees - 2 absences
                late: 2,
                absent: 2, // 1 absence + 1 sick day
                onLeave: 0,
                attendanceRate: [95, 96, 92, 100, 91] // Mon-Fri this week
            },
            monthly: {
                present: 118, // Based on current data (6 employees * varying attendance)
                late: 4,
                absent: 2,
                onLeave: 0,
                attendanceRate: [98, 96, 92, 100, 91, 95, 88, 92, 96, 100, 95, 100] // Daily rates for July
            },
            departmentStats: {
                "IT": { employees: 1, presentToday: 1, attendanceRate: 100 },
                "Operations": { employees: 2, presentToday: 2, attendanceRate: 95.8 },
                "Construction": { employees: 1, presentToday: 1, attendanceRate: 91.7 },
                "Quality Assurance": { employees: 1, presentToday: 1, attendanceRate: 100 },
                "Safety": { employees: 1, presentToday: 1, attendanceRate: 95.8 }
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
                employeeId: 101,
                attendanceRate: 100,
                tardyRate: 0,
                overtimeHours: 8,
                averageHoursPerDay: 8.3
            },
            {
                employeeId: 102,
                attendanceRate: 95.8,
                tardyRate: 4.2,
                overtimeHours: 6,
                averageHoursPerDay: 8.1
            },
            {
                employeeId: 103,
                attendanceRate: 100,
                tardyRate: 0,
                overtimeHours: 10,
                averageHoursPerDay: 8.4
            },
            {
                employeeId: 104,
                attendanceRate: 95.8,
                tardyRate: 4.2,
                overtimeHours: 4,
                averageHoursPerDay: 8.0
            },
            {
                employeeId: 105,
                attendanceRate: 91.7,
                tardyRate: 8.3,
                overtimeHours: 12,
                averageHoursPerDay: 8.5
            },
            {
                employeeId: 106,
                attendanceRate: 95.8,
                tardyRate: 4.2,
                overtimeHours: 6,
                averageHoursPerDay: 8.2
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