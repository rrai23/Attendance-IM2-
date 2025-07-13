/**
 * Settings Page Controller
 * Handles system settings, user management, business rules, and theme preferences
 */

class SettingsController {
    constructor() {
        // Initialize data service if not available
        if (!window.dataService) {
            console.log('Initializing DataService for settings...');
            window.dataService = new DataService();
        }
        this.dataService = window.dataService;
        
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
     * Initialize the settings controller
     */
    async init() {
        try {
            console.log('Initializing Settings Controller...');
            await this.loadSettings();
            this.setupTabs();
            this.setupEventListeners();
            
            // Use hybrid approach: populate existing static fields and enhance where needed
            this.populateExistingForms();
            this.enhanceMissingFields(); // Add any missing dynamic fields
            
            // Only render sections if they don't already have content
            this.renderMissingSections();
            
            this.setupFormValidation();
            this.setupAutoSave();
            console.log('Settings Controller initialized successfully');
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
     * Load all settings from data service
     */
    async loadSettings() {
        try {
            this.currentSettings = await this.dataService.getSettings();
            
            // Ensure all required sections exist
            this.currentSettings = {
                general: {
                    companyName: 'Bricks Company',
                    timezone: 'Asia/Manila',
                    dateFormat: 'MM/DD/YYYY',
                    timeFormat: '12',
                    currency: 'PHP',
                    language: 'en',
                    ...this.currentSettings.general
                },
                payroll: {
                    payPeriod: 'weekly',
                    payday: 'friday',
                    overtimeRate: 1.5,
                    overtimeThreshold: 40,
                    roundingRules: 'nearest_quarter',
                    autoCalculate: true,
                    ...this.currentSettings.payroll
                },
                attendance: {
                    clockInGrace: 5,
                    clockOutGrace: 5,
                    lunchBreakDuration: 30,
                    autoClockOut: false,
                    autoClockOutTime: '18:00',
                    requireNotes: false,
                    ...this.currentSettings.attendance
                },
                notifications: {
                    emailNotifications: true,
                    tardyAlerts: true,
                    overtimeAlerts: true,
                    payrollReminders: true,
                    systemUpdates: true,
                    ...this.currentSettings.notifications
                },
                security: {
                    sessionTimeout: 480,
                    passwordMinLength: 6,
                    requirePasswordChange: false,
                    passwordChangeInterval: 90,
                    twoFactorAuth: false,
                    ...this.currentSettings.security
                },
                theme: {
                    defaultTheme: 'light',
                    allowUserThemes: true,
                    accentColor: '#007aff',
                    ...this.currentSettings.theme
                },
                ...this.currentSettings
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
                    <button type="button" class="btn btn-primary" onclick="window.open('/IM2/users.php', '_blank')">
                        Open User Management
                    </button>
                </div>
            </div>

            <div class="settings-section">
                <h3>User Statistics</h3>
                <div id="user-stats" class="stats-grid">
                    <!-- User statistics will be loaded here -->
                </div>
            </div>
        `;

        this.loadUserStats();
    }

    /**
     * Load and display user statistics
     */
    async loadUserStats() {
        try {
            const employees = await this.dataService.getEmployees();
            const stats = {
                total: employees.length,
                active: employees.filter(emp => emp.status === 'active').length,
                inactive: employees.filter(emp => emp.status === 'inactive').length,
                admins: employees.filter(emp => emp.role === 'admin').length
            };

            const container = document.getElementById('user-stats');
            if (container) {
                container.innerHTML = `
                    <div class="stat-card">
                        <div class="stat-value">${stats.total}</div>
                        <div class="stat-label">Total Users</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.active}</div>
                        <div class="stat-label">Active Users</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.inactive}</div>
                        <div class="stat-label">Inactive Users</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.admins}</div>
                        <div class="stat-label">Administrators</div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Failed to load user stats:', error);
        }
    }

    /**
     * Generate timezone options
     */
    generateTimezoneOptions(selectedTimezone) {
        const timezones = [
            'America/New_York',
            'America/Chicago',
            'America/Denver',
            'America/Los_Angeles',
            'America/Toronto',
            'Europe/London',
            'Europe/Paris',
            'Europe/Berlin',
            'Asia/Tokyo',
            'Asia/Shanghai',
            'Australia/Sydney'
        ];

        return timezones.map(tz => 
            `<option value="${tz}" ${tz === selectedTimezone ? 'selected' : ''}>${tz.replace('_', ' ')}</option>`
        ).join('');
    }

    /**
     * Setup form validation
     */
    setupFormValidation() {
        // Real-time validation rules
        this.validationRules = {
            'general.companyName': {
                required: true,
                minLength: 2,
                maxLength: 100
            },
            'payroll.overtimeRate': {
                required: true,
                min: 1,
                max: 3
            },
            'payroll.overtimeThreshold': {
                required: true,
                min: 30,
                max: 60
            },
            'security.sessionTimeout': {
                required: true,
                min: 30,
                max: 1440
            },
            'security.passwordMinLength': {
                required: true,
                min: 4,
                max: 20
            }
        };
    }

    /**
     * Validate a specific field
     */
    validateField(field) {
        const name = field.name;
        const value = field.type === 'checkbox' ? field.checked : field.value;
        const rules = this.validationRules[name];

        if (!rules) return true;

        const errors = [];

        // Required validation
        if (rules.required && (!value || value === '')) {
            errors.push('This field is required');
        }

        // String length validation
        if (value && typeof value === 'string') {
            if (rules.minLength && value.length < rules.minLength) {
                errors.push(`Minimum length is ${rules.minLength} characters`);
            }
            if (rules.maxLength && value.length > rules.maxLength) {
                errors.push(`Maximum length is ${rules.maxLength} characters`);
            }
        }

        // Number validation
        if (value && (rules.min !== undefined || rules.max !== undefined)) {
            const numValue = parseFloat(value);
            if (isNaN(numValue)) {
                errors.push('Must be a valid number');
            } else {
                if (rules.min !== undefined && numValue < rules.min) {
                    errors.push(`Minimum value is ${rules.min}`);
                }
                if (rules.max !== undefined && numValue > rules.max) {
                    errors.push(`Maximum value is ${rules.max}`);
                }
            }
        }

        // Update field validation state
        this.updateFieldValidation(field, errors);

        // Store validation result
        if (errors.length > 0) {
            this.validationErrors[name] = errors;
        } else {
            delete this.validationErrors[name];
        }

        return errors.length === 0;
    }

    /**
     * Update field validation UI
     */
    updateFieldValidation(field, errors) {
        const fieldGroup = field.closest('.form-group');
        const errorContainer = fieldGroup?.querySelector('.field-error');

        if (errors.length > 0) {
            field.classList.add('error');
            if (errorContainer) {
                errorContainer.textContent = errors[0];
                errorContainer.style.display = 'block';
            }
        } else {
            field.classList.remove('error');
            if (errorContainer) {
                errorContainer.textContent = '';
                errorContainer.style.display = 'none';
            }
        }
    }

    /**
     * Validate all forms
     */
    validateAllForms() {
        const forms = document.querySelectorAll('.settings-form');
        let isValid = true;

        forms.forEach(form => {
            const fields = form.querySelectorAll('input, select, textarea');
            fields.forEach(field => {
                if (!this.validateField(field)) {
                    isValid = false;
                }
            });
        });

        return isValid;
    }

    /**
     * Mark settings as dirty (unsaved changes)
     */
    markDirty() {
        this.isDirty = true;
        this.updateSaveButtonState();
    }

    /**
     * Mark settings as clean (saved)
     */
    markClean() {
        this.isDirty = false;
        this.updateSaveButtonState();
    }

    /**
     * Update save button state
     */
    updateSaveButtonState() {
        const saveBtn = document.getElementById('save-settings-btn');
        if (saveBtn) {
            saveBtn.disabled = !this.isDirty || Object.keys(this.validationErrors).length > 0;
            
            // Find the text node after the SVG icon
            const textNodes = [...saveBtn.childNodes].filter(node => 
                node.nodeType === Node.TEXT_NODE && node.textContent.trim()
            );
            
            if (textNodes.length > 0) {
                // Update the last text node (after the icon)
                textNodes[textNodes.length - 1].textContent = this.isDirty ? ' Save Changes' : ' Saved';
            } else {
                // Fallback: update innerHTML while preserving the icon
                const iconSVG = saveBtn.querySelector('svg');
                if (iconSVG) {
                    saveBtn.innerHTML = iconSVG.outerHTML + (this.isDirty ? ' Save Changes' : ' Saved');
                } else {
                    saveBtn.textContent = this.isDirty ? 'Save Changes' : 'Saved';
                }
            }
            
            // Add visual feedback
            if (this.isDirty) {
                saveBtn.classList.add('btn-primary');
                saveBtn.classList.remove('btn-secondary');
            } else {
                saveBtn.classList.add('btn-secondary');
                saveBtn.classList.remove('btn-primary');
            }
        }
    }

    /**
     * Setup auto-save functionality
     */
    setupAutoSave() {
        // Auto-save every 30 seconds if there are changes
        setInterval(() => {
            if (this.isDirty && Object.keys(this.validationErrors).length === 0) {
                this.saveSettings(true); // Silent save
            }
        }, 30000);
    }

    /**
     * Collect form data
     */
    collectFormData() {
        const formData = {};
        const forms = document.querySelectorAll('.settings-form');

        forms.forEach(form => {
            const fields = form.querySelectorAll('input, select, textarea');
            fields.forEach(field => {
                const name = field.name;
                if (!name) return;

                const value = field.type === 'checkbox' ? field.checked : 
                             field.type === 'number' ? parseFloat(field.value) || 0 : 
                             field.value;

                // Handle nested object notation (e.g., "general.companyName")
                const parts = name.split('.');
                let current = formData;
                
                for (let i = 0; i < parts.length - 1; i++) {
                    if (!current[parts[i]]) {
                        current[parts[i]] = {};
                    }
                    current = current[parts[i]];
                }
                
                current[parts[parts.length - 1]] = value;
            });
        });

        return formData;
    }

    /**
     * Save settings
     */
    async saveSettings(silent = false) {
        try {
            console.log('Saving settings...', { silent, isDirty: this.isDirty });
            
            // Validate all forms
            if (!this.validateAllForms()) {
                if (!silent) {
                    this.showErrorMessage('Please fix validation errors before saving');
                }
                console.log('Validation failed, not saving');
                return false;
            }

            // Collect form data
            const formData = this.collectFormData();
            console.log('Collected form data:', formData);
            
            // Merge with current settings
            const updatedSettings = this.deepMerge(this.currentSettings, formData);
            console.log('Updated settings:', updatedSettings);

            // Save to data service
            await this.dataService.saveSettings(updatedSettings);
            console.log('Settings saved successfully to data service');

            // Update local settings
            this.currentSettings = updatedSettings;
            this.markClean();

            // Apply theme changes if needed
            if (formData.theme) {
                this.applyThemeChanges(formData.theme);
            }

            if (!silent) {
                this.showSuccessMessage('Settings saved successfully');
            }

            return true;
        } catch (error) {
            console.error('Failed to save settings:', error);
            if (!silent) {
                this.showErrorMessage('Failed to save settings: ' + error.message);
            }
            return false;
        }
    }

    /**
     * Reset settings to defaults
     */
    async resetSettings() {
        if (!confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
            return;
        }

        try {
            // Reset to default settings
            await this.loadSettings();
            this.renderAllSections();
            this.markClean();
            
            this.showSuccessMessage('Settings reset to defaults');
        } catch (error) {
            console.error('Failed to reset settings:', error);
            this.showErrorMessage('Failed to reset settings');
        }
    }

    /**
     * Export settings
     */
    exportSettings() {
        try {
            const exportData = {
                settings: this.currentSettings,
                exportDate: new Date().toISOString(),
                version: '1.0.0'
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `brix-settings-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.showSuccessMessage('Settings exported successfully');
        } catch (error) {
            console.error('Failed to export settings:', error);
            this.showErrorMessage('Failed to export settings');
        }
    }

    /**
     * Import settings
     */
    importSettings() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const importData = JSON.parse(text);

                if (!importData.settings) {
                    throw new Error('Invalid settings file format');
                }

                // Validate imported settings
                if (await this.validateImportedSettings(importData.settings)) {
                    this.currentSettings = importData.settings;
                    await this.saveSettings();
                    this.renderAllSections();
                    
                    this.showSuccessMessage('Settings imported successfully');
                } else {
                    this.showErrorMessage('Invalid settings data');
                }
            } catch (error) {
                console.error('Failed to import settings:', error);
                this.showErrorMessage('Failed to import settings');
            }
        };

        input.click();
    }

    /**
     * Validate imported settings
     */
    async validateImportedSettings(settings) {
        // Basic structure validation
        const requiredSections = ['general', 'payroll', 'attendance', 'notifications', 'security', 'theme'];
        
        for (const section of requiredSections) {
            if (!settings[section] || typeof settings[section] !== 'object') {
                return false;
            }
        }

        return true;
    }

    /**
     * Handle theme changes
     */
    handleThemeChange(theme) {
<<<<<<< HEAD
        if (this.themeManager) {
            this.themeManager.setTheme(theme);
=======
        try {
            console.log('Theme change requested:', theme);
            
            // Apply theme immediately
            document.documentElement.setAttribute('data-theme', theme);
            
            // Save to localStorage
            localStorage.setItem('theme', theme);
            
            // Update theme manager if available
            if (this.themeManager) {
                this.themeManager.setTheme(theme);
            }
            
            console.log('Theme successfully changed to:', theme);
        } catch (error) {
            console.error('Error changing theme:', error);
            this.showErrorMessage('Failed to change theme: ' + error.message);
>>>>>>> 229033b43053322d058929ca0127d85dd699d80e
        }
    }

    /**
     * Apply theme changes
     */
    applyThemeChanges(themeSettings) {
        if (this.themeManager) {
            if (themeSettings.defaultTheme) {
                this.themeManager.setTheme(themeSettings.defaultTheme);
            }
            
            if (themeSettings.accentColor) {
                // Update accent color if theme manager supports it
                document.documentElement.style.setProperty('--accent-primary', themeSettings.accentColor);
            }
        }
    }

    /**
     * Test email settings
     */
    async testEmailSettings() {
        try {
            const testBtn = document.getElementById('test-email-btn');
            const originalText = testBtn.textContent;
            
            testBtn.textContent = 'Sending...';
            testBtn.disabled = true;

            // Simulate email test (would be actual API call in production)
            await new Promise(resolve => setTimeout(resolve, 2000));

            this.showSuccessMessage('Test email sent successfully');
            
            testBtn.textContent = originalText;
            testBtn.disabled = false;
        } catch (error) {
            console.error('Failed to send test email:', error);
            this.showErrorMessage('Failed to send test email');
            
            const testBtn = document.getElementById('test-email-btn');
            testBtn.textContent = 'Send Test Email';
            testBtn.disabled = false;
        }
    }

    /**
     * Create backup
     */
    async createBackup() {
        try {
            const backupData = {
                settings: this.currentSettings,
                employees: await this.dataService.getEmployees(),
                attendanceRecords: await this.dataService.getAttendanceRecords(),
                payrollHistory: await this.dataService.getPayrollHistory(),
                backupDate: new Date().toISOString(),
                version: '1.0.0'
            };

            const blob = new Blob([JSON.stringify(backupData, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `brix-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.showSuccessMessage('Backup created successfully');
        } catch (error) {
            console.error('Failed to create backup:', error);
            this.showErrorMessage('Failed to create backup');
        }
    }

    /**
     * Restore backup
     */
    restoreBackup() {
        if (!confirm('Are you sure you want to restore from backup? This will overwrite all current data.')) {
            return;
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const backupData = JSON.parse(text);

                if (!backupData.settings || !backupData.employees) {
                    throw new Error('Invalid backup file format');
                }

                // Restore settings
                this.currentSettings = backupData.settings;
                await this.saveSettings(true);
                this.renderAllSections();

                this.showSuccessMessage('Backup restored successfully');
            } catch (error) {
                console.error('Failed to restore backup:', error);
                this.showErrorMessage('Failed to restore backup');
            }
        };

        input.click();
    }

    /**
     * Deep merge objects
     */
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }

