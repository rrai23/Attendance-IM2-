/**
 * Role-Based Access Control Utility
 * Provides centralized authentication and authorization checks
 * Automatically redirects unauthorized users to appropriate pages
 */

class AccessControl {
    constructor() {
        this.initialized = false;
        this.userInfo = null;
        this.allowedRoles = {
            admin: ['admin'],
            manager: ['admin', 'manager'],
            employee: ['admin', 'manager', 'employee']
        };
    }

    /**
     * Initialize access control and perform checks
     * @param {string} requiredLevel - Required access level ('admin', 'manager', 'employee')
     * @param {boolean} autoRedirect - Whether to automatically redirect on failure
     * @returns {Promise<boolean>} - True if access is granted
     */
    async init(requiredLevel = 'employee', autoRedirect = true) {
        try {
            console.log(`🔐 Access control init: ${requiredLevel} level required`);
            
            // Check if DirectFlow auth is available
            if (!window.directFlowAuth) {
                console.error('❌ DirectFlow auth not available');
                if (autoRedirect) this.redirectToLogin();
                return false;
            }

            // Check authentication first
            if (!window.directFlowAuth.isAuthenticated()) {
                console.log('❌ User not authenticated, redirecting to login');
                if (autoRedirect) this.redirectToLogin();
                return false;
            }

            // Get user information
            this.userInfo = await this.getUserInfo();
            if (!this.userInfo) {
                console.error('❌ Failed to get user information');
                if (autoRedirect) this.redirectToLogin();
                return false;
            }

            console.log(`👤 User: ${this.userInfo.username} (${this.userInfo.role})`);

            // Check role-based access
            const hasAccess = this.checkRoleAccess(requiredLevel);
            if (!hasAccess && autoRedirect) {
                console.warn(`❌ Access denied: ${this.userInfo.role} cannot access ${requiredLevel} level`);
                this.redirectUnauthorized();
                return false;
            }

            this.initialized = true;
            console.log(`✅ Access granted for ${this.userInfo.role} to ${requiredLevel} level`);
            return hasAccess;

        } catch (error) {
            console.error('❌ Access control initialization failed:', error);
            if (autoRedirect) this.redirectToLogin();
            return false;
        }
    }

    /**
     * Get user information from DirectFlow auth system
     * @returns {Promise<Object|null>} User information
     */
    async getUserInfo() {
        try {
            // Check if DirectFlow auth is available
            if (!window.directFlowAuth) {
                console.error('DirectFlow auth not available');
                return null;
            }

            // Get user from DirectFlow's localStorage cache
            const user = window.directFlowAuth.getCurrentUser();
            
            if (user) {
                console.log('✅ Got user info from DirectFlow:', user.username, user.role);
                return user;
            } else {
                console.warn('⚠️ No user info available from DirectFlow');
                return null;
            }

        } catch (error) {
            console.error('Failed to get user info from DirectFlow:', error);
            return null;
        }
    }

    /**
     * Check if user's role has access to required level
     * @param {string} requiredLevel - Required access level
     * @returns {boolean} True if access is granted
     */
    checkRoleAccess(requiredLevel) {
        if (!this.userInfo || !this.userInfo.role) {
            console.error('No user role information available');
            return false;
        }

        const userRole = this.userInfo.role.toLowerCase();
        const allowedRoles = this.allowedRoles[requiredLevel.toLowerCase()] || [];
        
        const hasAccess = allowedRoles.includes(userRole);
        
        if (!hasAccess) {
            console.warn(`Access denied: User role '${userRole}' cannot access '${requiredLevel}' level`);
        }

        return hasAccess;
    }

    /**
     * Redirect to login page
     */
    redirectToLogin() {
        console.log('Redirecting to login page');
        window.location.href = '/login.html';
    }

    /**
     * Redirect unauthorized users to employee dashboard
     */
    redirectUnauthorized() {
        console.log('Redirecting unauthorized user to employee dashboard');
        
        // Show brief notification before redirect
        this.showAccessDeniedMessage();
        
        // Redirect after short delay to allow message to be seen
        setTimeout(() => {
            window.location.href = '/employee.html';
        }, 2000);
    }

