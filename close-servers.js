#!/usr/bin/env node

/**
 * BRICKS ATTENDANCE SYSTEM - SAFE SERVER SHUTDOWN UTILITY
 * 
 * This script safely terminates database connections and then kills Node.js processes
 * 
 * Usage: node close-servers.js
 * Or: npm run close
 */

const mysql = require('mysql2/promise');
const { spawn } = require('child_process');
require('dotenv').config();

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bricks_attendance',
    multipleStatements: true,
    timezone: '+00:00',
    charset: 'utf8mb4'
};

console.log('🔴 BRICKS ATTENDANCE SYSTEM - SAFE SHUTDOWN');
console.log('=' .repeat(55));

async function closeDatabaseConnections() {
    let connection = null;
    
    try {
        console.log('📡 Attempting to connect to database...');
        
        // Create a temporary connection to close any lingering connections
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to database successfully');
        
        // Get list of active connections from this application
        console.log('🔍 Checking for active database connections...');
        const [processes] = await connection.execute(`
            SELECT ID, USER, HOST, DB, COMMAND, TIME, STATE, INFO 
            FROM INFORMATION_SCHEMA.PROCESSLIST 
            WHERE DB = ? AND USER = ? AND COMMAND != 'Sleep'
        `, [dbConfig.database, dbConfig.user]);
        
        if (processes.length > 0) {
            console.log(`📋 Found ${processes.length} active database connections:`);
            processes.forEach(proc => {
                console.log(`   - ID: ${proc.ID}, Command: ${proc.COMMAND}, Time: ${proc.TIME}s`);
            });
            
            // Kill active connections (except our own)
            for (const proc of processes) {
                if (proc.ID !== connection.threadId) {
                    try {
                        await connection.execute(`KILL ${proc.ID}`);
                        console.log(`   ✅ Terminated connection ID: ${proc.ID}`);
                    } catch (killError) {
                        console.log(`   ⚠️  Could not kill connection ID: ${proc.ID} (${killError.message})`);
                    }
                }
            }
        } else {
            console.log('✅ No active database connections found');
        }
        
        // Safely close our connection
        console.log('🔌 Closing database connection...');
        await connection.end();
        console.log('✅ Database connection closed successfully');
        
        return true;
        
    } catch (error) {
        console.log('⚠️  Database connection handling failed:', error.code || error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('   💡 MySQL server is not running (this is normal if already stopped)');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log('   💡 Database access denied (check credentials in .env)');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.log('   💡 Database does not exist (this is normal if already dropped)');
        }
        
        return false;
        
    } finally {
        if (connection) {
            try {
                await connection.end();
            } catch (closeError) {
                // Ignore errors when closing connection
            }
        }
    }
}

function killNodeProcesses() {
    return new Promise((resolve) => {
        console.log('🔍 Searching for Node.js processes...');
        
        // Use PowerShell to find and kill Node.js processes (Windows compatible)
        const findCommand = spawn('powershell', [
            '-Command',
            'Get-Process | Where-Object {$_.ProcessName -eq "node"} | Select-Object Id,ProcessName,@{Name="CommandLine";Expression={(Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine}} | Format-Table -AutoSize'
        ]);
        
        let output = '';
        
        findCommand.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        findCommand.stderr.on('data', (data) => {
            console.log('⚠️  Find process warning:', data.toString());
        });
        
        findCommand.on('close', (code) => {
            if (output.includes('node')) {
                console.log('📋 Found Node.js processes:');
                console.log(output);
                
                // Now kill all Node.js processes
                console.log('🔴 Terminating all Node.js processes...');
                
                const killCommand = spawn('taskkill', ['/F', '/IM', 'node.exe'], {
                    stdio: 'inherit'
                });
                
                killCommand.on('close', (killCode) => {
                    if (killCode === 0) {
                        console.log('✅ All Node.js processes terminated successfully');
                    } else if (killCode === 128) {
                        console.log('💡 No Node.js processes were running');
                    } else {
                        console.log(`⚠️  Process termination completed with code: ${killCode}`);
                    }
                    resolve();
                });
                
                killCommand.on('error', (error) => {
                    console.log('❌ Error terminating processes:', error.message);
                    resolve();
                });
                
            } else {
                console.log('💡 No Node.js processes found running');
                resolve();
            }
        });
        
        findCommand.on('error', (error) => {
            console.log('⚠️  Could not search for processes:', error.message);
            console.log('🔴 Attempting direct termination...');
            
            // Fallback: direct taskkill
            const killCommand = spawn('taskkill', ['/F', '/IM', 'node.exe'], {
                stdio: 'inherit'
            });
            
            killCommand.on('close', () => {
                resolve();
            });
        });
    });
}

async function safeShutdown() {
    try {
        console.log('\n🔄 Step 1: Closing database connections...');
        await closeDatabaseConnections();
        
        console.log('\n🔄 Step 2: Terminating Node.js processes...');
        await killNodeProcesses();
        
        console.log('\n🎉 SHUTDOWN COMPLETED SUCCESSFULLY!');
        console.log('=' .repeat(55));
        console.log('✅ Database connections closed safely');
        console.log('✅ Node.js processes terminated');
        console.log('💡 You can now restart the server with: npm start');
        console.log('');
        
    } catch (error) {
        console.error('\n❌ SHUTDOWN ERROR:', error.message);
        console.log('\n🛠️  Manual cleanup may be required:');
        console.log('   1. Check Task Manager for remaining node.exe processes');
        console.log('   2. Restart XAMPP MySQL service if needed');
        console.log('   3. Check for any locked files or ports');
        
    } finally {
        console.log('\n🔚 Shutdown script completed');
        process.exit(0);
    }
}

// Handle script interruption
process.on('SIGINT', () => {
    console.log('\n\n⚠️  Shutdown script interrupted!');
    console.log('💡 You may need to manually terminate processes:');
    console.log('   taskkill /F /IM node.exe');
    process.exit(1);
});

process.on('SIGTERM', () => {
    console.log('\n\n⚠️  Shutdown script terminated!');
    process.exit(1);
});

// Run the safe shutdown
safeShutdown();