    /**
     * Show success message
     */
    showSuccessMessage(message) {
        this.showNotification(message, 'success');
    }

    /**
     * Show error message
     */
    showErrorMessage(message) {
        this.showNotification(message, 'error');
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        notification.innerHTML = `
            <div class="notification-content">
                <svg class="notification-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    ${type === 'success' ? 
                        '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22,4 12,14.01 9,11.01"></polyline>' :
                        type === 'error' ?
                        '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>' :
                        '<circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path>'
                    }
                </svg>
                <span class="notification-message">${message}</span>
            </div>
            <button class="notification-close" aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;

        // Find or create notification container
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }

        // Allow pointer events on the notification itself
        notification.style.pointerEvents = 'auto';

        // Calculate position based on existing notifications
        const existingNotifications = container.querySelectorAll('.notification');
        let topOffset = 0;
        existingNotifications.forEach(existing => {
            topOffset += existing.offsetHeight + 8; // 8px gap between notifications
        });
        
        notification.style.position = 'relative';
        notification.style.top = topOffset + 'px';
        notification.style.marginTop = existingNotifications.length > 0 ? '8px' : '0';

        // Add to container
        container.appendChild(notification);

        // Bind close event
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        });

        // Auto-remove after 4 seconds (reduced from 5)
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 4000);

        // Animate in
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
            notification.style.transition = 'all 0.3s ease-out';
        });
    }

    /**
     * Destroy controller and cleanup
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('beforeunload', this.beforeUnloadHandler);
        window.removeEventListener('hashchange', this.hashChangeHandler);
        
        // Clear any intervals
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
    }

    /**
     * Render sections that are missing content (only empty containers)
     */
    renderMissingSections() {
        const sections = ['general', 'payroll', 'attendance', 'notifications', 'security', 'theme', 'users'];
        
        sections.forEach(sectionId => {
            const container = document.getElementById(`${sectionId}-settings`);
            if (container && (!container.innerHTML.trim() || container.children.length === 0)) {
                console.log(`Rendering missing section: ${sectionId}`);
                this.renderSection(sectionId);
            } else {
                console.log(`Preserving existing content for section: ${sectionId}`);
            }
        });
    }
}

// Initialize settings controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.dataService !== 'undefined') {
        window.settingsController = new SettingsController();
    } else {
        console.error('DataService not found. Please ensure data-service.js is loaded first.');
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsController;
}
