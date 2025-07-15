const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { auth, requireAdmin, requireManagerOrAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// Sync data from frontend - when UnifiedEmployeeManager sends data to backend
router.post('/sync', auth, async (req, res) => {
    try {
        const { employees, attendanceRecords } = req.body;

        if (!employees || !attendanceRecords) {
            return res.status(400).json({
                success: false,
                message: 'Missing employees or attendance data'
            });
        }

        console.log('🔄 Syncing data from frontend:', {
            employees: employees.length,
            attendance: attendanceRecords.length
        });

        // Start transaction
        await db.execute('START TRANSACTION');

        try {
            // Clear existing data (in correct order)
            await db.execute('DELETE FROM attendance_records');
            await db.execute('DELETE FROM employees');

            // Insert employees
            const employeeQuery = `
                INSERT INTO employees (
                    id, employee_id, username, password, role, full_name,
                    first_name, last_name, email, phone, department, position,
                    date_hired, status, wage, overtime_rate, avatar
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    username = VALUES(username),
                    role = VALUES(role),
                    full_name = VALUES(full_name),
                    first_name = VALUES(first_name),
                    last_name = VALUES(last_name),
                    email = VALUES(email),
                    phone = VALUES(phone),
                    department = VALUES(department),
                    position = VALUES(position),
                    date_hired = VALUES(date_hired),
                    status = VALUES(status),
                    wage = VALUES(wage),
                    overtime_rate = VALUES(overtime_rate),
                    avatar = VALUES(avatar),
                    updated_at = CURRENT_TIMESTAMP
            `;

            for (const emp of employees) {
                // Extract name parts
                const nameParts = emp.name ? emp.name.split(' ') : 
                                emp.fullName ? emp.fullName.split(' ') : ['', ''];
                const firstName = emp.firstName || nameParts[0] || '';
                const lastName = emp.lastName || nameParts.slice(1).join(' ') || '';

                // Hash password if provided and not already hashed
                let hashedPassword = emp.password;
                if (emp.password && !emp.password.startsWith('$2')) {
                    hashedPassword = await bcrypt.hash(emp.password, 12);
                }

                await db.execute(employeeQuery, [
                    emp.id,
                    emp.employeeId || emp.employeeCode,
                    emp.username,
                    hashedPassword,
                    emp.role || 'employee',
                    emp.name || emp.fullName,
                    firstName,
                    lastName,
                    emp.email,
                    emp.phone,
                    emp.department,
                    emp.position,
                    emp.dateHired || emp.hireDate,
                    emp.status || 'active',
                    emp.wage || emp.hourlyRate || 15.00,
                    emp.overtimeRate || 1.5,
                    emp.avatar
                ]);
            }

            // Insert attendance records
            const attendanceQuery = `
                INSERT INTO attendance_records (
                    id, employee_id, date, time_in, time_out,
                    hours_worked, overtime_hours, status, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    time_in = VALUES(time_in),
                    time_out = VALUES(time_out),
                    hours_worked = VALUES(hours_worked),
                    overtime_hours = VALUES(overtime_hours),
                    status = VALUES(status),
                    notes = VALUES(notes),
                    updated_at = CURRENT_TIMESTAMP
            `;

            for (const record of attendanceRecords) {
                await db.execute(attendanceQuery, [
                    record.id,
                    record.employeeId,
                    record.date,
                    record.timeIn || record.clockIn,
                    record.timeOut || record.clockOut,
                    record.hours || record.hoursWorked || 0,
                    record.overtimeHours || 0,
                    record.status || 'present',
                    record.notes
                ]);
            }

            // Commit transaction
            await db.execute('COMMIT');

            console.log('✅ Data sync completed successfully');

            res.json({
                success: true,
                message: 'Data synchronized successfully',
                synced: {
                    employees: employees.length,
                    attendance: attendanceRecords.length
                }
            });

        } catch (error) {
            // Rollback on error
            await db.execute('ROLLBACK');
            throw error;
        }

    } catch (error) {
        console.error('❌ Error syncing data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to sync data: ' + error.message
        });
    }
});

// Get all data for frontend - when UnifiedEmployeeManager requests data from backend
router.get('/data', auth, async (req, res) => {
    try {
        console.log('📥 Frontend requesting all data from backend');

        // Get all employees from user_accounts table (which is what actually exists)
        const [employees] = await db.execute(`
            SELECT 
                id,
                employee_id as employeeId,
                employee_id as employeeCode,
                full_name as name,
                full_name as fullName,
                first_name as firstName,
                last_name as lastName,
                email,
                department,
                position,
                hire_date as dateHired,
                hire_date as hireDate,
                employee_status as status,
                created_at as createdAt,
                updated_at as updatedAt
            FROM user_accounts
            WHERE employee_status = 'active'
            ORDER BY full_name
        `);

        // Get all attendance records
        const [attendanceRecords] = await db.execute(`
            SELECT 
                ar.id,
                ar.employee_id as employeeId,
                ar.date,
                ar.time_in as timeIn,
                ar.time_in as clockIn,
                ar.time_out as timeOut,
                ar.time_out as clockOut,
                ar.hours_worked as hours,
                ar.hours_worked as hoursWorked,
                ar.overtime_hours as overtimeHours,
                ar.status,
                ar.notes,
                ar.location,
                ar.created_at as createdAt,
                ar.updated_at as updatedAt,
                e.full_name as employeeName,
                e.employee_id as employeeCode,
                e.department
            FROM attendance_records ar
            LEFT JOIN user_accounts e ON ar.employee_id = e.employee_id
            ORDER BY ar.date DESC, ar.created_at DESC
        `);

        console.log('📤 Sending data to frontend:', {
            employees: employees.length,
            attendance: attendanceRecords.length
        });

        res.json({
            success: true,
            data: {
                employees,
                attendanceRecords
            }
        });

    } catch (error) {
        console.error('❌ Error fetching data for frontend:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch data: ' + error.message
        });
    }
});

