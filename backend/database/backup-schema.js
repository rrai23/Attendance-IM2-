/**
 * Database Schema Backup Script
 * Creates a backup of the current database structure and data
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

async function backupDatabase() {
    let connection;
    
    try {
        console.log('🔄 Starting database backup...');
        
        // Connect to database
        connection = await mysql.createConnection(dbConfig);
        
        // Get current timestamp for backup filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                         new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
        
        const backupDir = path.join(__dirname, 'backups');
        const backupFile = path.join(backupDir, `schema_backup_${timestamp}.sql`);
        
        // Create backups directory if it doesn't exist
        try {
            await fs.mkdir(backupDir, { recursive: true });
        } catch (error) {
            // Directory might already exist
        }
        
        let sqlBackup = '';
        
        // Add header
        sqlBackup += `-- Database Schema Backup for ${dbConfig.database}\n`;
        sqlBackup += `-- Generated on: ${new Date().toISOString()}\n`;
        sqlBackup += `-- DirectFlow Migration Backup\n\n`;
        
        // Disable foreign key checks
        sqlBackup += `SET FOREIGN_KEY_CHECKS = 0;\n`;
        sqlBackup += `SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";\n`;
        sqlBackup += `SET AUTOCOMMIT = 0;\n`;
        sqlBackup += `START TRANSACTION;\n\n`;
        
        // Get all tables
        const [tables] = await connection.execute('SHOW TABLES');
        
        for (const table of tables) {
            const tableName = table[`Tables_in_${dbConfig.database}`];
            console.log(`📋 Backing up table: ${tableName}`);
            
            // Get table structure
            const [createTable] = await connection.execute(`SHOW CREATE TABLE \`${tableName}\``);
            sqlBackup += `-- Table structure for \`${tableName}\`\n`;
            sqlBackup += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
            sqlBackup += `${createTable[0]['Create Table']};\n\n`;
            
            // Get table data
            const [rows] = await connection.execute(`SELECT * FROM \`${tableName}\``);
            
            if (rows.length > 0) {
                sqlBackup += `-- Data for table \`${tableName}\`\n`;
                sqlBackup += `INSERT INTO \`${tableName}\` VALUES\n`;
                
                const values = rows.map(row => {
                    const escapedValues = Object.values(row).map(value => {
                        if (value === null) return 'NULL';
                        if (typeof value === 'string') {
                            return `'${value.replace(/'/g, "''")}'`;
                        }
                        if (value instanceof Date) {
                            return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
                        }
                        return value;
                    });
                    return `(${escapedValues.join(', ')})`;
                });
                
                sqlBackup += values.join(',\n');
                sqlBackup += ';\n\n';
            }
        }
        
        // Re-enable foreign key checks
        sqlBackup += `SET FOREIGN_KEY_CHECKS = 1;\n`;
        sqlBackup += `COMMIT;\n`;
        
        // Write backup file
        await fs.writeFile(backupFile, sqlBackup);
        
        console.log(`✅ Database backup completed successfully!`);
        console.log(`📁 Backup file: ${backupFile}`);
        
        // Also create a JSON structure export for reference
        const structureFile = path.join(backupDir, `schema_structure_${timestamp}.json`);
        const structure = await getTableStructure(connection);
        await fs.writeFile(structureFile, JSON.stringify(structure, null, 2));
        
        console.log(`📊 Schema structure exported: ${structureFile}`);
        
        return {
            sqlBackup: backupFile,
            structure: structureFile,
            timestamp
        };
        
    } catch (error) {
        console.error('❌ Database backup failed:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

async function getTableStructure(connection) {
    const structure = {
        database: dbConfig.database,
        tables: {},
        timestamp: new Date().toISOString()
    };
    
    // Get all tables
    const [tables] = await connection.execute('SHOW TABLES');
    
    for (const table of tables) {
        const tableName = table[`Tables_in_${dbConfig.database}`];
        
        // Get columns
        const [columns] = await connection.execute(`DESCRIBE \`${tableName}\``);
        
        // Get indexes
        const [indexes] = await connection.execute(`SHOW INDEX FROM \`${tableName}\``);
        
        // Get foreign keys
        const [foreignKeys] = await connection.execute(`
            SELECT 
                COLUMN_NAME,
                CONSTRAINT_NAME,
                REFERENCED_TABLE_NAME,
                REFERENCED_COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = ? 
            AND REFERENCED_TABLE_NAME IS NOT NULL
        `, [dbConfig.database, tableName]);
        
        structure.tables[tableName] = {
            columns: columns.map(col => ({
                name: col.Field,
                type: col.Type,
                null: col.Null,
                key: col.Key,
                default: col.Default,
                extra: col.Extra
            })),
            indexes: indexes.map(idx => ({
                name: idx.Key_name,
                column: idx.Column_name,
                unique: idx.Non_unique === 0
            })),
            foreignKeys: foreignKeys.map(fk => ({
                column: fk.COLUMN_NAME,
                constraint: fk.CONSTRAINT_NAME,
                referencedTable: fk.REFERENCED_TABLE_NAME,
                referencedColumn: fk.REFERENCED_COLUMN_NAME
            }))
        };
    }
    
    return structure;
}

// Run backup if called directly
if (require.main === module) {
    backupDatabase()
        .then(result => {
            console.log('\n🎉 Backup process completed successfully!');
            console.log('Files created:');
            console.log(`  - SQL Backup: ${result.sqlBackup}`);
            console.log(`  - Structure: ${result.structure}`);
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Backup failed:', error);
            process.exit(1);
        });
}

module.exports = { backupDatabase, getTableStructure };
