const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { auth, requireManagerOrAdmin } = require('../middleware/auth');

// Get payroll records with filters
router.get('/', auth, async (req, res) => {
    try {
        const {
            employee_id,
            pay_period_start,
            pay_period_end,
            year,
            month,
            status,
            page = 1,
            limit = 50,
            sort = 'pay_period_start',
            order = 'DESC'
        } = req.query;

        // Non-admin users can only see their own records
        const targetEmployeeId = req.user.role === 'admin' || req.user.role === 'manager' 
            ? employee_id 
            : req.user.employee_id;

        let query = `
            SELECT 
                pr.*,
                e.first_name,
                e.last_name,
                e.department,
                e.position,
                e.wage
            FROM payroll_records pr
            JOIN employees e ON pr.employee_id = e.employee_id
            WHERE 1=1
        `;
        const params = [];

        // Add employee filter
        if (targetEmployeeId) {
            query += ' AND pr.employee_id = ?';
            params.push(targetEmployeeId);
        }

        // Add date filters
        if (pay_period_start) {
            query += ' AND pr.pay_period_start >= ?';
            params.push(pay_period_start);
        }

        if (pay_period_end) {
            query += ' AND pr.pay_period_end <= ?';
            params.push(pay_period_end);
        }

        if (year) {
            query += ' AND YEAR(pr.pay_period_start) = ?';
            params.push(parseInt(year));
        }

        if (month) {
            query += ' AND MONTH(pr.pay_period_start) = ?';
            params.push(parseInt(month));
        }

        if (status) {
            query += ' AND pr.status = ?';
            params.push(status);
        }

        // Add sorting
        const validSortFields = ['pay_period_start', 'pay_period_end', 'gross_pay', 'net_pay', 'created_at'];
        const sortField = validSortFields.includes(sort) ? sort : 'pay_period_start';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY pr.${sortField} ${sortOrder}`;

        // Add pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const records = await db.execute(query, params);

        // Get total count
        let countQuery = `
            SELECT COUNT(*) as total
            FROM payroll_records pr
            WHERE 1=1
        `;
        const countParams = [];

        if (targetEmployeeId) {
            countQuery += ' AND pr.employee_id = ?';
            countParams.push(targetEmployeeId);
        }

        if (pay_period_start) {
            countQuery += ' AND pr.pay_period_start >= ?';
            countParams.push(pay_period_start);
        }

        if (pay_period_end) {
            countQuery += ' AND pr.pay_period_end <= ?';
            countParams.push(pay_period_end);
        }

        if (year) {
            countQuery += ' AND YEAR(pr.pay_period_start) = ?';
            countParams.push(parseInt(year));
        }

        if (month) {
            countQuery += ' AND MONTH(pr.pay_period_start) = ?';
            countParams.push(parseInt(month));
        }

        if (status) {
            countQuery += ' AND pr.status = ?';
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
        console.error('Get payroll records error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error getting payroll records'
        });
    }
});

// Get next payday information for dashboard
router.get('/next-payday', auth, async (req, res) => {
    try {
        // Get the most recent payroll record to determine next payday
        const lastPayroll = await db.execute(`
            SELECT 
                pay_period_end,
                pay_date,
                'monthly' as pay_frequency
            FROM payroll_records
            ORDER BY pay_date DESC
            LIMIT 1
        `);

        let nextPayday = null;
        let daysUntilPayday = null;

        if (lastPayroll && lastPayroll.length > 0) {
            const lastPayDate = new Date(lastPayroll[0].pay_date);
            const frequency = lastPayroll[0].pay_frequency || 'monthly';
            
            // Calculate next payday based on frequency
            switch (frequency) {
                case 'weekly':
                    nextPayday = new Date(lastPayDate.getTime() + (7 * 24 * 60 * 60 * 1000));
                    break;
                case 'bi-weekly':
                    nextPayday = new Date(lastPayDate.getTime() + (14 * 24 * 60 * 60 * 1000));
                    break;
                case 'monthly':
                default:
                    nextPayday = new Date(lastPayDate);
                    nextPayday.setMonth(nextPayday.getMonth() + 1);
                    break;
            }
            
            // Calculate days until next payday
            const today = new Date();
            const timeDiff = nextPayday.getTime() - today.getTime();
            daysUntilPayday = Math.ceil(timeDiff / (1000 * 3600 * 24));
        } else {
            // No payroll records found, use default monthly from end of month
            const today = new Date();
            nextPayday = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of next month
            const timeDiff = nextPayday.getTime() - today.getTime();
            daysUntilPayday = Math.ceil(timeDiff / (1000 * 3600 * 24));
        }

        res.json({
            success: true,
            data: {
                nextPayday: nextPayday ? nextPayday.toISOString().split('T')[0] : null,
                daysUntilPayday: daysUntilPayday,
                frequency: lastPayroll && lastPayroll.length > 0 ? lastPayroll[0].pay_frequency : 'monthly'
            }
        });

    } catch (error) {
        console.error('Get next payday error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error getting next payday information'
        });
    }
});

// Get single payroll record
router.get('/:payrollId', auth, async (req, res) => {
    try {
        const { payrollId } = req.params;

        const records = await db.execute(`
            SELECT 
                pr.*,
                e.first_name,
                e.last_name,
                e.department,
                e.position,
                e.wage
            FROM payroll_records pr
            JOIN employees e ON pr.employee_id = e.employee_id
            WHERE pr.payroll_id = ?
        `, [payrollId]);

        if (records.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Payroll record not found'
            });
        }

        const record = records[0];

        // Check permissions - users can only see their own records
        if (req.user.role !== 'admin' && req.user.role !== 'manager' && 
            record.employee_id !== req.user.employee_id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: { record }
        });

    } catch (error) {
        console.error('Get payroll record error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error getting payroll record'
        });
    }
});

// Create payroll record
router.post('/', requireManagerOrAdmin, async (req, res) => {
    try {
        const {
            employee_id,
            pay_period_start,
            pay_period_end,
            regular_hours,
            overtime_hours = 0,
            holiday_hours = 0,
            sick_hours = 0,
            vacation_hours = 0,
            regular_rate,
            overtime_rate,
            holiday_rate,
            deductions = {},
            bonuses = {},
            notes
        } = req.body;

        // Validate required fields
        if (!employee_id || !pay_period_start || !pay_period_end || 
            regular_hours === undefined || !regular_rate) {
            return res.status(400).json({
                success: false,
                message: 'Required fields: employee_id, pay_period_start, pay_period_end, regular_hours, regular_rate'
            });
        }

        // Check if employee exists
        const employees = await db.execute(
            'SELECT employee_id, wage FROM employees WHERE employee_id = ? AND status = ?',
            [employee_id, 'active']
        );

        if (employees.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // Check if payroll record already exists for this period
        const existing = await db.execute(
            'SELECT payroll_id FROM payroll_records WHERE employee_id = ? AND pay_period_start = ? AND pay_period_end = ?',
            [employee_id, pay_period_start, pay_period_end]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Payroll record already exists for this pay period'
            });
        }

        // Calculate pay amounts
        const regularPay = parseFloat(regular_hours) * parseFloat(regular_rate);
        const overtimePay = parseFloat(overtime_hours) * parseFloat(overtime_rate || regular_rate * 1.5);
        const holidayPay = parseFloat(holiday_hours) * parseFloat(holiday_rate || regular_rate);
        const sickPay = parseFloat(sick_hours) * parseFloat(regular_rate);
        const vacationPay = parseFloat(vacation_hours) * parseFloat(regular_rate);

        // Calculate total bonuses
        const totalBonuses = Object.values(bonuses || {}).reduce((sum, amount) => 
            sum + parseFloat(amount || 0), 0);

        // Calculate gross pay
        const grossPay = regularPay + overtimePay + holidayPay + sickPay + vacationPay + totalBonuses;

        // Calculate total deductions
        const totalDeductions = Object.values(deductions || {}).reduce((sum, amount) => 
            sum + parseFloat(amount || 0), 0);

        // Calculate net pay
        const netPay = grossPay - totalDeductions;

        const payrollId = `PAY${Date.now()}${Math.floor(Math.random() * 1000)}`;

        await db.execute(`
            INSERT INTO payroll_records (
                payroll_id, employee_id, pay_period_start, pay_period_end,
                regular_hours, overtime_hours, holiday_hours, sick_hours, vacation_hours,
                regular_rate, overtime_rate, holiday_rate,
                regular_pay, overtime_pay, holiday_pay, sick_pay, vacation_pay,
                gross_pay, total_deductions, net_pay,
                deductions_json, bonuses_json, notes,
                status, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, NOW())
        `, [
            payrollId, employee_id, pay_period_start, pay_period_end,
            parseFloat(regular_hours), parseFloat(overtime_hours), parseFloat(holiday_hours),
            parseFloat(sick_hours), parseFloat(vacation_hours),
            parseFloat(regular_rate), parseFloat(overtime_rate || regular_rate * 1.5), 
            parseFloat(holiday_rate || regular_rate),
            regularPay, overtimePay, holidayPay, sickPay, vacationPay,
            grossPay, totalDeductions, netPay,
            JSON.stringify(deductions || {}), JSON.stringify(bonuses || {}), notes,
            req.user.employee_id
        ]);

        // Get the created record with employee info
        const newRecord = await db.execute(`
            SELECT 
                pr.*,
                e.first_name,
                e.last_name,
                e.department,
                e.position
            FROM payroll_records pr
            JOIN employees e ON pr.employee_id = e.employee_id
            WHERE pr.payroll_id = ?
        `, [payrollId]);

        res.status(201).json({
            success: true,
            message: 'Payroll record created successfully',
            data: { record: newRecord[0] }
        });

    } catch (error) {
        console.error('Create payroll record error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating payroll record'
        });
    }
});

// Update payroll record
router.put('/:payrollId', requireManagerOrAdmin, async (req, res) => {
    try {
        const { payrollId } = req.params;
        const {
            regular_hours,
            overtime_hours,
            holiday_hours,
            sick_hours,
            vacation_hours,
            regular_rate,
            overtime_rate,
            holiday_rate,
            deductions,
            bonuses,
            notes,
            status
        } = req.body;

        // Check if record exists
        const existing = await db.execute(
            'SELECT * FROM payroll_records WHERE payroll_id = ?',
            [payrollId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Payroll record not found'
            });
        }

        const currentRecord = existing[0];

        // Don't allow editing finalized records
        if (currentRecord.status === 'finalized') {
            return res.status(400).json({
                success: false,
                message: 'Cannot edit finalized payroll record'
            });
        }

        // Build update query dynamically
        const updateFields = [];
        const updateParams = [];

        // Recalculate if any of these fields change
        let needsRecalculation = false;

        if (regular_hours !== undefined) {
            updateFields.push('regular_hours = ?');
            updateParams.push(parseFloat(regular_hours));
            needsRecalculation = true;
        }

        if (overtime_hours !== undefined) {
            updateFields.push('overtime_hours = ?');
            updateParams.push(parseFloat(overtime_hours));
            needsRecalculation = true;
        }

        if (holiday_hours !== undefined) {
            updateFields.push('holiday_hours = ?');
            updateParams.push(parseFloat(holiday_hours));
            needsRecalculation = true;
        }

        if (sick_hours !== undefined) {
            updateFields.push('sick_hours = ?');
            updateParams.push(parseFloat(sick_hours));
            needsRecalculation = true;
        }

        if (vacation_hours !== undefined) {
            updateFields.push('vacation_hours = ?');
            updateParams.push(parseFloat(vacation_hours));
            needsRecalculation = true;
        }

        if (regular_rate !== undefined) {
            updateFields.push('regular_rate = ?');
            updateParams.push(parseFloat(regular_rate));
            needsRecalculation = true;
        }

        if (overtime_rate !== undefined) {
            updateFields.push('overtime_rate = ?');
            updateParams.push(parseFloat(overtime_rate));
            needsRecalculation = true;
        }

        if (holiday_rate !== undefined) {
            updateFields.push('holiday_rate = ?');
            updateParams.push(parseFloat(holiday_rate));
            needsRecalculation = true;
        }

        if (deductions !== undefined) {
            updateFields.push('deductions_json = ?');
            updateParams.push(JSON.stringify(deductions));
            needsRecalculation = true;
        }

        if (bonuses !== undefined) {
            updateFields.push('bonuses_json = ?');
            updateParams.push(JSON.stringify(bonuses));
            needsRecalculation = true;
        }

        if (notes !== undefined) {
            updateFields.push('notes = ?');
            updateParams.push(notes);
        }

        if (status !== undefined) {
            updateFields.push('status = ?');
            updateParams.push(status);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        // If recalculation is needed, do it
        if (needsRecalculation) {
            // Get current or new values
            const newValues = {
                regular_hours: regular_hours !== undefined ? parseFloat(regular_hours) : currentRecord.regular_hours,
                overtime_hours: overtime_hours !== undefined ? parseFloat(overtime_hours) : currentRecord.overtime_hours,
                holiday_hours: holiday_hours !== undefined ? parseFloat(holiday_hours) : currentRecord.holiday_hours,
                sick_hours: sick_hours !== undefined ? parseFloat(sick_hours) : currentRecord.sick_hours,
                vacation_hours: vacation_hours !== undefined ? parseFloat(vacation_hours) : currentRecord.vacation_hours,
                regular_rate: regular_rate !== undefined ? parseFloat(regular_rate) : currentRecord.regular_rate,
                overtime_rate: overtime_rate !== undefined ? parseFloat(overtime_rate) : currentRecord.overtime_rate,
                holiday_rate: holiday_rate !== undefined ? parseFloat(holiday_rate) : currentRecord.holiday_rate,
                deductions: deductions !== undefined ? deductions : JSON.parse(currentRecord.deductions_json || '{}'),
                bonuses: bonuses !== undefined ? bonuses : JSON.parse(currentRecord.bonuses_json || '{}')
            };

            // Recalculate amounts
            const regularPay = newValues.regular_hours * newValues.regular_rate;
            const overtimePay = newValues.overtime_hours * newValues.overtime_rate;
            const holidayPay = newValues.holiday_hours * newValues.holiday_rate;
            const sickPay = newValues.sick_hours * newValues.regular_rate;
            const vacationPay = newValues.vacation_hours * newValues.regular_rate;

            const totalBonuses = Object.values(newValues.bonuses).reduce((sum, amount) => 
                sum + parseFloat(amount || 0), 0);

            const grossPay = regularPay + overtimePay + holidayPay + sickPay + vacationPay + totalBonuses;

            const totalDeductions = Object.values(newValues.deductions).reduce((sum, amount) => 
                sum + parseFloat(amount || 0), 0);

            const netPay = grossPay - totalDeductions;

            // Add calculated fields to update
            updateFields.push('regular_pay = ?', 'overtime_pay = ?', 'holiday_pay = ?', 
                            'sick_pay = ?', 'vacation_pay = ?', 'gross_pay = ?', 
                            'total_deductions = ?', 'net_pay = ?');
            updateParams.push(regularPay, overtimePay, holidayPay, sickPay, vacationPay, 
                            grossPay, totalDeductions, netPay);
        }

        updateFields.push('updated_at = NOW()');
        updateParams.push(payrollId);

        await db.execute(
            `UPDATE payroll_records SET ${updateFields.join(', ')} WHERE payroll_id = ?`,
            updateParams
        );

        // Get updated record
        const updatedRecord = await db.execute(`
            SELECT 
                pr.*,
                e.first_name,
                e.last_name,
                e.department,
                e.position
            FROM payroll_records pr
            JOIN employees e ON pr.employee_id = e.employee_id
            WHERE pr.payroll_id = ?
        `, [payrollId]);

        res.json({
            success: true,
            message: 'Payroll record updated successfully',
            data: { record: updatedRecord[0] }
        });

    } catch (error) {
        console.error('Update payroll record error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating payroll record'
        });
    }
});

// Generate payroll for a pay period
router.post('/generate', requireManagerOrAdmin, async (req, res) => {
    try {
        const {
            employee_ids, // array of employee IDs, or null for all active employees
            pay_period_start,
            pay_period_end,
            include_overtime = true,
            include_holidays = true
        } = req.body;

        if (!pay_period_start || !pay_period_end) {
            return res.status(400).json({
                success: false,
                message: 'pay_period_start and pay_period_end are required'
            });
        }

        // Get employees to generate payroll for
        let employeeQuery = `
            SELECT e.*, ua.role 
            FROM employees e 
            LEFT JOIN user_accounts ua ON e.employee_id = ua.employee_id
            WHERE e.status = 'active'
        `;
        let employeeParams = [];

        if (employee_ids && employee_ids.length > 0) {
            employeeQuery += ` AND e.employee_id IN (${employee_ids.map(() => '?').join(',')})`;
            employeeParams = employee_ids;
        }

        const employees = await db.execute(employeeQuery, employeeParams);

        if (employees.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No active employees found'
            });
        }

        const results = [];
        const errors = [];

        for (const employee of employees) {
            try {
                // Check if payroll already exists for this period
                const existing = await db.execute(
                    'SELECT payroll_id FROM payroll_records WHERE employee_id = ? AND pay_period_start = ? AND pay_period_end = ?',
                    [employee.employee_id, pay_period_start, pay_period_end]
                );

                if (existing.length > 0) {
                    errors.push({
                        employee_id: employee.employee_id,
                        error: 'Payroll record already exists for this period'
                    });
                    continue;
                }

                // Get attendance data for the pay period
                const attendanceRecords = await db.execute(`
                    SELECT * FROM attendance_records 
                    WHERE employee_id = ? AND date >= ? AND date <= ?
                    ORDER BY date
                `, [employee.employee_id, pay_period_start, pay_period_end]);

                // Calculate hours
                let regular_hours = 0;
                let overtime_hours = 0;
                let holiday_hours = 0;

                attendanceRecords.forEach(record => {
                    if (record.hours_worked && record.hours_worked > 0) {
                        const hours = parseFloat(record.hours_worked);
                        
                        if (record.status === 'holiday' && include_holidays) {
                            holiday_hours += hours;
                        } else if (hours > 8 && include_overtime) {
                            regular_hours += 8;
                            overtime_hours += (hours - 8);
                        } else {
                            regular_hours += hours;
                        }
                    }
                });

                // Calculate rates (using wage or default rates)
                const hourlyRate = employee.wage ? (parseFloat(employee.wage) / 2080) : 15; // Assuming 2080 work hours per year
                const regular_rate = hourlyRate;
                const overtime_rate = hourlyRate * 1.5;
                const holiday_rate = hourlyRate * 2;

                // Create payroll record
                const payrollId = `PAY${Date.now()}${Math.floor(Math.random() * 1000)}`;
                
                const regularPay = regular_hours * regular_rate;
                const overtimePay = overtime_hours * overtime_rate;
                const holidayPay = holiday_hours * holiday_rate;
                const grossPay = regularPay + overtimePay + holidayPay;
                
                // Basic deductions (can be customized)
                const deductions = {
                    tax: grossPay * 0.15, // 15% tax
                    sss: Math.min(grossPay * 0.045, 1000), // SSS contribution
                    philhealth: grossPay * 0.015, // PhilHealth
                    pagibig: Math.min(grossPay * 0.02, 100) // Pag-IBIG
                };
                
                const totalDeductions = Object.values(deductions).reduce((sum, amount) => sum + amount, 0);
                const netPay = grossPay - totalDeductions;

                await db.execute(`
                    INSERT INTO payroll_records (
                        payroll_id, employee_id, pay_period_start, pay_period_end,
                        regular_hours, overtime_hours, holiday_hours,
                        regular_rate, overtime_rate, holiday_rate,
                        regular_pay, overtime_pay, holiday_pay,
                        gross_pay, total_deductions, net_pay,
                        deductions_json, status, created_by, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, NOW())
                `, [
                    payrollId, employee.employee_id, pay_period_start, pay_period_end,
                    regular_hours, overtime_hours, holiday_hours,
                    regular_rate, overtime_rate, holiday_rate,
                    regularPay, overtimePay, holidayPay,
                    grossPay, totalDeductions, netPay,
                    JSON.stringify(deductions),
                    req.user.employee_id
                ]);

                results.push({
                    employee_id: employee.employee_id,
                    payroll_id: payrollId,
                    gross_pay: grossPay,
                    net_pay: netPay
                });

            } catch (error) {
                console.error(`Error generating payroll for employee ${employee.employee_id}:`, error);
                errors.push({
                    employee_id: employee.employee_id,
                    error: 'Failed to generate payroll record'
                });
            }
        }

        res.json({
            success: true,
            message: `Generated payroll for ${results.length} employees`,
            data: {
                generated: results,
                errors: errors
            }
        });

    } catch (error) {
        console.error('Generate payroll error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error generating payroll'
        });
    }
});

// Delete payroll record
router.delete('/:payrollId', requireManagerOrAdmin, async (req, res) => {
    try {
        const { payrollId } = req.params;

        // Check if record exists and is not finalized
        const existing = await db.execute(
            'SELECT status FROM payroll_records WHERE payroll_id = ?',
            [payrollId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Payroll record not found'
            });
        }

        if (existing[0].status === 'finalized') {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete finalized payroll record'
            });
        }

        await db.execute('DELETE FROM payroll_records WHERE payroll_id = ?', [payrollId]);

        res.json({
            success: true,
            message: 'Payroll record deleted successfully'
        });

    } catch (error) {
        console.error('Delete payroll record error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting payroll record'
        });
    }
});

module.exports = router;
