const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { auth, requireManagerOrAdmin } = require('../middleware/auth');

// Get current attendance status
router.get('/current-status', auth, async (req, res) => {
    try {
        const employee_id = req.user.employee_id;
        const today = new Date().toLocaleDateString('en-CA'); // Use local date in YYYY-MM-DD format

        // Get today's attendance record
        const result = await db.execute(`
            SELECT * FROM attendance_records 
            WHERE employee_id = ? AND date = ? 
            ORDER BY created_at DESC LIMIT 1
        `, [employee_id, today]);

        const records = Array.isArray(result[0]) ? result[0] : (result[0] ? [result[0]] : []);
        const currentRecord = records.length > 0 ? records[0] : null;

        let status = 'not_clocked_in';
        let lastAction = null;
        let canClockIn = true;
        let canClockOut = false;
        let canStartBreak = false;
        let canEndBreak = false;

        if (currentRecord) {
            if (currentRecord.time_in && !currentRecord.time_out) {
                status = 'clocked_in';
                canClockIn = false;
                canClockOut = true;
                
                if (!currentRecord.break_start) {
                    canStartBreak = true;
                } else if (currentRecord.break_start && !currentRecord.break_end) {
                    status = 'on_break';
                    canEndBreak = true;
                } else {
                    canStartBreak = true; // Can take another break
                }
            } else if (currentRecord.time_in && currentRecord.time_out) {
                status = 'clocked_out';
                canClockIn = true; // Allow clocking in again for additional shifts
                canClockOut = false;
            }
        }

        res.json({
            success: true,
            data: {
                status,
                record: currentRecord,
                capabilities: {
                    canClockIn,
                    canClockOut,
                    canStartBreak,
                    canEndBreak
                }
            }
        });

    } catch (error) {
        console.error('Current status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get current status'
        });
    }
});

