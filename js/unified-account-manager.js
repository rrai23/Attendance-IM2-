/**
 * Unified Account Manager for Bricks Attendance System
 * Manages user accounts for login authentication integrated with employee management
 * Creates accounts automatically when employees are added
 */

class UnifiedAccountManager {
    constructor() {
        this.accounts = [];
        this.initialized = false;
        this.storageKey = 'bricks-unified-accounts';
        this.defaultPassword = 'employee'; // Default password for new employee accounts
        
        // Event listeners for real-time updates
        this.eventListeners = {
            accountCreated: [],
            accountUpdated: [],
            accountDeleted: [],
            passwordChanged: []
        };
        
        console.log('UnifiedAccountManager created');
    }

    /**
     * Initialize the account manager
     */
    async init() {
        if (this.initialized) return;
        
        try {
            console.log('Initializing Unified Account Manager...');
            
            // Load existing accounts
            await this.loadAccounts();
            
            // Remove any legacy default employee accounts
            await this.removeLegacyEmployeeAccount();
            
            // Listen to employee manager events to sync accounts
            this.setupEmployeeManagerListeners();
            
            // Ensure admin accounts exist
            await this.ensureAdminAccounts();
            
            // Sync with existing employees from unified employee manager
            await this.syncWithEmployeeManager();
            
            // Remove legacy default employee accounts
            await this.removeLegacyEmployeeAccount();
            
            this.initialized = true;
            console.log('Unified Account Manager initialized with:', {
                accounts: this.accounts.length
            });
            
            this.emit('initialized');
            
        } catch (error) {
            console.error('Failed to initialize Unified Account Manager:', error);
            throw error;
        }
    }

