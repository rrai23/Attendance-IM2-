// Authentication module for the Bricks Attendance System
class Auth {
    static STORAGE_KEY = 'bricks_auth';
    static SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

    // Default users for demo purposes
    static DEFAULT_USERS = {
        'admin': {
            username: 'admin',
            password: 'admin',
            role: 'admin',
            fullName: 'Administrator',
            email: 'admin@bricks.com'
        },
        'employee': {
            username: 'employee',
            password: 'employee',
            role: 'employee',
            fullName: 'Employee User',
            email: 'employee@bricks.com'
        }
    };

    /**
     * Authenticate user with username and password
     * @param {string} username 
     * @param {string} password 
     * @returns {Promise<{success: boolean, user?: object, error?: string}>}
     */
    static async login(username, password) {
        try {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Check against default users
            const user = this.DEFAULT_USERS[username.toLowerCase()];
            
            if (!user || user.password !== password) {
                return {
                    success: false,
                    error: 'Invalid username or password'
                };
            }

            // Create session
            const session = {
                user: {
                    username: user.username,
                    role: user.role,
                    fullName: user.fullName,
                    email: user.email
                },
                loginTime: Date.now(),
                expiresAt: Date.now() + this.SESSION_DURATION
            };

            // Store session
            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));

            return {
                success: true,
                user: session.user
            };
        } catch (error) {
            return {
                success: false,
                error: 'Login failed. Please try again.'
            };
        }
    }

    /**
     * Check if user is currently authenticated
     * @returns {boolean}
     */
    static isAuthenticated() {
        try {
            const sessionData = sessionStorage.getItem(this.STORAGE_KEY);
            if (!sessionData) return false;

            const session = JSON.parse(sessionData);
            const now = Date.now();

            // Check if session has expired
            if (now > session.expiresAt) {
                this.logout();
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error checking authentication:', error);
            return false;
        }
    }

    /**
     * Get current user information
     * @returns {object|null}
     */
    static getCurrentUser() {
        try {
            const sessionData = sessionStorage.getItem(this.STORAGE_KEY);
            if (!sessionData) return null;

            const session = JSON.parse(sessionData);
            return session.user;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    }

    /**
     * Get current user role
     * @returns {string|null}
     */
    static getCurrentUserRole() {
        const user = this.getCurrentUser();
        return user ? user.role : null;
    }

    /**
     * Logout current user
     */
    static logout() {
        sessionStorage.removeItem(this.STORAGE_KEY);
        window.location.href = 'login.html';
    }

    /**
     * Check if current user has admin privileges
     * @returns {boolean}
     */
    static isAdmin() {
        return this.getCurrentUserRole() === 'admin';
    }

    /**
     * Guard function to redirect unauthorized users
     * @param {string} requiredRole - Required role to access the page
     */
    static requireAuth(requiredRole = null) {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }

        if (requiredRole && this.getCurrentUserRole() !== requiredRole) {
            // Redirect to appropriate dashboard based on role
            const userRole = this.getCurrentUserRole();
            if (userRole === 'admin') {
                window.location.href = 'dashboard.html';
            } else {
                window.location.href = 'employee.html';
            }
            return;
        }
    }

    /**
     * Extend current session
     */
    static extendSession() {
        try {
            const sessionData = sessionStorage.getItem(this.STORAGE_KEY);
            if (!sessionData) return;

            const session = JSON.parse(sessionData);
            session.expiresAt = Date.now() + this.SESSION_DURATION;
            
            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
        } catch (error) {
            console.error('Error extending session:', error);
        }
    }

    /**
     * Get session remaining time in minutes
     * @returns {number}
     */
    static getSessionTimeRemaining() {
        try {
            const sessionData = sessionStorage.getItem(this.STORAGE_KEY);
            if (!sessionData) return 0;

            const session = JSON.parse(sessionData);
            const remaining = session.expiresAt - Date.now();
            
            return Math.max(0, Math.floor(remaining / (60 * 1000)));
        } catch (error) {
            console.error('Error getting session time:', error);
            return 0;
        }
    }

    /**
     * Setup automatic session monitoring
     */
    static setupSessionMonitoring() {
        // Check session every minute
        setInterval(() => {
            if (!this.isAuthenticated()) {
                return;
            }

            const timeRemaining = this.getSessionTimeRemaining();
            
            // Warn user when 5 minutes remaining
            if (timeRemaining === 5) {
                const extend = confirm('Your session will expire in 5 minutes. Would you like to extend it?');
                if (extend) {
                    this.extendSession();
                }
            }
            
            // Auto-logout when session expires
            if (timeRemaining === 0) {
                alert('Your session has expired. Please log in again.');
                this.logout();
            }
        }, 60000); // Check every minute

        // Extend session on user activity
        ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
            document.addEventListener(event, () => {
                if (this.isAuthenticated()) {
                    this.extendSession();
                }
            }, { passive: true, throttle: true });
        });
    }
}

// Initialize session monitoring when the module loads
if (typeof window !== 'undefined') {
    Auth.setupSessionMonitoring();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Auth;
} else if (typeof window !== 'undefined') {
    window.Auth = Auth;
}
