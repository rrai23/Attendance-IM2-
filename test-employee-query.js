const db = require('./backend/database/connection');

async function testEmployeeQuery() {
    try {
        console.log('Testing employee query...');
        
        const result = await db.execute(`
            SELECT employee_id, full_name, department FROM employees LIMIT 10
        `);
        
        console.log('Raw result:', JSON.stringify(result, null, 2));
        console.log('Type of result:', typeof result);
        console.log('Is array?', Array.isArray(result));
        
        if (Array.isArray(result)) {
            console.log('Result length:', result.length);
            console.log('First element:', result[0]);
            console.log('Type of first element:', typeof result[0]);
            console.log('Is first element array?', Array.isArray(result[0]));
        }
        
        await db.end();
        
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testEmployeeQuery();
