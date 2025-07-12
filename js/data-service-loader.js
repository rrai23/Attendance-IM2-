/**
 * Data Service Initialization Module
 * This script ensures that all the required data service modules are loaded
 * and initialized in the correct order.
 */

(function() {
    // Keep track of loaded modules
    const loadedModules = {
        dataServiceApi: false,
        localStorageService: false,
        apiService: false,
        dataServiceFactory: false,
        unifiedDataService: false
    };

    // Function to load a script
    function loadScript(src, callback) {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = src;
        script.async = false; // Load scripts in order
        
        script.onload = function() {
            console.log(`Loaded: ${src}`);
            if (callback) callback();
        };
        
        script.onerror = function() {
            console.error(`Failed to load: ${src}`);
            if (callback) callback(new Error(`Failed to load script: ${src}`));
        };
        
        document.head.appendChild(script);
    }

    // Load scripts in sequence
    function loadDataServiceModules() {
        // Step 1: Load the API interface
        loadScript('/js/core/data-service-api.js', function() {
            loadedModules.dataServiceApi = true;
            
            // Step 2: Load the implementations
            loadScript('/js/core/local-storage-service.js', function() {
                loadedModules.localStorageService = true;
                
                loadScript('/js/core/api-service.js', function() {
                    loadedModules.apiService = true;
                    
                    // Step 3: Load the factory
                    loadScript('/js/core/data-service-factory.js', function() {
                        loadedModules.dataServiceFactory = true;
                        
                        // Step 4: Load the unified service
                        loadScript('/js/unified-data-service.js', function() {
                            loadedModules.unifiedDataService = true;
                            
                            console.log('All data service modules loaded');
                            
                            // Dispatch an event when all modules are loaded
                            document.dispatchEvent(new CustomEvent('dataServiceModulesLoaded'));
                        });
                    });
                });
            });
        });
    }

    // Start loading if we don't already have a data service
    if (typeof window.dataService === 'undefined') {
        console.log('Initializing data service modules...');
        loadDataServiceModules();
    } else {
        console.log('Data service already initialized');
    }
})();
