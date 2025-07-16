const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { auth, requireManagerOrAdmin } = require('../middleware/auth');

// Get attendance records with filtering
router.get('/', auth, async (req, res) => {
    console.log('🔍 Attendance route called:', req.query);
    
    try {
        const {
            employee_id,
            date,
            start_date,
            end_date,
            status,
            department,
            page = 1,
            limit = 50
        } = req.query;

        let query = `
            SELECT 
                ar.id,
                ar.employee_id,
                ar.date,
                ar.time_in,
                ar.time_out,
                ar.break_start,
                ar.break_end,
                ar.total_hours as hours_worked,
                ar.overtime_hours,
                ar.status,
                ar.notes,
                ar.created_at,
                ar.updated_at,
                e.full_name as employee_name,
                e.employee_id as employee_code,
                e.department,
                e.position
            FROM attendance_records ar
            JOIN employees e ON ar.employee_id = e.employee_id
            WHERE 1=1
        `;
        const params = [];

        // Add filters
        if (employee_id) {
            query += ' AND ar.employee_id = ?';
            params.push(employee_id);
        }

        if (date) {
            query += ' AND ar.date = ?';
            params.push(date);
        }

        if (start_date && end_date) {
            query += ' AND ar.date BETWEEN ? AND ?';
            params.push(start_date, end_date);
        }

        if (status) {
            query += ' AND ar.status = ?';
            params.push(status);
        }

        if (department) {
            query += ' AND e.department = ?';
            params.push(department);
        }

        // Add sorting and pagination
        query += ' ORDER BY ar.date DESC, ar.created_at DESC';
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        console.log('🔍 Attendance query:', query);
        console.log('🔍 Attendance params:', params);
        
        const result = await db.execute(query, params);
        
        // Result is directly the array of records (not [rows, fields])
        const records = result;

        // Ensure records is an array (in case of empty result)
        const recordsArray = Array.isArray(records) ? records : [];

        // Transform to match frontend structure
        const transformedRecords = recordsArray.map(record => ({
            id: record.id,                              // attendance record ID
            employeeId: record.employee_id,             // employee_id from attendance_records
            employeeName: record.employee_name,         // full_name from employees
            employeeCode: record.employee_code,         // employee_id from employees (used as code)
            department: record.department,
            date: record.date,
            clockIn: record.time_in,
            clockOut: record.time_out,
            timeIn: record.time_in,
            timeOut: record.time_out,
            hours: record.total_hours,
            hoursWorked: record.total_hours,
            overtimeHours: record.overtime_hours,
            status: record.status,
            notes: record.notes,
            createdAt: record.created_at,
            updatedAt: record.updated_at
        }));

        res.json({
            success: true,
            data: transformedRecords,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: transformedRecords.length
            }
        });
    } catch (error) {
        console.error('Error fetching attendance records:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch attendance records'
        });
    }
});

