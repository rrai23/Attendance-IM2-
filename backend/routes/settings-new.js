const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { auth, requireAdmin } = require('../middleware/auth');

// Get all system settings
router.get('/', auth, async (req, res) => {
    try {
        const [settings] = await db.execute(
            'SELECT setting_key, setting_value, setting_type FROM system_settings ORDER BY setting_key'
        );

        // Convert to flat object format with proper type conversion
        const flatSettings = {};
        settings.forEach(setting => {
            let value = setting.setting_value;
            
            // Convert based on setting_type
            try {
                switch (setting.setting_type) {
                    case 'number':
                        value = parseFloat(value);
                        break;
                    case 'boolean':
                        value = value === 'true' || value === '1' || value === 1;
                        break;
                    case 'json':
                        value = JSON.parse(value);
                        break;
                    default:
                        // Keep as string
                        break;
                }
            } catch (e) {
                console.warn(`Error parsing setting ${setting.setting_key}:`, e);
                // Keep original value if parsing fails
            }
            
            flatSettings[setting.setting_key] = value;
        });

        res.json({
            success: true,
            data: flatSettings
        });

    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error getting settings'
        });
    }
});

// Get specific setting
router.get('/:key', auth, async (req, res) => {
    try {
        const { key } = req.params;

        const [settings] = await db.execute(
            'SELECT setting_key, setting_value, description FROM system_settings WHERE setting_key = ?',
            [key]
        );

        if (settings.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found'
            });
        }

        const setting = settings[0];
        let value;
        try {
            value = JSON.parse(setting.setting_value);
        } catch {
            value = setting.setting_value;
        }

        res.json({
            success: true,
            data: {
                key: setting.setting_key,
                value: value,
                description: setting.description
            }
        });

    } catch (error) {
        console.error('Get setting error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error getting setting'
        });
    }
});

// Update system settings (admin only)
router.put('/', auth, requireAdmin, async (req, res) => {
    try {
        console.log('PUT /settings called with:', req.body);
        const settings = req.body;

        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Settings object is required'
            });
        }

        const results = [];
        const errors = [];

        // Process each setting directly (frontend sends camelCase keys that match database)
        for (const [key, value] of Object.entries(settings)) {
            try {
                console.log(`Processing setting: ${key} = ${value}`);
                
                // Determine setting type and convert value appropriately
                let settingType = 'string';
                let stringValue = value;
                
                if (typeof value === 'number') {
                    settingType = 'number';
                    stringValue = value.toString();
                } else if (typeof value === 'boolean') {
                    settingType = 'boolean';
                    stringValue = value.toString();
                } else if (typeof value === 'object' && value !== null) {
                    settingType = 'json';
                    stringValue = JSON.stringify(value);
                } else {
                    stringValue = String(value);
                }

                // Try to update existing setting first
                const [updateResult] = await db.execute(
                    'UPDATE system_settings SET setting_value = ?, setting_type = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?',
                    [stringValue, settingType, key]
                );

                if (updateResult.affectedRows === 0) {
                    // Setting doesn't exist, create it
                    await db.execute(
                        'INSERT INTO system_settings (setting_key, setting_value, setting_type) VALUES (?, ?, ?)',
                        [key, stringValue, settingType]
                    );
                    console.log(`Created setting: ${key}`);
                    results.push({ key: key, status: 'created' });
                } else {
                    console.log(`Updated setting: ${key}`);
                    results.push({ key: key, status: 'updated' });
                }

            } catch (error) {
                console.error(`Error updating setting ${key}:`, error);
                errors.push({
                    key: key,
                    error: error.message
                });
            }
        }

        if (errors.length > 0) {
            console.error('Some settings failed to update:', errors);
            return res.status(400).json({
                success: false,
                message: 'Some settings failed to update',
                errors: errors,
                updated: results
            });
        }

        console.log('Settings update successful:', results);
        res.json({
            success: true,
            message: 'Settings updated successfully',
            updated: results
        });

    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating settings'
        });
    }
});

// Create new setting (admin only)
router.post('/', auth, requireAdmin, async (req, res) => {
    try {
        const { key, value, description, type = 'string', isEditable = true } = req.body;

        if (!key || value === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Key and value are required'
            });
        }

        // Check if setting already exists
        const [existing] = await db.execute(
            'SELECT id FROM system_settings WHERE setting_key = ?',
            [key]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Setting already exists'
            });
        }

        // Convert value to string based on type
        let stringValue = value;
        if (type === 'json') {
            stringValue = JSON.stringify(value);
        } else {
            stringValue = String(value);
        }

        await db.execute(
            'INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_editable) VALUES (?, ?, ?, ?, ?)',
            [key, stringValue, type, description, isEditable]
        );

        res.status(201).json({
            success: true,
            message: 'Setting created successfully',
            data: { key, value, type, description, isEditable }
        });

    } catch (error) {
        console.error('Create setting error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating setting'
        });
    }
});

// Delete setting (admin only)
router.delete('/:key', auth, requireAdmin, async (req, res) => {
    try {
        const { key } = req.params;

        const [result] = await db.execute(
            'DELETE FROM system_settings WHERE setting_key = ? AND is_editable = 1',
            [key]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Setting not found or not editable'
            });
        }

        res.json({
            success: true,
            message: 'Setting deleted successfully'
        });

    } catch (error) {
        console.error('Delete setting error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting setting'
        });
    }
});

module.exports = router;
