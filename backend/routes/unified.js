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

        // Update/Insert employees individually (no destructive delete)
        for (const emp of employees) {
            try {
                // Check if employee exists in employees table
                const existing = await db.execute(
                    'SELECT id FROM employees WHERE id = ?',
                    [emp.id]
                );

                if (existing.length > 0) {
                    // Update existing employee in employees table
                    await db.execute(`
                        UPDATE employees SET
                            full_name = ?,
                            first_name = ?,
                            last_name = ?,
                            email = ?,
                            department = ?,
                            position = ?,
                            hire_date = ?,
                            status = ?,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `, [
                        emp.name || emp.fullName,
                        emp.firstName || emp.name?.split(' ')[0] || '',
                        emp.lastName || emp.name?.split(' ').slice(1).join(' ') || '',
                        emp.email,
                        emp.department,
                        emp.position,
                        emp.dateHired || emp.hireDate,
                        emp.status || 'active',
                        emp.id
                    ]);
                    
                    // Also update user_accounts if needed
                    await db.execute(`
                        UPDATE user_accounts SET
                            username = ?,
                            role = ?,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `, [
                        emp.username || emp.email || emp.name,
                        emp.role || 'employee',
                        emp.id
                    ]);
                    
                } else {
                    // Insert new employee in employees table
                    await db.execute(`
                        INSERT INTO employees (
                            id, employee_id, full_name, first_name, last_name, 
                            email, department, position, hire_date, status, 
                            created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    `, [
                        emp.id,
                        emp.employeeId || emp.employeeCode || emp.id,
                        emp.name || emp.fullName,
                        emp.firstName || emp.name?.split(' ')[0] || '',
                        emp.lastName || emp.name?.split(' ').slice(1).join(' ') || '',
                        emp.email,
                        emp.department,
                        emp.position,
                        emp.dateHired || emp.hireDate,
                        emp.status || 'active'
                    ]);
                    
                    // Also insert into user_accounts
                    await db.execute(`
                        INSERT INTO user_accounts (
                            id, employee_id, username, password_hash, role, 
                            is_active, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    `, [
                        emp.id,
                        emp.employeeId || emp.employeeCode || emp.id,
                        emp.username || emp.email || emp.name,
                        emp.password ? await bcrypt.hash(emp.password, 12) : null,
                        emp.role || 'employee',
                        emp.status === 'active' ? 1 : 0
                    ]);
                }
            } catch (empError) {
                console.error(`Error updating employee ${emp.id}:`, empError.message);
                // Continue with other employees instead of failing completely
            }
        }

        // Update/Insert attendance records individually (no destructive delete)
        for (const record of attendanceRecords) {
            try {
                // Check if record exists
                const existing = await db.execute(
                    'SELECT id FROM attendance_records WHERE id = ?',
                    [record.id]
                );

                if (existing.length > 0) {
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
                        record.employeeId,
                        record.date,
                        record.timeIn || record.clockIn,
                        record.timeOut || record.clockOut,
                        record.hours || record.hoursWorked || 0,
                        record.overtimeHours || 0,
                        record.status || 'present',
                        record.notes,
                        record.id
                    ]);
                } else {
                    // Insert new record
                    await db.execute(`
                        INSERT INTO attendance_records (
                            id, employee_id, date, time_in, time_out,
                            hours_worked, overtime_hours, status, notes, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    `, [
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
            } catch (recError) {
                console.error(`Error updating attendance record ${record.id}:`, recError.message);
                // Continue with other records instead of failing completely
            }
        }

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

        // Get all employees with full data by joining user_accounts and employees tables
        const employeeResult = await db.execute(`
            SELECT 
                e.id,
                ua.employee_id as employeeId,
                ua.employee_id as employeeCode,
                e.full_name as name,
                e.full_name as fullName,
                e.first_name as firstName,
                e.last_name as lastName,
                e.email,
                e.department,
                e.position,
                e.hire_date as dateHired,
                e.hire_date as hireDate,
                e.status,
                e.created_at as createdAt,
                e.updated_at as updatedAt,
                ua.username,
                ua.role
            FROM employees e
            JOIN user_accounts ua ON e.id = ua.id
            WHERE ua.is_active = 1 AND e.status = 'active'
            ORDER BY e.full_name
        `);

        // MySQL2 returns [rows, fields] - we want the rows
        const employees = Array.isArray(employeeResult) && Array.isArray(employeeResult[0]) 
            ? employeeResult[0] 
            : (Array.isArray(employeeResult) ? employeeResult : []);

        // Get all attendance records
        const attendanceResult = await db.execute(`
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
                e.username as employeeName,
                e.employee_id as employeeCode,
                e.role as department
            FROM attendance_records ar
            LEFT JOIN user_accounts e ON ar.employee_id = e.employee_id
            ORDER BY ar.date DESC, ar.created_at DESC
        `);

        const attendanceRecords = Array.isArray(attendanceResult) && Array.isArray(attendanceResult[0]) 
            ? attendanceResult[0] 
            : (Array.isArray(attendanceResult) ? attendanceResult : []);

        // Ensure we always have arrays
        const employeeArray = Array.isArray(employees) ? employees : [];
        const attendanceArray = Array.isArray(attendanceRecords) ? attendanceRecords : [];

        console.log('📤 Sending data to frontend:', {
            employees: employeeArray.length,
            attendance: attendanceArray.length
        });

        res.json({
            success: true,
            data: {
                employees: employeeArray,
                attendanceRecords: attendanceArray
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
                    hire_date = ?,
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
                    hire_date, status, wage, overtime_rate, avatar
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

// Settings management endpoints
router.get('/settings', auth, async (req, res) => {
    try {
        console.log('📋 Loading settings for user:', req.user.username);
        
        // In a real implementation, you would load settings from a dedicated settings table
        // For now, we'll use a simple default settings structure
        const defaultSettings = {
            companyName: 'Bricks Company',
            timezone: 'Asia/Manila',
            dateFormat: 'MM/DD/YYYY',
            timeFormat: '12',
            workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            workingHours: {
                start: '08:00',
                end: '17:00'
            },
            lunchBreak: {
                enabled: true,
                duration: 60
            },
            notifications: {
                email: true,
                sms: false,
                push: true
            },
            security: {
                passwordMinLength: 8,
                passwordRequireSymbols: true,
                sessionTimeout: 1440
            }
        };
        
        // Try to load actual settings from database (if settings table exists)
        try {
            const settingsResult = await db.execute(
                'SELECT * FROM system_settings WHERE id = 1'
            );
            
            if (settingsResult.length > 0) {
                const dbSettings = settingsResult[0];
                // Merge database settings with defaults
                const mergedSettings = {
                    ...defaultSettings,
                    companyName: dbSettings.company_name || defaultSettings.companyName,
                    timezone: dbSettings.timezone || defaultSettings.timezone,
                    dateFormat: dbSettings.date_format || defaultSettings.dateFormat,
                    timeFormat: dbSettings.time_format || defaultSettings.timeFormat
                };
                
                res.json({
                    success: true,
                    data: mergedSettings,
                    message: 'Settings loaded successfully'
                });
            } else {
                res.json({
                    success: true,
                    data: defaultSettings,
                    message: 'Default settings loaded'
                });
            }
        } catch (dbError) {
            console.log('Settings table not found, using defaults:', dbError.message);
            res.json({
                success: true,
                data: defaultSettings,
                message: 'Default settings loaded'
            });
        }
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load settings: ' + error.message
        });
    }
});

router.post('/settings', auth, async (req, res) => {
    try {
        console.log('💾 Saving settings for user:', req.user.username);
        console.log('Settings data:', req.body);
        
        const settings = req.body;
        
        // Try to save to database (if settings table exists)
        try {
            // First check if settings record exists
            const existingSettings = await db.execute(
                'SELECT id FROM system_settings WHERE id = 1'
            );
            
            if (existingSettings.length > 0) {
                // Update existing settings
                await db.execute(`
                    UPDATE system_settings SET
                        company_name = ?,
                        timezone = ?,
                        date_format = ?,
                        time_format = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = 1
                `, [
                    settings.companyName || 'Bricks Company',
                    settings.timezone || 'Asia/Manila',
                    settings.dateFormat || 'MM/DD/YYYY',
                    settings.timeFormat || '12'
                ]);
            } else {
                // Insert new settings
                await db.execute(`
                    INSERT INTO system_settings (
                        id, company_name, timezone, date_format, time_format,
                        created_at, updated_at
                    ) VALUES (1, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                `, [
                    settings.companyName || 'Bricks Company',
                    settings.timezone || 'Asia/Manila',
                    settings.dateFormat || 'MM/DD/YYYY',
                    settings.timeFormat || '12'
                ]);
            }
            
            res.json({
                success: true,
                message: 'Settings saved successfully'
            });
        } catch (dbError) {
            console.log('Settings table not found, cannot save to database:', dbError.message);
            // Even if we can't save to database, return success
            // The frontend will handle localStorage fallback
            res.json({
                success: true,
                message: 'Settings processed (localStorage fallback)'
            });
        }
    } catch (error) {
        console.error('Save settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save settings: ' + error.message
        });
    }
});

module.exports = router;