// Clock in/out endpoint
router.post('/clock', auth, async (req, res) => {
    try {
        const { action, location, notes } = req.body; // action: 'in' or 'out'
        const employee_id = req.user.employee_id;

        if (!action || !['in', 'out'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Action must be "in" or "out"'
            });
        }

        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);

        // Get today's attendance record
        const [existingRecords] = await db.execute(`
            SELECT * FROM attendance_records 
            WHERE employee_id = ? AND date = ? 
            ORDER BY created_at DESC LIMIT 1
        `, [employee_id, today]);

        if (action === 'in') {
            // Check if already clocked in today
            if (existingRecords.length > 0 && existingRecords[0].time_in && !existingRecords[0].time_out) {
                return res.status(400).json({
                    success: false,
                    message: 'Already clocked in. Please clock out first.'
                });
            }

            // Create new attendance record
            await db.execute(`
                INSERT INTO attendance_records (
                    employee_id, date, time_in, clock_in, status, location, notes, created_at
                ) VALUES (?, ?, ?, ?, 'present', ?, ?, NOW())
            `, [employee_id, today, currentTime, now, location, notes]);

            res.json({
                success: true,
                message: 'Clocked in successfully',
                data: {
                    attendance_id: attendanceId,
                    action: 'in',
                    time: now,
                    location: location || null
                }
            });

        } else { // action === 'out'
            // Check if there's an active clock-in record
            if (existingRecords.length === 0 || !existingRecords[0].time_in || existingRecords[0].time_out) {
                return res.status(400).json({
                    success: false,
                    message: 'No active clock-in record found. Please clock in first.'
                });
            }

            const record = existingRecords[0];
            const timeIn = new Date(record.time_in);
            const timeOut = now;

            // Calculate hours worked
            const hoursWorked = ((timeOut - timeIn) / (1000 * 60 * 60)).toFixed(2);

            // Determine if late or early departure
            const standardWorkHours = 8;
            let status = 'present';
            
            // Check if late (assuming 9 AM start time)
            const standardStartTime = new Date(timeIn);
            standardStartTime.setHours(9, 0, 0, 0);
            
            if (timeIn > standardStartTime) {
                status = 'late';
            }

            // Update the record with clock out time
            await db.execute(`
                UPDATE attendance_records 
                SET time_out = ?, total_hours = ?, clock_out_location = ?, 
                    clock_out_notes = ?, status = ?, updated_at = NOW()
                WHERE id = ?
            `, [timeOut, parseFloat(hoursWorked), location, notes, status, record.id]);

            res.json({
                success: true,
                message: 'Clocked out successfully',
                data: {
                    id: record.id,
                    action: 'out',
                    time: timeOut,
                    hours_worked: parseFloat(hoursWorked),
                    location: location || null
                }
            });
        }

    } catch (error) {
        console.error('Clock in/out error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during clock operation'
        });
    }
});

// Get current status (clocked in/out)
router.get('/status', auth, async (req, res) => {
    try {
        const employee_id = req.user.employee_id;
        const today = new Date().toISOString().split('T')[0];

        const records = await db.execute(`
            SELECT * FROM attendance_records 
            WHERE employee_id = ? AND DATE(date) = ? 
            ORDER BY created_at DESC LIMIT 1
        `, [employee_id, today]);

        let status = 'clocked_out';
        let currentRecord = null;

        if (records.length > 0) {
            const record = records[0];
            if (record.time_in && !record.time_out) {
                status = 'clocked_in';
                currentRecord = record;
            }
        }

        res.json({
            success: true,
            data: {
                status,
                current_record: currentRecord,
                employee_id
            }
        });

    } catch (error) {
        console.error('Get attendance status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error getting attendance status'
        });
    }
});

