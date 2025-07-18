/**
 * Settings Page Controller
 * Handles system settings, user management, business rules, and theme preferences
 */

class SettingsController {
    constructor() {
        // Initialize DirectFlow if not available (EXCLUSIVE MODE)
        if (!window.directFlow) {
            console.error('DirectFlow not available - settings page requires DirectFlow data system');
            throw new Error('DirectFlow not available');
        }
        
        // Wait for DirectFlow initialization
        if (!window.directFlow.initialized) {
            console.log('Waiting for DirectFlow initialization...');
            this.initializeWhenReady();
            return;
        }
        
        this.directFlow = window.directFlow;
        
        // Only keep essential managers
        this.sidebarManager = window.sidebarManager || null;
        this.themeManager = window.themeManager || null;
        
        this.currentSettings = {};
        this.isDirty = false;
        this.validationErrors = {};
        this.activeTab = 'general';
        this.isPopulating = false; // Flag to prevent marking dirty during form population
        
        this.init();
    }

    /**
     * Wait for DirectFlow to be ready
     */
    async initializeWhenReady() {
        const maxWaitTime = 10000; // 10 seconds
        const checkInterval = 100; // Check every 100ms
        let waitTime = 0;
        
        while (waitTime < maxWaitTime) {
            if (window.directFlow && window.directFlow.initialized) {
                console.log('DirectFlow is now ready');
                this.directFlow = window.directFlow;
                this.init();
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waitTime += checkInterval;
        }
        
        console.error('Timeout waiting for DirectFlow initialization');
        throw new Error('DirectFlow initialization timeout');
    }

    /**
     * Initialize the settings controller
     */
    async init() {
        try {
            console.log('Initializing Settings Controller with DirectFlow integration...');
            await this.loadSettings();
            this.setupTabs();
            this.setupEventListeners();
            this.setupDirectFlowListeners(); // Add DirectFlow listeners
            this.handleUserManagementActions(); // Setup user management actions
            
            // Use hybrid approach: populate existing static fields and enhance where needed
            this.populateExistingForms();
            this.enhanceMissingFields(); // Add any missing dynamic fields
            
            // Only render sections if they don't already have content
            this.renderMissingSections();
            
            this.setupFormValidation();
            this.setupAutoSave();
            
            // Load user stats from DirectFlow
            await this.loadUserStats();
            
            console.log('Settings Controller initialized successfully with DirectFlow integration');
        } catch (error) {
            console.error('Failed to initialize settings controller:', error);
            this.showErrorMessage('Failed to load settings. Please refresh the page.');
            // Try to render at least a basic interface
            try {
                this.renderBasicInterface();
            } catch (renderError) {
                console.error('Failed to render basic interface:', renderError);
            }
        }
    }

    /**
     * Render a basic interface when full initialization fails
     */
    renderBasicInterface() {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="error-container" style="padding: 2rem; text-align: center;">
                    <h2>Settings</h2>
                    <p>Unable to load settings interface. Please check the console for errors and refresh the page.</p>
                    <button onclick="location.reload()" style="padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Refresh Page
                    </button>
                </div>
            `;
        }
    }

    /**
     * Load all settings from DirectFlow (FLAT STRUCTURE)
     */
    async loadSettings() {
        try {
            console.log('Loading settings from backend...');
            
            // Get settings from DirectFlow backend
            let savedSettings = {};
            
            try {
                if (this.directFlow && this.directFlow.initialized) {
                    // Load settings from backend via DirectFlow
                    const result = await this.loadSettingsFromBackend();
                    if (result && Object.keys(result).length > 0) {
                        savedSettings = result;
                        console.log('Settings loaded from DirectFlow backend (flat structure):', savedSettings);
                    }
                } else {
                    // Direct localStorage access as fallback
                    const settingsData = localStorage.getItem('attendance-settings');
                    if (settingsData) {
                        savedSettings = JSON.parse(settingsData);
                        console.log('Settings loaded from localStorage:', savedSettings);
                    }
                }
            } catch (error) {
                console.warn('Failed to load saved settings, using defaults:', error);
                savedSettings = {};
            }
            
            // Store settings in flat structure (matches backend and database)
            this.currentSettings = savedSettings;
            
            console.log('Final settings loaded:', this.currentSettings);
            
        } catch (error) {
            console.error('Failed to load settings:', error);
            throw error;
        }
    }

    /**
     * Setup tab navigation
     */
    setupTabs() {
        const tabButtons = document.querySelectorAll('.settings-tab');
        const tabContents = document.querySelectorAll('.settings-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabId = e.target.dataset.tab;
                this.switchTab(tabId);
            });
        });

        // Set initial active tab
        this.switchTab(this.activeTab);
    }

    /**
     * Switch to a specific tab
     */
    switchTab(tabId) {
        // Update active tab
        this.activeTab = tabId;

        // Update tab buttons
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });

        // Update tab contents
        document.querySelectorAll('.settings-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabId}-settings`);
        });

        // Update URL hash
        window.location.hash = `#${tabId}`;

        // Only render if content is empty or missing (preserve existing styled HTML)
        const container = document.getElementById(`${tabId}-settings`);
        if (container && (!container.innerHTML.trim() || container.children.length === 0)) {
            this.renderSection(tabId);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Save button
        const saveBtn = document.getElementById('save-settings-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSettings());
        }

        // Reset button
        const resetBtn = document.getElementById('reset-settings-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetSettings());
        }

        // Export button
        const exportBtn = document.getElementById('export-settings-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportSettings());
        }

        // Import button
        const importBtn = document.getElementById('import-settings-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.importSettings());
        }

        // Form change detection
        document.addEventListener('change', (e) => {
            if (e.target.closest('.settings-form') && !this.isPopulating) {
                this.markDirty();
                this.validateField(e.target);
            }
        });

        // Input events for real-time validation
        document.addEventListener('input', (e) => {
            if (e.target.closest('.settings-form') && !this.isPopulating) {
                this.markDirty();
                this.validateField(e.target);
            }
        });

        // Test email button
        const testEmailBtn = document.getElementById('test-email-btn');
        if (testEmailBtn) {
            testEmailBtn.addEventListener('click', () => this.testEmailSettings());
        }

        // Backup buttons
        const backupBtn = document.getElementById('create-backup-btn');
        if (backupBtn) {
            backupBtn.addEventListener('click', () => this.createBackup());
        }

        const restoreBtn = document.getElementById('restore-backup-btn');
        if (restoreBtn) {
            restoreBtn.addEventListener('click', () => this.restoreBackup());
        }

        // Reset local storage button
        const resetLocalStorageBtn = document.getElementById('reset-localstorage-btn');
        if (resetLocalStorageBtn) {
            resetLocalStorageBtn.addEventListener('click', () => this.resetLocalStorage());
        }

        // Data Recovery buttons
        const openRecoveryModalBtn = document.getElementById('open-recovery-modal-btn');
        if (openRecoveryModalBtn) {
            openRecoveryModalBtn.addEventListener('click', () => this.openDataRecoveryModal());
        }

        const closeRecoveryModalBtn = document.getElementById('close-recovery-modal');
        if (closeRecoveryModalBtn) {
            closeRecoveryModalBtn.addEventListener('click', () => this.closeDataRecoveryModal());
        }

        const cancelRecoveryBtn = document.getElementById('cancel-recovery');
        if (cancelRecoveryBtn) {
            cancelRecoveryBtn.addEventListener('click', () => this.closeDataRecoveryModal());
        }

        const bulkRecoverBtn = document.getElementById('bulk-recover-btn');
        if (bulkRecoverBtn) {
            bulkRecoverBtn.addEventListener('click', () => this.bulkRecoverEmployees());
        }

        // Close modal on overlay click
        const recoveryModal = document.getElementById('data-recovery-modal');
        if (recoveryModal) {
            recoveryModal.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-overlay')) {
                    this.closeDataRecoveryModal();
                }
            });
        }

        // Listen for hash changes
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1);
            if (hash && hash !== this.activeTab) {
                this.switchTab(hash);
            }
        });

        // Prevent navigation with unsaved changes
        window.addEventListener('beforeunload', (e) => {
            if (this.isDirty) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
    }

    /**
     * Setup unified data listeners for real-time updates
     */
    setupUnifiedDataListeners() {
        try {
            if (!this.directFlow) {
                console.warn('DirectFlow not available for data listeners');
                return;
            }

            // Listen for employee data changes
            this.directFlow.addEventListener('employeeUpdate', (data) => {
                console.log('Employee data updated, refreshing user stats');
                this.loadUserStats();
            });

            // Listen for attendance data changes
            this.directFlow.addEventListener('attendanceUpdate', (data) => {
                console.log('Attendance data updated, refreshing stats');
                this.loadUserStats();
            });

            console.log('DirectFlow data listeners setup successfully');
        } catch (error) {
            console.error('Error setting up unified data listeners:', error);
        }
    }

    /**
     * Show error message to user
     */
    showErrorMessage(message) {
        try {
            // Try to find existing notification container
            let container = document.getElementById('notification-container');
            
            if (!container) {
                // Create notification container if it doesn't exist
                container = document.createElement('div');
                container.id = 'notification-container';
                container.className = 'notification-container';
                container.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    max-width: 400px;
                `;
                document.body.appendChild(container);
            }

            // Create error notification
            const notification = document.createElement('div');
            notification.className = 'notification notification-error';
            notification.style.cssText = `
                background: #ff3b30;
                color: white;
                padding: 1rem;
                border-radius: 8px;
                margin-bottom: 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                display: flex;
                align-items: center;
                gap: 10px;
                animation: slideIn 0.3s ease;
            `;

            notification.innerHTML = `
                <span style="font-size: 1.2em;">⚠️</span>
                <span style="flex: 1;">${message}</span>
                <button onclick="this.parentElement.remove()" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 1.2em;
                    cursor: pointer;
                    padding: 0;
                    margin-left: 10px;
                ">&times;</button>
            `;

            container.appendChild(notification);

            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 5000);

            console.error('Error message shown:', message);
        } catch (error) {
            console.error('Failed to show error message:', error);
            // Fallback to alert
            alert(message);
        }
    }

    /**
     * Mark form as dirty (has unsaved changes)
     */
    markDirty() {
        if (this.isPopulating) {
            return; // Don't mark dirty during form population
        }
        
        this.isDirty = true;
        
        // Update save button state
        const saveBtn = document.getElementById('save-settings-btn');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
            saveBtn.classList.add('btn-primary');
            saveBtn.classList.remove('btn-secondary');
        }

        // Show unsaved changes indicator
        this.showUnsavedIndicator();
        
        console.log('Form marked as dirty - unsaved changes detected');
    }

    /**
     * Mark form as clean (no unsaved changes)
     */
    markClean() {
        this.isDirty = false;
        
        // Update save button state
        const saveBtn = document.getElementById('save-settings-btn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saved';
            saveBtn.classList.remove('btn-primary');
            saveBtn.classList.add('btn-secondary');
        }

        // Hide unsaved changes indicator
        this.hideUnsavedIndicator();
        
        console.log('Form marked as clean - all changes saved');
    }

    /**
     * Show unsaved changes indicator
     */
    showUnsavedIndicator() {
        // Add indicator to page title or create visual indicator
        if (document.title && !document.title.includes('*')) {
            document.title = '* ' + document.title;
        }

        // Add visual indicator to active tab if possible
        const activeTab = document.querySelector('.settings-tab.active');
        if (activeTab && !activeTab.querySelector('.unsaved-indicator')) {
            const indicator = document.createElement('span');
            indicator.className = 'unsaved-indicator';
            indicator.textContent = ' *';
            indicator.style.color = '#ff3b30';
            indicator.style.fontWeight = 'bold';
            activeTab.appendChild(indicator);
        }
    }

    /**
     * Hide unsaved changes indicator
     */
    hideUnsavedIndicator() {
        // Remove indicator from page title
        if (document.title.startsWith('* ')) {
            document.title = document.title.substring(2);
        }

        // Remove visual indicators
        const indicators = document.querySelectorAll('.unsaved-indicator');
        indicators.forEach(indicator => indicator.remove());
    }

    /**
     * Validate a specific form field
     */
    validateField(field) {
        try {
            if (!field) return true;

            const fieldName = field.name || field.id;
            const value = field.value;
            let isValid = true;
            let errorMessage = '';

            // Remove existing error styling
            field.classList.remove('error');
            const existingError = field.parentNode.querySelector('.field-error');
            if (existingError) {
                existingError.remove();
            }

            // Validation rules based on field type and name
            if (field.required && (!value || value.trim() === '')) {
                isValid = false;
                errorMessage = 'This field is required';
            } else if (field.type === 'email' && value && !this.isValidEmail(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid email address';
            } else if (field.type === 'number' && value) {
                const num = parseFloat(value);
                if (isNaN(num)) {
                    isValid = false;
                    errorMessage = 'Please enter a valid number';
                } else if (field.min && num < parseFloat(field.min)) {
                    isValid = false;
                    errorMessage = `Value must be at least ${field.min}`;
                } else if (field.max && num > parseFloat(field.max)) {
                    isValid = false;
                    errorMessage = `Value must be no more than ${field.max}`;
                }
            }

            // Show error if validation failed
            if (!isValid) {
                field.classList.add('error');
                const errorDiv = document.createElement('div');
                errorDiv.className = 'field-error';
                errorDiv.style.cssText = 'color: #ff3b30; font-size: 0.875rem; margin-top: 4px;';
                errorDiv.textContent = errorMessage;
                field.parentNode.appendChild(errorDiv);
                
                this.validationErrors[fieldName] = errorMessage;
            } else {
                delete this.validationErrors[fieldName];
            }

            return isValid;
        } catch (error) {
            console.error('Error validating field:', error);
            return true; // Don't block on validation errors
        }
    }

    /**
     * Check if email is valid
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Setup form validation
     */
    setupFormValidation() {
        try {
            // Add CSS for error styling
            if (!document.getElementById('settings-validation-styles')) {
                const style = document.createElement('style');
                style.id = 'settings-validation-styles';
                style.textContent = `
                    .settings-form .form-input.error,
                    .settings-form .form-select.error,
                    .settings-form .form-textarea.error {
                        border-color: #ff3b30;
                        box-shadow: 0 0 0 3px rgba(255, 59, 48, 0.1);
                    }
                    .field-error {
                        color: #ff3b30;
                        font-size: 0.875rem;
                        margin-top: 4px;
                    }
                `;
                document.head.appendChild(style);
            }

            console.log('Form validation setup completed');
        } catch (error) {
            console.error('Error setting up form validation:', error);
        }
    }

    /**
     * Setup auto-save functionality
     */
    setupAutoSave() {
        try {
            // Auto-save every 30 seconds if there are changes
            this.autoSaveInterval = setInterval(() => {
                if (this.isDirty && Object.keys(this.validationErrors).length === 0) {
                    console.log('Auto-saving settings...');
                    this.saveSettings(true); // true for silent save
                }
            }, 30000); // 30 seconds

            console.log('Auto-save setup completed');
        } catch (error) {
            console.error('Error setting up auto-save:', error);
        }
    }

    /**
     * Handle user management actions
     */
    handleUserManagementActions() {
        try {
            // Add employee button (fixed ID to match HTML)
            const addUserBtn = document.getElementById('add-employee-btn');
            if (addUserBtn) {
                addUserBtn.addEventListener('click', () => this.showAddUserDialog());
            }

            // Bulk actions
            const bulkActionsBtn = document.getElementById('bulk-actions-btn');
            if (bulkActionsBtn) {
                bulkActionsBtn.addEventListener('click', () => this.showBulkActionsDialog());
            }

            // Export users button
            const exportUsersBtn = document.getElementById('export-users-btn');
            if (exportUsersBtn) {
                exportUsersBtn.addEventListener('click', () => this.exportUsers());
            }

            // Import users button
            const importUsersBtn = document.getElementById('import-users-btn');
            if (importUsersBtn) {
                importUsersBtn.addEventListener('click', () => this.showImportUsersDialog());
            }

            console.log('User management actions setup completed');
        } catch (error) {
            console.error('Error setting up user management actions:', error);
        }
    }

    /**
     * Show add user dialog
     */
    showAddUserDialog() {
        try {
            // Simple implementation - can be enhanced with a proper modal
            const name = prompt('Enter user name:');
            if (name) {
                const email = prompt('Enter user email:');
                if (email && this.isValidEmail(email)) {
                    this.addUser({ name, email });
                } else {
                    this.showErrorMessage('Please enter a valid email address');
                }
            }
        } catch (error) {
            console.error('Error showing add user dialog:', error);
            this.showErrorMessage('Failed to show add user dialog');
        }
    }

    /**
     * Add a new user
     */
    addUser(userData) {
        try {
            if (!this.directFlow) {
                this.showErrorMessage('DirectFlow not available');
                return;
            }

            // Use DirectFlow to add user
            const result = this.directFlow.createEmployee(userData);
            if (result.success) {
                console.log('User added successfully:', userData);
                this.loadUserStats(); // Refresh stats
            } else {
                this.showErrorMessage('Failed to add user: ' + result.message);
            }
        } catch (error) {
            console.error('Error adding user:', error);
            this.showErrorMessage('Failed to add user: ' + error.message);
        }
    }

    /**
     * Show bulk actions dialog
     */
    showBulkActionsDialog() {
        try {
            // Simple implementation
            const action = prompt('Enter bulk action (export, delete, activate, deactivate):');
            if (action) {
                this.performBulkAction(action);
            }
        } catch (error) {
            console.error('Error showing bulk actions dialog:', error);
            this.showErrorMessage('Failed to show bulk actions dialog');
        }
    }

    /**
     * Perform bulk action
     */
    performBulkAction(action) {
        try {
            console.log('Performing bulk action:', action);
            // Implementation depends on specific requirements
            this.showErrorMessage('Bulk actions feature coming soon');
        } catch (error) {
            console.error('Error performing bulk action:', error);
            this.showErrorMessage('Failed to perform bulk action');
        }
    }

    /**
     * Export users
     */
    exportUsers() {
        try {
            if (!this.directFlow) {
                this.showErrorMessage('DirectFlow not available');
                return;
            }

            const employees = this.directFlow.getEmployees();
            const csvContent = this.convertToCSV(employees);
            this.downloadCSV(csvContent, 'users-export.csv');
        } catch (error) {
            console.error('Error exporting users:', error);
            this.showErrorMessage('Failed to export users');
        }
    }

    /**
     * Convert data to CSV format
     */
    convertToCSV(data) {
        if (!data || data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header];
                return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
            });
            csvRows.push(values.join(','));
        }
        
        return csvRows.join('\n');
    }

    /**
     * Download CSV file
     */
    downloadCSV(csvContent, filename) {
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    /**
     * Show import users dialog
     */
    showImportUsersDialog() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.csv';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.importUsersFromFile(file);
                }
            };
            input.click();
        } catch (error) {
            console.error('Error showing import dialog:', error);
            this.showErrorMessage('Failed to show import dialog');
        }
    }

    /**
     * Import users from file
     */
    importUsersFromFile(file) {
        try {
            const reader = new FileReader();
            reader.onload = (e) => {
                const csv = e.target.result;
                const users = this.parseCSV(csv);
                this.importUsers(users);
            };
            reader.readAsText(file);
        } catch (error) {
            console.error('Error importing users from file:', error);
            this.showErrorMessage('Failed to import users from file');
        }
    }

    /**
     * Parse CSV content
     */
    parseCSV(csv) {
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = values[index] || '';
                });
                data.push(obj);
            }
        }
        
        return data;
    }

    /**
     * Import multiple users
     */
    importUsers(users) {
        try {
            let successCount = 0;
            let errorCount = 0;
            
            for (const user of users) {
                try {
                    const result = this.addUser(user);
                    if (result !== false) {
                        successCount++;
                    } else {
                        errorCount++;
                    }
                } catch (error) {
                    errorCount++;
                    console.error('Error importing user:', user, error);
                }
            }
            
            console.log(`Import completed: ${successCount} success, ${errorCount} errors`);
            this.showErrorMessage(`Import completed: ${successCount} users imported, ${errorCount} errors`);
        } catch (error) {
            console.error('Error importing users:', error);
            this.showErrorMessage('Failed to import users');
        }
    }

    /**
     * Save settings to storage
     */
    async saveSettings(silent = false) {
        try {
            if (!silent) {
                console.log('Saving settings...');
            }

            // Collect form data
            const formData = this.collectFormData();
            console.log('Collected form data:', formData);
            
            // Validate form data
            const validationResult = this.validateFormData(formData);
            if (!validationResult.isValid) {
                console.error('Validation failed:', validationResult.errors);
                this.showErrorMessage('Please fix validation errors before saving');
                return false;
            }

            // Save to DirectFlow backend
            if (this.directFlow && this.directFlow.initialized) {
                console.log('Saving to DirectFlow backend...');
                const result = await this.saveSettingsToBackend(formData);
                console.log('DirectFlow backend save result:', result);
                if (!result.success) {
                    throw new Error(result.message || 'Failed to save settings');
                }
            } else {
                console.log('DirectFlow not available, saving to localStorage');
                // Direct localStorage save
                localStorage.setItem('attendance-settings', JSON.stringify(formData));
            }

            // Update current settings
            this.currentSettings = { ...formData };
            this.markClean();

            if (!silent) {
                console.log('Settings saved successfully');
                this.showSuccessMessage('Settings saved successfully');
            }

            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showErrorMessage('Failed to save settings: ' + error.message);
            return false;
        }
    }

    /**
     * Collect form data from all sections (FLAT STRUCTURE - Direct mapping to database keys)
     */
    collectFormData() {
        const data = {};
        
        // Collect all form inputs - HTML forms now use camelCase names directly
        const allInputs = document.querySelectorAll('input, select, textarea');
        
        for (const input of allInputs) {
            if (input.name) {
                // Form field names are now camelCase and match database keys directly
                const fieldName = input.name;
                
                // Extract the value based on input type
                if (input.type === 'checkbox') {
                    data[fieldName] = input.checked;
                } else if (input.type === 'radio') {
                    if (input.checked) {
                        data[fieldName] = input.value;
                    }
                } else {
                    data[fieldName] = input.value;
                }
            }
        }
        
        return data;
    }

    /**
     * Collect data from a specific section
     */
    collectSectionData(section) {
        const sectionData = {};
        const container = document.getElementById(`${section}-settings`);
        
        if (!container) return sectionData;
        
        // Find all form inputs in this section
        const inputs = container.querySelectorAll('input, select, textarea');
        
        for (const input of inputs) {
            const name = input.name || input.id;
            if (!name) continue;
            
            // Extract property name from dotted field name (e.g., "general.companyName" -> "companyName")
            const propertyName = name.includes('.') ? name.split('.').pop() : name;
            
            let value = input.value;
            
            // Handle different input types
            if (input.type === 'checkbox') {
                value = input.checked;
            } else if (input.type === 'radio') {
                if (input.checked) {
                    sectionData[propertyName] = value;
                }
                continue;
            } else if (input.type === 'number') {
                value = parseFloat(value) || 0;
            }
            
            sectionData[propertyName] = value;
        }
        
        return sectionData;
    }

    /**
     * Validate form data
     */
    validateFormData(data) {
        const errors = [];
        
        // Add validation rules as needed
        if (data.general && data.general.companyName && data.general.companyName.trim() === '') {
            errors.push('Company name is required');
        }
        
        if (data.notifications && data.notifications.emailAddress && data.notifications.emailAddress.trim() !== '') {
            if (!this.isValidEmail(data.notifications.emailAddress)) {
                errors.push('Valid email address is required for notifications');
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Show success message
     */
    showSuccessMessage(message) {
        try {
            let container = document.getElementById('notification-container');
            
            if (!container) {
                container = document.createElement('div');
                container.id = 'notification-container';
                container.className = 'notification-container';
                container.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    max-width: 400px;
                `;
                document.body.appendChild(container);
            }

            const notification = document.createElement('div');
            notification.className = 'notification notification-success';
            notification.style.cssText = `
                background: #34c759;
                color: white;
                padding: 1rem;
                border-radius: 8px;
                margin-bottom: 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                display: flex;
                align-items: center;
                gap: 10px;
                animation: slideIn 0.3s ease;
            `;

            notification.innerHTML = `
                <span style="font-size: 1.2em;">✅</span>
                <span style="flex: 1;">${message}</span>
                <button onclick="this.parentElement.remove()" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 1.2em;
                    cursor: pointer;
                    padding: 0;
                    margin-left: 10px;
                ">&times;</button>
            `;

            container.appendChild(notification);

            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 3000);
        } catch (error) {
            console.error('Failed to show success message:', error);
        }
    }

    /**
     * Render missing sections if they don't exist
     */
    renderMissingSections() {
        try {
            // Check if main content area exists
            const mainContent = document.querySelector('.main-content');
            if (!mainContent) {
                console.warn('Main content area not found');
                return;
            }

            // List of expected sections
            const expectedSections = [
                { id: 'general-settings', title: 'General Settings' },
                { id: 'payroll-settings', title: 'Payroll Settings' },
                { id: 'attendance-settings', title: 'Attendance Settings' },
                { id: 'notifications-settings', title: 'Notification Settings' },
                { id: 'security-settings', title: 'Security Settings' }
            ];

            let missingSections = 0;

            for (const section of expectedSections) {
                if (!document.getElementById(section.id)) {
                    this.createBasicSection(section.id, section.title);
                    missingSections++;
                }
            }

            if (missingSections > 0) {
                console.log(`Created ${missingSections} missing sections`);
            }
        } catch (error) {
            console.error('Error rendering missing sections:', error);
        }
    }

    /**
     * Create a basic section if it doesn't exist
     */
    createBasicSection(sectionId, title) {
        try {
            const mainContent = document.querySelector('.main-content');
            if (!mainContent) return;

            const section = document.createElement('div');
            section.id = sectionId;
            section.className = 'settings-section';
            section.style.cssText = `
                background: var(--bg-primary, #ffffff);
                border: 1px solid var(--border-color, #e5e7eb);
                border-radius: 8px;
                padding: 1.5rem;
                margin-bottom: 1.5rem;
            `;

            section.innerHTML = `
                <h3 style="margin-bottom: 1rem; color: var(--text-primary, #1f2937);">${title}</h3>
                <div class="settings-content">
                    <p style="color: var(--text-secondary, #6b7280); font-style: italic;">
                        This section is dynamically created. Add specific settings as needed.
                    </p>
                </div>
            `;

            mainContent.appendChild(section);
            console.log(`Created basic section: ${sectionId}`);
        } catch (error) {
            console.error(`Error creating section ${sectionId}:`, error);
        }
    }

    /**
     * Populate existing form fields with settings data (FLAT STRUCTURE)
     */
    populateExistingForms() {
        try {
            console.log('Populating form fields with flat settings data...');
            
            // Set flag to prevent marking as dirty during population
            this.isPopulating = true;
            
            // Populate all form fields directly from flat settings structure
            this.populateAllFormFields(this.currentSettings);
            
            // Ensure dropdowns work properly by refreshing them
            this.refreshDropdowns();
            
            // Clear the populating flag after a short delay to ensure all events have processed
            setTimeout(() => {
                this.isPopulating = false;
                this.markClean(); // Ensure form starts in clean state
                console.log('Form population completed, change tracking enabled');
            }, 100);
            
            console.log('Form fields populated successfully');
        } catch (error) {
            console.error('Error populating form fields:', error);
            this.isPopulating = false; // Make sure to clear flag even on error
        }
    }

    /**
     * Enhance static HTML by adding any missing fields that the controller expects
     */
    enhanceMissingFields() {
        try {
            // Check for and add missing fields in each section
            this.enhanceGeneralFields();
            this.enhancePayrollFields();
            this.enhanceAttendanceFields();
            this.enhanceNotificationFields();
            this.enhanceSecurityFields();
            
            console.log('Enhanced missing fields successfully');
        } catch (error) {
            console.error('Error enhancing missing fields:', error);
        }
    }

    /**
     * Enhance general settings fields
     */
    enhanceGeneralFields() {
        // Check if timezone options need enhancement
        const timezoneSelect = document.querySelector('select[name="general.timezone"]');
        if (timezoneSelect && timezoneSelect.children.length < 5) {
            // Add more timezone options if needed
            const additionalTimezones = [
                { value: 'Asia/Bangkok', text: 'Bangkok' },
                { value: 'Asia/Hong_Kong', text: 'Hong Kong' },
                { value: 'Asia/Kuala_Lumpur', text: 'Kuala Lumpur' }
            ];
            
            additionalTimezones.forEach(tz => {
                if (!timezoneSelect.querySelector(`option[value="${tz.value}"]`)) {
                    const option = document.createElement('option');
                    option.value = tz.value;
                    option.textContent = tz.text;
                    timezoneSelect.appendChild(option);
                }
            });
        }
    }

    /**
     * Enhance payroll settings fields - ensure all expected fields exist
     */
    enhancePayrollFields() {
        const payrollContainer = document.getElementById('payroll-settings');
        if (!payrollContainer) return;

        // Check for overtime rate field
        if (!document.querySelector('input[name="payroll.overtimeRate"]')) {
            this.addMissingField(payrollContainer, {
                name: 'payroll.overtimeRate',
                type: 'number',
                label: 'Overtime Rate Multiplier',
                value: this.currentSettings.payroll.overtimeRate || 1.5,
                attributes: { min: '1', max: '3', step: '0.1' }
            });
        }

        // Check for overtime threshold field
        if (!document.querySelector('input[name="payroll.overtimeThreshold"]')) {
            this.addMissingField(payrollContainer, {
                name: 'payroll.overtimeThreshold',
                type: 'number',
                label: 'Overtime Threshold (hours/week)',
                value: this.currentSettings.payroll.overtimeThreshold || 40,
                attributes: { min: '30', max: '60' }
            });
        }
    }

    /**
     * Add other enhancement methods for different sections
     */
    enhanceAttendanceFields() {
        // Add attendance field enhancements if needed
    }

    enhanceNotificationFields() {
        // Add notification field enhancements if needed
    }

    enhanceSecurityFields() {
        // Add security field enhancements if needed
    }

    /**
     * Helper method to add a missing form field
     */
    addMissingField(container, fieldConfig) {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        
        const label = document.createElement('label');
        label.className = 'form-label';
        label.textContent = fieldConfig.label;
        label.setAttribute('for', fieldConfig.name.replace('.', '-'));
        
        const input = document.createElement(fieldConfig.type === 'select' ? 'select' : 'input');
        if (fieldConfig.type !== 'select') {
            input.type = fieldConfig.type;
        }
        input.id = fieldConfig.name.replace('.', '-');
        input.name = fieldConfig.name;
        input.className = fieldConfig.type === 'select' ? 'form-select' : 'form-input';
        
        if (fieldConfig.type !== 'select') {
            input.value = fieldConfig.value || '';
        }
        
        // Add any additional attributes
        if (fieldConfig.attributes) {
            Object.keys(fieldConfig.attributes).forEach(attr => {
                input.setAttribute(attr, fieldConfig.attributes[attr]);
            });
        }
        
        // Add options for select elements
        if (fieldConfig.type === 'select' && fieldConfig.options) {
            fieldConfig.options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.text;
                if (option.value === fieldConfig.value) {
                    optionElement.selected = true;
                }
                input.appendChild(optionElement);
            });
        }
        
        formGroup.appendChild(label);
        formGroup.appendChild(input);
        
        // Find a good place to insert it
        const firstForm = container.querySelector('.settings-form');
        if (firstForm) {
            firstForm.appendChild(formGroup);
        }
    }

    /**
     * Refresh dropdown selections to ensure they display correctly
     */
    refreshDropdowns() {
        const dropdowns = document.querySelectorAll('select.form-select');
        dropdowns.forEach(dropdown => {
            // Force a refresh of the dropdown display
            const currentValue = dropdown.value;
            dropdown.value = '';
            dropdown.value = currentValue;
            
            // Ensure the selected option is properly marked
            const selectedOption = dropdown.querySelector(`option[value="${currentValue}"]`);
            if (selectedOption) {
                selectedOption.selected = true;
            }
        });
    }

    /**
     * Populate form fields for a specific section
     */
    populateFormFields(section, data) {
        if (!data) {
            console.warn(`No data provided for section: ${section}`);
            return;
        }
        
        console.log(`Populating ${section} fields with:`, data);
        
        // Iterate through the backend data and populate form fields
        // Form field names now match backend keys directly (camelCase)
        for (const [backendKey, value] of Object.entries(data)) {
            // Form field names are now camelCase and match backend keys directly
            let field = document.querySelector(`[name="${backendKey}"]`) ||
                       document.getElementById(backendKey);
            
            if (field) {
                console.log(`Setting field ${field.name || field.id} = ${value}`);
                
                if (field.type === 'checkbox') {
                    field.checked = Boolean(value);
                } else if (field.type === 'radio') {
                    if (field.value === value) {
                        field.checked = true;
                    }
                } else {
                    field.value = value || '';
                }
                
                // Trigger change event to update any dependent UI
                field.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                console.warn(`❌ Field not found for ${backendKey}`);
            }
        }
    }

    /**
     * Populate all form fields with flat settings data
     */
    populateAllFormFields(settings) {
        if (!settings) {
            console.warn('No settings data provided');
            return;
        }
        
        console.log('Populating all form fields with flat settings:', settings);
        
        // Iterate through all settings and populate form fields
        for (const [key, value] of Object.entries(settings)) {
            // Find the form field by name (camelCase)
            let field = document.querySelector(`[name="${key}"]`) ||
                       document.getElementById(key);
            
            if (field) {
                console.log(`Setting field ${field.name || field.id} = ${value}`);
                
                if (field.type === 'checkbox') {
                    field.checked = Boolean(value);
                } else if (field.type === 'radio') {
                    if (field.value === value) {
                        field.checked = true;
                    }
                } else {
                    field.value = value || '';
                }
                
                // Trigger change event to update any dependent UI
                field.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                // Only warn for known important fields, not debug/internal fields
                if (key && !key.startsWith('_') && key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
                    console.warn(`❌ Field not found for setting: ${key}`);
                }
            }
        }
    }

    /**
     * Render all settings sections
     */
    renderAllSections() {
        this.renderGeneralSettings();
        this.renderPayrollSettings();
        this.renderAttendanceSettings();
        this.renderNotificationSettings();
        this.renderSecuritySettings();
        this.renderThemeSettings();
        this.renderUserManagement();
    }

    /**
     * Render specific section
     */
    renderSection(sectionId) {
        switch (sectionId) {
            case 'general':
                this.renderGeneralSettings();
                break;
            case 'payroll':
                this.renderPayrollSettings();
                break;
            case 'attendance':
                this.renderAttendanceSettings();
                break;
            case 'notifications':
                this.renderNotificationSettings();
                break;
            case 'security':
                this.renderSecuritySettings();
                break;
            case 'theme':
                this.renderThemeSettings();
                break;
            case 'users':
                this.renderUserManagement();
                break;
        }
    }

    /**
     * Render general settings
     */
    renderGeneralSettings() {
        const container = document.getElementById('general-settings');
        if (!container) return;
        
        // If content already exists, don't replace it (preserve styled HTML)
        if (container.innerHTML.trim() && container.children.length > 0) {
            console.log('Preserving existing general settings content');
            return;
        }

        const settings = this.currentSettings.general;

        container.innerHTML = `
            <div class="settings-section">
                <h3>Company Information</h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="company-name" class="form-label">Company Name</label>
                        <input type="text" id="company-name" name="general.companyName" 
                               class="form-input" value="${settings.companyName}" required>
                        <div class="field-error" id="company-name-error"></div>
                    </div>
                    
                    <div class="form-group">
                        <label for="timezone" class="form-label">Timezone</label>
                        <select id="timezone" name="general.timezone" class="form-select">
                            ${this.generateTimezoneOptions(settings.timezone)}
                        </select>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h3>Regional Settings</h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="date-format" class="form-label">Date Format</label>
                        <select id="date-format" name="general.dateFormat" class="form-select">
                            <option value="MM/DD/YYYY" ${settings.dateFormat === 'MM/DD/YYYY' ? 'selected' : ''}>MM/DD/YYYY</option>
                            <option value="DD/MM/YYYY" ${settings.dateFormat === 'DD/MM/YYYY' ? 'selected' : ''}>DD/MM/YYYY</option>
                            <option value="YYYY-MM-DD" ${settings.dateFormat === 'YYYY-MM-DD' ? 'selected' : ''}>YYYY-MM-DD</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="time-format" class="form-label">Time Format</label>
                        <select id="time-format" name="general.timeFormat" class="form-select">
                            <option value="12" ${settings.timeFormat === '12' ? 'selected' : ''}>12 Hour</option>
                            <option value="24" ${settings.timeFormat === '24' ? 'selected' : ''}>24 Hour</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="currency" class="form-label">Currency</label>
                        <select id="currency" name="general.currency" class="form-select">
                            <option value="PHP" ${settings.currency === 'PHP' ? 'selected' : ''}>PHP (₱)</option>
                            <option value="USD" ${settings.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
                            <option value="EUR" ${settings.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                            <option value="GBP" ${settings.currency === 'GBP' ? 'selected' : ''}>GBP (£)</option>
                            <option value="CAD" ${settings.currency === 'CAD' ? 'selected' : ''}>CAD ($)</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render payroll settings
     */
    renderPayrollSettings() {
        const container = document.getElementById('payroll-settings');
        if (!container) return;
        
        // If content already exists, don't replace it (preserve styled HTML)
        if (container.innerHTML.trim() && container.children.length > 0) {
            console.log('Preserving existing payroll settings content');
            return;
        }

        const settings = this.currentSettings.payroll;

        container.innerHTML = `
            <div class="settings-section">
                <h3>Pay Period Configuration</h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="pay-period" class="form-label">Pay Period</label>
                        <select id="pay-period" name="payroll.payPeriod" class="form-select">
                            <option value="weekly" ${settings.payPeriod === 'weekly' ? 'selected' : ''}>Weekly</option>
                            <option value="biweekly" ${settings.payPeriod === 'biweekly' ? 'selected' : ''}>Bi-weekly</option>
                            <option value="monthly" ${settings.payPeriod === 'monthly' ? 'selected' : ''}>Monthly</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="payday" class="form-label">Payday</label>
                        <select id="payday" name="payroll.payday" class="form-select">
                            <option value="monday" ${settings.payday === 'monday' ? 'selected' : ''}>Monday</option>
                            <option value="tuesday" ${settings.payday === 'tuesday' ? 'selected' : ''}>Tuesday</option>
                            <option value="wednesday" ${settings.payday === 'wednesday' ? 'selected' : ''}>Wednesday</option>
                            <option value="thursday" ${settings.payday === 'thursday' ? 'selected' : ''}>Thursday</option>
                            <option value="friday" ${settings.payday === 'friday' ? 'selected' : ''}>Friday</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h3>Overtime Configuration</h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="overtime-rate" class="form-label">Overtime Rate Multiplier</label>
                        <input type="number" id="overtime-rate" name="payroll.overtimeRate" 
                               class="form-input" value="${settings.overtimeRate}" min="1" max="3" step="0.1" required>
                        <small class="field-help">Standard rate multiplier for overtime hours</small>
                        <div class="field-error" id="overtime-rate-error"></div>
                    </div>
                    
                    <div class="form-group">
                        <label for="overtime-threshold" class="form-label">Overtime Threshold (hours/week)</label>
                        <input type="number" id="overtime-threshold" name="payroll.overtimeThreshold" 
                               class="form-input" value="${settings.overtimeThreshold}" min="30" max="60" required>
                        <small class="field-help">Hours per week before overtime applies</small>
                        <div class="field-error" id="overtime-threshold-error"></div>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h3>Time Rounding & Calculation</h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="rounding-rules" class="form-label">Time Rounding Rules</label>
                        <select id="rounding-rules" name="payroll.roundingRules" class="form-select">
                            <option value="none" ${settings.roundingRules === 'none' ? 'selected' : ''}>No Rounding</option>
                            <option value="nearest_minute" ${settings.roundingRules === 'nearest_minute' ? 'selected' : ''}>Nearest Minute</option>
                            <option value="nearest_quarter" ${settings.roundingRules === 'nearest_quarter' ? 'selected' : ''}>Nearest 15 Minutes</option>
                            <option value="nearest_half" ${settings.roundingRules === 'nearest_half' ? 'selected' : ''}>Nearest 30 Minutes</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="auto-calculate" name="payroll.autoCalculate" 
                                   ${settings.autoCalculate ? 'checked' : ''}>
                            <span class="checkmark"></span>
                            Auto-calculate payroll
                        </label>
                        <small class="field-help">Automatically calculate payroll at end of pay period</small>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render attendance settings
     */
    renderAttendanceSettings() {
        const container = document.getElementById('attendance-settings');
        if (!container) return;
        
        // If content already exists, don't replace it (preserve styled HTML)
        if (container.innerHTML.trim() && container.children.length > 0) {
            console.log('Preserving existing attendance settings content');
            return;
        }

        const settings = this.currentSettings.attendance;

        container.innerHTML = `
            <div class="settings-section">
                <h3>Clock In/Out Settings</h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="clock-in-grace" class="form-label">Clock In Grace Period (minutes)</label>
                        <input type="number" id="clock-in-grace" name="attendance.clockInGrace" 
                               class="form-input" value="${settings.clockInGrace}" min="0" max="30">
                        <small class="field-help">Minutes after scheduled start time before marked as tardy</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="clock-out-grace" class="form-label">Clock Out Grace Period (minutes)</label>
                        <input type="number" id="clock-out-grace" name="attendance.clockOutGrace" 
                               class="form-input" value="${settings.clockOutGrace}" min="0" max="30">
                        <small class="field-help">Minutes before scheduled end time allowed for early clock out</small>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h3>Break Settings</h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="lunch-break-duration" class="form-label">Default Lunch Break (minutes)</label>
                        <input type="number" id="lunch-break-duration" name="attendance.lunchBreakDuration" 
                               class="form-input" value="${settings.lunchBreakDuration}" min="15" max="120">
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h3>Automation Settings</h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="auto-clock-out" name="attendance.autoClockOut" 
                                   ${settings.autoClockOut ? 'checked' : ''}>
                            <span class="checkmark"></span>
                            Auto clock out employees
                        </label>
                        <small class="field-help">Automatically clock out employees at specified time</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="auto-clock-out-time" class="form-label">Auto Clock Out Time</label>
                        <input type="time" id="auto-clock-out-time" name="attendance.autoClockOutTime" 
                               class="form-input" value="${settings.autoClockOutTime}">
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="require-notes" name="attendance.requireNotes" 
                                   ${settings.requireNotes ? 'checked' : ''}>
                            <span class="checkmark"></span>
                            Require notes for manual time adjustments
                        </label>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render notification settings
     */
    renderNotificationSettings() {
        const container = document.getElementById('notifications-settings');
        if (!container) return;
        
        // If content already exists, don't replace it (preserve styled HTML)
        if (container.innerHTML.trim() && container.children.length > 0) {
            console.log('Preserving existing notification settings content');
            return;
        }

        const settings = this.currentSettings.notifications;

        container.innerHTML = `
            <div class="settings-section">
                <h3>Email Notifications</h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="email-notifications" name="notifications.emailNotifications" 
                                   ${settings.emailNotifications ? 'checked' : ''}>
                            <span class="checkmark"></span>
                            Enable email notifications
                        </label>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h3>Alert Types</h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="tardy-alerts" name="notifications.tardyAlerts" 
                                   ${settings.tardyAlerts ? 'checked' : ''}>
                            <span class="checkmark"></span>
                            Tardiness alerts
                        </label>
                        <small class="field-help">Notify when employees are late</small>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="overtime-alerts" name="notifications.overtimeAlerts" 
                                   ${settings.overtimeAlerts ? 'checked' : ''}>
                            <span class="checkmark"></span>
                            Overtime alerts
                        </label>
                        <small class="field-help">Notify when employees approach overtime</small>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="payroll-reminders" name="notifications.payrollReminders" 
                                   ${settings.payrollReminders ? 'checked' : ''}>
                            <span class="checkmark"></span>
                            Payroll reminders
                        </label>
                        <small class="field-help">Remind about upcoming payroll deadlines</small>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="system-updates" name="notifications.systemUpdates" 
                                   ${settings.systemUpdates ? 'checked' : ''}>
                            <span class="checkmark"></span>
                            System update notifications
                        </label>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h3>Test Email Settings</h3>
                <div class="form-grid">
                    <div class="form-group">
                        <button type="button" id="test-email-btn" class="btn btn-secondary">
                            Send Test Email
                        </button>
                        <small class="field-help">Send a test email to verify settings</small>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render security settings
     */
    renderSecuritySettings() {
        const container = document.getElementById('security-settings');
        if (!container) return;
        
        // If content already exists, don't replace it (preserve styled HTML)
        if (container.innerHTML.trim() && container.children.length > 0) {
            console.log('Preserving existing security settings content');
            return;
        }

        const settings = this.currentSettings.security;

        container.innerHTML = `
            <div class="settings-section">
                <h3>Session Management</h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="session-timeout" class="form-label">Session Timeout (minutes)</label>
                        <input type="number" id="session-timeout" name="security.sessionTimeout" 
                               class="form-input" value="${settings.sessionTimeout}" min="30" max="1440">
                        <small class="field-help">Automatically log out users after inactivity</small>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h3>Password Policy</h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="password-min-length" class="form-label">Minimum Password Length</label>
                        <input type="number" id="password-min-length" name="security.passwordMinLength" 
                               class="form-input" value="${settings.passwordMinLength}" min="4" max="20">
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="require-password-change" name="security.requirePasswordChange" 
                                   ${settings.requirePasswordChange ? 'checked' : ''}>
                            <span class="checkmark"></span>
                            Require periodic password changes
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label for="password-change-interval" class="form-label">Password Change Interval (days)</label>
                        <input type="number" id="password-change-interval" name="security.passwordChangeInterval" 
                               class="form-input" value="${settings.passwordChangeInterval}" min="30" max="365">
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h3>Two-Factor Authentication</h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="two-factor-auth" name="security.twoFactorAuth" 
                                   ${settings.twoFactorAuth ? 'checked' : ''}>
                            <span class="checkmark"></span>
                            Enable two-factor authentication
                        </label>
                        <small class="field-help">Require additional verification for login</small>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render theme settings
     */
    renderThemeSettings() {
        const container = document.getElementById('theme-settings');
        if (!container) return;
        
        // If content already exists, don't replace it (preserve styled HTML)
        if (container.innerHTML.trim() && container.children.length > 0) {
            console.log('Preserving existing theme settings content');
            return;
        }

        const settings = this.currentSettings.theme;

        container.innerHTML = `
            <div class="settings-section">
                <h3>Default Theme</h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="default-theme" class="form-label">Default Theme</label>
                        <select id="default-theme" name="theme.defaultTheme" class="form-select">
                            <option value="light" ${settings.defaultTheme === 'light' ? 'selected' : ''}>Light</option>
                            <option value="dark" ${settings.defaultTheme === 'dark' ? 'selected' : ''}>Dark</option>
                            <option value="auto" ${settings.defaultTheme === 'auto' ? 'selected' : ''}>Auto (System)</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="allow-user-themes" name="theme.allowUserThemes" 
                                   ${settings.allowUserThemes ? 'checked' : ''}>
                            <span class="checkmark"></span>
                            Allow users to change themes
                        </label>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h3>Color Customization</h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="accent-color" class="form-label">Accent Color</label>
                        <input type="color" id="accent-color" name="theme.accentColor" 
                               class="form-input" value="${settings.accentColor}">
                        <small class="field-help">Primary accent color for the interface</small>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h3>Current Theme Preview</h3>
                <div class="theme-preview">
                    <div class="preview-card">
                        <div class="preview-header">Sample Interface</div>
                        <div class="preview-content">
                            <div class="preview-button">Button</div>
                            <div class="preview-text">Sample text content</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render user management section
     */
    renderUserManagement() {
        const container = document.getElementById('users-settings');
        if (!container) return;
        
        // If content already exists, don't replace it (preserve styled HTML)
        if (container.innerHTML.trim() && container.children.length > 0) {
            console.log('Preserving existing user management content');
            return;
        }

        container.innerHTML = `
            <div class="settings-section">
                <h3>User Management</h3>
                <p>User management is handled in a dedicated interface with full CRUD operations.</p>
                
                <div class="user-management-actions">
                    <button type="button" class="btn btn-primary" onclick="window.open('/users.html', '_blank')">
                        Open User Management
                    </button>
                </div>
            </div>

            <div class="settings-section">
                <h3>Account Management</h3>
                <p>Manage user accounts and login credentials.</p>
                
                <div class="user-management-actions">
                    <button type="button" class="btn btn-secondary" id="view-accounts-btn">
                        View All Accounts
                    </button>
                    <button type="button" class="btn btn-secondary" id="sync-accounts-btn">
                        Sync Accounts
                    </button>
                    <button type="button" class="btn btn-warning" id="reset-passwords-btn">
                        Reset All Passwords
                    </button>
                </div>
                
                <div id="accounts-summary" class="accounts-summary">
                    <!-- Account summary will be loaded here -->
                </div>
            </div>

            <div class="settings-section">
                <h3>User Statistics</h3>
                <div id="user-stats" class="stats-grid">
                    <!-- User statistics will be loaded here -->
                </div>
            </div>
        `;

        // Setup account management event listeners
        this.setupAccountManagementHandlers();

        this.loadUserStats();
    }

    /**
     * Setup account management event handlers
     */
    setupAccountManagementHandlers() {
        const viewAccountsBtn = document.getElementById('view-accounts-btn');
        const syncAccountsBtn = document.getElementById('sync-accounts-btn');
        const resetPasswordsBtn = document.getElementById('reset-passwords-btn');

        if (viewAccountsBtn) {
            viewAccountsBtn.addEventListener('click', () => this.showAccountsModal());
        }

        if (syncAccountsBtn) {
            syncAccountsBtn.addEventListener('click', () => this.syncAccounts());
        }

        if (resetPasswordsBtn) {
            resetPasswordsBtn.addEventListener('click', () => this.showResetPasswordsModal());
        }

        // Load initial account summary
        this.loadAccountSummary();
    }

    /**
     * Load and display account summary using DirectFlow
     */
    async loadAccountSummary() {
        try {
            if (!this.directFlow || !this.directFlow.initialized) {
                return;
            }

            // Get user accounts from DirectFlow API
            const employees = await this.getAllEmployees();
            const stats = {
                total: employees.length,
                active: employees.filter(emp => emp.status === 'active').length,
                inactive: employees.filter(emp => emp.status === 'inactive').length,
                admins: employees.filter(emp => emp.role === 'admin').length
            };

            const container = document.getElementById('accounts-summary');
            
            if (container) {
                container.innerHTML = `
                    <div class="stats-row">
                        <div class="stat-item">
                            <span class="stat-number">${stats.total}</span>
                            <span class="stat-label">Total Accounts</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${stats.active}</span>
                            <span class="stat-label">Active Accounts</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${stats.active}</span>
                            <span class="stat-label">Employee Accounts</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${stats.admins}</span>
                            <span class="stat-label">Admin Accounts</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${stats.inactive}</span>
                            <span class="stat-label">Inactive</span>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading account summary:', error);
        }
    }

    /**
     * Show accounts modal with detailed account information using DirectFlow
     */
    async showAccountsModal() {
        if (!this.directFlow || !this.directFlow.initialized) {
            this.showErrorMessage('DirectFlow not available');
            return;
        }

        try {
            const employees = await this.getAllEmployees();
            
            const modalContent = `
                <div class="accounts-table-container">
                    <table class="accounts-table">
                        <thead>
                            <tr>
                                <th>Employee Code</th>
                                <th>Full Name</th>
                                <th>Email</th>
                                <th>Department</th>
                                <th>Position</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${employees.map(employee => `
                                <tr>
                                    <td>${employee.employee_id || 'N/A'}</td>
                                    <td>${employee.full_name || employee.first_name + ' ' + employee.last_name || 'N/A'}</td>
                                    <td>${employee.email || 'N/A'}</td>
                                    <td>${employee.department || 'N/A'}</td>
                                    <td>${employee.position || 'N/A'}</td>
                                    <td>
                                        <span class="status-badge status-${employee.status}">
                                            ${employee.status}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            this.showModal('Employee Accounts', modalContent, 'large');
        } catch (error) {
            console.error('Error loading accounts modal:', error);
            this.showErrorMessage('Failed to load accounts');
        }
    }

    /**
     * Sync accounts with employees - Using DirectFlow only
     */
    async syncAccounts() {
        try {
            if (!this.directFlow || !this.directFlow.initialized) {
                this.showErrorMessage('DirectFlow not available');
                return;
            }

            this.showSuccessMessage('Syncing employee data...');
            await this.loadAccountSummary();
            await this.loadUserStats();
            this.showSuccessMessage('Employee data sync completed successfully');

        } catch (error) {
            console.error('Error syncing accounts:', error);
            this.showErrorMessage('Failed to sync accounts: ' + error.message);
        }
    }

    /**
     * Show reset passwords modal
     */
    showResetPasswordsModal() {
        const modalContent = `
            <div class="reset-passwords-form">
                <div class="form-group">
                    <p class="info-text">
                        <strong>Note:</strong> Password reset functionality requires direct backend administration.
                        Please contact your system administrator for password reset operations.
                    </p>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="settingsController.closeModal()">
                        Close
                    </button>
                </div>
            </div>
        `;

        this.showModal('Reset Passwords', modalContent);
    }

    /**
     * Execute password reset
     */
    async executePasswordReset() {
        try {
            const resetType = document.querySelector('input[name="resetType"]:checked').value;
            const newPassword = document.getElementById('newPassword').value;
            const forceChange = document.getElementById('forceChange').checked;

            if (!newPassword) {
                this.showErrorMessage('Please enter a new password');
                return;
            }

            // Get all accounts using DirectFlow
            const accounts = await this.getAllUserAccounts();
            let resetCount = 0;

            for (const account of accounts) {
                if (account.role === 'system') continue; // Skip system accounts
                
                const shouldReset = resetType === 'all' || 
                                  (resetType === 'expired' && account.must_change_password);
                
                if (shouldReset) {
                    await this.resetPassword(account.username, newPassword, forceChange);
                    resetCount++;
                }
            }

            this.closeModal();
            await this.loadAccountSummary();
            this.showSuccessMessage(`Successfully reset ${resetCount} account passwords`);

        } catch (error) {
            console.error('Error resetting passwords:', error);
            this.showErrorMessage('Failed to reset passwords: ' + error.message);
        }
    }

    /**
     * Reset individual account password
     */
    async resetAccountPassword(username) {
        try {
            const newPassword = prompt('Enter new password for ' + username + ':', 'employee');
            if (!newPassword) return;

            const forceChange = confirm('Force password change on next login?');

            const result = await this.resetPassword(username, newPassword, forceChange);
            
            if (result.success) {
                this.showSuccessMessage(`Password reset for ${username}`);

                await this.loadAccountSummary();
            } else {
                this.showErrorMessage('Failed to reset password: ' + (result.message || 'Unknown error'));
            }

        } catch (error) {
            console.error('Error resetting account password:', error);
            this.showErrorMessage('Failed to reset password: ' + error.message);
        }
    }

    /**
     * Load and display user statistics from DirectFlow
     */
    async loadUserStats() {
        try {
            // Get employees from DirectFlow (EXCLUSIVE MODE)
            if (!this.directFlow || !this.directFlow.initialized) {
                throw new Error('DirectFlow not available for user stats');
            }
            
            const employeesData = await this.getAllEmployees();
            
            // Handle different data formats that might be returned
            let employees = employeesData;
            if (!Array.isArray(employeesData)) {
                if (employeesData && employeesData.employees && Array.isArray(employeesData.employees)) {
                    // Response is { employees: [...], pagination: {...} }
                    employees = employeesData.employees;
                    console.log('Extracted employees array from API response object');
                } else {
                    console.warn('Employees data is not an array:', employeesData);
                    throw new Error('Invalid employees data format');
                }
            }
            
            const stats = {
                total: employees.length,
                active: employees.filter(emp => emp.status === 'active').length,
                inactive: employees.filter(emp => emp.status === 'inactive').length,
                admins: employees.filter(emp => emp.role === 'admin').length
            };

            // No additional account statistics needed - DirectFlow provides all data
            console.log('User stats loaded from DirectFlow:', stats);

            const container = document.getElementById('user-stats');
            if (container) {
                container.innerHTML = `
                    <div class="stat-card">
                        <div class="stat-value">${stats.total}</div>
                        <div class="stat-label">Total Employees</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.active}</div>
                        <div class="stat-label">Active Employees</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.inactive}</div>
                        <div class="stat-label">Inactive Employees</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.admins}</div>
                        <div class="stat-label">Administrators</div>
                    </div>
                `;
            }

            // Update any other stat displays that might exist
            this.updateAdditionalStats(stats);

            // Update deleted employees count
            await this.updateDeletedEmployeesCount();

        } catch (error) {
            console.error('Failed to load user stats from DirectFlow:', error);
            this.showErrorMessage('Failed to load user statistics: ' + error.message);
            
            // Show error stats
            const container = document.getElementById('user-stats');
            if (container) {
                container.innerHTML = `
                    <div class="stat-card">
                        <div class="stat-value">--</div>
                        <div class="stat-label">Total Users</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">--</div>
                        <div class="stat-label">Active Users</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">--</div>
                        <div class="stat-label">Inactive Users</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">--</div>
                        <div class="stat-label">Administrators</div>
                    </div>
                `;
            }
        }
    }

    /**
     * Update additional statistics displays
     */
    updateAdditionalStats(stats) {
        // Update any additional stat elements that might be added dynamically
        const totalUsersElements = document.querySelectorAll('[data-stat="total-users"]');
        const activeUsersElements = document.querySelectorAll('[data-stat="active-users"]');
        
        totalUsersElements.forEach(el => el.textContent = stats.total);
        activeUsersElements.forEach(el => el.textContent = stats.active);
    }

    /**
     * Update deleted employees count and button state
     */
    async updateDeletedEmployeesCount() {
        try {
            console.log('🔄 Updating deleted employees count...');
            
            // Force a fresh fetch of employees
            const deletedEmployees = await this.getDeletedEmployees();
            const count = deletedEmployees.length;
            
            console.log(`📊 Found ${count} deleted employees:`, deletedEmployees.map(emp => ({
                id: emp.employee_id,
                name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
                status: emp.status,
                is_active: emp.is_active,
                account_active: emp.account_active
            })));
            
            // Update count display
            const countElement = document.getElementById('deleted-employees-count');
            if (countElement) {
                const oldCount = countElement.textContent;
                countElement.textContent = count;
                console.log(`📈 Updated count display from ${oldCount} to ${count}`);
            } else {
                console.warn('⚠️ deleted-employees-count element not found');
            }
            
            // Update button state
            const openModalBtn = document.getElementById('open-recovery-modal-btn');
            if (openModalBtn) {
                openModalBtn.disabled = count === 0;
                const newText = count > 0 ? `View Deleted Employees (${count})` : 'No Deleted Employees';
                openModalBtn.textContent = newText;
                console.log(`🔘 Updated button text to: "${newText}"`);
            } else {
                console.warn('⚠️ open-recovery-modal-btn element not found');
            }
            
            console.log('✅ Deleted employees count update completed');
            
        } catch (error) {
            console.error('❌ Failed to update deleted employees count:', error);
        }
    }

    /**
     * Get deleted employees (those with inactive status)
     * ALIGNED WITH USER STATS LOGIC for consistency
     */
    async getDeletedEmployees() {
        try {
            const employees = await this.getAllEmployees();
            
            // Use the SAME logic as the user stats to ensure consistency
            // This should match exactly with the "inactive employees" count in stats
            const deletedEmployees = employees.filter(emp => emp.status === 'inactive');
            
            console.log(`🔍 Found ${deletedEmployees.length} deleted/inactive employees out of ${employees.length} total employees`);
            console.log('📋 Deleted employees details:', deletedEmployees.map(emp => ({
                id: emp.employee_id || emp.id,
                name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
                status: emp.status,
                employment_status: emp.employment_status,
                employee_status: emp.employee_status,
                is_active: emp.is_active,
                account_active: emp.account_active
            })));
            
            // Also log what the user stats logic would show for comparison
            const userStatsInactive = employees.filter(emp => emp.status === 'inactive').length;
            console.log(`📊 User stats inactive count: ${userStatsInactive} (should match deleted count: ${deletedEmployees.length})`);
            
            return deletedEmployees;
        } catch (error) {
            console.error('Failed to get deleted employees:', error);
            return [];
        }
    }

    /**
     * Open the data recovery modal
     */
    async openDataRecoveryModal() {
        try {
            const modal = document.getElementById('data-recovery-modal');
            const loadingState = document.getElementById('recovery-loading');
            const emptyState = document.getElementById('recovery-empty');
            const tableContainer = document.getElementById('deleted-employees-table');
            
            if (!modal) return;
            
            // Show modal
            modal.classList.remove('hidden');
            
            // Show loading state
            loadingState.classList.remove('hidden');
            emptyState.classList.add('hidden');
            tableContainer.classList.add('hidden');
            
            // Load deleted employees
            const deletedEmployees = await this.getDeletedEmployees();
            
            // Hide loading state
            loadingState.classList.add('hidden');
            
            if (deletedEmployees.length === 0) {
                // Show empty state
                emptyState.classList.remove('hidden');
            } else {
                // Show table with deleted employees
                tableContainer.classList.remove('hidden');
                this.populateDeletedEmployeesTable(deletedEmployees);
            }
        } catch (error) {
            console.error('Failed to open data recovery modal:', error);
            this.showErrorMessage('Failed to load deleted employees: ' + error.message);
        }
    }

    /**
     * Close the data recovery modal
     */
    closeDataRecoveryModal() {
        const modal = document.getElementById('data-recovery-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    /**
     * Populate the deleted employees table
     */
    populateDeletedEmployeesTable(deletedEmployees) {
        const tbody = document.getElementById('deleted-employees-tbody');
        if (!tbody) return;
        
        tbody.innerHTML = deletedEmployees.map(employee => {
            const employeeName = this.getEmployeeName(employee);
            const employeeId = employee.employee_id || employee.id || 'N/A';
            const department = employee.department || 'N/A';
            const dateDeleted = employee.date_deleted || employee.updated_at || 'Unknown';
            
            return `
                <tr data-employee-id="${employee.id || employee.employee_id}">
                    <td>
                        <div class="employee-info">
                            <strong>${employeeName}</strong>
                        </div>
                    </td>
                    <td>${employeeId}</td>
                    <td>${department}</td>
                    <td>${this.formatDate(dateDeleted)}</td>
                    <td>
                        <div class="action-buttons">
                            <label class="checkbox-label">
                                <input type="checkbox" class="employee-checkbox" data-employee-id="${employee.id || employee.employee_id}">
                                <span class="checkmark"></span>
                                Select
                            </label>
                            <button class="btn btn-sm btn-success recover-btn" data-employee-id="${employee.id || employee.employee_id}">
                                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"></path>
                                    <path d="M8 5v4"></path>
                                    <path d="M16 5v4"></path>
                                    <path d="M3 9h18"></path>
                                </svg>
                                Recover
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Add event listeners for recover buttons
        tbody.querySelectorAll('.recover-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const employeeId = e.currentTarget.getAttribute('data-employee-id');
                this.recoverEmployee(employeeId);
            });
        });
        
        // Add event listeners for checkboxes
        tbody.querySelectorAll('.employee-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateBulkRecoverButton();
            });
        });
    }

    /**
     * Get employee name with proper formatting
     */
    getEmployeeName(employee) {
        if (!employee) return 'Unknown Employee';
        
        const firstName = employee.first_name || employee.firstName || '';
        const lastName = employee.last_name || employee.lastName || '';
        
        if (firstName && lastName) {
            return `${firstName} ${lastName}`;
        } else if (firstName) {
            return firstName;
        } else if (lastName) {
            return lastName;
        } else if (employee.full_name) {
            return employee.full_name;
        } else if (employee.name) {
            return employee.name;
        } else {
            return employee.employee_id || employee.id || 'Unknown Employee';
        }
    }

    /**
     * Format date for display
     */
    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return 'Invalid Date';
        }
    }

    /**
     * Recover a single employee
     */
    async recoverEmployee(employeeId) {
        try {
            const confirmed = await this.showRecoveryConfirmation(
                'Recover Employee', 
                'Are you sure you want to recover this employee? They will be restored to active status.'
            );
            
            if (!confirmed) {
                return;
            }
            
            // Update employee status to active
            const updateData = {
                status: 'active',
                employment_status: 'active',
                employee_status: 'active'
            };
            
            await this.directFlow.updateEmployee(employeeId, updateData);
            
            // Clear any cached employee data to ensure fresh data
            if (this.directFlow.clearEmployeeCache) {
                this.directFlow.clearEmployeeCache();
            }
            
            this.showSuccessMessage('Employee recovered successfully!');
            
            // Add a small delay to ensure database update is propagated
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Refresh the modal and stats in the correct order
            await this.updateDeletedEmployeesCount();
            await this.loadUserStats();
            
            // Re-open the modal with fresh data
            const modal = document.getElementById('data-recovery-modal');
            if (modal && !modal.classList.contains('hidden')) {
                await this.openDataRecoveryModal();
            }
            
        } catch (error) {
            console.error('Failed to recover employee:', error);
            this.showErrorMessage('Failed to recover employee: ' + error.message);
        }
    }

    /**
     * Update bulk recover button state
     */
    updateBulkRecoverButton() {
        const checkboxes = document.querySelectorAll('.employee-checkbox:checked');
        const bulkRecoverBtn = document.getElementById('bulk-recover-btn');
        
        if (bulkRecoverBtn) {
            bulkRecoverBtn.disabled = checkboxes.length === 0;
            const count = checkboxes.length;
            bulkRecoverBtn.innerHTML = count > 0 
                ? `<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                     <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"></path>
                     <path d="M8 5v4"></path>
                     <path d="M16 5v4"></path>
                     <path d="M3 9h18"></path>
                   </svg>
                   Recover Selected (${count})`
                : `<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                     <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"></path>
                     <path d="M8 5v4"></path>
                     <path d="M16 5v4"></path>
                     <path d="M3 9h18"></path>
                   </svg>
                   Recover Selected`;
        }
    }

    /**
     * Bulk recover selected employees
     */
    async bulkRecoverEmployees() {
        try {
            const checkboxes = document.querySelectorAll('.employee-checkbox:checked');
            const employeeIds = Array.from(checkboxes).map(cb => cb.getAttribute('data-employee-id'));
            
            if (employeeIds.length === 0) {
                this.showErrorMessage('Please select employees to recover.');
                return;
            }
            
            const confirmed = await this.showRecoveryConfirmation(
                'Bulk Recover Employees',
                `Are you sure you want to recover ${employeeIds.length} selected employee${employeeIds.length === 1 ? '' : 's'}? They will be restored to active status.`
            );
            
            if (!confirmed) {
                return;
            }
            
            // Update all selected employees
            const updateData = {
                status: 'active',
                employment_status: 'active',
                employee_status: 'active'
            };
            
            const promises = employeeIds.map(id => this.directFlow.updateEmployee(id, updateData));
            await Promise.all(promises);
            
            // Clear any cached employee data to ensure fresh data
            if (this.directFlow.clearEmployeeCache) {
                this.directFlow.clearEmployeeCache();
            }
            
            this.showSuccessMessage(`Successfully recovered ${employeeIds.length} employees!`);
            
            // Add a small delay to ensure database updates are propagated
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Refresh the modal and stats in the correct order
            await this.updateDeletedEmployeesCount();
            await this.loadUserStats();
            
            // Re-open the modal with fresh data
            const modal = document.getElementById('data-recovery-modal');
            if (modal && !modal.classList.contains('hidden')) {
                await this.openDataRecoveryModal();
            }
            
        } catch (error) {
            console.error('Failed to bulk recover employees:', error);
            this.showErrorMessage('Failed to recover employees: ' + error.message);
        }
    }

    /**
     * Show recovery confirmation modal
     */
    showRecoveryConfirmation(title, message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('recovery-confirmation-modal');
            const titleElement = document.getElementById('confirmation-title');
            const messageElement = document.getElementById('confirmation-message');
            const confirmButton = document.getElementById('confirm-recovery');
            const cancelButton = document.getElementById('cancel-confirmation');
            const closeButton = document.getElementById('close-confirmation-modal');
            
            if (!modal || !titleElement || !messageElement || !confirmButton || !cancelButton) {
                console.warn('Recovery confirmation modal elements not found, falling back to confirm dialog');
                resolve(confirm(message));
                return;
            }
            
            // Set modal content
            titleElement.textContent = title;
            messageElement.textContent = message;
            
            // Show modal
            modal.classList.remove('hidden');
            
            // Focus on confirm button for accessibility
            setTimeout(() => confirmButton.focus(), 100);
            
            // Handle confirm
            const handleConfirm = () => {
                cleanup();
                resolve(true);
            };
            
            // Handle cancel/close
            const handleCancel = () => {
                cleanup();
                resolve(false);
            };
            
            // Handle escape key
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    handleCancel();
                }
            };
            
            // Cleanup function
            const cleanup = () => {
                modal.classList.add('hidden');
                confirmButton.removeEventListener('click', handleConfirm);
                cancelButton.removeEventListener('click', handleCancel);
                closeButton.removeEventListener('click', handleCancel);
                document.removeEventListener('keydown', handleEscape);
                modal.removeEventListener('click', handleOverlayClick);
            };
            
            // Handle clicking outside modal
            const handleOverlayClick = (e) => {
                if (e.target === modal) {
                    handleCancel();
                }
            };
            
            // Add event listeners
            confirmButton.addEventListener('click', handleConfirm);
            cancelButton.addEventListener('click', handleCancel);
            closeButton.addEventListener('click', handleCancel);
            document.addEventListener('keydown', handleEscape);
            modal.addEventListener('click', handleOverlayClick);
        });
    }

    /**
     * Show success message
     */
    showSuccessMessage(message) {
        try {
            // Create or get notification container
            let container = document.getElementById('notification-container');
            
            if (!container) {
                container = document.createElement('div');
                container.id = 'notification-container';
                container.className = 'notification-container';
                container.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    max-width: 400px;
                `;
                document.body.appendChild(container);
            }

            // Create success notification
            const notification = document.createElement('div');
            notification.className = 'notification notification-success';
            notification.style.cssText = `
                background: #28a745;
                color: white;
                padding: 1rem;
                border-radius: 8px;
                margin-bottom: 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                display: flex;
                align-items: center;
                gap: 10px;
                transform: translateX(420px);
                transition: transform 0.3s ease;
            `;

            notification.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20,6 9,17 4,12"></polyline>
                </svg>
                <span>${message}</span>
            `;

            container.appendChild(notification);

            // Animate in
            setTimeout(() => {
                notification.style.transform = 'translateX(0)';
            }, 10);

            // Auto remove after 5 seconds
            setTimeout(() => {
                notification.style.transform = 'translateX(420px)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, 5000);

        } catch (error) {
            console.error('Error showing success message:', error);
        }
    }

    /**
     * Reset all localStorage data after confirmation
     */
    resetLocalStorage() {
        try {
            console.log('Reset localStorage requested');
            
            // Show confirmation dialog
            const confirmed = confirm('Are you sure you want to reset all local storage data? This action cannot be undone and will clear all saved settings, preferences, and cached data.');
            
            if (!confirmed) {
                console.log('Reset localStorage cancelled by user');
                return;
            }
            
            // Get current theme before clearing
            const currentTheme = localStorage.getItem('theme') || 'light';
            
            // Clear all localStorage
            localStorage.clear();
            
            // Restore essential items
            localStorage.setItem('theme', currentTheme);
            
            // Show success message
            this.showSuccessMessage('Local storage has been reset successfully. The page will reload to apply changes.');
            
            // Reload page after a short delay
            setTimeout(() => {
                window.location.reload();
            }, 2000);
            
            console.log('Local storage reset completed');
        } catch (error) {
            console.error('Error resetting localStorage:', error);
            this.showErrorMessage('Failed to reset local storage: ' + error.message);
        }
    }

    /**
     * DirectFlow API Methods - Direct backend communication
     */
    
    // Make authenticated API calls through DirectFlow
    async makeDirectFlowAPICall(endpoint, method = 'GET', data = null) {
        try {
            // Use DirectFlowAuth for token access
            if (!window.directFlowAuth) {
                throw new Error('DirectFlow authentication not available');
            }
            
            const token = window.directFlowAuth.getToken();
            if (!token) {
                throw new Error('No authentication token available');
            }

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            const options = {
                method,
                headers,
                credentials: 'include'
            };

            if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(endpoint, options);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `API Error: ${response.status}`);
            }

            return result;
        } catch (error) {
            console.error(`DirectFlow API call failed (${endpoint}):`, error);
            throw error;
        }
    }

    // Get all user accounts
    async getAllUserAccounts() {
        try {
            const result = await this.makeDirectFlowAPICall('/accounts');
            return result.data || [];
        } catch (error) {
            console.error('Failed to get user accounts:', error);
            throw error;
        }
    }

    // Get all employees
    async getAllEmployees() {
        try {
            console.log('Getting all employees (including inactive)...');
            
            if (!this.directFlow || !this.directFlow.initialized) {
                throw new Error('DirectFlow not available');
            }
            
            let employees = [];
            
            // Try DirectFlow's getAllEmployeesForPayroll method which includes all statuses
            try {
                const directFlowResponse = await this.directFlow.getAllEmployeesForPayroll();
                console.log('DirectFlow getAllEmployeesForPayroll response:', directFlowResponse);
                
                if (directFlowResponse.success && directFlowResponse.data) {
                    if (Array.isArray(directFlowResponse.data)) {
                        employees = directFlowResponse.data;
                    } else if (directFlowResponse.data.employees && Array.isArray(directFlowResponse.data.employees)) {
                        employees = directFlowResponse.data.employees;
                    }
                } else if (Array.isArray(directFlowResponse)) {
                    employees = directFlowResponse;
                }
            } catch (error) {
                console.warn('DirectFlow getAllEmployeesForPayroll failed, trying API call:', error);
                
                // Fallback to direct API call
                try {
                    const result = await this.makeDirectFlowAPICall('/api/employees?status=all&limit=1000');
                    console.log('API response for all employees:', result);
                    
                    if (result.success && result.data) {
                        if (Array.isArray(result.data)) {
                            employees = result.data;
                        } else if (result.data.employees && Array.isArray(result.data.employees)) {
                            employees = result.data.employees;
                        } else {
                            console.warn('Unexpected API response format:', result);
                            employees = [];
                        }
                    } else if (result.employees && Array.isArray(result.employees)) {
                        employees = result.employees;
                    } else if (Array.isArray(result)) {
                        employees = result;
                    } else {
                        console.warn('Unexpected API response format:', result);
                        employees = [];
                    }
                } catch (apiError) {
                    console.error('API call also failed:', apiError);
                }
            }
            
            console.log(`getAllEmployees returning ${employees.length} employees`);
            console.log('Employee status breakdown:', employees.reduce((acc, emp) => {
                const status = emp.status || 'unknown';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {}));
            
            return employees;
        } catch (error) {
            console.error('Failed to get employees:', error);
            throw error;
        }
    }

    // Reset password for user
    async resetPassword(username, newPassword, forceChange = false) {
        try {
            const result = await this.makeDirectFlowAPICall('/accounts/reset-password', 'POST', {
                username,
                newPassword,
                forceChange
            });
            return result;
        } catch (error) {
            console.error('Failed to reset password:', error);
            throw error;
        }
    }

    // Get user statistics
    async getUserStatistics() {
        try {
            const result = await this.makeDirectFlowAPICall('/accounts/stats/overview');
            return result.data || {};
        } catch (error) {
            console.error('Failed to get user statistics:', error);
            throw error;
        }
    }

    // Save settings to backend
    async saveSettingsToBackend(settings) {
        try {
            const result = await this.makeDirectFlowAPICall('/api/settings', 'PUT', settings);
            return result;
        } catch (error) {
            console.error('Failed to save settings to backend:', error);
            throw error;
        }
    }

    // Load settings from backend
    async loadSettingsFromBackend() {
        try {
            const result = await this.makeDirectFlowAPICall('/api/settings');
            return result.data || {};
        } catch (error) {
            console.error('Failed to load settings from backend:', error);
            throw error;
        }
    }

    /**
     * Setup DirectFlow event listeners
     */
    setupDirectFlowListeners() {
        // Listen for DirectFlow events
        if (this.directFlow) {
            console.log('Setting up DirectFlow event listeners...');
            
            // Listen for authentication changes
            window.addEventListener('authenticationComplete', () => {
                console.log('Authentication completed, refreshing settings...');
                this.loadSettings();
            });

            // Listen for authentication errors
            window.addEventListener('authenticationError', (event) => {
                console.error('Authentication error:', event.detail);
                this.showErrorMessage('Authentication error. Please log in again.');
                // Redirect to login if needed
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);
            });
        }
    }
}

// Initialize settings controller when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for DirectFlow to be ready
    let waitCount = 0;
    const maxWait = 100; // 10 seconds max wait
    
    while ((!window.directFlow || !window.directFlow.initialized) && waitCount < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
        if (waitCount % 10 === 0) {
            console.log(`Settings waiting for DirectFlow... (${waitCount/10}s)`);
        }
    }
    
    if (window.directFlow && window.directFlow.initialized) {
        window.settingsController = new SettingsController();
    } else {
        console.error('DirectFlow not found or not initialized after timeout.');
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsController;
}