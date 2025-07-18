const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { auth, requireManagerOrAdmin } = require('../middleware/auth');

// Get overtime requests for the authenticated user
router.get('/', auth, async (req, res) => {
    try {
        const employee_id = req.user.employee_id;
        const { status, start_date, end_date, page = 1, limit = 50 } = req.query;

        let query = `
            SELECT 
                ot.*,
                e.first_name,
                e.last_name,
                e.department
            FROM overtime_requests ot
            JOIN employees e ON ot.employee_id = e.employee_id
            WHERE ot.employee_id = ?
        `;
        
        const params = [employee_id];

        // Add filters
        if (status) {
            query += ' AND ot.status = ?';
            params.push(status);
        }

        if (start_date) {
            query += ' AND ot.request_date >= ?';
            params.push(start_date);
        }

        if (end_date) {
            query += ' AND ot.request_date <= ?';
            params.push(end_date);
        }

        // Add sorting and pagination
        query += ' ORDER BY ot.created_at DESC';
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const result = await db.execute(query, params);
        const records = result; // mysql2 execute returns array directly

        // Get total count
        let countQuery = `
            SELECT COUNT(*) as total
            FROM overtime_requests ot
            WHERE ot.employee_id = ?
        `;
        const countParams = [employee_id];

        if (status) {
            countQuery += ' AND ot.status = ?';
            countParams.push(status);
        }

        if (start_date) {
            countQuery += ' AND ot.request_date >= ?';
            countParams.push(start_date);
        }

        if (end_date) {
            countQuery += ' AND ot.request_date <= ?';
            countParams.push(end_date);
        }

        const countResult = await db.execute(countQuery, countParams);
        const totalCount = countResult[0]; // mysql2 execute returns array directly
        const total = totalCount?.total || 0;

        res.json({
            success: true,
            data: {
                requests: records,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Get overtime requests error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error getting overtime requests'
        });
    }
});

// Submit new overtime request
router.post('/', auth, async (req, res) => {
    try {
        const employee_id = req.user.employee_id;
        const { request_date, hours_requested, reason } = req.body;

        // Validate required fields
        if (!request_date || !hours_requested || !reason) {
            return res.status(400).json({
                success: false,
                message: 'Request date, hours requested, and reason are required'
            });
        }

        // Validate hours
        const hours = parseFloat(hours_requested);
        if (isNaN(hours) || hours <= 0 || hours > 12) {
            return res.status(400).json({
                success: false,
                message: 'Hours requested must be between 0 and 12'
            });
        }

        // Check if employee already has a pending request for this date
        const existingRequest = await db.execute(`
            SELECT id FROM overtime_requests 
            WHERE employee_id = ? AND request_date = ? AND status = 'pending'
        `, [employee_id, request_date]);

        if (existingRequest.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'You already have a pending overtime request for this date'
            });
        }

        // Insert new overtime request
        const result = await db.execute(`
            INSERT INTO overtime_requests (
                employee_id, request_date, hours_requested, reason, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, 'pending', NOW(), NOW())
        `, [employee_id, request_date, hours, reason]);

        const insertId = result.insertId || (result[0] && result[0].insertId) || (Array.isArray(result) && result[0] && result[0].insertId);

        // Get the created request with employee info
        const newRequestQuery = await db.execute(`
            SELECT 
                ot.*,
                e.first_name,
                e.last_name,
                e.department
            FROM overtime_requests ot
            JOIN employees e ON ot.employee_id = e.employee_id
            WHERE ot.id = ?
        `, [insertId]);

        const newRequestRecords = Array.isArray(newRequestQuery[0]) ? newRequestQuery[0] : [newRequestQuery[0]];
        const newRequest = newRequestRecords[0];

        res.status(201).json({
            success: true,
            message: 'Overtime request submitted successfully',
            data: {
                request: newRequest
            }
        });

    } catch (error) {
        console.error('Submit overtime request error:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            sqlState: error.sqlState,
            stack: error.stack
        });
        res.status(500).json({
            success: false,
            message: 'Server error submitting overtime request',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Cancel overtime request (only if pending)
router.delete('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const employee_id = req.user.employee_id;

        // Check if request exists and belongs to user
        const requestQuery = await db.execute(`
            SELECT * FROM overtime_requests 
            WHERE id = ? AND employee_id = ?
        `, [id, employee_id]);

        // Handle mysql2 result format - single object for single row
        const request = requestQuery[0];
        
        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Overtime request not found'
            });
        }

        // Only allow cancellation of pending requests
        if (request.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Can only cancel pending overtime requests'
            });
        }

        // Delete the request
        await db.execute('DELETE FROM overtime_requests WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Overtime request cancelled successfully',
            data: {
                cancelled_request: {
                    id: request.id,
                    request_date: request.request_date,
                    hours_requested: request.hours_requested
                }
            }
        });

    } catch (error) {
        console.error('Cancel overtime request error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error cancelling overtime request'
        });
    }
});

