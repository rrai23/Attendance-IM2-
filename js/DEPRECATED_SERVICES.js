/**
 * DEPRECATION NOTICE
 * 
 * This file contains deprecated services that have been replaced by DirectFlow.
 * Please use DirectFlow instead for all data operations.
 * 
 * This file is kept for reference only and will be removed in future versions.
 */

console.warn(`
🚨 DEPRECATION NOTICE 🚨

The following services have been deprecated and replaced by DirectFlow:

❌ DEPRECATED:
- unified-data-service.js
- unified-employee-manager.js  
- backend-api-service.js
- data-manager.js
- All localStorage-based services
- Mock data services

✅ REPLACEMENT:
- js/directflow.js (Main service)
- js/directflow-compatibility.js (Backward compatibility)

🔄 MIGRATION GUIDE:

OLD WAY:
window.dataService.getEmployees()
window.unifiedEmployeeManager.getAttendanceRecords()
window.backendApiService.syncToBackend()

NEW WAY:
window.directFlow.getEmployees()
window.directFlow.getAttendanceRecords()
window.directFlow.syncData()

📋 BENEFITS OF DIRECTFLOW:
- Pure backend communication (no localStorage)
- No mock data or fallbacks
- Streamlined API calls
- Better error handling
- Event-driven architecture
- Consistent data flow

⚠️  IMPORTANT:
- DirectFlow requires authentication
- No offline functionality
- Backend must be running
- All data is server-side only

For more information, see: DIRECTFLOW_MIGRATION_REPORT.md
`);

// Export empty object to prevent errors
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {};
}