// Manual attendance entry (admin/manager only)
router.post('/manual', requireManagerOrAdmin, async (req, res) => {
    try {
        const {
            employee_id,
            date,
            time_in,
            time_out,
            hours_worked,
            status = 'present',
            notes,
            reason
        } = req.body;

        if (!employee_id || !date || !time_in) {
            return res.status(400).json({
                success: false,
                message: 'employee_id, date, and time_in are required'
            });
        }

        // Check if employee exists
        const employees = await db.execute(
            'SELECT employee_id FROM employees WHERE employee_id = ? AND status = ?',
            [employee_id, 'active']
        );

        if (employees.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // Check if attendance record already exists for this date
        const existing = await db.execute(
            'SELECT id FROM attendance_records WHERE employee_id = ? AND DATE(date) = ?',
            [employee_id, date]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Attendance record already exists for this date'
            });
        }

        // Calculate hours worked if not provided
        let calculatedHours = hours_worked;
        if (!calculatedHours && time_in && time_out) {
            const timeInDate = new Date(`${date}T${time_in}`);
            const timeOutDate = new Date(`${date}T${time_out}`);
            calculatedHours = ((timeOutDate - timeInDate) / (1000 * 60 * 60)).toFixed(2);
        }

        await db.execute(`
            INSERT INTO attendance_records (
                employee_id, date, time_in, time_out,
                total_hours, status, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
            employee_id, date, 
            time_in || null,
            time_out || null,
            calculatedHours ? parseFloat(calculatedHours) : null,
            status, notes
        ]);

        // Get the created record with employee info
        const newRecord = await db.execute(`
            SELECT 
                ar.id,
                ar.employee_id,
                ar.date,
                ar.time_in,
                ar.time_out,
                ar.break_start,
                ar.break_end,
                ar.total_hours as hours_worked,
                ar.overtime_hours,
                ar.status,
                ar.notes,
                ar.created_at,
                ar.updated_at,
                e.full_name as employee_name,
                e.employee_id as employee_code,
                e.department,
                e.position
            FROM attendance_records ar
            JOIN employees e ON ar.employee_id = e.employee_id
            WHERE ar.id = LAST_INSERT_ID()
        `);

        res.status(201).json({
            success: true,
            message: 'Manual attendance record created successfully',
            data: { record: newRecord[0] }
        });

    } catch (error) {
        console.error('Manual attendance entry error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating manual attendance record'
        });
    }
});

// Update attendance record
router.put('/:id', requireManagerOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            time_in,
            time_out,
            hours_worked,
            status,
            notes,
            reason
        } = req.body;

        // Check if record exists
        const existing = await db.execute(
            'SELECT * FROM attendance_records WHERE id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Attendance record not found'
            });
        }

        // Build update query dynamically
        const updateFields = [];
        const updateParams = [];

        if (time_in !== undefined) {
            updateFields.push('time_in = ?');
            updateParams.push(time_in);
        }

        if (time_out !== undefined) {
            updateFields.push('time_out = ?');
            updateParams.push(time_out);
        }

        if (hours_worked !== undefined) {
            updateFields.push('total_hours = ?');
            updateParams.push(parseFloat(hours_worked));
        }

        if (status !== undefined) {
            updateFields.push('status = ?');
            updateParams.push(status);
        }

        if (notes !== undefined) {
            updateFields.push('clock_in_notes = ?');
            updateParams.push(notes);
        }

        // Add manual entry tracking
        updateFields.push('manual_entry = TRUE');
        updateFields.push('manual_entry_by = ?');
        updateParams.push(req.user.employee_id);

        if (reason) {
            updateFields.push('manual_entry_reason = ?');
            updateParams.push(reason);
        }

        updateFields.push('updated_at = NOW()');
        updateParams.push(id);

        if (updateFields.length <= 3) { // Only manual entry fields
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        await db.execute(
            `UPDATE attendance_records SET ${updateFields.join(', ')} WHERE id = ?`,
            updateParams
        );

        // Get updated record
        const updatedRecord = await db.execute(`
            SELECT 
                ar.id,
                ar.employee_id,
                ar.date,
                ar.time_in,
                ar.time_out,
                ar.break_start,
                ar.break_end,
                ar.total_hours as hours_worked,
                ar.overtime_hours,
                ar.status,
                ar.notes,
                ar.created_at,
                ar.updated_at,
                e.full_name as employee_name,
                e.employee_id as employee_code,
                e.department,
                e.position
            FROM attendance_records ar
            JOIN employees e ON ar.employee_id = e.employee_id
            WHERE ar.id = ?
        `, [id]);

        res.json({
            success: true,
            message: 'Attendance record updated successfully',
            data: { record: updatedRecord[0] }
        });

    } catch (error) {
        console.error('Update attendance record error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating attendance record'
        });
    }
});

// Get attendance summary/statistics
router.get('/summary/:employeeId?', auth, async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { start_date, end_date, period = 'month' } = req.query;

        // Determine target employee
        const targetEmployeeId = req.user.role === 'admin' || req.user.role === 'manager' 
            ? (employeeId || req.user.employee_id) 
            : req.user.employee_id;

        // Set date range based on period
        let startDate, endDate;
        if (start_date && end_date) {
            startDate = start_date;
            endDate = end_date;
        } else {
            const now = new Date();
            if (period === 'week') {
                startDate = new Date(now.getDate() - 7).toISOString().split('T')[0];
            } else if (period === 'month') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            } else {
                startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
            }
            endDate = new Date().toISOString().split('T')[0];
        }

        const summaryData = await Promise.all([
            // Total records
            db.execute(`
                SELECT COUNT(*) as total_days
                FROM attendance_records 
                WHERE employee_id = ? AND date >= ? AND date <= ?
            `, [targetEmployeeId, startDate, endDate]),

            // Total hours worked
            db.execute(`
                SELECT SUM(total_hours) as total_hours
                FROM attendance_records 
                WHERE employee_id = ? AND date >= ? AND date <= ? AND total_hours IS NOT NULL
            `, [targetEmployeeId, startDate, endDate]),

            // Status breakdown
            db.execute(`
                SELECT status, COUNT(*) as count
                FROM attendance_records 
                WHERE employee_id = ? AND date >= ? AND date <= ?
                GROUP BY status
            `, [targetEmployeeId, startDate, endDate]),

            // Average hours per day
            db.execute(`
                SELECT AVG(total_hours) as avg_hours
                FROM attendance_records 
                WHERE employee_id = ? AND date >= ? AND date <= ? 
                AND total_hours IS NOT NULL AND total_hours > 0
            `, [targetEmployeeId, startDate, endDate])
        ]);

        res.json({
            success: true,
            data: {
                employee_id: targetEmployeeId,
                period: { start_date: startDate, end_date: endDate },
                summary: {
                    total_days: summaryData[0][0].total_days,
                    total_hours: parseFloat(summaryData[1][0].total_hours || 0),
                    average_hours_per_day: parseFloat(summaryData[3][0].avg_hours || 0),
                    status_breakdown: summaryData[2]
                }
            }
        });

    } catch (error) {
        console.error('Get attendance summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error getting attendance summary'
        });
    }
});

// Get attendance statistics for dashboard
router.get('/stats', auth, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Get today's attendance stats
        const todayStatsResult = await db.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
                SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
                SUM(CASE WHEN status = 'on_leave' THEN 1 ELSE 0 END) as onLeave
            FROM attendance_records ar
            WHERE ar.date = ?
        `, [today]);

        // Get total employees count
        const totalEmployeesResult = await db.execute(`
            SELECT COUNT(*) as count
            FROM employees e
            JOIN user_accounts ua ON e.employee_id = ua.employee_id
            WHERE ua.is_active = 1 AND e.status = 'active'
        `);

        // Extract data from results (direct array format)
        const todayStats = todayStatsResult[0] || {};
        const totalEmployees = totalEmployeesResult[0] || {};

        const stats = {
            present: parseInt(todayStats.present || 0),
            absent: parseInt(todayStats.absent || 0),
            late: parseInt(todayStats.late || 0),
            onLeave: parseInt(todayStats.onLeave || 0),
            total: parseInt(totalEmployees.count || 0),
            attendanceRate: (totalEmployees.count > 0) 
                ? (((todayStats.present || 0) / totalEmployees.count) * 100).toFixed(1)
                : 0
        };

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Get attendance stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error getting attendance statistics'
        });
    }
});

// Delete attendance record (admin/manager only)
router.delete('/:id', requireManagerOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if record exists
        const existing = await db.execute(
            'SELECT * FROM attendance_records WHERE id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Attendance record not found'
            });
        }

        // Store the record data for logging
        const recordData = existing[0];

        // Delete the record
        await db.execute(
            'DELETE FROM attendance_records WHERE id = ?',
            [id]
        );

        // Log the deletion
        console.log(`Attendance record ${id} deleted by user ${req.user.employee_id}`);

        res.json({
            success: true,
            message: 'Attendance record deleted successfully',
            data: { 
                deleted_record: {
                    id: recordData.id,
                    employee_id: recordData.employee_id,
                    date: recordData.date,
                    deleted_by: req.user.employee_id,
                    deleted_at: new Date().toISOString()
                }
            }
        });

    } catch (error) {
        console.error('Delete attendance record error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting attendance record'
        });
    }
});

module.exports = router;
