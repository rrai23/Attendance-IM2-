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

The following services have been REMOVED and replaced by DirectFlow:

❌ REMOVED (moved to js/DEPRECATED/):
- unified-data-service.js → js/DEPRECATED/
- unified-employee-manager.js → js/DEPRECATED/
- unified-employee-manager-auth-only.js → js/DEPRECATED/
- unified-account-manager.js → js/DEPRECATED/
- backend-api-service.js
- data-manager.js
- All localStorage-based services
- Mock data services

✅ REPLACEMENT:
- js/directflow.js (Main service)
- js/directflow-auth.js (Authentication)
- js/employee.js (Employee controller with DirectFlow)

🔄 MIGRATION GUIDE:

OLD WAY (NO LONGER AVAILABLE):
window.dataService.getEmployees()
window.unifiedEmployeeManager.getAttendanceRecords()
window.unifiedAccountManager.authenticate()
window.backendApiService.syncToBackend()

NEW WAY:
window.directFlowAuth.apiRequest('/api/employees')
window.employeeController.loadAttendanceData()
window.directFlowAuth.authenticate()
DirectFlow backend API endpoints

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
