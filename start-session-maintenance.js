const sessionMaintenance = require('./backend/services/session-maintenance');

console.log('🚀 Starting Attendance System with Session Maintenance...');

// Start session maintenance service
sessionMaintenance.start();

// Keep the process running
console.log('✅ Session maintenance service is running in the background');
console.log('📝 Press Ctrl+C to stop the service');

// Prevent the process from exiting
process.stdin.resume();
