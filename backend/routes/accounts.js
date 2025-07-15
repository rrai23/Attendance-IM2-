const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { auth, requireAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// Get all user accounts (admin only)
router.get('/', requireAdmin, async (req, res) => {
    try {
        const {
            role,
            status,
            search,
            page = 1,
            limit = 50,
            sort = 'created_at',
            order = 'DESC'
        } = req.query;

        let query = `
            SELECT 
                ua.*,
                e.first_name,
                e.last_name,
                e.email,
                e.department,
                e.position,
                e.status as employee_status
            FROM user_accounts ua
            JOIN employees e ON ua.employee_id = e.employee_id
            WHERE 1=1
        `;
        const params = [];

        // Add filters
        if (role) {
            query += ' AND ua.role = ?';
            params.push(role);
        }

        if (status !== undefined) {
            const isActive = status === 'active' || status === 'true' || status === true;
            query += ' AND ua.is_active = ?';
            params.push(isActive);
        }

        if (search) {
            query += ' AND (ua.username LIKE ? OR e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // Add sorting
        const validSortFields = ['username', 'role', 'created_at', 'last_login', 'first_name', 'last_name'];
        const sortField = validSortFields.includes(sort) ? sort : 'created_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        
        if (sort === 'first_name' || sort === 'last_name') {
            query += ` ORDER BY e.${sortField} ${sortOrder}`;
        } else {
            query += ` ORDER BY ua.${sortField} ${sortOrder}`;
        }

        // Add pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const accounts = await db.execute(query, params);

        // Get total count
        let countQuery = `
            SELECT COUNT(*) as total
            FROM user_accounts ua
            JOIN employees e ON ua.employee_id = e.employee_id
            WHERE 1=1
        `;
        const countParams = [];

        if (role) {
            countQuery += ' AND ua.role = ?';
            countParams.push(role);
        }

        if (status !== undefined) {
            const isActive = status === 'active' || status === 'true' || status === true;
            countQuery += ' AND ua.is_active = ?';
            countParams.push(isActive);
        }

        if (search) {
            countQuery += ' AND (ua.username LIKE ? OR e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ?)';
            const searchTerm = `%${search}%`;
            countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        const countResult = await db.execute(countQuery, countParams);
        const total = countResult[0].total;

        // Remove password hashes from response
        const sanitizedAccounts = accounts.map(account => {
            const { password_hash, ...sanitizedAccount } = account;
            return sanitizedAccount;
        });

        res.json({
            success: true,
            data: {
                accounts: sanitizedAccounts,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Get user accounts error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error getting user accounts'
        });
    }
});

// Get single user account
router.get('/:employeeId', auth, async (req, res) => {
    try {
        const { employeeId } = req.params;

        // Users can only view their own account unless they're admin
        if (req.user.role !== 'admin' && req.user.employee_id !== employeeId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const accounts = await db.execute(`
            SELECT 
                ua.*,
                e.first_name,
                e.last_name,
                e.email,
                e.department,
                e.position,
                e.status as employee_status
            FROM user_accounts ua
            JOIN employees e ON ua.employee_id = e.employee_id
            WHERE ua.employee_id = ?
        `, [employeeId]);

        if (accounts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User account not found'
            });
        }

        // Remove password hash from response
        const { password_hash, ...account } = accounts[0];

        res.json({
            success: true,
            data: { account }
        });

    } catch (error) {
        console.error('Get user account error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error getting user account'
        });
    }
});

// Create user account (admin only)
router.post('/', requireAdmin, async (req, res) => {
    try {
        const {
            employee_id,
            username,
            password,
            role = 'employee'
        } = req.body;

        // Validate required fields
        if (!employee_id || !username || !password) {
            return res.status(400).json({
                success: false,
                message: 'employee_id, username, and password are required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Check if employee exists and doesn't already have an account
        const employees = await db.execute(
            'SELECT employee_id FROM employees WHERE employee_id = ? AND status = ?',
            [employee_id, 'active']
        );

        if (employees.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found or inactive'
            });
        }

        // Check if username already exists
        const existingUsername = await db.execute(
            'SELECT username FROM user_accounts WHERE username = ?',
            [username]
        );

        if (existingUsername.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Username already exists'
            });
        }

        // Check if employee already has an account
        const existingAccount = await db.execute(
            'SELECT employee_id FROM user_accounts WHERE employee_id = ?',
            [employee_id]
        );

        if (existingAccount.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Employee already has a user account'
            });
        }

        // Hash password
        const saltRounds = 12;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Create user account
        await db.execute(`
            INSERT INTO user_accounts (
                employee_id, username, password_hash, role, 
                is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, TRUE, NOW(), NOW())
        `, [employee_id, username, password_hash, role]);

        // Get the created account with employee info
        const newAccount = await db.execute(`
            SELECT 
                ua.*,
                e.first_name,
                e.last_name,
                e.email,
                e.department,
                e.position
            FROM user_accounts ua
            JOIN employees e ON ua.employee_id = e.employee_id
            WHERE ua.employee_id = ?
        `, [employee_id]);

        // Remove password hash from response
        const { password_hash: _, ...account } = newAccount[0];

        res.status(201).json({
            success: true,
            message: 'User account created successfully',
            data: { account }
        });

    } catch (error) {
        console.error('Create user account error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating user account'
        });
    }
});

