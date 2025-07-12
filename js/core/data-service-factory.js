/**
 * Data Service Factory
 * Creates and returns the appropriate data service implementation based on configuration.
 * This allows seamless switching between different data services.
 */

class DataServiceFactory {
    /**
     * Create a data service instance based on configuration
     * @param {string} type - Service type ('localStorage', 'api')
     * @param {Object} config - Configuration options
     * @returns {DataServiceInterface} Data service instance
     */
    static createService(type = 'localStorage', config = {}) {
        switch (type.toLowerCase()) {
            case 'api':
                // Ensure API data service class is available
                if (typeof ApiDataService === 'undefined') {
                    console.error('ApiDataService not loaded');
                    throw new Error('ApiDataService not available');
                }
                return new ApiDataService(config.apiBaseUrl || '/api');
                
            case 'localstorage':
            default:
                // Ensure local storage data service class is available
                if (typeof LocalStorageDataService === 'undefined') {
                    console.error('LocalStorageDataService not loaded');
                    throw new Error('LocalStorageDataService not available');
                }
                return new LocalStorageDataService();
        }
    }
    
    /**
     * Determine the best available service type
     * @returns {string} Service type to use ('localStorage' or 'api')
     */
    static detectBestServiceType() {
        // Check if we're in a browser environment
        const isBrowser = typeof window !== 'undefined';
        
        if (!isBrowser) {
            // Node.js environment - use API service
            return 'api';
        }
        
        // Check if localStorage is available
        let localStorageAvailable = false;
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            localStorageAvailable = true;
        } catch (e) {
            localStorageAvailable = false;
        }
        
        // Check if API service should be preferred
        const preferApi = window.location.search.includes('useApi=true') || 
                          localStorage.getItem('bricks_prefer_api') === 'true';
        
        if (preferApi) {
            return 'api';
        }
        
        // Default to localStorage if available
        return localStorageAvailable ? 'localStorage' : 'api';
    }
    
    /**
     * Create the best available data service
     * @returns {DataServiceInterface} Best available data service
     */
    static createBestService() {
        const serviceType = this.detectBestServiceType();
        return this.createService(serviceType);
    }
}

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DataServiceFactory };
} else if (typeof window !== 'undefined') {
    window.DataServiceFactory = DataServiceFactory;
}
