const mysql = require('mysql2/promise');
require('dotenv').config();

// Database connection configuration (for individual connections)
const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bricks_attendance',
    multipleStatements: true,
    timezone: '+00:00', // Store everything in UTC
    charset: 'utf8mb4'
};

// Pool-specific configuration (includes connection config + pool options)
const poolConfig = {
    ...connectionConfig,
    // Pool-only options
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Note: acquireTimeout and timeout are not valid in MySQL2
    // Use alternative timeout handling if needed
    // MySQL2 connection enhancement options
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
};

// Create connection pool
const pool = mysql.createPool(poolConfig);

// Test connection and create database if it doesn't exist
const initializeDatabase = async () => {
    try {
        // First connect without specifying database to create it if needed
        const tempConfig = {
            host: connectionConfig.host,
            port: connectionConfig.port,
            user: connectionConfig.user,
            password: connectionConfig.password,
            multipleStatements: connectionConfig.multipleStatements,
            timezone: connectionConfig.timezone,
            charset: connectionConfig.charset
        };
        const tempConnection = await mysql.createConnection(tempConfig);
        
        // Create database if it doesn't exist
        await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${connectionConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await tempConnection.end();
        
        // Test main connection
        const connection = await pool.getConnection();
        console.log(`✅ Connected to MySQL database: ${connectionConfig.database}`);
        connection.release();
        
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        throw error;
    }
};

// Initialize database on startup
initializeDatabase().catch(console.error);

// Helper function to execute queries with error handling
const executeQuery = async (query, params = []) => {
    try {
        const [rows] = await pool.execute(query, params);
        return rows;
    } catch (error) {
        console.error('Database query error:', error);
        console.error('Query:', query);
        console.error('Params:', params);
        throw error;
    }
};

// Helper function to execute transactions
const executeTransaction = async (queries) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const results = [];
        for (const { query, params } of queries) {
            const [result] = await connection.execute(query, params || []);
            results.push(result);
        }
        
        await connection.commit();
        return results;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

// Export pool and helper functions
module.exports = {
    pool,
    execute: executeQuery,
    transaction: executeTransaction,
    end: () => pool.end()
};

// Export direct access for advanced usage
module.exports.connection = pool;
