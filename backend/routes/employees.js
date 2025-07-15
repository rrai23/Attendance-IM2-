const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { auth, requireAdmin, requireManagerOrAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// Get all employees (with optional filtering)
router.get('/', auth, async (req, res) => {
    try {
        const { 
            status = 'active',
            department,
            position,
            search,
            page = 1,
            limit = 50,
            sort = 'full_name',
            order = 'ASC'
        } = req.query;

        let query = `
            SELECT 
                e.id,
                e.employee_id,
                CONCAT(e.first_name, ' ', e.last_name) as full_name,
                e.first_name,
                e.last_name,
                e.email,
                e.phone,
                e.department,
                e.position,
                null as manager_id,
                e.date_hired,
                e.status,
                null as hourly_rate,
                null as overtime_rate,
                e.salary,
                null as avatar,
                null as address,
                null as emergency_contact,
                null as emergency_phone,
                null as work_schedule,
                e.created_at,
                e.updated_at,
                ua.username,
                ua.role,
                ua.is_active as account_active,
                ua.last_login
            FROM employees e
            LEFT JOIN user_accounts ua ON e.employee_id = ua.employee_id
            WHERE 1=1
        `;
        const params = [];

        // Add filters
        if (status && status !== 'all') {
            query += ' AND e.status = ?';
            params.push(status);
        }

        if (department) {
            query += ' AND e.department = ?';
            params.push(department);
        }

        if (position) {
            query += ' AND e.position = ?';
            params.push(position);
        }

        if (search) {
            query += ' AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ? OR e.employee_code LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // Add sorting
        const validSortFields = ['employee_id', 'first_name', 'last_name', 'department', 'position', 'date_hired', 'created_at'];
        const sortField = validSortFields.includes(sort) ? sort : 'last_name';
        const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        query += ` ORDER BY e.${sortField} ${sortOrder}`;

        // Add pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const employees = await db.execute(query, params);

        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(*) as total
            FROM employees e
            WHERE 1=1
        `;
        const countParams = [];

        if (status && status !== 'all') {
            countQuery += ' AND e.status = ?';
            countParams.push(status);
        }

        if (department) {
            countQuery += ' AND e.department = ?';
            countParams.push(department);
        }

        if (position) {
            countQuery += ' AND e.position = ?';
            countParams.push(position);
        }

        if (search) {
            countQuery += ' AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ? OR e.employee_code LIKE ?)';
            const searchTerm = `%${search}%`;
            countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        const countResult = await db.execute(countQuery, countParams);
        const total = countResult[0].total;

        res.json({
            success: true,
            data: {
                employees,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error getting employees'
        });
    }
});

// Get single employee by ID
router.get('/:employeeId', auth, async (req, res) => {
    try {
        const { employeeId } = req.params;

        const employees = await db.execute(`
            SELECT 
                e.*,
                ua.username,
                ua.role,
                ua.is_active as account_active,
                ua.last_login,
                ua.created_at as account_created
            FROM employees e
            LEFT JOIN user_accounts ua ON e.employee_code = ua.employee_id
            WHERE e.employee_code = ?
        `, [employeeId]);

        if (employees.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.json({
            success: true,
            data: { employee: employees[0] }
        });

    } catch (error) {
        console.error('Get employee error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error getting employee'
        });
    }
});

// Create new employee
router.post('/', auth, requireManagerOrAdmin, async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            email,
            phone,
            department,
            position,
            date_hired,
            salary,
            employment_type = 'full-time',
            shift_schedule = 'day',
            username,
            password,
            role = 'employee'
        } = req.body;

        // Validate required fields
        if (!first_name || !last_name || !email || !department || !position || !date_hired) {
            return res.status(400).json({
                success: false,
                message: 'Required fields: first_name, last_name, email, department, position, date_hired'
            });
        }

        // Generate unique employee code
        const generateEmployeeCode = async () => {
            const year = new Date().getFullYear().toString().slice(-2);
            let counter = 1;
            
            while (true) {
                const empCode = `EMP${year}${counter.toString().padStart(4, '0')}`;
                const existing = await db.execute('SELECT employee_code FROM employees WHERE employee_code = ?', [empCode]);
                if (existing.length === 0) {
                    return empCode;
                }
                counter++;
            }
        };

        const employee_code = await generateEmployeeCode();

        // Check if email already exists
        const existingEmail = await db.execute('SELECT email FROM employees WHERE email = ?', [email]);
        if (existingEmail.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        await db.beginTransaction();

        try {
            // Insert employee record first
            await db.execute(`
                INSERT INTO employees (
                    employee_code, first_name, last_name, full_name, email, phone, 
                    department, position, date_hired, hourly_rate, overtime_rate, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
            `, [
                employee_code, first_name, last_name, `${first_name} ${last_name}`, email, phone,
                department, position, date_hired, salary ? (salary / 2080) : 15.00, 1.50
            ]);

            // Create user account if username and password provided
            if (username && password) {
                // Check if username already exists
                const existingUsername = await db.execute('SELECT username FROM user_accounts WHERE username = ?', [username]);
                if (existingUsername.length > 0) {
                    throw new Error('Username already exists');
                }

                if (password.length < 6) {
                    throw new Error('Password must be at least 6 characters long');
                }

                const saltRounds = 12;
                const password_hash = await bcrypt.hash(password, saltRounds);

                await db.execute(`
                    INSERT INTO user_accounts (
                        employee_id, username, password_hash, role, 
                        is_active, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, TRUE, NOW(), NOW())
                `, [employee_code, username, password_hash, role]);
            }

            await db.commit();

            // Get the created employee data
            const newEmployee = await db.execute(`
                SELECT 
                    e.*,
                    ua.username,
                    ua.role,
                    ua.is_active as account_active
                FROM employees e
                LEFT JOIN user_accounts ua ON e.employee_code = ua.employee_id
                WHERE e.employee_code = ?
            `, [employee_code]);

            res.status(201).json({
                success: true,
                message: 'Employee created successfully',
                data: { employee: newEmployee[0] }
            });

        } catch (error) {
            await db.rollback();
            throw error;
        }

    } catch (error) {
        console.error('Create employee error:', error);
        
        if (error.message === 'Username already exists' || error.message === 'Password must be at least 6 characters long') {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error creating employee'
        });
    }
});

// Update employee
router.put('/:employeeId', requireManagerOrAdmin, async (req, res) => {
    try {
        const { employeeId } = req.params;
        const {
            first_name,
            last_name,
            email,
            phone,
            department,
            position,
            salary,
            employment_type,
            shift_schedule,
            status
        } = req.body;

        // Check if employee exists
        const existing = await db.execute('SELECT employee_id FROM employees WHERE employee_id = ?', [employeeId]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // Check if email belongs to another employee
        if (email) {
            const emailCheck = await db.execute(
                'SELECT employee_id FROM employees WHERE email = ? AND employee_id != ?',
                [email, employeeId]
            );
            if (emailCheck.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists'
                });
            }
        }

        // Build update query dynamically
        const updateFields = [];
        const updateParams = [];

        if (first_name !== undefined) {
            updateFields.push('first_name = ?');
            updateParams.push(first_name);
        }
        if (last_name !== undefined) {
            updateFields.push('last_name = ?');
            updateParams.push(last_name);
        }
        if (email !== undefined) {
            updateFields.push('email = ?');
            updateParams.push(email);
        }
        if (phone !== undefined) {
            updateFields.push('phone = ?');
            updateParams.push(phone);
        }
        if (department !== undefined) {
            updateFields.push('department = ?');
            updateParams.push(department);
        }
        if (position !== undefined) {
            updateFields.push('position = ?');
            updateParams.push(position);
        }
        if (salary !== undefined) {
            updateFields.push('salary = ?');
            updateParams.push(salary);
        }
        if (employment_type !== undefined) {
            updateFields.push('employment_type = ?');
            updateParams.push(employment_type);
        }
        if (shift_schedule !== undefined) {
            updateFields.push('shift_schedule = ?');
            updateParams.push(shift_schedule);
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

        updateFields.push('updated_at = NOW()');
        updateParams.push(employeeId);

        await db.execute(
            `UPDATE employees SET ${updateFields.join(', ')} WHERE employee_id = ?`,
            updateParams
        );

        // Get updated employee data
        const updatedEmployee = await db.execute(`
            SELECT 
                e.*,
                ua.username,
                ua.role,
                ua.is_active as account_active
            FROM employees e
            LEFT JOIN user_accounts ua ON e.employee_id = ua.employee_id
            WHERE e.employee_id = ?
        `, [employeeId]);

        res.json({
            success: true,
            message: 'Employee updated successfully',
            data: { employee: updatedEmployee[0] }
        });

    } catch (error) {
        console.error('Update employee error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating employee'
        });
    }
});

// Delete employee (soft delete)
router.delete('/:employeeId', requireAdmin, async (req, res) => {
    try {
        const { employeeId } = req.params;

        // Check if employee exists
        const existing = await db.execute('SELECT employee_id FROM employees WHERE employee_id = ?', [employeeId]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        await db.beginTransaction();

        try {
            // Soft delete employee
            await db.execute(
                'UPDATE employees SET status = ?, updated_at = NOW() WHERE employee_id = ?',
                ['inactive', employeeId]
            );

            // Deactivate user account
            await db.execute(
                'UPDATE user_accounts SET is_active = FALSE, updated_at = NOW() WHERE employee_id = ?',
                [employeeId]
            );

            // Deactivate all sessions
            await db.execute(
                'UPDATE user_sessions SET is_active = FALSE WHERE employee_id = ?',
                [employeeId]
            );

            await db.commit();

            res.json({
                success: true,
                message: 'Employee deleted successfully'
            });

        } catch (error) {
            await db.rollback();
            throw error;
        }

    } catch (error) {
        console.error('Delete employee error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting employee'
        });
    }
});

// Get employee statistics
router.get('/stats/overview', requireManagerOrAdmin, async (req, res) => {
    try {
        const stats = await Promise.all([
            // Total employees
            db.execute('SELECT COUNT(*) as total FROM employees WHERE status = ?', ['active']),
            
            // By department
            db.execute(`
                SELECT department, COUNT(*) as count 
                FROM employees 
                WHERE status = ? 
                GROUP BY department
            `, ['active']),
            
            // By employment type
            db.execute(`
                SELECT employment_type, COUNT(*) as count 
                FROM employees 
                WHERE status = ? 
                GROUP BY employment_type
            `, ['active']),
            
            // Recent hires (last 30 days)
            db.execute(`
                SELECT COUNT(*) as recent_hires 
                FROM employees 
                WHERE status = ? AND date_hired >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            `, ['active'])
        ]);

        res.json({
            success: true,
            data: {
                total_employees: stats[0][0].total,
                by_department: stats[1],
                by_employment_type: stats[2],
                recent_hires: stats[3][0].recent_hires
            }
        });

    } catch (error) {
        console.error('Get employee stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error getting employee statistics'
        });
    }
});

module.exports = router;