    /**
     * Load accounts from localStorage
     */
    async loadAccounts() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                this.accounts = data.accounts || [];
                console.log('Loaded accounts from localStorage:', this.accounts.length);
                return;
            }

            // No stored accounts, will be created during sync
            this.accounts = [];
            console.log('No stored accounts found, starting with empty array');
            
        } catch (error) {
            console.error('Error loading accounts:', error);
            this.accounts = [];
        }
    }

    /**
     * Save accounts to localStorage
     */
    saveAccounts() {
        try {
            const data = {
                accounts: this.accounts,
                lastUpdated: new Date().toISOString(),
                version: '1.0'
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            console.log('Accounts saved to localStorage:', this.accounts.length);
            
        } catch (error) {
            console.error('Error saving accounts:', error);
        }
    }

    /**
     * Listen to employee manager events to automatically create/update accounts
     */
    setupEmployeeManagerListeners() {
        if (!window.unifiedEmployeeManager) {
            console.warn('UnifiedEmployeeManager not available, will retry later');
            setTimeout(() => this.setupEmployeeManagerListeners(), 1000);
            return;
        }

        // Listen for new employees
        window.unifiedEmployeeManager.addEventListener('employeeAdded', async (data) => {
            console.log('Employee added, creating account:', data.employee);
            await this.createAccountForEmployee(data.employee);
        });

        // Listen for employee updates
        window.unifiedEmployeeManager.addEventListener('employeeUpdated', async (data) => {
            console.log('Employee updated, updating account:', data.employee);
            await this.updateAccountForEmployee(data.employee);
        });

        // Listen for employee deletions
        window.unifiedEmployeeManager.addEventListener('employeeDeleted', async (data) => {
            console.log('Employee deleted, removing account:', data.employee);
            await this.deleteAccountForEmployee(data.employee.id);
        });

        console.log('Account manager listening to employee manager events');
    }

    /**
     * Ensure admin accounts exist
     */
    async ensureAdminAccounts() {
        const adminAccounts = [
            {
                id: 'admin',
                username: 'admin',
                password: 'admin',
                role: 'admin',
                employeeId: null,
                isSystemAccount: true,
                fullName: 'System Administrator',
                email: 'admin@bricks.com',
                status: 'active',
                createdAt: new Date().toISOString()
            }
        ];

        for (const adminAccount of adminAccounts) {
            const existingAccount = this.accounts.find(acc => acc.username === adminAccount.username);
            if (!existingAccount) {
                this.accounts.push(adminAccount);
                console.log('Created admin account:', adminAccount.username);
                this.emit('accountCreated', { account: adminAccount });
            }
        }

        this.saveAccounts();
    }

    /**
     * Sync accounts with existing employees from unified employee manager
     */
    async syncWithEmployeeManager() {
        if (!window.unifiedEmployeeManager || !window.unifiedEmployeeManager.initialized) {
            console.warn('UnifiedEmployeeManager not available for sync');
            return;
        }

        const employees = window.unifiedEmployeeManager.getAllEmployees();
        console.log(`Syncing accounts with ${employees.length} employees...`);

        for (const employee of employees) {
            await this.ensureAccountForEmployee(employee);
        }

        console.log('Account sync with employee manager complete');
    }

    /**
     * Ensure an account exists for an employee
     */
    async ensureAccountForEmployee(employee) {
        const existingAccount = this.accounts.find(acc => 
            acc.employeeId === employee.id || 
            acc.username === employee.employeeCode
        );

        if (!existingAccount) {
            await this.createAccountForEmployee(employee);
        } else {
            // Update existing account with latest employee info
            await this.updateAccountForEmployee(employee);
        }
    }

    /**
     * Create a new account for an employee
     */
    async createAccountForEmployee(employee) {
        try {
            // Use employeeCode as username, fallback to employee ID
            const username = employee.employeeCode || employee.employeeId || `emp_${employee.id}`;
            
            // Check if username already exists
            const existingAccount = this.accounts.find(acc => acc.username === username);
            if (existingAccount) {
                console.log(`Account already exists for username: ${username}`);
                return existingAccount;
            }

            const account = {
                id: `acc_${employee.id}_${Date.now()}`,
                username: username,
                password: this.defaultPassword, // Default password
                role: employee.role || 'employee',
                employeeId: employee.id,
                isSystemAccount: false,
                fullName: employee.fullName || employee.name,
                firstName: employee.firstName,
                lastName: employee.lastName,
                email: employee.email,
                department: employee.department,
                position: employee.position,
                status: employee.status || 'active',
                mustChangePassword: true, // Force password change on first login
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            this.accounts.push(account);
            this.saveAccounts();

            console.log('Created account for employee:', {
                employeeId: employee.id,
                username: account.username,
                fullName: account.fullName
            });

            this.emit('accountCreated', { account, employee });
            return account;

        } catch (error) {
            console.error('Error creating account for employee:', error);
            throw error;
        }
    }

    /**
     * Update an existing account for an employee
     */
    async updateAccountForEmployee(employee) {
        try {
            const accountIndex = this.accounts.findIndex(acc => 
                acc.employeeId === employee.id
            );

            if (accountIndex === -1) {
                console.log('No account found for employee, creating new one:', employee.id);
                return await this.createAccountForEmployee(employee);
            }

            const account = this.accounts[accountIndex];
            const oldAccount = { ...account };

            // Update account with latest employee information
            account.fullName = employee.fullName || employee.name;
            account.firstName = employee.firstName;
            account.lastName = employee.lastName;
            account.email = employee.email;
            account.department = employee.department;
            account.position = employee.position;
            account.status = employee.status || 'active';
            account.role = employee.role || 'employee';
            account.updatedAt = new Date().toISOString();

            // Update username if employeeCode changed
            const newUsername = employee.employeeCode || employee.employeeId || `emp_${employee.id}`;
            if (account.username !== newUsername) {
                // Check if new username is available
                const usernameExists = this.accounts.some(acc => 
                    acc.username === newUsername && acc.id !== account.id
                );
                
                if (!usernameExists) {
                    account.username = newUsername;
                    console.log('Updated username for account:', oldAccount.username, '->', newUsername);
                }
            }

            this.accounts[accountIndex] = account;
            this.saveAccounts();

            console.log('Updated account for employee:', {
                employeeId: employee.id,
                username: account.username,
                changes: this.getAccountChanges(oldAccount, account)
            });

            this.emit('accountUpdated', { account, oldAccount, employee });
            return account;

        } catch (error) {
            console.error('Error updating account for employee:', error);
            throw error;
        }
    }

    /**
     * Delete account for an employee
     */
    async deleteAccountForEmployee(employeeId) {
        try {
            const accountIndex = this.accounts.findIndex(acc => acc.employeeId === employeeId);
            
            if (accountIndex === -1) {
                console.log('No account found for employee:', employeeId);
                return;
            }

            const account = this.accounts[accountIndex];
            
            // Don't delete system accounts
            if (account.isSystemAccount) {
                console.log('Cannot delete system account:', account.username);
                return;
            }

            this.accounts.splice(accountIndex, 1);
            this.saveAccounts();

            console.log('Deleted account for employee:', {
                employeeId: employeeId,
                username: account.username
            });

            this.emit('accountDeleted', { account });

        } catch (error) {
            console.error('Error deleting account for employee:', error);
            throw error;
        }
    }

    /**
     * Authenticate a user
     */
    async authenticate(username, password) {
        try {
            console.log('Authenticating user:', username);
            
            const account = this.accounts.find(acc => 
                acc.username === username && acc.status === 'active'
            );

            if (!account) {
                console.log('Account not found or inactive:', username);
                return {
                    success: false,
                    message: 'Invalid username or password'
                };
            }

            if (account.password !== password) {
                console.log('Invalid password for user:', username);
                return {
                    success: false,
                    message: 'Invalid username or password'
                };
            }

            // Get employee details if not system account
            let employee = null;
            if (!account.isSystemAccount && account.employeeId) {
                employee = window.unifiedEmployeeManager?.getEmployee(account.employeeId);
            }

            const user = {
                id: account.employeeId || account.id,
                username: account.username,
                role: account.role,
                fullName: account.fullName,
                firstName: account.firstName,
                lastName: account.lastName,
                email: account.email,
                department: account.department,
                position: account.position,
                mustChangePassword: account.mustChangePassword,
                employee: employee
            };

            console.log('Authentication successful for user:', username);

            return {
                success: true,
                user: user,
                account: account
            };

        } catch (error) {
            console.error('Authentication error:', error);
            return {
                success: false,
                message: 'Authentication failed'
            };
        }
    }

    /**
     * Change password for a user
     */
    async changePassword(username, oldPassword, newPassword) {
        try {
            const account = this.accounts.find(acc => acc.username === username);
            
            if (!account) {
                return {
                    success: false,
                    message: 'Account not found'
                };
            }

            if (account.password !== oldPassword) {
                return {
                    success: false,
                    message: 'Current password is incorrect'
                };
            }

            account.password = newPassword;
            account.mustChangePassword = false;
            account.updatedAt = new Date().toISOString();
            account.passwordChangedAt = new Date().toISOString();

            this.saveAccounts();

            console.log('Password changed for user:', username);
            this.emit('passwordChanged', { account });

            return {
                success: true,
                message: 'Password changed successfully'
            };

        } catch (error) {
            console.error('Error changing password:', error);
            return {
                success: false,
                message: 'Failed to change password'
            };
        }
    }

    /**
     * Reset password for a user (admin function)
     */
    async resetPassword(username, newPassword, forceChange = true) {
        try {
            const account = this.accounts.find(acc => acc.username === username);
            
            if (!account) {
                return {
                    success: false,
                    message: 'Account not found'
                };
            }

            account.password = newPassword;
            account.mustChangePassword = forceChange;
            account.updatedAt = new Date().toISOString();
            account.passwordChangedAt = new Date().toISOString();

            this.saveAccounts();

            console.log('Password reset for user:', username);
            this.emit('passwordChanged', { account, isReset: true });

            return {
                success: true,
                message: 'Password reset successfully'
            };

        } catch (error) {
            console.error('Error resetting password:', error);
            return {
                success: false,
                message: 'Failed to reset password'
            };
        }
    }

    /**
     * Get all accounts (admin function)
     */
    getAllAccounts() {
        return [...this.accounts];
    }

    /**
     * Get account by username
     */
    getAccount(username) {
        return this.accounts.find(acc => acc.username === username);
    }

    /**
     * Get account by employee ID
     */
    getAccountByEmployeeId(employeeId) {
        return this.accounts.find(acc => acc.employeeId === employeeId);
    }

    /**
     * Disable/enable account
     */
    async setAccountStatus(username, status) {
        try {
            const account = this.accounts.find(acc => acc.username === username);
            
            if (!account) {
                return {
                    success: false,
                    message: 'Account not found'
                };
            }

            account.status = status;
            account.updatedAt = new Date().toISOString();

            this.saveAccounts();

            console.log('Account status changed:', username, '->', status);
            this.emit('accountUpdated', { account });

            return {
                success: true,
                message: `Account ${status} successfully`
            };

        } catch (error) {
            console.error('Error changing account status:', error);
            return {
                success: false,
                message: 'Failed to change account status'
            };
        }
    }

    /**
     * Get account changes for logging
     */
    getAccountChanges(oldAccount, newAccount) {
        const changes = {};
        const fields = ['fullName', 'email', 'department', 'position', 'role', 'status'];
        
        fields.forEach(field => {
            if (oldAccount[field] !== newAccount[field]) {
                changes[field] = {
                    from: oldAccount[field],
                    to: newAccount[field]
                };
            }
        });

        return changes;
    }

    /**
     * Clear all account data (for reset functionality)
     */
    clearAllAccounts() {
        console.log('Clearing all account data...');
        this.accounts = [];
        this.initialized = false;
        localStorage.removeItem(this.storageKey);
        this.emit('cleared');
        console.log('All account data cleared');
    }

    /**
     * Get account statistics
     */
    getAccountStats() {
        const total = this.accounts.length;
        const active = this.accounts.filter(acc => acc.status === 'active').length;
        const employees = this.accounts.filter(acc => acc.role === 'employee').length;
        const admins = this.accounts.filter(acc => acc.role === 'admin').length;
        const mustChangePassword = this.accounts.filter(acc => acc.mustChangePassword).length;

        return {
            total,
            active,
            inactive: total - active,
            employees,
            admins,
            mustChangePassword
        };
    }

    /**
     * Event system for real-time updates
     */
    addEventListener(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    removeEventListener(event, callback) {
        if (this.eventListeners[event]) {
            const index = this.eventListeners[event].indexOf(callback);
            if (index > -1) {
                this.eventListeners[event].splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Migration method to sync existing mock data accounts
     */
    async migrateExistingMockAccounts() {
        try {
            // Check if mock data has account information
            if (typeof mockData !== 'undefined' && mockData.employees) {
                console.log('Migrating accounts from mock data...');
                
                for (const employee of mockData.employees) {
                    // If mock data has username/password, use it
                    // But exclude any default "employee/employee" accounts
                    if (employee.username && employee.password && 
                        !(employee.username === 'employee' && employee.password === 'employee')) {
                        
                        const existingAccount = this.accounts.find(acc => 
                            acc.username === employee.username
                        );
                        
                        if (!existingAccount) {
                            const account = {
                                id: `mock_acc_${employee.id}`,
                                username: employee.username,
                                password: employee.password,
                                role: employee.role || 'employee',
                                employeeId: employee.id,
                                isSystemAccount: employee.role === 'admin',
                                fullName: employee.fullName,
                                email: employee.email,
                                department: employee.department,
                                position: employee.position,
                                status: employee.status || 'active',
                                mustChangePassword: false, // Mock accounts don't need to change
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            };
                            
                            this.accounts.push(account);
                            console.log('Migrated mock account:', employee.username);
                        }
                    }
                }
                
                this.saveAccounts();
                console.log('Mock account migration complete');
            }
        } catch (error) {
            console.error('Error migrating mock accounts:', error);
        }
    }

    /**
     * Remove legacy default employee account if it exists
     */
    async removeLegacyEmployeeAccount() {
        try {
            console.log('Checking for legacy employee/employee accounts to remove...');
            
            const legacyAccountIndex = this.accounts.findIndex(acc => 
                acc.username === 'employee' && 
                acc.password === 'employee' &&
                !acc.employeeId // No associated employee ID means it's a legacy default account
            );

            if (legacyAccountIndex !== -1) {
                const legacyAccount = this.accounts[legacyAccountIndex];
                this.accounts.splice(legacyAccountIndex, 1);
                this.saveAccounts();
                
                console.log('✅ Removed legacy employee/employee default account');
                this.emit('accountDeleted', { account: legacyAccount, reason: 'legacy_cleanup' });
            } else {
                console.log('✅ No legacy employee/employee accounts found');
            }
        } catch (error) {
            console.error('Error removing legacy employee account:', error);
        }
    }
}

// Global instance
window.unifiedAccountManager = new UnifiedAccountManager();

// Auto-initialize after employee manager is ready
function initializeAccountManager() {
    if (window.unifiedEmployeeManager && window.unifiedEmployeeManager.initialized) {
        console.log('Employee manager ready, initializing account manager...');
        window.unifiedAccountManager.init().then(() => {
            // Migrate existing mock accounts if available
            window.unifiedAccountManager.migrateExistingMockAccounts();
        }).catch(console.error);
    } else {
        console.log('Waiting for employee manager to initialize...');
        setTimeout(initializeAccountManager, 200);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeAccountManager, 100);
    });
} else {
    setTimeout(initializeAccountManager, 100);
}
