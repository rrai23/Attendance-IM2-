/**
 * Production Setup Validation Script
 * 
 * This script validates the production setup and ensures all components
 * are working correctly after deployment.
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

class ProductionValidator {
    constructor() {
        this.connection = null;
        this.validationResults = [];
        this.errors = [];
    }

    // Log validation results
    logResult(test, status, message) {
        const result = {
            test,
            status,
            message,
            timestamp: new Date().toISOString()
        };
        
        this.validationResults.push(result);
        
        const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
        console.log(`${emoji} ${test}: ${message}`);
        
        if (status === 'FAIL') {
            this.errors.push(result);
        }
    }

    // Test database connection
    async testDatabaseConnection() {
        try {
            this.connection = await mysql.createConnection({
                host: process.env.DB_HOST || 'localhost',
                port: process.env.DB_PORT || 3306,
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'bricks_attendance'
            });
            
            await this.connection.execute('SELECT 1');
            this.logResult('Database Connection', 'PASS', 'Successfully connected to database');
        } catch (error) {
            this.logResult('Database Connection', 'FAIL', `Connection failed: ${error.message}`);
            throw error;
        }
    }

    // Test table existence
    async testTableExistence() {
        const expectedTables = [
            'departments', 'employees', 'user_accounts', 'user_sessions',
            'attendance_records', 'payroll_records', 'system_settings',
            'audit_log', 'overtime_requests'
        ];

        try {
            const [tables] = await this.connection.execute('SHOW TABLES');
            const tableNames = tables.map(row => Object.values(row)[0]);
            
            const missingTables = expectedTables.filter(table => !tableNames.includes(table));
            
            if (missingTables.length === 0) {
                this.logResult('Table Existence', 'PASS', 'All required tables exist');
            } else {
                this.logResult('Table Existence', 'FAIL', `Missing tables: ${missingTables.join(', ')}`);
            }
        } catch (error) {
            this.logResult('Table Existence', 'FAIL', `Error checking tables: ${error.message}`);
        }
    }

    // Test authentication query (the main fix)
    async testAuthenticationQuery() {
        try {
            const [result] = await this.connection.execute(`
                SELECT 
                    ua.*,
                    e.first_name,
                    e.last_name,
                    e.full_name,
                    e.email,
                    e.department,
                    e.position,
                    e.hire_date,
                    e.status as employee_status
                FROM user_accounts ua
                JOIN employees e ON ua.employee_id = e.employee_id
                WHERE ua.username = ? AND ua.is_active = TRUE AND e.status = 'active'
            `, ['admin']);
            
            if (result.length > 0) {
                this.logResult('Authentication Query', 'PASS', 'JOIN query between user_accounts and employees works correctly');
            } else {
                this.logResult('Authentication Query', 'FAIL', 'No admin user found in JOIN query');
            }
        } catch (error) {
            this.logResult('Authentication Query', 'FAIL', `JOIN query failed: ${error.message}`);
        }
    }

    // Test password hashing
    async testPasswordHashing() {
        try {
            const [result] = await this.connection.execute(
                'SELECT password_hash FROM user_accounts WHERE username = ?',
                ['admin']
            );
            
            if (result.length === 0) {
                this.logResult('Password Hashing', 'FAIL', 'Admin user not found');
                return;
            }
            
            const isValid = await bcrypt.compare('admin123', result[0].password_hash);
            
            if (isValid) {
                this.logResult('Password Hashing', 'PASS', 'Password hashing and verification works correctly');
            } else {
                this.logResult('Password Hashing', 'FAIL', 'Password verification failed');
            }
        } catch (error) {
            this.logResult('Password Hashing', 'FAIL', `Password test failed: ${error.message}`);
        }
    }

    // Test JWT configuration
    async testJWTConfiguration() {
        try {
            const secret = process.env.JWT_SECRET;
            
            if (!secret || secret === 'your-secret-key-change-in-production') {
                this.logResult('JWT Configuration', 'WARN', 'JWT_SECRET should be changed in production');
                return;
            }
            
            if (secret.length < 32) {
                this.logResult('JWT Configuration', 'WARN', 'JWT_SECRET should be at least 32 characters long');
                return;
            }
            
            // Test token creation and verification
            const payload = { test: true };
            const token = jwt.sign(payload, secret, { expiresIn: '1h' });
            const decoded = jwt.verify(token, secret);
            
            if (decoded.test) {
                this.logResult('JWT Configuration', 'PASS', 'JWT configuration is working correctly');
            } else {
                this.logResult('JWT Configuration', 'FAIL', 'JWT verification failed');
            }
        } catch (error) {
            this.logResult('JWT Configuration', 'FAIL', `JWT test failed: ${error.message}`);
        }
    }

    // Test user accounts
    async testUserAccounts() {
        try {
            const [users] = await this.connection.execute(
                'SELECT username, role, is_active FROM user_accounts WHERE is_active = TRUE'
            );
            
            const adminUser = users.find(u => u.username === 'admin' && u.role === 'admin');
            
            if (adminUser) {
                this.logResult('User Accounts', 'PASS', `${users.length} active user accounts found, admin user exists`);
            } else {
                this.logResult('User Accounts', 'FAIL', 'Admin user not found or inactive');
            }
        } catch (error) {
            this.logResult('User Accounts', 'FAIL', `User accounts test failed: ${error.message}`);
        }
    }

    // Test system settings
    async testSystemSettings() {
        try {
            const [settings] = await this.connection.execute(
                'SELECT COUNT(*) as count FROM system_settings'
            );
            
            if (settings[0].count > 0) {
                this.logResult('System Settings', 'PASS', `${settings[0].count} system settings configured`);
            } else {
                this.logResult('System Settings', 'FAIL', 'No system settings found');
            }
        } catch (error) {
            this.logResult('System Settings', 'FAIL', `System settings test failed: ${error.message}`);
        }
    }

    // Test environment variables
    async testEnvironmentVariables() {
        const requiredEnvVars = [
            'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME',
            'JWT_SECRET', 'NODE_ENV'
        ];
        
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length === 0) {
            this.logResult('Environment Variables', 'PASS', 'All required environment variables are set');
        } else {
            this.logResult('Environment Variables', 'FAIL', `Missing environment variables: ${missingVars.join(', ')}`);
        }
        
        // Check for production-specific warnings
        if (process.env.NODE_ENV !== 'production') {
            this.logResult('Environment Variables', 'WARN', 'NODE_ENV is not set to production');
        }
    }

    // Test foreign key constraints
    async testForeignKeyConstraints() {
        try {
            // Test if foreign keys are properly set up
            await this.connection.execute('SET FOREIGN_KEY_CHECKS = 1');
            
            // Try to insert a record that would violate foreign key constraint
            try {
                await this.connection.execute(
                    'INSERT INTO user_accounts (employee_id, username, password_hash) VALUES (?, ?, ?)',
                    ['nonexistent_employee', 'test_user', 'test_hash']
                );
                this.logResult('Foreign Key Constraints', 'FAIL', 'Foreign key constraints are not working');
            } catch (fkError) {
                if (fkError.code === 'ER_NO_REFERENCED_ROW_2') {
                    this.logResult('Foreign Key Constraints', 'PASS', 'Foreign key constraints are working correctly');
                } else {
                    this.logResult('Foreign Key Constraints', 'WARN', `Unexpected error: ${fkError.message}`);
                }
            }
        } catch (error) {
            this.logResult('Foreign Key Constraints', 'FAIL', `Foreign key test failed: ${error.message}`);
        }
    }

    // Generate validation report
    generateReport() {
        const passCount = this.validationResults.filter(r => r.status === 'PASS').length;
        const failCount = this.validationResults.filter(r => r.status === 'FAIL').length;
        const warnCount = this.validationResults.filter(r => r.status === 'WARN').length;
        
        console.log('\n' + '='.repeat(60));
        console.log('PRODUCTION VALIDATION REPORT');
        console.log('='.repeat(60));
        console.log(`✅ Passed: ${passCount}`);
        console.log(`❌ Failed: ${failCount}`);
        console.log(`⚠️  Warnings: ${warnCount}`);
        console.log(`📊 Total Tests: ${this.validationResults.length}`);
        
        if (failCount > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.errors.forEach(error => {
                console.log(`   - ${error.test}: ${error.message}`);
            });
        }
        
        if (warnCount > 0) {
            console.log('\n⚠️  WARNINGS:');
            this.validationResults.filter(r => r.status === 'WARN').forEach(warning => {
                console.log(`   - ${warning.test}: ${warning.message}`);
            });
        }
        
        console.log('\n' + '='.repeat(60));
        
        if (failCount === 0) {
            console.log('🎉 ALL CRITICAL TESTS PASSED - SYSTEM READY FOR PRODUCTION');
        } else {
            console.log('⚠️  SOME TESTS FAILED - PLEASE FIX ISSUES BEFORE PRODUCTION');
        }
        
        console.log('='.repeat(60));
        
        return {
            passed: passCount,
            failed: failCount,
            warnings: warnCount,
            total: this.validationResults.length,
            ready: failCount === 0
        };
    }

    // Run all validation tests
    async validate() {
        console.log('🔍 Starting Production Validation...\n');
        
        try {
            await this.testEnvironmentVariables();
            await this.testDatabaseConnection();
            await this.testTableExistence();
            await this.testAuthenticationQuery();
            await this.testPasswordHashing();
            await this.testJWTConfiguration();
            await this.testUserAccounts();
            await this.testSystemSettings();
            await this.testForeignKeyConstraints();
            
            return this.generateReport();
        } catch (error) {
            console.error('❌ Validation failed:', error.message);
            return {
                passed: 0,
                failed: 1,
                warnings: 0,
                total: 1,
                ready: false
            };
        } finally {
            if (this.connection) {
                await this.connection.end();
            }
        }
    }
}

// Export for use as module
module.exports = ProductionValidator;

// Run if executed directly
if (require.main === module) {
    const validator = new ProductionValidator();
    validator.validate().then(result => {
        process.exit(result.ready ? 0 : 1);
    }).catch(error => {
        console.error('❌ Validation error:', error);
        process.exit(1);
    });
}