// Save/update employee
router.post('/employees', auth, requireManagerOrAdmin, async (req, res) => {
    try {
        const employeeData = req.body;
        
        // Extract name parts
        const nameParts = employeeData.name ? employeeData.name.split(' ') : 
                         employeeData.fullName ? employeeData.fullName.split(' ') : ['', ''];
        const firstName = employeeData.firstName || nameParts[0] || '';
        const lastName = employeeData.lastName || nameParts.slice(1).join(' ') || '';

        // Hash password if provided and not already hashed
        let hashedPassword = employeeData.password;
        if (employeeData.password && !employeeData.password.startsWith('$2')) {
            hashedPassword = await bcrypt.hash(employeeData.password, 12);
        }

        if (employeeData.id) {
            // Update existing employee
            await db.execute(`
                UPDATE employees SET
                    employee_id = ?,
                    username = ?,
                    password = COALESCE(?, password),
                    role = ?,
                    full_name = ?,
                    first_name = ?,
                    last_name = ?,
                    email = ?,
                    phone = ?,
                    department = ?,
                    position = ?,
                    date_hired = ?,
                    status = ?,
                    wage = ?,
                    overtime_rate = ?,
                    avatar = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [
                employeeData.employeeId || employeeData.employeeCode,
                employeeData.username,
                hashedPassword,
                employeeData.role || 'employee',
                employeeData.name || employeeData.fullName,
                firstName,
                lastName,
                employeeData.email,
                employeeData.phone,
                employeeData.department,
                employeeData.position,
                employeeData.dateHired || employeeData.hireDate,
                employeeData.status || 'active',
                employeeData.wage || employeeData.hourlyRate || 15.00,
                employeeData.overtimeRate || 1.5,
                employeeData.avatar,
                employeeData.id
            ]);
        } else {
            // Create new employee
            const [result] = await db.execute(`
                INSERT INTO employees (
                    employee_id, username, password, role, full_name,
                    first_name, last_name, email, phone, department, position,
                    date_hired, status, wage, overtime_rate, avatar
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                employeeData.employeeId || employeeData.employeeCode,
                employeeData.username,
                hashedPassword,
                employeeData.role || 'employee',
                employeeData.name || employeeData.fullName,
                firstName,
                lastName,
                employeeData.email,
                employeeData.phone,
                employeeData.department,
                employeeData.position,
                employeeData.dateHired || employeeData.hireDate,
                employeeData.status || 'active',
                employeeData.wage || employeeData.hourlyRate || 15.00,
                employeeData.overtimeRate || 1.5,
                employeeData.avatar
            ]);

            employeeData.id = result.insertId;
        }

        res.json({
            success: true,
            message: 'Employee saved successfully',
            employee: employeeData
        });

    } catch (error) {
        console.error('Error saving employee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save employee: ' + error.message
        });
    }
});

// Save/update attendance record
router.post('/attendance', auth, async (req, res) => {
    try {
        const recordData = req.body;

        if (recordData.id) {
            // Update existing record
            await db.execute(`
                UPDATE attendance_records SET
                    employee_id = ?,
                    date = ?,
                    time_in = ?,
                    time_out = ?,
                    hours_worked = ?,
                    overtime_hours = ?,
                    status = ?,
                    notes = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [
                recordData.employeeId,
                recordData.date,
                recordData.timeIn || recordData.clockIn,
                recordData.timeOut || recordData.clockOut,
                recordData.hours || recordData.hoursWorked || 0,
                recordData.overtimeHours || 0,
                recordData.status || 'present',
                recordData.notes,
                recordData.id
            ]);
        } else {
            // Create new record
            const [result] = await db.execute(`
                INSERT INTO attendance_records (
                    employee_id, date, time_in, time_out,
                    hours_worked, overtime_hours, status, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                recordData.employeeId,
                recordData.date,
                recordData.timeIn || recordData.clockIn,
                recordData.timeOut || recordData.clockOut,
                recordData.hours || recordData.hoursWorked || 0,
                recordData.overtimeHours || 0,
                recordData.status || 'present',
                recordData.notes
            ]);

            recordData.id = result.insertId;
        }

        res.json({
            success: true,
            message: 'Attendance record saved successfully',
            record: recordData
        });

    } catch (error) {
        console.error('Error saving attendance record:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save attendance record: ' + error.message
        });
    }
});

// Delete employee (cascades to attendance records)
router.delete('/employees/:id', auth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Get employee info before deletion
        const [employee] = await db.execute(
            'SELECT employee_id, full_name FROM employees WHERE id = ?',
            [id]
        );

        if (employee.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // Count attendance records that will be deleted
        const [attendanceCount] = await db.execute(
            'SELECT COUNT(*) as count FROM attendance_records WHERE employee_id = ?',
            [employee[0].employee_id]
        );

        // Delete employee (cascades to attendance records)
        await db.execute('DELETE FROM employees WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Employee deleted successfully',
            deletedEmployee: employee[0],
            removedAttendanceRecords: attendanceCount[0].count
        });

    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete employee: ' + error.message
        });
    }
});

module.exports = router;
