const mysql = require('mysql2/promise');
require('dotenv').config();

async function getCompleteDBStructure() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'bricks_attendance',
        port: process.env.DB_PORT || 3306
    });

    console.log('🔗 Connected to database:', process.env.DB_NAME || 'bricks_attendance');
    
    try {
        // Get all tables
        const [tables] = await connection.execute('SHOW TABLES');
        console.log('📋 Found tables:', tables.length);
        
        const dbStructure = {
            database: process.env.DB_NAME || 'bricks_attendance',
            tables: {},
            relationships: [],
            indexes: {}
        };

        // Get detailed structure for each table
        for (const table of tables) {
            const tableName = table[`Tables_in_${process.env.DB_NAME || 'bricks_attendance'}`];
            console.log(`\n🔍 Analyzing table: ${tableName}`);
            
            // Get table structure
            const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
            
            // Get table indexes
            const [indexes] = await connection.execute(`SHOW INDEX FROM ${tableName}`);
            
            // Get foreign key constraints
            const [foreignKeys] = await connection.execute(`
                SELECT 
                    COLUMN_NAME,
                    REFERENCED_TABLE_NAME,
                    REFERENCED_COLUMN_NAME,
                    CONSTRAINT_NAME
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL
            `, [process.env.DB_NAME || 'bricks_attendance', tableName]);

            // Get table row count
            const [rowCount] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);

            // Get table creation info
            const [createTable] = await connection.execute(`SHOW CREATE TABLE ${tableName}`);

            dbStructure.tables[tableName] = {
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
                    unique: idx.Non_unique === 0,
                    type: idx.Index_type
                })),
                foreignKeys: foreignKeys.map(fk => ({
                    column: fk.COLUMN_NAME,
                    referencedTable: fk.REFERENCED_TABLE_NAME,
                    referencedColumn: fk.REFERENCED_COLUMN_NAME,
                    constraint: fk.CONSTRAINT_NAME
                })),
                rowCount: rowCount[0].count,
                createStatement: createTable[0]['Create Table']
            };

            // Track relationships
            for (const fk of foreignKeys) {
                dbStructure.relationships.push({
                    from: tableName,
                    fromColumn: fk.COLUMN_NAME,
                    to: fk.REFERENCED_TABLE_NAME,
                    toColumn: fk.REFERENCED_COLUMN_NAME,
                    constraint: fk.CONSTRAINT_NAME
                });
            }

            console.log(`   ✅ ${tableName}: ${columns.length} columns, ${indexes.length} indexes, ${foreignKeys.length} foreign keys, ${rowCount[0].count} rows`);
        }

        // Generate formatted output
        console.log('\n' + '='.repeat(80));
        console.log('DATABASE STRUCTURE REPORT');
        console.log('='.repeat(80));
        console.log(`Database: ${dbStructure.database}`);
        console.log(`Tables: ${Object.keys(dbStructure.tables).length}`);
        console.log(`Relationships: ${dbStructure.relationships.length}`);
        console.log(`Generated: ${new Date().toISOString()}`);
        
        console.log('\n' + '='.repeat(80));
        console.log('TABLE STRUCTURES');
        console.log('='.repeat(80));

        // Print detailed table structures
        for (const [tableName, tableInfo] of Object.entries(dbStructure.tables)) {
            console.log(`\n📋 TABLE: ${tableName.toUpperCase()}`);
            console.log(`   Rows: ${tableInfo.rowCount}`);
            console.log(`   Columns: ${tableInfo.columns.length}`);
            console.log(`   Indexes: ${tableInfo.indexes.length}`);
            console.log(`   Foreign Keys: ${tableInfo.foreignKeys.length}`);
            
            console.log('\n   COLUMNS:');
            for (const col of tableInfo.columns) {
                const keyInfo = col.key ? ` [${col.key}]` : '';
                const nullInfo = col.null === 'NO' ? ' NOT NULL' : '';
                const defaultInfo = col.default ? ` DEFAULT ${col.default}` : '';
                const extraInfo = col.extra ? ` ${col.extra}` : '';
                console.log(`     ${col.name}: ${col.type}${nullInfo}${keyInfo}${defaultInfo}${extraInfo}`);
            }

            if (tableInfo.indexes.length > 0) {
                console.log('\n   INDEXES:');
                const indexGroups = {};
                for (const idx of tableInfo.indexes) {
                    if (!indexGroups[idx.name]) {
                        indexGroups[idx.name] = [];
                    }
                    indexGroups[idx.name].push(idx);
                }
                
                for (const [indexName, indexes] of Object.entries(indexGroups)) {
                    const uniqueText = indexes[0].unique ? ' UNIQUE' : '';
                    const columns = indexes.map(i => i.column).join(', ');
                    console.log(`     ${indexName}:${uniqueText} (${columns})`);
                }
            }

            if (tableInfo.foreignKeys.length > 0) {
                console.log('\n   FOREIGN KEYS:');
                for (const fk of tableInfo.foreignKeys) {
                    console.log(`     ${fk.column} -> ${fk.referencedTable}.${fk.referencedColumn}`);
                }
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('TABLE RELATIONSHIPS');
        console.log('='.repeat(80));

        if (dbStructure.relationships.length > 0) {
            for (const rel of dbStructure.relationships) {
                console.log(`${rel.from}.${rel.fromColumn} -> ${rel.to}.${rel.toColumn}`);
            }
        } else {
            console.log('No foreign key relationships found');
        }

        console.log('\n' + '='.repeat(80));
        console.log('SAMPLE DATA STRUCTURE');
        console.log('='.repeat(80));

        // Show sample data for key tables
        const keyTables = ['employees', 'attendance_records', 'user_accounts', 'departments'];
        for (const tableName of keyTables) {
            if (dbStructure.tables[tableName]) {
                console.log(`\n📋 SAMPLE FROM ${tableName.toUpperCase()}:`);
                try {
                    const [sampleData] = await connection.execute(`SELECT * FROM ${tableName} LIMIT 3`);
                    if (sampleData.length > 0) {
                        console.log(`   Found ${sampleData.length} sample records:`);
                        for (let i = 0; i < sampleData.length; i++) {
                            console.log(`   Record ${i + 1}:`, JSON.stringify(sampleData[i], null, 4));
                        }
                    } else {
                        console.log('   No data found');
                    }
                } catch (error) {
                    console.log(`   Error getting sample data: ${error.message}`);
                }
            }
        }

        return dbStructure;

    } catch (error) {
        console.error('❌ Error getting database structure:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

// Run the analysis
getCompleteDBStructure()
    .then(structure => {
        console.log('\n✅ Database structure analysis complete!');
        console.log(`Total tables analyzed: ${Object.keys(structure.tables).length}`);
    })
    .catch(error => {
        console.error('❌ Analysis failed:', error);
        process.exit(1);
    });