// Clock in/out endpoint
router.post('/clock', auth, async (req, res) => {
    try {
        const { action, location, notes } = req.body; // action: 'in' or 'out'
        const employee_id = req.user.employee_id;

        console.log('Clock operation:', { action, employee_id, notes });

        if (!action || !['in', 'out'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Action must be "in" or "out"'
            });
        }

        const now = new Date();
        const today = now.toLocaleDateString('en-CA'); // Use local date in YYYY-MM-DD format
        const currentTime = now.toTimeString().split(' ')[0].substring(0, 8); // HH:MM:SS format

        // Get today's attendance record
        const result = await db.execute(`
            SELECT * FROM attendance_records 
            WHERE employee_id = ? AND date = ? 
            ORDER BY created_at DESC LIMIT 1
        `, [employee_id, today]);
        
        const existingRecords = Array.isArray(result[0]) ? result[0] : (result[0] ? [result[0]] : []);

        if (action === 'in') {
            // Check if already clocked in today (but not yet clocked out)
            if (existingRecords.length > 0 && existingRecords[0].time_in && !existingRecords[0].time_out) {
                return res.status(400).json({
                    success: false,
                    message: 'Already clocked in. Please clock out first.',
                    data: {
                        current_record: existingRecords[0]
                    }
                });
            }

            let attendanceId;
            
            if (existingRecords.length > 0) {
                // Update existing record for additional clock-in
                await db.execute(`
                    UPDATE attendance_records 
                    SET time_in = ?, time_out = NULL, status = 'present', notes = ?, updated_at = NOW()
                    WHERE id = ?
                `, [currentTime, notes, existingRecords[0].id]);
                attendanceId = existingRecords[0].id;
            } else {
                // Create new record for first clock-in of the day
                const [result] = await db.execute(`
                    INSERT INTO attendance_records (
                        employee_id, date, time_in, status, notes, created_at, updated_at
                    ) VALUES (?, ?, ?, 'present', ?, NOW(), NOW())
                `, [employee_id, today, currentTime, notes]);
                attendanceId = result.insertId;
            }

            res.json({
                success: true,
                message: 'Clocked in successfully',
                data: {
                    id: attendanceId,
                    employee_id: employee_id,
                    date: today,
                    time_in: currentTime,
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
            
            // Parse time_in properly
            const timeInStr = record.time_in;
            const timeIn = new Date(`${today}T${timeInStr}`);
            const timeOut = new Date(`${today}T${currentTime}`);

            // Calculate total hours worked excluding break time
            let totalMinutes = (timeOut - timeIn) / (1000 * 60);
            
            // Subtract break time if exists
            if (record.break_start && record.break_end) {
                const breakStart = new Date(`${today}T${record.break_start}`);
                const breakEnd = new Date(`${today}T${record.break_end}`);
                const breakMinutes = (breakEnd - breakStart) / (1000 * 60);
                totalMinutes -= breakMinutes;
            }
            
            const totalHours = Math.max(0, totalMinutes / 60);
            
            // Calculate overtime (assuming 8 hour standard)
            const standardHours = 8;
            const overtimeHours = Math.max(0, totalHours - standardHours);

            // Determine status
            let status = 'present';
            
            // Check if late (assuming 9 AM start time)
            const standardStartTime = new Date(`${today}T09:00:00`);
            if (timeIn > standardStartTime) {
                status = 'late';
            }

            // Update the record with clock out time
            await db.execute(`
                UPDATE attendance_records 
                SET time_out = ?, total_hours = ?, overtime_hours = ?, status = ?, notes = ?, updated_at = NOW()
                WHERE id = ?
            `, [currentTime, totalHours.toFixed(2), overtimeHours.toFixed(2), status, notes, record.id]);

            res.json({
                success: true,
                message: 'Clocked out successfully',
                data: {
                    id: record.id,
                    employee_id: employee_id,
                    date: today,
                    time_in: timeInStr,
                    time_out: currentTime,
                    total_hours: totalHours.toFixed(2),
                    overtime_hours: overtimeHours.toFixed(2),
                    action: 'out',
                    time: now,
                    location: location || null
                }
            });
        }

    } catch (error) {
        console.error('Clock in/out error:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            sqlState: error.sqlState,
            stack: error.stack
        });
        res.status(500).json({
            success: false,
            message: 'Server error during clock operation',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Break/Lunch start endpoint
router.post('/break', auth, async (req, res) => {
    try {
        const { action, notes } = req.body; // action: 'start' or 'end'
        const employee_id = req.user.employee_id;

        if (!action || !['start', 'end'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Action must be "start" or "end"'
            });
        }

        const now = new Date();
        const today = now.toLocaleDateString('en-CA'); // Use local date in YYYY-MM-DD format
        const currentTime = now.toTimeString().split(' ')[0].substring(0, 8); // HH:MM:SS format

        // Get today's attendance record
        const result = await db.execute(`
            SELECT * FROM attendance_records 
            WHERE employee_id = ? AND date = ? 
            ORDER BY created_at DESC LIMIT 1
        `, [employee_id, today]);
        
        const existingRecords = Array.isArray(result[0]) ? result[0] : (result[0] ? [result[0]] : []);

        if (existingRecords.length === 0 || !existingRecords[0].time_in) {
            return res.status(400).json({
                success: false,
                message: 'You must clock in before starting a break'
            });
        }

        const record = existingRecords[0];

        if (action === 'start') {
            // Check if already on break
            if (record.break_start && !record.break_end) {
                return res.status(400).json({
                    success: false,
                    message: 'Break already started. Please end current break first.'
                });
            }

            // Start break
            await db.execute(`
                UPDATE attendance_records 
                SET break_start = ?, notes = ?, updated_at = NOW()
                WHERE id = ?
            `, [currentTime, notes, record.id]);

            res.json({
                success: true,
                message: 'Break started successfully',
                data: {
                    id: record.id,
                    employee_id: employee_id,
                    date: today,
                    break_start: currentTime,
                    action: 'start'
                }
            });

        } else { // action === 'end'
            // Check if break was started
            if (!record.break_start) {
                return res.status(400).json({
                    success: false,
                    message: 'No active break found. Please start a break first.'
                });
            }

            if (record.break_end) {
                return res.status(400).json({
                    success: false,
                    message: 'Break already ended.'
                });
            }

            // End break
            await db.execute(`
                UPDATE attendance_records 
                SET break_end = ?, notes = ?, updated_at = NOW()
                WHERE id = ?
            `, [currentTime, notes, record.id]);

            res.json({
                success: true,
                message: 'Break ended successfully',
                data: {
                    id: record.id,
                    employee_id: employee_id,
                    date: today,
                    break_start: record.break_start,
                    break_end: currentTime,
                    action: 'end'
                }
            });
        }

    } catch (error) {
        console.error('Break operation error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during break operation'
        });
    }
});

// Get attendance records with filters
router.get('/', auth, async (req, res) => {
    try {
        const {
            employee_id,
            start_date,
            end_date,
            status,
            page = 1,
            limit = 50,
            sort = 'date',
            order = 'DESC'
        } = req.query;

        // Admin/Manager users can see all records when no employee_id is specified
        // Non-admin users can only see their own records
        let targetEmployeeId = null;
        let whereClause = '';
        
        if (req.user.role === 'admin' || req.user.role === 'manager') {
            if (employee_id) {
                // Specific employee requested
                targetEmployeeId = employee_id;
                whereClause = 'WHERE ar.employee_id = ?';
            } else {
                // No specific employee - show all records for admin/manager
                whereClause = 'WHERE 1=1'; // Show all records
            }
        } else {
            // Regular users can only see their own records
            targetEmployeeId = req.user.employee_id;
            whereClause = 'WHERE ar.employee_id = ?';
        }

        let query = `
            SELECT 
                ar.*,
                e.first_name,
                e.last_name,
                e.department,
                e.position
            FROM attendance_records ar
            JOIN employees e ON ar.employee_id = e.employee_id
            ${whereClause}
        `;
        
        const params = [];
        if (targetEmployeeId) {
            params.push(targetEmployeeId);
        }

        // Add date filters
        if (start_date) {
            query += ' AND ar.date >= ?';
            params.push(start_date);
        }

        if (end_date) {
            query += ' AND ar.date <= ?';
            params.push(end_date);
        }

        if (status) {
            query += ' AND ar.status = ?';
            params.push(status);
        }

        // Add sorting
        const validSortFields = ['date', 'time_in', 'time_out', 'total_hours', 'status'];
        const sortField = validSortFields.includes(sort) ? sort : 'date';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY ar.${sortField} ${sortOrder}`;

        // Add pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const records = await db.execute(query, params);

        // Get total count with same filtering logic
        let countQuery = `
            SELECT COUNT(*) as total
            FROM attendance_records ar
            ${whereClause}
        `;
        const countParams = [];
        if (targetEmployeeId) {
            countParams.push(targetEmployeeId);
        }

        if (start_date) {
            countQuery += ' AND ar.date >= ?';
            countParams.push(start_date);
        }

        if (end_date) {
            countQuery += ' AND ar.date <= ?';
            countParams.push(end_date);
        }

        if (status) {
            countQuery += ' AND ar.status = ?';
            countParams.push(status);
        }

        const countResult = await db.execute(countQuery, countParams);
        const total = countResult[0].total;

        res.json({
            success: true,
            data: {
                records,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Get attendance records error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error getting attendance records'
        });
    }
});

// Get current status (clocked in/out)
router.get('/status', auth, async (req, res) => {
    try {
        const employee_id = req.user.employee_id;
        const today = new Date().toLocaleDateString('en-CA'); // Use local date in YYYY-MM-DD format

        const result = await db.execute(`
            SELECT * FROM attendance_records 
            WHERE employee_id = ? AND date = ? 
            ORDER BY created_at DESC LIMIT 1
        `, [employee_id, today]);

        const records = Array.isArray(result[0]) ? result[0] : (result[0] ? [result[0]] : []);

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
router.post('/manual', auth, requireManagerOrAdmin, async (req, res) => {
    console.log('🎯 Manual attendance route reached!');
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
    console.log('👤 Request user:', req.user ? req.user.employee_id : 'No user');
    
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
                ar.*,
                CONCAT(e.first_name, ' ', e.last_name) as employee_name,
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
router.put('/:id', auth, requireManagerOrAdmin, async (req, res) => {
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

        if (!existing || existing.length === 0) {
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
            updateFields.push('notes = ?');
            updateParams.push(notes);
        }

        updateFields.push('updated_at = NOW()');
        updateParams.push(id);

        if (updateFields.length <= 1) { // Only updated_at field
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
                ar.*,
                CONCAT(e.first_name, ' ', e.last_name) as employee_name,
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
        const todayStats = await db.execute(`
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
        const totalEmployees = await db.execute(`
            SELECT COUNT(*) as count
            FROM employees e
            JOIN user_accounts ua ON e.employee_id = ua.employee_id
            WHERE ua.is_active = 1 AND e.status = 'active'
        `);

        const stats = {
            present: parseInt((todayStats[0] && todayStats[0].present) || 0),
            absent: parseInt((todayStats[0] && todayStats[0].absent) || 0),
            late: parseInt((todayStats[0] && todayStats[0].late) || 0),
            onLeave: parseInt((todayStats[0] && todayStats[0].onLeave) || 0),
            total: parseInt((totalEmployees[0] && totalEmployees[0].count) || 0),
            attendanceRate: (totalEmployees[0] && totalEmployees[0].count > 0) 
                ? (((todayStats[0] && todayStats[0].present) || 0) / totalEmployees[0].count * 100).toFixed(1)
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
router.delete('/:id', auth, requireManagerOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if record exists
        const existing = await db.execute(
            'SELECT * FROM attendance_records WHERE id = ?',
            [id]
        );

        if (!existing || existing.length === 0) {
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
