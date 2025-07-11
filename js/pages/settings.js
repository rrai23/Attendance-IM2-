// Settings page functionality for the Bricks Attendance System
class SettingsPage {
    constructor() {
        this.dataStore = DataStore.getInstance();
        this.payroll = new Payroll();
        this.theming = window.BricksTheming || window.Theming;
        
        // Current settings
        this.currentSettings = {};
        this.unsavedChanges = false;
        
        this.init();
    }

    /**
     * Initialize settings page
     */
    async init() {
        // Check authentication
        Auth.requireAuth('admin');
        
        // Initialize components
        await this.initializeComponents();
        this.setupEventListeners();
        
        console.log('Settings page initialized');
    }

    /**
     * Initialize page components
     */
    async initializeComponents() {
        // Set user name
        this.updateUserInfo();
        
        // Load current settings
        await this.loadSettings();
        
        // Load users list
        await this.loadUsers();
        
        // Setup default tab
        this.switchTab('general');
    }

    /**
     * Update user information in header
     */
    updateUserInfo() {
        const userName = document.getElementById('userName');
        const currentUser = Auth.getCurrentUser();
        
        if (userName && currentUser) {
            userName.textContent = currentUser.fullName || currentUser.username;
        }
    }

    /**
     * Load current settings
     */
    async loadSettings() {
        try {
            this.currentSettings = await this.dataStore.getSettings();
            this.populateSettingsForm();
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    /**
     * Populate settings form with current values
     */
    populateSettingsForm() {
        const settings = this.currentSettings;
        
        // General settings
        this.setInputValue('companyName', settings.company?.name || 'Bricks Company');
        this.setInputValue('workingHours', settings.company?.workingHours || 8);
        this.setInputValue('startTime', settings.company?.startTime || '09:00');
        this.setInputValue('endTime', settings.company?.endTime || '17:00');
        
        // Payroll settings
        this.setInputValue('standardWage', settings.payroll?.standardWage || 15.00);
        this.setInputValue('overtimeRate', settings.payroll?.overtimeRate || 1.5);
        this.setInputValue('minOvertimeHours', settings.payroll?.minOvertimeHours || 8);
        this.setInputValue('paydayFrequency', settings.payroll?.frequency || 'biweekly');
        
        // Preferences
        this.setInputValue('dateFormat', settings.preferences?.dateFormat || 'YYYY-MM-DD');
        this.setInputValue('timeFormat', settings.preferences?.timeFormat || '24');
        
        // Theme preferences
        const themePreference = settings.preferences?.theme || 'auto';
        this.setRadioValue('theme', themePreference);
    }

    /**
     * Set input value safely
     */
    setInputValue(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.value = value;
        }
    }

    /**
     * Set radio button value
     */
    setRadioValue(name, value) {
        const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
        if (radio) {
            radio.checked = true;
        }
    }

    /**
     * Load users list
     */
    async loadUsers() {
        try {
            const employees = await this.dataStore.getEmployees();
            const usersList = document.getElementById('usersList');
            
            if (!usersList) return;

            usersList.innerHTML = employees.map(employee => `
                <div class="user-item">
                    <div class="user-info">
                        <div class="user-name">${employee.fullName || employee.username}</div>
                        <div class="user-role">${this.capitalizeFirst(employee.role)} • ${employee.email || 'No email'}</div>
                    </div>
                    <div class="user-actions">
                        <button class="btn btn-secondary btn-sm" onclick="settingsPage.editUser('${employee.id}')">
                            Edit
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="settingsPage.deleteUser('${employee.id}')" ${employee.role === 'admin' ? 'disabled' : ''}>
                            Delete
                        </button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Logout button
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => this.handleLogout());
        }

        // Tab buttons
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });

        // Form inputs change tracking
        const formInputs = document.querySelectorAll('.form-input, .form-select, input[type="radio"]');
        formInputs.forEach(input => {
            input.addEventListener('change', () => this.markUnsavedChanges());
        });

        // Save settings button
        const saveSettings = document.getElementById('saveSettings');
        if (saveSettings) {
            saveSettings.addEventListener('click', () => this.saveSettings());
        }

        // Reset settings button
        const resetSettings = document.getElementById('resetSettings');
        if (resetSettings) {
            resetSettings.addEventListener('click', () => this.resetSettings());
        }

        // Add user button
        const addUserButton = document.getElementById('addUserButton');
        if (addUserButton) {
            addUserButton.addEventListener('click', () => this.showAddUserModal());
        }

        // Modal handlers
        this.setupModalHandlers();

        // Theme change handler
        const themeRadios = document.querySelectorAll('input[name="theme"]');
        themeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked && this.theming) {
                    this.theming.setTheme(e.target.value);
                }
            });
        });

        // Unsaved changes warning
        window.addEventListener('beforeunload', (e) => {
            if (this.unsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    /**
     * Setup modal event handlers
     */
    setupModalHandlers() {
        // Add user modal
        const modalClose = document.getElementById('modalClose');
        const cancelAddUser = document.getElementById('cancelAddUser');
        const saveNewUser = document.getElementById('saveNewUser');
        const addUserModal = document.getElementById('addUserModal');

        if (modalClose) {
            modalClose.addEventListener('click', () => this.hideAddUserModal());
        }

        if (cancelAddUser) {
            cancelAddUser.addEventListener('click', () => this.hideAddUserModal());
        }

        if (saveNewUser) {
            saveNewUser.addEventListener('click', () => this.addNewUser());
        }

        // Close modal when clicking outside
        if (addUserModal) {
            addUserModal.addEventListener('click', (e) => {
                if (e.target === addUserModal) {
                    this.hideAddUserModal();
                }
            });
        }

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAddUserModal();
            }
        });
    }

    /**
     * Switch between tabs
     */
    switchTab(tabName) {
        // Update tab buttons
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.classList.remove('active');
            if (button.getAttribute('data-tab') === tabName) {
                button.classList.add('active');
            }
        });

        // Update tab content
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            content.classList.remove('active');
        });

        const targetTab = document.getElementById(`${tabName}Tab`);
        if (targetTab) {
            targetTab.classList.add('active');
        }
    }

    /**
     * Mark unsaved changes
     */
    markUnsavedChanges() {
        this.unsavedChanges = true;
        
        // Update save button state
        const saveButton = document.getElementById('saveSettings');
        if (saveButton) {
            saveButton.textContent = 'Save Changes *';
            saveButton.classList.add('btn-warning');
        }
    }

    /**
     * Clear unsaved changes flag
     */
    clearUnsavedChanges() {
        this.unsavedChanges = false;
        
        // Update save button state
        const saveButton = document.getElementById('saveSettings');
        if (saveButton) {
            saveButton.textContent = 'Save Changes';
            saveButton.classList.remove('btn-warning');
        }
    }

    /**
     * Save settings
     */
    async saveSettings() {
        try {
            // Show loading state
            this.setLoadingState(true);

            // Collect form data
            const updatedSettings = this.collectSettingsData();

            // Save to data store
            await this.dataStore.updateSettings(updatedSettings);

            // Update current settings
            this.currentSettings = updatedSettings;

            // Clear unsaved changes
            this.clearUnsavedChanges();

            // Show success message
            this.showSuccessMessage('Settings saved successfully!');

            this.setLoadingState(false);
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showError('Error saving settings. Please try again.');
            this.setLoadingState(false);
        }
    }

    /**
     * Collect settings data from form
     */
    collectSettingsData() {
        return {
            company: {
                name: this.getInputValue('companyName'),
                workingHours: parseInt(this.getInputValue('workingHours')),
                startTime: this.getInputValue('startTime'),
                endTime: this.getInputValue('endTime')
            },
            payroll: {
                standardWage: parseFloat(this.getInputValue('standardWage')),
                overtimeRate: parseFloat(this.getInputValue('overtimeRate')),
                minOvertimeHours: parseInt(this.getInputValue('minOvertimeHours')),
                frequency: this.getInputValue('paydayFrequency')
            },
            preferences: {
                theme: this.getRadioValue('theme'),
                dateFormat: this.getInputValue('dateFormat'),
                timeFormat: this.getInputValue('timeFormat')
            }
        };
    }

    /**
     * Get input value safely
     */
    getInputValue(id) {
        const element = document.getElementById(id);
        return element ? element.value : '';
    }

    /**
     * Get radio button value
     */
    getRadioValue(name) {
        const radio = document.querySelector(`input[name="${name}"]:checked`);
        return radio ? radio.value : '';
    }

    /**
     * Reset settings to defaults
     */
    async resetSettings() {
        const confirmReset = confirm('Are you sure you want to reset all settings to default values?');
        if (!confirmReset) return;

        try {
            // Default settings
            const defaultSettings = {
                company: {
                    name: 'Bricks Company',
                    workingHours: 8,
                    startTime: '09:00',
                    endTime: '17:00'
                },
                payroll: {
                    standardWage: 15.00,
                    overtimeRate: 1.5,
                    minOvertimeHours: 8,
                    frequency: 'biweekly'
                },
                preferences: {
                    theme: 'auto',
                    dateFormat: 'YYYY-MM-DD',
                    timeFormat: '24'
                }
            };

            // Save default settings
            await this.dataStore.updateSettings(defaultSettings);
            this.currentSettings = defaultSettings;

            // Update form
            this.populateSettingsForm();

            // Clear unsaved changes
            this.clearUnsavedChanges();

            this.showSuccessMessage('Settings reset to defaults successfully!');
        } catch (error) {
            console.error('Error resetting settings:', error);
            this.showError('Error resetting settings. Please try again.');
        }
    }

    /**
     * Show add user modal
     */
    showAddUserModal() {
        const modal = document.getElementById('addUserModal');
        if (modal) {
            // Clear form
            this.clearAddUserForm();
            modal.classList.add('show');
            
            // Focus first input
            const firstInput = modal.querySelector('input');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }

    /**
     * Hide add user modal
     */
    hideAddUserModal() {
        const modal = document.getElementById('addUserModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    /**
     * Clear add user form
     */
    clearAddUserForm() {
        const form = document.getElementById('addUserForm');
        if (form) {
            form.reset();
        }
    }

    /**
     * Add new user
     */
    async addNewUser() {
        try {
            // Get form data
            const userData = {
                username: this.getInputValue('newUsername'),
                role: this.getInputValue('newRole'),
                fullName: this.getInputValue('newFullName'),
                email: this.getInputValue('newEmail')
            };

            // Validate data
            if (!userData.username || !userData.role || !userData.fullName) {
                this.showError('Please fill in all required fields');
                return;
            }

            // Check if username already exists
            const existingEmployees = await this.dataStore.getEmployees();
            if (existingEmployees.some(emp => emp.username === userData.username)) {
                this.showError('Username already exists');
                return;
            }

            // Add user
            await this.dataStore.addEmployee(userData);

            // Reload users list
            await this.loadUsers();

            // Hide modal
            this.hideAddUserModal();

            this.showSuccessMessage('User added successfully!');
        } catch (error) {
            console.error('Error adding user:', error);
            this.showError('Error adding user. Please try again.');
        }
    }

    /**
     * Edit user (placeholder)
     */
    editUser(userId) {
        // This would open an edit modal similar to add user
        console.log('Edit user:', userId);
        alert('User editing functionality will be implemented in a future version.');
    }

    /**
     * Delete user
     */
    async deleteUser(userId) {
        try {
            const employee = await this.dataStore.getEmployee(userId);
            if (!employee) {
                this.showError('User not found');
                return;
            }

            const confirmDelete = confirm(`Are you sure you want to delete user "${employee.fullName || employee.username}"?`);
            if (!confirmDelete) return;

            await this.dataStore.deleteEmployee(userId);
            await this.loadUsers();

            this.showSuccessMessage('User deleted successfully!');
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showError('Error deleting user. Please try again.');
        }
    }

    /**
     * Set loading state
     */
    setLoadingState(loading) {
        const saveButton = document.getElementById('saveSettings');
        if (saveButton) {
            saveButton.disabled = loading;
            if (loading) {
                saveButton.textContent = 'Saving...';
            } else {
                saveButton.textContent = 'Save Changes';
            }
        }
    }

    /**
     * Show success message
     */
    showSuccessMessage(message) {
        // Could implement a toast notification system
        console.log('Success:', message);
        alert(message); // Temporary solution
    }

    /**
     * Show error message
     */
    showError(message) {
        // Could implement a toast notification system
        console.error(message);
        alert(message); // Temporary solution
    }

    /**
     * Capitalize first letter
     */
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Handle logout
     */
    handleLogout() {
        if (this.unsavedChanges) {
            const confirmLogout = confirm('You have unsaved changes. Are you sure you want to logout?');
            if (!confirmLogout) return;
        }

        Auth.logout();
    }

    /**
     * Validate settings form
     */
    validateSettings() {
        const errors = [];

        // Validate working hours
        const workingHours = parseInt(this.getInputValue('workingHours'));
        if (workingHours < 1 || workingHours > 24) {
            errors.push('Working hours must be between 1 and 24');
        }

        // Validate wage
        const standardWage = parseFloat(this.getInputValue('standardWage'));
        if (standardWage < 0) {
            errors.push('Standard wage cannot be negative');
        }

        // Validate overtime rate
        const overtimeRate = parseFloat(this.getInputValue('overtimeRate'));
        if (overtimeRate < 1) {
            errors.push('Overtime rate must be at least 1.0');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Enhanced save with validation
     */
    async saveSettingsWithValidation() {
        const validation = this.validateSettings();
        if (!validation.isValid) {
            this.showError(validation.errors.join('\n'));
            return;
        }

        await this.saveSettings();
    }
}

// Add CSS for button states
const buttonStateStyles = `
.btn-sm {
    padding: 4px 8px;
    font-size: 12px;
}

.btn-warning {
    background-color: var(--color-warning);
    color: white;
}

.user-item {
    transition: all 0.2s ease;
}

.user-item:hover {
    background-color: var(--bg-tertiary);
}

.user-actions {
    display: flex;
    gap: 8px;
}
`;

// Inject button state styles
if (typeof window !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = buttonStateStyles;
    document.head.appendChild(style);
}

// Initialize settings page when DOM is ready
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        window.settingsPage = new SettingsPage();
    });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsPage;
} else if (typeof window !== 'undefined') {
    window.SettingsPage = SettingsPage;
}