// Get all overtime requests (admin/manager only)
router.get('/all', auth, requireManagerOrAdmin, async (req, res) => {
    try {
        const { employee_id, status, start_date, end_date, page = 1, limit = 50 } = req.query;

        let query = `
            SELECT 
                ot.*,
                e.first_name,
                e.last_name,
                e.department,
                e.position
            FROM overtime_requests ot
            JOIN employees e ON ot.employee_id = e.employee_id
            WHERE 1=1
        `;
        
        const params = [];

        // Add filters
        if (employee_id) {
            query += ' AND ot.employee_id = ?';
            params.push(employee_id);
        }

        if (status) {
            query += ' AND ot.status = ?';
            params.push(status);
        }

        if (start_date) {
            query += ' AND ot.request_date >= ?';
            params.push(start_date);
        }

        if (end_date) {
            query += ' AND ot.request_date <= ?';
            params.push(end_date);
        }

        // Add sorting and pagination
        query += ' ORDER BY ot.created_at DESC';
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const result = await db.execute(query, params);
        const records = result; // mysql2 execute returns array directly

        // Get total count
        let countQuery = `
            SELECT COUNT(*) as total
            FROM overtime_requests ot
            WHERE 1=1
        `;
        const countParams = [];

        if (employee_id) {
            countQuery += ' AND ot.employee_id = ?';
            countParams.push(employee_id);
        }

        if (status) {
            countQuery += ' AND ot.status = ?';
            countParams.push(status);
        }

        if (start_date) {
            countQuery += ' AND ot.request_date >= ?';
            countParams.push(start_date);
        }

        if (end_date) {
            countQuery += ' AND ot.request_date <= ?';
            countParams.push(end_date);
        }

        const countResult = await db.execute(countQuery, countParams);
        const total = countResult[0]?.total || 0;

        res.json({
            success: true,
            data: {
                requests: records,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Get all overtime requests error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error getting overtime requests'
        });
    }
});

// Approve/reject overtime request (admin/manager only)
router.patch('/:id', auth, requireManagerOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        const approved_by = req.user.employee_id;

        // Validate status
        if (!status || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status must be either "approved" or "rejected"'
            });
        }

        // Check if request exists
        const requestQuery = await db.execute(`
            SELECT * FROM overtime_requests WHERE id = ?
        `, [id]);

        const requestRecords = requestQuery; // mysql2 execute returns array directly
        if (requestRecords.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Overtime request not found'
            });
        }

        const request = requestRecords[0];

        // Only allow updating pending requests
        if (request.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Can only approve/reject pending overtime requests'
            });
        }

        // Update the request
        await db.execute(`
            UPDATE overtime_requests 
            SET status = ?, approved_by = ?, approved_at = NOW(), updated_at = NOW()
            WHERE id = ?
        `, [status, approved_by, id]);

        // Get the updated request with employee info
        const updatedRequestQuery = await db.execute(`
            SELECT 
                ot.*,
                e.first_name,
                e.last_name,
                e.department,
                e.position
            FROM overtime_requests ot
            JOIN employees e ON ot.employee_id = e.employee_id
            WHERE ot.id = ?
        `, [id]);

        const updatedRequest = updatedRequestQuery[0]; // Get first result

        res.json({
            success: true,
            message: `Overtime request ${status} successfully`,
            data: {
                request: updatedRequest
            }
        });

    } catch (error) {
        console.error('Update overtime request error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating overtime request'
        });
    }
});

// Get overtime summary statistics
router.get('/stats', auth, async (req, res) => {
    try {
        const employee_id = req.user.employee_id;
        const { period = 'month' } = req.query;

        // Calculate date range
        const now = new Date();
        let start_date;
        
        if (period === 'week') {
            start_date = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (period === 'month') {
            start_date = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (period === 'year') {
            start_date = new Date(now.getFullYear(), 0, 1);
        } else {
            start_date = new Date(now.getFullYear(), now.getMonth(), 1); // Default to month
        }

        const end_date = now;

        // Get statistics
        const statsQuery = await db.execute(`
            SELECT 
                COUNT(*) as total_requests,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_requests,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_requests,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_requests,
                SUM(CASE WHEN status = 'approved' THEN hours_requested ELSE 0 END) as approved_hours
            FROM overtime_requests 
            WHERE employee_id = ? AND request_date >= ? AND request_date <= ?
        `, [employee_id, start_date.toISOString().split('T')[0], end_date.toISOString().split('T')[0]]);

        const statsResult = statsQuery[0];

        res.json({
            success: true,
            data: {
                period,
                start_date: start_date.toISOString().split('T')[0],
                end_date: end_date.toISOString().split('T')[0],
                statistics: {
                    total_requests: parseInt(statsResult?.total_requests || 0),
                    pending_requests: parseInt(statsResult?.pending_requests || 0),
                    approved_requests: parseInt(statsResult?.approved_requests || 0),
                    rejected_requests: parseInt(statsResult?.rejected_requests || 0),
                    approved_hours: parseFloat(statsResult?.approved_hours || 0)
                }
            }
        });

    } catch (error) {
        console.error('Get overtime stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error getting overtime statistics'
        });
    }
});

module.exports = router;