    /**
     * Show access denied message with blurred background
     */
    showAccessDeniedMessage() {
        // First, remove any existing access denied modals to prevent duplicates
        const existingOverlay = document.getElementById('access-denied-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        // Also remove any existing page blur wrappers
        const existingBlurWrapper = document.getElementById('page-content-blur');
        if (existingBlurWrapper) {
            // Move content back to body first
            while (existingBlurWrapper.firstChild) {
                document.body.appendChild(existingBlurWrapper.firstChild);
            }
            existingBlurWrapper.remove();
        }
        
        // Create wrapper element for page content blur
        const pageContent = document.createElement('div');
        pageContent.id = 'page-content-blur';
        
        // Move all existing body content into the wrapper
        while (document.body.firstChild) {
            pageContent.appendChild(document.body.firstChild);
        }
        
        // Apply blur and interaction blocking to wrapper only
        pageContent.style.filter = 'blur(4px)';
        pageContent.style.pointerEvents = 'none';
        pageContent.style.userSelect = 'none';
        pageContent.style.transition = 'filter 0.3s ease-out';
        
        // Add wrapper back to body
        document.body.appendChild(pageContent);
        
        // Create modal overlay (not blurred)
        const overlay = document.createElement('div');
        overlay.id = 'access-denied-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease-out;
        `;
        
        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
            text-align: center;
            max-width: 400px;
            width: 90vw;
            animation: slideUp 0.4s ease-out;
            border: 1px solid rgba(255, 59, 48, 0.2);
            position: relative;
            z-index: 10001;
        `;
        
        modalContent.innerHTML = `
            <div style="
                width: 64px;
                height: 64px;
                background: #ff3b30;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 24px;
                font-size: 32px;
                animation: bounce 0.6s ease-out;
            ">
                🚫
            </div>
            <h2 style="
                margin: 0 0 16px;
                color: #1a1a1a;
                font-size: 24px;
                font-weight: 700;
                font-family: system-ui, -apple-system, sans-serif;
            ">
                Access Denied
            </h2>
            <p style="
                margin: 0 0 24px;
                color: #666;
                font-size: 16px;
                line-height: 1.5;
                font-family: system-ui, -apple-system, sans-serif;
            ">
                You don't have permission to view this page.<br>
                Redirecting to your dashboard...
            </p>
            <div style="
                width: 200px;
                height: 4px;
                background: #f0f0f0;
                border-radius: 2px;
                margin: 0 auto;
                overflow: hidden;
            ">
                <div style="
                    width: 0%;
                    height: 100%;
                    background: linear-gradient(90deg, #ff3b30, #ff6b6b);
                    border-radius: 2px;
                    animation: progressBar 2s linear forwards;
                "></div>
            </div>
        `;
        
        overlay.appendChild(modalContent);

        // Add CSS animations
        const style = document.createElement('style');
        style.id = 'access-denied-styles';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { opacity: 0; transform: translateY(20px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-10px); }
                60% { transform: translateY(-5px); }
            }
            @keyframes progressBar {
                from { width: 0%; }
                to { width: 100%; }
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                #access-denied-overlay .modal-content {
                    background: #2a2a2a !important;
                    border: 1px solid rgba(255, 59, 48, 0.3) !important;
                }
                #access-denied-overlay h2 {
                    color: #ffffff !important;
                }
                #access-denied-overlay p {
                    color: #cccccc !important;
                }
            }
        `;
        
        // Remove any existing styles first
        const existingStyles = document.getElementById('access-denied-styles');
        if (existingStyles) {
            existingStyles.remove();
        }
        
        document.head.appendChild(style);
        modalContent.className = 'modal-content';
        document.body.appendChild(overlay);

        // Remove notification and blur after redirect
        setTimeout(() => {
            const overlayElement = document.getElementById('access-denied-overlay');
            if (overlayElement) {
                overlayElement.remove();
            }
            
            // Restore original body structure
            const blurWrapper = document.getElementById('page-content-blur');
            if (blurWrapper) {
                // Move content back to body
                while (blurWrapper.firstChild) {
                    document.body.appendChild(blurWrapper.firstChild);
                }
                blurWrapper.remove();
            }
            
            // Remove the style element
            const styleElement = document.getElementById('access-denied-styles');
            if (styleElement && styleElement.parentNode) {
                styleElement.parentNode.removeChild(styleElement);
            }
        }, 2500);
    }

    /**
     * Get user information (cached after initialization)
     * @returns {Object|null} User information
     */
    getUser() {
        return this.userInfo;
    }

    /**
     * Check if user has specific role
     * @param {string} role - Role to check
     * @returns {boolean} True if user has the role
     */
    hasRole(role) {
        return this.userInfo && 
               this.userInfo.role && 
               this.userInfo.role.toLowerCase() === role.toLowerCase();
    }

    /**
     * Check if user is admin
     * @returns {boolean} True if user is admin
     */
    isAdmin() {
        return this.hasRole('admin');
    }

    /**
     * Check if user is manager or admin
     * @returns {boolean} True if user is manager or admin
     */
    isManager() {
        return this.hasRole('manager') || this.hasRole('admin');
    }

    /**
     * Check if current page requires admin access
     * @returns {boolean} True if current page is admin-only
     */
    isAdminPage() {
        const currentPage = window.location.pathname.toLowerCase();
        const adminPages = [
            '/dashboard.html',
            '/employee-management.html',
            '/employees.html',
            '/payroll.html',
            '/settings.html',
            '/analytics.html'
        ];
        
        return adminPages.some(page => currentPage.includes(page.toLowerCase()));
    }

    /**
     * Check if current page requires manager access
     * @returns {boolean} True if current page requires manager access
     */
    isManagerPage() {
        const currentPage = window.location.pathname.toLowerCase();
        const managerPages = [
            '/reports.html',
            '/attendance-reports.html'
        ];
        
        return managerPages.some(page => currentPage.includes(page.toLowerCase()));
    }
}

// Global instance
window.accessControl = new AccessControl();

// Auto-initialize based on current page
document.addEventListener('DOMContentLoaded', async function() {
    console.log('� Access control system starting...');
    
    // Wait for DirectFlow to be ready
    let retries = 0;
    const maxRetries = 10;
    
    const waitForDirectFlow = () => {
        return new Promise((resolve) => {
            const checkDirectFlow = () => {
                if (window.directFlowAuth && window.directFlowAuth.initialized) {
                    console.log('✅ DirectFlow ready for access control');
                    resolve();
                } else if (retries < maxRetries) {
                    retries++;
                    console.log(`⏳ Waiting for DirectFlow... (${retries}/${maxRetries})`);
                    setTimeout(checkDirectFlow, 100);
                } else {
                    console.error('❌ DirectFlow not available after waiting');
                    resolve(); // Continue anyway
                }
            };
            checkDirectFlow();
        });
    };
    
    await waitForDirectFlow();
    
    const currentPage = window.location.pathname.toLowerCase();
    console.log('🔍 Access control checking page:', currentPage);
    
    // Determine required access level based on current page
    let requiredLevel = 'employee'; // Default
    
    if (window.accessControl.isAdminPage()) {
        requiredLevel = 'admin';
        console.log('🔒 Admin page detected, requiring admin access');
    } else if (window.accessControl.isManagerPage()) {
        requiredLevel = 'manager';
        console.log('👔 Manager page detected, requiring manager access');
    } else {
        console.log('👤 Employee page detected, requiring employee access');
    }
    
    // Initialize access control
    console.log(`🚀 Initializing access control for ${requiredLevel} level...`);
    const hasAccess = await window.accessControl.init(requiredLevel);
    
    if (hasAccess) {
        console.log('✅ Access control initialized successfully');
    } else {
        console.warn('⚠️ Access control failed - user may be redirected');
    }
});
