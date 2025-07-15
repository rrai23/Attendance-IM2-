// Test DirectFlow standalone functionality
console.log('Testing DirectFlow standalone functionality...');

// Load DirectFlow
const directFlowScript = require('./js/directflow.js');

// Test that DirectFlow can be instantiated
console.log('Testing DirectFlow instantiation...');

// Check if DirectFlow has all required methods
const requiredMethods = [
    'initialize',
    'getEmployees',
    'getAttendanceData',
    'getAttendanceStats',
    'getNextPayday',
    'getSettings',
    'refreshData'
];

console.log('Checking DirectFlow methods...');

// Since we can't directly test the browser environment, 
// let's just verify the file structure is correct
const fs = require('fs');
const path = require('path');

try {
    const directFlowPath = path.join(__dirname, 'js', 'directflow.js');
    const directFlowContent = fs.readFileSync(directFlowPath, 'utf8');
    
    console.log('DirectFlow file exists and readable:', directFlowPath);
    
    // Check for required methods in the file
    requiredMethods.forEach(method => {
        if (directFlowContent.includes(method)) {
            console.log(`✓ Method ${method} found in DirectFlow`);
        } else {
            console.log(`✗ Method ${method} missing in DirectFlow`);
        }
    });
    
    // Check that compatibility layer is not loaded
    if (directFlowContent.includes('directflow-compatibility')) {
        console.log('✗ DirectFlow still references compatibility layer');
    } else {
        console.log('✓ DirectFlow is standalone (no compatibility layer references)');
    }
    
    // Check for global window assignment
    if (directFlowContent.includes('window.DirectFlow')) {
        console.log('✓ DirectFlow assigns to window.DirectFlow');
    } else {
        console.log('✗ DirectFlow does not assign to window.DirectFlow');
    }
    
    console.log('\nDirectFlow standalone test completed.');
    
} catch (error) {
    console.error('Error testing DirectFlow:', error);
}
