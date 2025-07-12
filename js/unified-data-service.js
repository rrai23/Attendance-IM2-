/**
 * Unified Data Service for Bricks Attendance System
 * Central entry point for all data operations across the entire system.
 * This ensures all parts of the application use a consistent data layer.
 * 
 * This module provides a single point of access to the data service,
 * ensuring consistent data access across all parts of the application.
 * It supports cross-tab synchronization and will be easily portable to PHP.
 */

// Check if we need to initialize the data service
if (typeof window.dataService === 'undefined') {
    try {
        // Create the data service instance
        if (typeof DataServiceFactory !== 'undefined') {
            // Use the factory if available
            window.dataService = DataServiceFactory.createBestService();
            console.log('Data service created via factory');
        } else if (typeof LocalStorageDataService !== 'undefined') {
            // Fall back to direct instantiation
            window.dataService = new LocalStorageDataService();
            console.log('Data service created directly (LocalStorage)');
        } else {
            // Create a basic placeholder with minimal functionality
            console.warn('Data service implementation not available, creating placeholder');
            window.dataService = {
                initialized: false,
                addEventListener: function(event, callback) {
                    console.warn(`Event listener registration ignored for ${event}`);
                },
                removeEventListener: function() {},
                emit: function() {},
                getEmployees: async function() { return []; },
                getAttendanceRecords: async function() { return []; },
                getSettings: async function() { return {}; },
                getAuthToken: function() { return localStorage.getItem('bricks_auth_token'); },
                setAuthToken: function(token) { localStorage.setItem('bricks_auth_token', token); }
            };
        }
        
        // Register the data service as initialized
        window.dataService.initialized = true;
        
        // Initialize default data if available
        if (window.dataService.createDefaultData) {
            window.dataService.createDefaultData().then(() => {
                console.log('Default data initialized in unified data service');
            }).catch(error => {
                console.warn('Failed to initialize default data:', error);
            });
        }
        
        // Emit initialization event
        if (window.dataService.emit) {
            window.dataService.emit('initialized', { timestamp: Date.now() });
        }
        
        console.log('Unified data service initialized successfully');
    } catch (error) {
        console.error('Failed to initialize data service:', error);
        // Create a fallback data service
        window.dataService = {
            error: error,
            initialized: false,
            addEventListener: function() {},
            removeEventListener: function() {},
            emit: function() {},
            getEmployees: async function() { return []; },
            getAttendanceRecords: async function() { return []; },
            getSettings: async function() { return {}; },
            getAuthToken: function() { return localStorage.getItem('bricks_auth_token'); },
            setAuthToken: function(token) { localStorage.setItem('bricks_auth_token', token); }
        };
    }
}

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.dataService;
}
