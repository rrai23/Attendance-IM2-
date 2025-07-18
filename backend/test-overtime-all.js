const db = require('./database/connection');

async function testOvertimeAll() {
    try {
        console.log('Testing overtime /all endpoint query...');
        
        const query = `
            SELECT 
                ot.*,
                e.first_name,
                e.last_name,
                e.department,
                e.position
            FROM overtime_requests ot
            JOIN employees e ON ot.employee_id = e.employee_id
            WHERE 1=1
            ORDER BY ot.created_at DESC
        `;
        
        const result = await db.execute(query, []);
        console.log('Query result length:', result.length);
        console.log('Query result:');
        console.table(result);
        
        // Test if this matches what the API should return
        console.log('\nFormatted for API response:');
        result.forEach((record, index) => {
            console.log(`${index + 1}. ID: ${record.id}, Employee: ${record.first_name} ${record.last_name} (${record.employee_id}), Date: ${record.request_date}, Hours: ${record.hours_requested}, Status: ${record.status}`);
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

testOvertimeAll();
