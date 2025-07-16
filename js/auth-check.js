/**
 * Common Authentication Check for All Pages
 * This script should be included in all pages that require authentication
 */

(function() {
    'use strict';

    /**
     * Check if user is authenticated using DirectFlowAuth
     */
    async function checkAuthentication() {
        try {
            // Wait for DirectFlowAuth to be available
            let waitCount = 0;
            const maxWait = 100; // 10 seconds total
            
            while ((!window.directFlowAuth || !window.directFlowAuth.initialized) && waitCount < maxWait) {
                await new Promise(resolve => setTimeout(resolve, 100));
                waitCount++;
            }

            // If DirectFlowAuth is not available or not initialized, redirect to login
            if (!window.directFlowAuth || !window.directFlowAuth.initialized) {
                console.warn('DirectFlowAuth not available or not initialized, redirecting to login...');
                window.location.href = '/login.html';
                return false;
            }

            // Check if user is authenticated
            if (!window.directFlowAuth.isAuthenticated()) {
                console.log('User not authenticated, redirecting to login...');
                window.location.href = '/login.html';
                return false;
            }

            console.log('User is authenticated');
            return true;
        } catch (error) {
            console.error('Authentication check failed:', error);
            window.location.href = '/login.html';
            return false;
        }
    }

    /**
     * Initialize authentication check when DOM is loaded
     */
    document.addEventListener('DOMContentLoaded', function() {
        // Run authentication check
        checkAuthentication().then(isAuthenticated => {
            if (isAuthenticated) {
                console.log('Authentication check passed');
                // Dispatch event to indicate authentication is complete
                window.dispatchEvent(new CustomEvent('authenticationComplete'));
            }
        });
    });

    // Export for global use
    window.checkAuthentication = checkAuthentication;
})();
