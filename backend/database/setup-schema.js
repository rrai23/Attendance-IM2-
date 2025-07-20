/**
 * Database Schema Setup Script
 * Creates the complete database structure for the Bricks Attendance System
 * This script is used for initial setup and schema migrations
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 's24100604_bricksdb',
    password: process.env.DB_PASSWORD || 'bricksdatabase',
    database: process.env.DB_NAME || 's24100604_bricksdb',
    multipleStatements: true
};

const SCHEMA_SQL = `
-- Bricks Attendance System Database Schema
-- Optimized for DirectFlow Data Manager

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;

-- Users table for authentication
CREATE TABLE IF NOT EXISTS \`users\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`username\` varchar(50) NOT NULL UNIQUE,
    \`email\` varchar(255) DEFAULT NULL,
    \`password_hash\` varchar(255) NOT NULL,
    \`role\` enum('admin', 'manager', 'employee') DEFAULT 'employee',
    \`is_active\` tinyint(1) DEFAULT 1,
    \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`last_login\` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (\`id\`),
    KEY \`idx_username\` (\`username\`),
    KEY \`idx_email\` (\`email\`),
    KEY \`idx_role\` (\`role\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Employees table
CREATE TABLE IF NOT EXISTS \`employees\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`employee_id\` varchar(20) NOT NULL UNIQUE,
    \`first_name\` varchar(100) NOT NULL,
    \`last_name\` varchar(100) NOT NULL,
    \`email\` varchar(255) DEFAULT NULL,
    \`phone\` varchar(20) DEFAULT NULL,
    \`position\` varchar(100) DEFAULT NULL,
    \`department\` varchar(100) DEFAULT NULL,
    \`hire_date\` date DEFAULT NULL,
    \`salary\` decimal(10,2) DEFAULT NULL,
    \`hourly_rate\` decimal(8,2) DEFAULT NULL,
    \`overtime_rate\` decimal(8,2) DEFAULT NULL,
    \`status\` enum('active', 'inactive', 'terminated') DEFAULT 'active',
    \`user_id\` int(11) DEFAULT NULL,
    \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`idx_employee_id\` (\`employee_id\`),
    KEY \`idx_name\` (\`first_name\`, \`last_name\`),
    KEY \`idx_email\` (\`email\`),
    KEY \`idx_department\` (\`department\`),
    KEY \`idx_status\` (\`status\`),
    KEY \`fk_employee_user\` (\`user_id\`),
    CONSTRAINT \`fk_employee_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Attendance records table
CREATE TABLE IF NOT EXISTS \`attendance\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`employee_id\` varchar(20) NOT NULL,
    \`date\` date NOT NULL,
    \`time_in\` time DEFAULT NULL,
    \`time_out\` time DEFAULT NULL,
    \`break_start\` time DEFAULT NULL,
    \`break_end\` time DEFAULT NULL,
    \`hours_worked\` decimal(4,2) DEFAULT NULL,
    \`overtime_hours\` decimal(4,2) DEFAULT NULL,
    \`status\` enum('present', 'absent', 'late', 'half_day', 'holiday', 'sick', 'vacation') DEFAULT 'present',
    \`notes\` text DEFAULT NULL,
    \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`idx_employee_date\` (\`employee_id\`, \`date\`),
    KEY \`idx_date\` (\`date\`),
    KEY \`idx_status\` (\`status\`),
    KEY \`idx_employee_id\` (\`employee_id\`),
    CONSTRAINT \`fk_attendance_employee\` FOREIGN KEY (\`employee_id\`) REFERENCES \`employees\` (\`employee_id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payroll records table
CREATE TABLE IF NOT EXISTS \`payroll\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`employee_id\` varchar(20) NOT NULL,
    \`pay_period_start\` date NOT NULL,
    \`pay_period_end\` date NOT NULL,
    \`regular_hours\` decimal(6,2) DEFAULT 0.00,
    \`overtime_hours\` decimal(6,2) DEFAULT 0.00,
    \`regular_pay\` decimal(10,2) DEFAULT 0.00,
    \`overtime_pay\` decimal(10,2) DEFAULT 0.00,
    \`gross_pay\` decimal(10,2) DEFAULT 0.00,
    \`deductions\` decimal(10,2) DEFAULT 0.00,
    \`net_pay\` decimal(10,2) DEFAULT 0.00,
    \`bonus\` decimal(10,2) DEFAULT 0.00,
    \`allowances\` decimal(10,2) DEFAULT 0.00,
    \`tax_deductions\` decimal(10,2) DEFAULT 0.00,
    \`status\` enum('draft', 'processed', 'paid') DEFAULT 'draft',
    \`processed_at\` timestamp NULL DEFAULT NULL,
    \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_employee_period\` (\`employee_id\`, \`pay_period_start\`, \`pay_period_end\`),
    KEY \`idx_status\` (\`status\`),
    KEY \`idx_pay_period\` (\`pay_period_start\`, \`pay_period_end\`),
    CONSTRAINT \`fk_payroll_employee\` FOREIGN KEY (\`employee_id\`) REFERENCES \`employees\` (\`employee_id\`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- System settings table
CREATE TABLE IF NOT EXISTS \`settings\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`key\` varchar(100) NOT NULL UNIQUE,
    \`value\` text DEFAULT NULL,
    \`description\` text DEFAULT NULL,
    \`type\` enum('string', 'number', 'boolean', 'json', 'date', 'time') DEFAULT 'string',
    \`category\` varchar(50) DEFAULT 'general',
    \`is_public\` tinyint(1) DEFAULT 0,
    \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`idx_key\` (\`key\`),
    KEY \`idx_category\` (\`category\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions table for authentication
CREATE TABLE IF NOT EXISTS \`sessions\` (
    \`id\` varchar(128) NOT NULL,
    \`user_id\` int(11) NOT NULL,
    \`data\` text,
    \`expires_at\` timestamp NOT NULL,
    \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_user_id\` (\`user_id\`),
    KEY \`idx_expires\` (\`expires_at\`),
    CONSTRAINT \`fk_session_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit log table
CREATE TABLE IF NOT EXISTS \`audit_log\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`user_id\` int(11) DEFAULT NULL,
    \`action\` varchar(100) NOT NULL,
    \`table_name\` varchar(100) DEFAULT NULL,
    \`record_id\` int(11) DEFAULT NULL,
    \`old_values\` json DEFAULT NULL,
    \`new_values\` json DEFAULT NULL,
    \`ip_address\` varchar(45) DEFAULT NULL,
    \`user_agent\` text DEFAULT NULL,
    \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_user_id\` (\`user_id\`),
    KEY \`idx_action\` (\`action\`),
    KEY \`idx_table_record\` (\`table_name\`, \`record_id\`),
    KEY \`idx_created_at\` (\`created_at\`),
    CONSTRAINT \`fk_audit_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin user
INSERT IGNORE INTO \`users\` (\`username\`, \`email\`, \`password_hash\`, \`role\`, \`is_active\`) VALUES
('admin', 'admin@bricks.com', '$2b$10$4RHXyUOVzFPfW3/ZAWfPV.pnLJPaVOqnlWmOhRqAIUqgD8VJo8WT6', 'admin', 1);

-- Insert default system settings
INSERT IGNORE INTO \`settings\` (\`key\`, \`value\`, \`description\`, \`type\`, \`category\`, \`is_public\`) VALUES
('company_name', 'Bricks Attendance System', 'Company name displayed in the system', 'string', 'general', 1),
('working_hours_per_day', '8', 'Standard working hours per day', 'number', 'attendance', 1),
('overtime_threshold', '8', 'Hours threshold for overtime calculation', 'number', 'payroll', 1),
('overtime_multiplier', '1.5', 'Overtime pay multiplier', 'number', 'payroll', 1),
('currency', 'PHP', 'Currency code for payroll', 'string', 'payroll', 1),
('timezone', 'Asia/Manila', 'System timezone', 'string', 'general', 1),
('date_format', 'YYYY-MM-DD', 'Date format for display', 'string', 'general', 1),
('time_format', '24', 'Time format (12 or 24 hour)', 'string', 'general', 1),
('backup_retention_days', '30', 'Days to retain database backups', 'number', 'system', 0),
('session_timeout', '3600', 'Session timeout in seconds', 'number', 'auth', 0);

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;
`;

async function setupDatabase() {
    let connection;
    
    try {
        console.log('🔄 Setting up database schema...');
        
        // First connect without database to create it
        const tempConfig = { ...dbConfig };
        delete tempConfig.database;
        
        connection = await mysql.createConnection(tempConfig);
        
        // Create database if it doesn't exist
        await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log(`✅ Database '${dbConfig.database}' created/verified`);
        
        // Switch to the database
        await connection.query(`USE \`${dbConfig.database}\``);
        
        // Execute schema
        await connection.query(SCHEMA_SQL);
        console.log('✅ Database schema created successfully');
        
        // Verify tables
        const [tables] = await connection.execute('SHOW TABLES');
        console.log('📋 Tables created:');
        tables.forEach(table => {
            console.log(`  - ${table[`Tables_in_${dbConfig.database}`]}`);
        });
        
        // Check if admin user exists
        const [adminUser] = await connection.execute('SELECT username FROM users WHERE username = "admin"');
        if (adminUser.length > 0) {
            console.log('👤 Admin user verified (username: admin, password: admin)');
        } else {
            console.log('⚠️  Admin user not found - you may need to create one manually');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Database setup failed:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

async function verifySchema() {
    let connection;
    
    try {
        connection = await mysql.createConnection(dbConfig);
        
        // Get table info
        const [tables] = await connection.execute('SHOW TABLES');
        const tableNames = tables.map(t => t[`Tables_in_${dbConfig.database}`]);
        
        const expectedTables = ['users', 'employees', 'attendance', 'payroll', 'settings', 'sessions', 'audit_log'];
        const missingTables = expectedTables.filter(table => !tableNames.includes(table));
        
        if (missingTables.length > 0) {
            console.error('❌ Missing tables:', missingTables);
            return false;
        }
        
        console.log('✅ All required tables exist');
        
        // Check admin user
        const [adminUser] = await connection.execute('SELECT id, username, role FROM users WHERE username = "admin"');
        if (adminUser.length === 0) {
            console.error('❌ Admin user not found');
            return false;
        }
        
        console.log('✅ Admin user exists');
        
        return true;
        
    } catch (error) {
        console.error('❌ Schema verification failed:', error);
        return false;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Command line interface
async function main() {
    const command = process.argv[2];
    
    switch (command) {
        case 'setup':
            await setupDatabase();
            break;
        case 'verify':
            const isValid = await verifySchema();
            process.exit(isValid ? 0 : 1);
            break;
        case 'reset':
            console.log('🔄 Resetting database...');
            await setupDatabase();
            console.log('✅ Database reset complete');
            break;
        default:
            console.log('Usage: node setup-schema.js [setup|verify|reset]');
            console.log('  setup  - Create database and tables');
            console.log('  verify - Check if schema is valid');
            console.log('  reset  - Reset database (WARNING: This will delete all data)');
            process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main()
        .then(() => {
            console.log('🎉 Schema setup completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Schema setup failed:', error);
            process.exit(1);
        });
}

module.exports = { setupDatabase, verifySchema, SCHEMA_SQL };
