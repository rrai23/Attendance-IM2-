const mysql = require('mysql2/promise');

// Load environment variables - prioritize .env.production in production
if (process.env.NODE_ENV === 'production') {
    require('dotenv').config({ path: '.env.production' });
} else {
    require('dotenv').config();
}

// Debug: Log what environment variables we have
console.log('🔧 Connection.js Environment Check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DB_USER:', process.env.DB_USER || 'NOT SET');
console.log('DB_HOST:', process.env.DB_HOST || 'NOT SET');
console.log('DB_NAME:', process.env.DB_NAME || 'NOT SET');

// Database connection configuration (for individual connections)
let connectionConfig;

if (process.env.NODE_ENV === 'production') {
    // HARDCODED PRODUCTION VALUES - guaranteed to work
    connectionConfig = {
        host: 'localhost',
        port: 3306,
        user: 's24100604_bricksdb',
        password: 'bricksdatabase',
        database: 's24100604_bricksdb',
        multipleStatements: true,
        timezone: '+00:00',
        charset: 'utf8mb4'
    };
    console.log('🔧 Using HARDCODED production database config');
} else {
    // Development configuration with environment variables
    connectionConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 's24100604_bricksdb',
        password: process.env.DB_PASSWORD || 'bricksdatabase',
        database: process.env.DB_NAME || 's24100604_bricksdb',
        multipleStatements: true,
        timezone: '+00:00',
        charset: 'utf8mb4'
    };
    console.log('🔧 Using environment-based database config');
}

// Log the final configuration (without password)
console.log('📊 Final Database Config:');
console.log('Host:', connectionConfig.host);
console.log('Port:', connectionConfig.port);
console.log('User:', connectionConfig.user);
console.log('Database:', connectionConfig.database);
console.log('Password:', connectionConfig.password ? '*'.repeat(connectionConfig.password.length) : 'NOT SET');

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
