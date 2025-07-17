const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { auth, requireAdmin, requireManagerOrAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { createJWTToken, calculateExpiryDate } = require('./auth');

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
                e.hire_date,
                e.status,
                e.wage as hourly_rate,
                null as overtime_rate,
                e.wage,
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
            query += ' AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ? OR e.employee_id LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // Add sorting
        const validSortFields = ['employee_id', 'first_name', 'last_name', 'department', 'position', 'hire_date', 'created_at'];
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
            countQuery += ' AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ? OR e.employee_id LIKE ?)';
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
            LEFT JOIN user_accounts ua ON e.employee_id = ua.employee_id
            WHERE e.id = ?
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
            hire_date,
            wage,
            employment_type = 'full-time',
            shift_schedule = 'day',
            role = 'employee'
        } = req.body;

        // Validate required fields
        if (!first_name || !last_name || !email || !department || !position || !hire_date) {
            return res.status(400).json({
                success: false,
                message: 'Required fields: first_name, last_name, email, department, position, hire_date'
            });
        }

        // Auto-generate username and password based on the naming convention
        // Username: concatenate all names, remove spaces, lowercase
        // Password: lastname + "123", remove spaces, lowercase
        const generateCredentials = (firstName, lastName) => {
            const username = `${firstName}${lastName}`.toLowerCase().replace(/\s+/g, '');
            const password = `${lastName.toLowerCase().replace(/\s+/g, '')}123`;
            return { username, password };
        };

        const { username, password } = generateCredentials(first_name, last_name);

        console.log(`🔧 Auto-generating credentials for ${first_name} ${last_name}:`);
        console.log(`   Username: ${username}`);
        console.log(`   Password: ${password}`);

        // Generate unique employee code
        const generateEmployeeCode = async () => {
            const year = new Date().getFullYear().toString().slice(-2);
            let counter = 1;
            
            while (true) {
                const empCode = `EMP${year}${counter.toString().padStart(4, '0')}`;
                const existing = await db.execute('SELECT employee_id FROM employees WHERE employee_id = ?', [empCode]);
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

        // Check if generated username already exists and make it unique if needed
        const ensureUniqueUsername = async (baseUsername) => {
            let uniqueUsername = baseUsername;
            let counter = 1;
            
            while (true) {
                const existing = await db.execute('SELECT username FROM user_accounts WHERE username = ?', [uniqueUsername]);
                if (existing.length === 0) {
                    return uniqueUsername;
                }
                counter++;
                uniqueUsername = `${baseUsername}${counter}`;
            }
        };

        const finalUsername = await ensureUniqueUsername(username);
        
        if (finalUsername !== username) {
            console.log(`   📝 Username '${username}' was taken, using '${finalUsername}' instead`);
        }

        // Prepare transaction queries
        const queries = [];
        
        // Insert employee record first
        queries.push({
            query: `
                INSERT INTO employees (
                    employee_id, first_name, last_name, full_name, email, phone, 
                    department, position, hire_date, wage, overtime_rate, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
            `,
            params: [
                employee_code, first_name, last_name, `${first_name} ${last_name}`, email, phone,
                department, position, hire_date, wage || 15.00, 1.50
            ]
        });

        // Always create user account with auto-generated credentials
        const saltRounds = 12;
        const password_hash = await bcrypt.hash(password, saltRounds);

        queries.push({
            query: `
                INSERT INTO user_accounts (
                    employee_id, username, password_hash, role, 
                    is_active, created_at, updated_at
                ) VALUES (?, ?, ?, ?, TRUE, NOW(), NOW())
            `,
            params: [employee_code, finalUsername, password_hash, role]
        });

        // Execute transaction
        await db.transaction(queries);

        // Get the created employee data
        const newEmployee = await db.execute(`
            SELECT 
                e.*,
                ua.username,
                ua.role,
                ua.is_active as account_active
            FROM employees e
            LEFT JOIN user_accounts ua ON e.employee_id = ua.employee_id
            WHERE e.employee_id = ?
        `, [employee_code]);

        // Create JWT token with 365-day expiry for the new employee
        const tokenPayload = {
            employee_id: employee_code,
            username: finalUsername,
            role: role
        };

        const longTermToken = createJWTToken(tokenPayload, '365d');
        const tokenExpiryDate = calculateExpiryDate('365d');

        // Store the session in database
        try {
            await db.execute(`
                INSERT INTO user_sessions (employee_id, token_hash, expires_at, is_active, created_at)
                VALUES (?, ?, ?, TRUE, NOW())
            `, [employee_code, longTermToken, tokenExpiryDate]);
            
            console.log(`🔑 Long-term JWT token created for ${finalUsername} (expires: ${tokenExpiryDate.toISOString()})`);
        } catch (sessionError) {
            console.warn('⚠️ Failed to store session, but employee creation was successful:', sessionError.message);
        }

        // Log the successful creation with credentials
        console.log(`✅ Employee created successfully:`);
        console.log(`   Name: ${first_name} ${last_name}`);
        console.log(`   Employee ID: ${employee_code}`);
        console.log(`   Username: ${finalUsername}`);
        console.log(`   Password: ${password}`);
        console.log(`   Email: ${email}`);
        console.log(`   JWT Token: ${longTermToken.substring(0, 20)}...`);
        console.log(`   Token Expires: ${tokenExpiryDate.toISOString()}`);

        res.status(201).json({
            success: true,
            message: 'Employee and user account created successfully',
            data: { 
                employee: newEmployee[0],
                credentials: {
                    username: finalUsername,
                    password: password,
                    token: longTermToken,
                    tokenExpiry: tokenExpiryDate.toISOString(),
                    note: "Please share these credentials securely with the employee. The JWT token has a 365-day expiry and can be used for API access."
                }
            }
        });

    } catch (error) {
        console.error('Create employee error:', error);
        
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
            wage,
            employment_type,
            shift_schedule,
            status
        } = req.body;

        // Check if employee exists - use database id (primary key)
        const existing = await db.execute('SELECT id, employee_id FROM employees WHERE id = ?', [employeeId]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        const employeeCode = existing[0].employee_id;

        // Check if email belongs to another employee
        if (email) {
            const emailCheck = await db.execute(
                'SELECT employee_id FROM employees WHERE email = ? AND id != ?',
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
        if (wage !== undefined) {
            updateFields.push('wage = ?');
            updateParams.push(wage);
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
            `UPDATE employees SET ${updateFields.join(', ')} WHERE id = ?`,
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
            WHERE e.id = ?
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
router.delete('/:employeeId', auth, requireAdmin, async (req, res) => {
    try {
        const { employeeId } = req.params;

        // Check if employee exists - use database id (primary key)
        const existing = await db.execute('SELECT id, employee_id FROM employees WHERE id = ?', [employeeId]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        const employeeCode = existing[0].employee_id;

        // Use transaction to safely delete employee
        const queries = [
            {
                query: 'UPDATE employees SET status = ?, updated_at = NOW() WHERE id = ?',
                params: ['inactive', employeeId]
            },
            {
                query: 'UPDATE user_accounts SET is_active = FALSE, updated_at = NOW() WHERE employee_id = ?',
                params: [employeeCode]
            },
            {
                query: 'UPDATE user_sessions SET is_active = FALSE WHERE employee_id = ?',
                params: [employeeCode]
            }
        ];

        await db.transaction(queries);

        res.json({
            success: true,
            message: 'Employee deleted successfully'
        });

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
                WHERE status = ? AND hire_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
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
