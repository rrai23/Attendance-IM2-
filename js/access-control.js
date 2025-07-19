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
            // Check if DirectFlow auth is available
            if (!window.directFlowAuth) {
                console.error('DirectFlow auth not available');
                if (autoRedirect) this.redirectToLogin();
                return false;
            }

            // Check authentication first
            if (!window.directFlowAuth.isAuthenticated()) {
                console.log('User not authenticated, redirecting to login');
                if (autoRedirect) this.redirectToLogin();
                return false;
            }

            // Get user information
            this.userInfo = await this.getUserInfo();
            if (!this.userInfo) {
                console.error('Failed to get user information');
                if (autoRedirect) this.redirectToLogin();
                return false;
            }

            // Check role-based access
            const hasAccess = this.checkRoleAccess(requiredLevel);
            if (!hasAccess && autoRedirect) {
                this.redirectUnauthorized();
                return false;
            }

            this.initialized = true;
            console.log(`Access granted for ${this.userInfo.role} to ${requiredLevel} level`);
            return hasAccess;

        } catch (error) {
            console.error('Access control initialization failed:', error);
            if (autoRedirect) this.redirectToLogin();
            return false;
        }
    }

    /**
     * Get user information from the API
     * @returns {Promise<Object|null>} User information
     */
    async getUserInfo() {
        try {
            const response = await fetch('/api/auth/me', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data.user || null;

        } catch (error) {
            console.error('Failed to get user info:', error);
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
     * Show access denied message
     */
    showAccessDeniedMessage() {
        // Create notification element
        const notification = document.createElement('div');
        notification.id = 'access-denied-notification';
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #ff3b30;
                color: white;
                padding: 16px 24px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(255, 59, 48, 0.3);
                z-index: 10000;
                font-weight: 600;
                text-align: center;
                animation: slideDown 0.3s ease-out;
            ">
                🚫 Access Denied: You don't have permission to view this page<br>
                <small style="font-weight: 400; opacity: 0.9;">Redirecting to your dashboard...</small>
            </div>
            <style>
                @keyframes slideDown {
                    from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                    to { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
            </style>
        `;

        document.body.appendChild(notification);

        // Remove notification after redirect
        setTimeout(() => {
            const element = document.getElementById('access-denied-notification');
            if (element) {
                element.remove();
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
    const currentPage = window.location.pathname.toLowerCase();
    
    // Determine required access level based on current page
    let requiredLevel = 'employee'; // Default
    
    if (window.accessControl.isAdminPage()) {
        requiredLevel = 'admin';
    } else if (window.accessControl.isManagerPage()) {
        requiredLevel = 'manager';
    }
    
    // Initialize access control
    await window.accessControl.init(requiredLevel);
});
