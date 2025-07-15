const db = require('./backend/database/connection');

async function checkEmployeesTable() {
    try {
        // Check if employees table exists
        const tables = await db.execute('SHOW TABLES LIKE "employees"');
        console.log('Employees table exists:', tables.length > 0);
        
        if (tables.length > 0) {
            // Get table structure
            const structure = await db.execute('DESCRIBE employees');
            console.log('Employees table structure:');
            structure.forEach(col => console.log(`  ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key} ${col.Default || ''}`));
        } else {
            console.log('Employees table does not exist. Creating it...');
            await db.execute(`
                CREATE TABLE employees (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    employee_id VARCHAR(20) UNIQUE NOT NULL,
                    first_name VARCHAR(100) NOT NULL,
                    last_name VARCHAR(100) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    phone VARCHAR(20),
                    department VARCHAR(100),
                    position VARCHAR(100),
                    date_hired DATE,
                    salary DECIMAL(10,2),
                    employment_type VARCHAR(50) DEFAULT 'full-time',
                    shift_schedule VARCHAR(50) DEFAULT 'day',
                    status VARCHAR(20) DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            console.log('Employees table created successfully!');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkEmployeesTable();
