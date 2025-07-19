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
                ua.id,
                ua.employee_id,
                ua.username,
                ua.password_hash,
                ua.role,
                ua.is_active,
                ua.last_login,
                ua.failed_login_attempts,
                ua.account_locked_until,
                ua.password_reset_token,
                ua.password_reset_expires,
                ua.created_at,
                ua.updated_at,
                ua.email as ua_email,
                ua.phone,
                ua.department as ua_department,
                ua.position as ua_position,
                ua.hire_date as ua_hire_date,
                ua.employee_status,
                e.first_name,
                e.last_name,
                CONCAT(e.first_name, ' ', e.last_name) as full_name,
                COALESCE(e.email, ua.email) as email,
                COALESCE(e.department, ua.department) as department,
                COALESCE(e.position, ua.position) as position,
                e.status as employee_status
            FROM user_accounts ua
            JOIN employees e ON ua.employee_id = e.employee_id
        `;
        
        const queryParams = [];
        const conditions = [];

        // Filter by role
        if (role) {
            conditions.push('ua.role = ?');
            queryParams.push(role);
        }

        // Filter by account status
        if (status === 'active') {
            conditions.push('ua.is_active = TRUE');
        } else if (status === 'inactive') {
            conditions.push('ua.is_active = FALSE');
        }

        // Search functionality
        if (search) {
            conditions.push('(ua.username LIKE ? OR e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ?)');
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        // Add ordering
        const validSortFields = ['username', 'role', 'is_active', 'created_at', 'last_login'];
        const sortField = validSortFields.includes(sort) ? sort : 'created_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY ua.${sortField} ${sortOrder}`;

        // Add pagination
        const offset = (page - 1) * limit;
        query += ' LIMIT ? OFFSET ?';
        queryParams.push(parseInt(limit), offset);

        const accounts = await db.execute(query, queryParams);

        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(*) as total
            FROM user_accounts ua
            JOIN employees e ON ua.employee_id = e.employee_id
        `;
        
        const countParams = [];
        if (conditions.length > 0) {
            countQuery += ' WHERE ' + conditions.join(' AND ');
            // Add the same search parameters (excluding limit/offset)
            if (role) countParams.push(role);
            if (search) {
                const searchTerm = `%${search}%`;
                countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
            }
        }

        const countResult = await db.execute(countQuery, countParams);
        const total = countResult[0].total;

        // Remove password hashes from response
        const sanitizedAccounts = accounts.map(account => {
            const { password_hash, ...sanitized } = account;
            return sanitized;
        });

        res.json({
            success: true,
            data: {
                accounts: sanitizedAccounts,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Error getting user accounts:', error);
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
                ua.id,
                ua.employee_id,
                ua.username,
                ua.password_hash,
                ua.role,
                ua.is_active,
                ua.last_login,
                ua.failed_login_attempts,
                ua.account_locked_until,
                ua.password_reset_token,
                ua.password_reset_expires,
                ua.created_at,
                ua.updated_at,
                ua.email as ua_email,
                ua.phone,
                ua.department as ua_department,
                ua.position as ua_position,
                ua.hire_date as ua_hire_date,
                ua.employee_status,
                e.first_name,
                e.last_name,
                CONCAT(e.first_name, ' ', e.last_name) as full_name,
                COALESCE(e.email, ua.email) as email,
                COALESCE(e.department, ua.department) as department,
                COALESCE(e.position, ua.position) as position,
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
        console.error('Error getting user account:', error);
        res.status(500).json({
            success: false,
            message: 'Server error getting user account'
        });
    }
});

// Create new user account (admin only)
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { employee_id, username, password, role = 'employee' } = req.body;

        if (!employee_id || !username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID, username, and password are required'
            });
        }

        // Check if employee exists and is active
        const employees = await db.execute(
            'SELECT employee_id, status FROM employees WHERE employee_id = ?',
            [employee_id]
        );

        if (employees.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Employee not found'
            });
        }

        if (employees[0].status !== 'active') {
            return res.status(400).json({
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
                ua.id,
                ua.employee_id,
                ua.username,
                ua.password_hash,
                ua.role,
                ua.is_active,
                ua.last_login,
                ua.failed_login_attempts,
                ua.account_locked_until,
                ua.password_reset_token,
                ua.password_reset_expires,
                ua.created_at,
                ua.updated_at,
                ua.email as ua_email,
                ua.phone,
                ua.department as ua_department,
                ua.position as ua_position,
                ua.hire_date as ua_hire_date,
                ua.employee_status,
                e.first_name,
                e.last_name,
                CONCAT(e.first_name, ' ', e.last_name) as full_name,
                COALESCE(e.email, ua.email) as email,
                COALESCE(e.department, ua.department) as department,
                COALESCE(e.position, ua.position) as position
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
        console.error('Error creating user account:', error);
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
                ua.id,
                ua.employee_id,
                ua.username,
                ua.password_hash,
                ua.role,
                ua.is_active,
                ua.last_login,
                ua.failed_login_attempts,
                ua.account_locked_until,
                ua.password_reset_token,
                ua.password_reset_expires,
                ua.created_at,
                ua.updated_at,
                ua.email as ua_email,
                ua.phone,
                ua.department as ua_department,
                ua.position as ua_position,
                ua.hire_date as ua_hire_date,
                ua.employee_status,
                e.first_name,
                e.last_name,
                CONCAT(e.first_name, ' ', e.last_name) as full_name,
                COALESCE(e.email, ua.email) as email,
                COALESCE(e.department, ua.department) as department,
                COALESCE(e.position, ua.position) as position
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
        console.error('Error updating user account:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating user account'
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

        // Delete all user sessions first
        await db.execute(
            'DELETE FROM user_sessions WHERE employee_id = ?',
            [employeeId]
        );

        // Delete user account
        await db.execute(
            'DELETE FROM user_accounts WHERE employee_id = ?',
            [employeeId]
        );

        res.json({
            success: true,
            message: 'User account deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting user account:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting user account'
        });
    }
});

// Change password
router.put('/:employeeId/password', auth, async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { currentPassword, newPassword } = req.body;

        // Users can only change their own password unless they're admin
        if (req.user.role !== 'admin' && req.user.employee_id !== employeeId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        if (!newPassword) {
            return res.status(400).json({
                success: false,
                message: 'New password is required'
            });
        }

        // For non-admin users, verify current password
        if (req.user.role !== 'admin') {
            if (!currentPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is required'
                });
            }

            const userResult = await db.execute(
                'SELECT password_hash FROM user_accounts WHERE employee_id = ?',
                [employeeId]
            );

            if (!userResult || userResult.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User account not found'
                });
            }

            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userResult[0].password_hash);
            if (!isCurrentPasswordValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }
        }

        // Hash new password
        const saltRounds = 12;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await db.execute(
            'UPDATE user_accounts SET password_hash = ?, updated_at = NOW() WHERE employee_id = ?',
            [newPasswordHash, employeeId]
        );

        // Invalidate all sessions for this user (force re-login)
        await db.execute(
            'UPDATE user_sessions SET is_active = FALSE WHERE employee_id = ?',
            [employeeId]
        );

        res.json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({
            success: false,
            message: 'Server error changing password'
        });
    }
});

module.exports = router;
