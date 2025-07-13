/**
 * Settings Page Controller
 * Handles system settings, user management, business rules, and theme preferences
 */

class SettingsController {
    constructor() {
        // Initialize unified employee manager if not available (EXCLUSIVE MODE)
        if (!window.unifiedEmployeeManager) {
            console.error('UnifiedEmployeeManager not available - settings page requires unified data system');
            throw new Error('UnifiedEmployeeManager not available');
        }
        
        // Wait for unified employee manager initialization
        if (!window.unifiedEmployeeManager.initialized) {
            console.log('Waiting for UnifiedEmployeeManager initialization...');
            this.initializeWhenReady();
            return;
        }
        
        this.unifiedEmployeeManager = window.unifiedEmployeeManager;
        
        // Initialize other managers with fallbacks
        this.userManager = window.userManager || null;
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
     * Wait for UnifiedEmployeeManager to be ready
     */
    async initializeWhenReady() {
        const maxWaitTime = 10000; // 10 seconds
        const checkInterval = 100; // Check every 100ms
        let waitTime = 0;
        
        while (waitTime < maxWaitTime) {
            if (window.unifiedEmployeeManager && window.unifiedEmployeeManager.initialized) {
                console.log('UnifiedEmployeeManager is now ready');
                this.unifiedEmployeeManager = window.unifiedEmployeeManager;
                this.init();
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waitTime += checkInterval;
        }
        
        console.error('Timeout waiting for UnifiedEmployeeManager initialization');
        throw new Error('UnifiedEmployeeManager initialization timeout');
    }

    /**
     * Initialize the settings controller
     */
    async init() {
        try {
            console.log('Initializing Settings Controller with unified data integration...');
            await this.loadSettings();
            this.setupTabs();
            this.setupEventListeners();
            this.setupUnifiedDataListeners(); // Add unified data listeners
            this.handleUserManagementActions(); // Setup user management actions
            
            // Use hybrid approach: populate existing static fields and enhance where needed
            this.populateExistingForms();
            this.enhanceMissingFields(); // Add any missing dynamic fields
            
            // Only render sections if they don't already have content
            this.renderMissingSections();
            
            this.setupFormValidation();
            this.setupAutoSave();
            
            // Load user stats from unified data
            await this.loadUserStats();
            
            console.log('Settings Controller initialized successfully with unified data integration');
        } catch (error) {
            console.error('Failed to initialize settings controller:', error);
            this.showErrorMessage('Failed to load settings. Please refresh the page.');
            // Try to render at least a basic interface
            try {
                this.renderBasicInterface();
            } catch (fallbackError) {
                console.error('Failed to render basic interface:', fallbackError);
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
     * Load all settings from unified data system
     */
    async loadSettings() {
        try {
            // Get settings from unified employee manager or create defaults
            let savedSettings = {};
            
            try {
                // Check if unified manager has settings stored
                const settingsData = localStorage.getItem('bricks-unified-settings');
                if (settingsData) {
                    savedSettings = JSON.parse(settingsData);
                }
            } catch (error) {
                console.warn('Failed to load saved settings, using defaults:', error);
                savedSettings = {};
            }
            
            this.currentSettings = {
                general: {
                    companyName: 'Bricks Company',
                    timezone: 'Asia/Manila',
                    dateFormat: 'MM/DD/YYYY',
                    timeFormat: '12',
                    currency: 'PHP',
                    language: 'en',
                    ...savedSettings.general
                },
                payroll: {
                    payPeriod: 'weekly',
                    payday: 'friday',
                    overtimeRate: 1.5,
                    overtimeThreshold: 40,
                    roundingRules: 'nearest_quarter',
                    autoCalculate: true,
                    ...savedSettings.payroll
                },
                attendance: {
                    clockInGrace: 5,
                    clockOutGrace: 5,
                    lunchBreakDuration: 30,
                    autoClockOut: false,
                    autoClockOutTime: '18:00',
                    requireNotes: false,
                    ...savedSettings.attendance
                },
                notifications: {
                    emailNotifications: true,
                    tardyAlerts: true,
                    overtimeAlerts: true,
                    payrollReminders: true,
                    systemUpdates: true,
                    ...savedSettings.notifications
                },
                security: {
                    sessionTimeout: 480,
                    passwordMinLength: 6,
                    requirePasswordChange: false,
                    passwordChangeInterval: 90,
                    twoFactorAuth: false,
                    ...savedSettings.security
                },
                theme: {
                    defaultTheme: 'light',
                    allowUserThemes: true,
                    accentColor: '#007aff',
                    ...savedSettings.theme
                },
                users: {
                    defaultRole: 'employee',
                    defaultHourlyRate: 15.00,
                    autoEnableAccounts: true,
                    requireEmailVerification: false,
                    lockoutAttempts: 5,
                    lockoutDuration: 30,
                    autoInactivate: false,
                    inactiveThreshold: 90,
                    ...savedSettings.users
                },
                ...savedSettings
            };
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

        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle-setting');
        if (themeToggle) {
            themeToggle.addEventListener('change', (e) => {
                this.handleThemeChange(e.target.value);
            });
        }

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
     * Populate existing form fields with settings data
     */
    populateExistingForms() {
        try {
            console.log('Populating form fields with settings data...');
            
            // Set flag to prevent marking as dirty during population
            this.isPopulating = true;
            
            // Populate general settings
            this.populateFormFields('general', this.currentSettings.general);
            
            // Populate other sections
            this.populateFormFields('payroll', this.currentSettings.payroll);
            this.populateFormFields('attendance', this.currentSettings.attendance);
            this.populateFormFields('notifications', this.currentSettings.notifications);
            this.populateFormFields('security', this.currentSettings.security);
            this.populateFormFields('theme', this.currentSettings.theme);
            
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
            this.enhanceThemeFields();
            
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

    enhanceThemeFields() {
        // Add theme field enhancements if needed
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
        
        Object.keys(data).forEach(key => {
            const fieldName = `${section}.${key}`;
            const field = document.querySelector(`[name="${fieldName}"]`);
            
            if (field) {
                console.log(`Setting field ${fieldName} to:`, data[key]);
                
                if (field.type === 'checkbox') {
                    field.checked = Boolean(data[key]);
                } else if (field.type === 'radio') {
                    const radioField = document.querySelector(`[name="${fieldName}"][value="${data[key]}"]`);
                    if (radioField) radioField.checked = true;
                } else if (field.tagName === 'SELECT') {
                    // Handle select elements specially
                    console.log(`Setting select ${fieldName} to value: ${data[key]}`);
                    
                    // First, clear any existing selection
                    Array.from(field.options).forEach(option => option.selected = false);
                    
                    // Try to find and select the correct option
                    const option = field.querySelector(`option[value="${data[key]}"]`);
                    if (option) {
                        field.value = data[key];
                        option.selected = true;
                        console.log(`✅ Successfully set select ${fieldName} to ${data[key]}`);
                    } else {
                        console.warn(`⚠️ Option not found for ${fieldName} with value: ${data[key]}`);
                        console.log('Available options:', Array.from(field.options).map(opt => opt.value));
                        
                        // Create the missing option
                        const newOption = document.createElement('option');
                        newOption.value = data[key];
                        newOption.textContent = data[key];
                        newOption.selected = true;
                        field.appendChild(newOption);
                        field.value = data[key];
                        console.log(`✅ Created and selected new option for ${fieldName}: ${data[key]}`);
                    }
                } else {
                    field.value = data[key] || '';
                }
                
                // Trigger change event to update any dependent UI
                field.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                console.warn(`❌ Field not found: ${fieldName}`);
            }
        });
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
                    
                    <div class="form-group">
                        <label for="language">Language</label>
                        <select id="language" name="general.language">
                            <option value="en" ${settings.language === 'en' ? 'selected' : ''}>English</option>
                            <option value="es" ${settings.language === 'es' ? 'selected' : ''}>Spanish</option>
                            <option value="fr" ${settings.language === 'fr' ? 'selected' : ''}>French</option>
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
     * Load and display account summary
     */
    async loadAccountSummary() {
        try {
            if (!window.unifiedAccountManager || !window.unifiedAccountManager.initialized) {
                return;
            }

            const stats = window.unifiedAccountManager.getAccountStats();
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
                            <span class="stat-number">${stats.employees}</span>
                            <span class="stat-label">Employee Accounts</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${stats.admins}</span>
                            <span class="stat-label">Admin Accounts</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${stats.mustChangePassword}</span>
                            <span class="stat-label">Need Password Change</span>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading account summary:', error);
        }
    }

    /**
     * Show accounts modal with detailed account information
     */
    showAccountsModal() {
        if (!window.unifiedAccountManager || !window.unifiedAccountManager.initialized) {
            this.showErrorMessage('Account manager not available');
            return;
        }

        const accounts = window.unifiedAccountManager.getAllAccounts();
        
        const modalContent = `
            <div class="accounts-table-container">
                <table class="accounts-table">
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Full Name</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Employee ID</th>
                            <th>Password Change Required</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${accounts.map(account => `
                            <tr>
                                <td>${account.username}</td>
                                <td>${account.fullName || 'N/A'}</td>
                                <td>${account.role}</td>
                                <td>
                                    <span class="status-badge status-${account.status}">
                                        ${account.status}
                                    </span>
                                </td>
                                <td>${account.employeeId || 'N/A'}</td>
                                <td>
                                    ${account.mustChangePassword ? 
                                        '<span class="status-badge status-warning">Yes</span>' : 
                                        '<span class="status-badge status-success">No</span>'}
                                </td>
                                <td>
                                    ${!account.isSystemAccount ? `
                                        <button class="btn btn-sm btn-secondary" onclick="settingsController.resetAccountPassword('${account.username}')">
                                            Reset Password
                                        </button>
                                    ` : 'System Account'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        this.showModal('User Accounts', modalContent, 'large');
    }

    /**
     * Sync accounts with employees
     */
    async syncAccounts() {
        try {
            if (!window.unifiedAccountManager || !window.unifiedAccountManager.initialized) {
                this.showErrorMessage('Account manager not available');
                return;
            }

            this.showSuccessMessage('Syncing accounts with employees...');
            await window.unifiedAccountManager.syncWithEmployeeManager();
            await this.loadAccountSummary();
            await this.loadUserStats();
            this.showSuccessMessage('Account sync completed successfully');

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
                    <label class="form-label">Reset Type</label>
                    <div class="radio-group">
                        <label class="radio-label">
                            <input type="radio" name="resetType" value="all" checked>
                            Reset all employee passwords to default
                        </label>
                        <label class="radio-label">
                            <input type="radio" name="resetType" value="expired">
                            Reset only accounts that need password change
                        </label>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="newPassword" class="form-label">New Password</label>
                    <input type="password" id="newPassword" class="form-input" value="employee" placeholder="Enter new password">
                    <small class="field-help">Default password for all reset accounts</small>
                </div>
                
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="forceChange" checked>
                        <span class="checkmark"></span>
                        Force password change on next login
                    </label>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="settingsController.closeModal()">
                        Cancel
                    </button>
                    <button type="button" class="btn btn-warning" onclick="settingsController.executePasswordReset()">
                        Reset Passwords
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

            if (!window.unifiedAccountManager || !window.unifiedAccountManager.initialized) {
                this.showErrorMessage('Account manager not available');
                return;
            }

            const accounts = window.unifiedAccountManager.getAllAccounts();
            let resetCount = 0;

            for (const account of accounts) {
                if (account.isSystemAccount) continue; // Skip system accounts
                
                const shouldReset = resetType === 'all' || 
                                  (resetType === 'expired' && account.mustChangePassword);
                
                if (shouldReset) {
                    await window.unifiedAccountManager.resetPassword(account.username, newPassword, forceChange);
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

            if (!window.unifiedAccountManager || !window.unifiedAccountManager.initialized) {
                this.showErrorMessage('Account manager not available');
                return;
            }

            const result = await window.unifiedAccountManager.resetPassword(username, newPassword, forceChange);
            
            if (result.success) {
                this.showSuccessMessage(`Password reset for ${username}`);
                await this.loadAccountSummary();
            } else {
                this.showErrorMessage('Failed to reset password: ' + result.message);
            }

        } catch (error) {
            console.error('Error resetting account password:', error);
            this.showErrorMessage('Failed to reset password: ' + error.message);
        }
    }

    /**
     * Load and display user statistics from unified employee manager
     */
    async loadUserStats() {
        try {
            // Get employees from unified employee manager (EXCLUSIVE MODE)
            if (!this.unifiedEmployeeManager || !this.unifiedEmployeeManager.initialized) {
                throw new Error('UnifiedEmployeeManager not available for user stats');
            }
            
            const employees = this.unifiedEmployeeManager.getAllEmployees();
            const stats = {
                total: employees.length,
                active: employees.filter(emp => emp.status === 'active').length,
                inactive: employees.filter(emp => emp.status === 'inactive').length,
                admins: employees.filter(emp => emp.role === 'admin').length
            };

            // Get account statistics if available
            let accountStats = null;
            if (window.unifiedAccountManager && window.unifiedAccountManager.initialized) {
                accountStats = window.unifiedAccountManager.getAccountStats();
            }

            console.log('User stats loaded from unified employee manager:', stats);
            console.log('Account stats loaded from unified account manager:', accountStats);

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
                    ${accountStats ? `
                        <div class="stat-card">
                            <div class="stat-value">${accountStats.total}</div>
                            <div class="stat-label">User Accounts</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${accountStats.mustChangePassword}</div>
                            <div class="stat-label">Need Password Change</div>
                        </div>
                    ` : ''}
                `;
            }

            // Update any other stat displays that might exist
            this.updateAdditionalStats(stats);

        } catch (error) {
            console.error('Failed to load user stats from unified employee manager:', error);
            this.showErrorMessage('Failed to load user statistics: ' + error.message);
            
            // Show fallback stats
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
}

// Initialize settings controller when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for unified employee manager to be ready
    let waitCount = 0;
    const maxWait = 100; // 10 seconds max wait
    
    while ((!window.unifiedEmployeeManager || !window.unifiedEmployeeManager.initialized) && waitCount < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
        if (waitCount % 10 === 0) {
            console.log(`Settings waiting for unified manager... (${waitCount/10}s)`);
        }
    }
    
    if (window.unifiedEmployeeManager && window.unifiedEmployeeManager.initialized) {
        window.settingsController = new SettingsController();
    } else {
        console.error('UnifiedEmployeeManager not found or not initialized after timeout.');
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsController;
}