// Update user account
router.put('/:employeeId', auth, async (req, res) => {
    try {
        const { employeeId } = req.params;
        const {
            username,
            role,
            is_active
        } = req.body;

        // Users can only update their own username, admins can update everything
        if (req.user.role !== 'admin' && req.user.employee_id !== employeeId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Non-admin users can only update username
        if (req.user.role !== 'admin' && (role !== undefined || is_active !== undefined)) {
            return res.status(403).json({
                success: false,
                message: 'Only username can be updated by non-admin users'
            });
        }

        // Check if account exists
        const existing = await db.execute(
            'SELECT employee_id FROM user_accounts WHERE employee_id = ?',
            [employeeId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User account not found'
            });
        }

        // Check if username is taken by another user
        if (username) {
            const usernameCheck = await db.execute(
                'SELECT employee_id FROM user_accounts WHERE username = ? AND employee_id != ?',
                [username, employeeId]
            );

            if (usernameCheck.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Username already exists'
                });
            }
        }

        // Build update query dynamically
        const updateFields = [];
        const updateParams = [];

        if (username !== undefined) {
            updateFields.push('username = ?');
            updateParams.push(username);
        }

        if (role !== undefined && req.user.role === 'admin') {
            updateFields.push('role = ?');
            updateParams.push(role);
        }

        if (is_active !== undefined && req.user.role === 'admin') {
            updateFields.push('is_active = ?');
            updateParams.push(is_active);
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
            `UPDATE user_accounts SET ${updateFields.join(', ')} WHERE employee_id = ?`,
            updateParams
        );

        // If account is being deactivated, deactivate all sessions
        if (is_active === false) {
            await db.execute(
                'UPDATE user_sessions SET is_active = FALSE WHERE employee_id = ?',
                [employeeId]
            );
        }

        // Get updated account
        const updatedAccount = await db.execute(`
            SELECT 
                ua.*,
                e.first_name,
                e.last_name,
                e.email,
                e.department,
                e.position
            FROM user_accounts ua
            JOIN employees e ON ua.employee_id = e.employee_id
            WHERE ua.employee_id = ?
        `, [employeeId]);

        // Remove password hash from response
        const { password_hash: _, ...account } = updatedAccount[0];

        res.json({
            success: true,
            message: 'User account updated successfully',
            data: { account }
        });

    } catch (error) {
        console.error('Update user account error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating user account'
        });
    }
});

// Reset password (admin only)
router.post('/:employeeId/reset-password', requireAdmin, async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { new_password } = req.body;

        if (!new_password) {
            return res.status(400).json({
                success: false,
                message: 'new_password is required'
            });
        }

        if (new_password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Check if account exists
        const existing = await db.execute(
            'SELECT employee_id FROM user_accounts WHERE employee_id = ?',
            [employeeId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User account not found'
            });
        }

        // Hash new password
        const saltRounds = 12;
        const password_hash = await bcrypt.hash(new_password, saltRounds);

        // Update password
        await db.execute(
            'UPDATE user_accounts SET password_hash = ?, updated_at = NOW() WHERE employee_id = ?',
            [password_hash, employeeId]
        );

        // Deactivate all sessions for this user (force re-login)
        await db.execute(
            'UPDATE user_sessions SET is_active = FALSE WHERE employee_id = ?',
            [employeeId]
        );

        res.json({
            success: true,
            message: 'Password reset successfully. User will need to log in again.'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error resetting password'
        });
    }
});

// Delete user account (admin only)
router.delete('/:employeeId', requireAdmin, async (req, res) => {
    try {
        const { employeeId } = req.params;

        // Check if account exists
        const existing = await db.execute(
            'SELECT employee_id FROM user_accounts WHERE employee_id = ?',
            [employeeId]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User account not found'
            });
        }

        await db.beginTransaction();

        try {
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
                message: 'User account deleted successfully'
            });

        } catch (error) {
            await db.rollback();
            throw error;
        }

    } catch (error) {
        console.error('Delete user account error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting user account'
        });
    }
});

// Get account statistics (admin only)
router.get('/stats/overview', requireAdmin, async (req, res) => {
    try {
        const stats = await Promise.all([
            // Total accounts
            db.execute('SELECT COUNT(*) as total FROM user_accounts WHERE is_active = TRUE'),
            
            // By role
            db.execute(`
                SELECT role, COUNT(*) as count 
                FROM user_accounts 
                WHERE is_active = TRUE 
                GROUP BY role
            `),
            
            // Recent logins (last 24 hours)
            db.execute(`
                SELECT COUNT(DISTINCT ua.employee_id) as recent_logins
                FROM user_accounts ua
                JOIN user_sessions us ON ua.employee_id = us.employee_id
                WHERE ua.is_active = TRUE AND us.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            `),
            
            // Inactive accounts
            db.execute('SELECT COUNT(*) as inactive FROM user_accounts WHERE is_active = FALSE')
        ]);

        res.json({
            success: true,
            data: {
                total_accounts: stats[0][0].total,
                by_role: stats[1],
                recent_logins: stats[2][0].recent_logins,
                inactive_accounts: stats[3][0].inactive
            }
        });

    } catch (error) {
        console.error('Get account stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error getting account statistics'
        });
    }
});

// Get user sessions (admin only or own sessions)
router.get('/:employeeId/sessions', auth, async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { active_only = true, limit = 20 } = req.query;

        // Users can only view their own sessions unless they're admin
        if (req.user.role !== 'admin' && req.user.employee_id !== employeeId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        let query = `
            SELECT 
                session_id,
                employee_id,
                expires_at,
                is_active,
                created_at
            FROM user_sessions 
            WHERE employee_id = ?
        `;
        const params = [employeeId];

        if (active_only === 'true' || active_only === true) {
            query += ' AND is_active = TRUE';
        }

        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(parseInt(limit));

        const sessions = await db.execute(query, params);

        res.json({
            success: true,
            data: { sessions }
        });

    } catch (error) {
        console.error('Get user sessions error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error getting user sessions'
        });
    }
});

module.exports = router;
