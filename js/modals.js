/**
 * Modal Management System
 * Handles dynamic modal creation, state management, and animations
 */

class ModalManager {
    constructor() {
        this.activeModals = new Map();
        this.modalCounter = 0;
        this.defaultOptions = {
            closable: true,
            backdrop: true,
            keyboard: true,
            animation: true,
            size: 'md',
            position: 'center'
        };
        
        this.init();
    }

    init() {
        // Create modal container if it doesn't exist
        if (!document.getElementById('modal-container')) {
            const container = document.createElement('div');
            container.id = 'modal-container';
            document.body.appendChild(container);
        }

        // Bind global event listeners
        this.bindGlobalEvents();
    }

    bindGlobalEvents() {
        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeTopModal();
            }
        });

        // Handle backdrop clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                const modalId = e.target.dataset.modalId;
                const modal = this.activeModals.get(modalId);
                if (modal && modal.options.backdrop) {
                    this.close(modalId);
                }
            }
        });
    }

    /**
     * Create and show a modal
     * @param {Object} config - Modal configuration
     * @returns {string} Modal ID
     */
    create(config) {
        const modalId = `modal-${++this.modalCounter}`;
        const options = { ...this.defaultOptions, ...config.options };
        
        const modalHTML = this.generateModalHTML(modalId, config, options);
        const container = document.getElementById('modal-container');
        container.insertAdjacentHTML('beforeend', modalHTML);

        const modalElement = document.getElementById(modalId);
        const overlayElement = modalElement.querySelector('.modal-overlay');

        // Store modal reference
        this.activeModals.set(modalId, {
            element: modalElement,
            overlay: overlayElement,
            options: options,
            config: config
        });

        // Bind modal-specific events
        this.bindModalEvents(modalId);

        // Show modal with animation
        this.show(modalId);

        return modalId;
    }

    /**
     * Generate modal HTML structure
     */
    generateModalHTML(modalId, config, options) {
        const sizeClass = `modal-${options.size}`;
        const positionClass = `modal-${options.position}`;
        const customClass = options.customClass || '';

        return `
            <div id="${modalId}" class="modal-wrapper">
                <div class="modal-overlay ${options.animation ? 'modal-animated' : ''}" data-modal-id="${modalId}">
                    <div class="modal ${sizeClass} ${positionClass} ${customClass}" role="dialog" aria-labelledby="${modalId}-title" aria-modal="true">
                        ${this.generateModalHeader(modalId, config, options)}
                        ${this.generateModalBody(modalId, config)}
                        ${this.generateModalFooter(modalId, config)}
                    </div>
                </div>
            </div>
        `;
    }

    generateModalHeader(modalId, config, options) {
        if (!config.title && !options.closable) return '';

        return `
            <div class="modal-header">
                ${config.title ? `<h3 class="modal-title" id="${modalId}-title">${config.title}</h3>` : ''}
                ${config.subtitle ? `<p class="modal-subtitle">${config.subtitle}</p>` : ''}
                ${options.closable ? `
                    <button type="button" class="modal-close" data-modal-close="${modalId}" aria-label="Close">
                        <svg class="modal-close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                ` : ''}
            </div>
        `;
    }

    generateModalBody(modalId, config) {
        let bodyContent = '';

        if (config.content) {
            bodyContent = config.content;
        } else if (config.form) {
            bodyContent = this.generateFormHTML(config.form, modalId);
        } else if (config.template) {
            bodyContent = this.renderTemplate(config.template, config.data || {});
        }

        return `<div class="modal-body">${bodyContent}</div>`;
    }

    generateModalFooter(modalId, config) {
        if (!config.buttons || config.buttons.length === 0) return '';

        const buttonsHTML = config.buttons.map(button => {
            const btnClass = `btn ${button.class || 'btn-secondary'}`;
            const btnAttrs = button.attributes ? Object.entries(button.attributes)
                .map(([key, value]) => `${key}="${value}"`).join(' ') : '';
            
            return `
                <button type="${button.type || 'button'}" 
                        class="${btnClass}" 
                        data-modal-action="${button.action || ''}"
                        data-modal-id="${modalId}"
                        ${btnAttrs}>
                    ${button.text}
                </button>
            `;
        }).join('');

        return `<div class="modal-footer">${buttonsHTML}</div>`;
    }

    generateFormHTML(formConfig, modalId) {
        let formHTML = `<form id="${modalId}-form" class="modal-form">`;

        formConfig.fields.forEach(field => {
            formHTML += this.generateFieldHTML(field);
        });

        formHTML += '</form>';
        return formHTML;
    }

    generateFieldHTML(field) {
        const fieldId = `field-${field.name}`;
        const required = field.required ? 'required' : '';
        const value = field.value || '';

        let fieldHTML = `<div class="form-group">`;
        
        if (field.label) {
            fieldHTML += `<label for="${fieldId}" class="form-label">${field.label}</label>`;
        }

        switch (field.type) {
            case 'text':
            case 'email':
            case 'password':
            case 'number':
                fieldHTML += `
                    <input type="${field.type}" 
                           id="${fieldId}" 
                           name="${field.name}" 
                           class="form-input" 
                           placeholder="${field.placeholder || ''}"
                           value="${value}"
                           ${required}>
                `;
                break;

            case 'textarea':
                fieldHTML += `
                    <textarea id="${fieldId}" 
                              name="${field.name}" 
                              class="form-textarea" 
                              placeholder="${field.placeholder || ''}"
                              rows="${field.rows || 4}"
                              ${required}>${value}</textarea>
                `;
                break;

            case 'select':
                fieldHTML += `<select id="${fieldId}" name="${field.name}" class="form-select" ${required}>`;
                if (field.placeholder) {
                    fieldHTML += `<option value="">${field.placeholder}</option>`;
                }
                field.options.forEach(option => {
                    const selected = option.value === value ? 'selected' : '';
                    fieldHTML += `<option value="${option.value}" ${selected}>${option.text}</option>`;
                });
                fieldHTML += '</select>';
                break;

            case 'checkbox':
                const checked = field.checked || value ? 'checked' : '';
                fieldHTML += `
                    <label class="form-checkbox">
                        <input type="checkbox" 
                               id="${fieldId}" 
                               name="${field.name}" 
                               value="${field.value || '1'}"
                               ${checked} ${required}>
                        <span class="form-checkbox-label">${field.checkboxLabel || field.label}</span>
                    </label>
                `;
                break;

            case 'radio':
                field.options.forEach(option => {
                    const checked = option.value === value ? 'checked' : '';
                    fieldHTML += `
                        <label class="form-radio">
                            <input type="radio" 
                                   name="${field.name}" 
                                   value="${option.value}"
                                   ${checked} ${required}>
                            <span class="form-radio-label">${option.text}</span>
                        </label>
                    `;
                });
                break;
        }

        if (field.help) {
            fieldHTML += `<div class="form-help">${field.help}</div>`;
        }

        fieldHTML += '</div>';
        return fieldHTML;
    }

    bindModalEvents(modalId) {
        const modal = this.activeModals.get(modalId);
        if (!modal) return;

        const modalElement = modal.element;

        // Close button events
        modalElement.querySelectorAll('[data-modal-close]').forEach(btn => {
            btn.addEventListener('click', () => this.close(modalId));
        });

        // Action button events
        modalElement.querySelectorAll('[data-modal-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.dataset.modalAction;
                this.handleAction(modalId, action, e);
            });
        });

        // Form submission
        const form = modalElement.querySelector('.modal-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit(modalId, form);
            });
        }
    }

    handleAction(modalId, action, event) {
        const modal = this.activeModals.get(modalId);
        if (!modal) return;

        const config = modal.config;

        switch (action) {
            case 'close':
                this.close(modalId);
                break;

            case 'submit':
                const form = modal.element.querySelector('.modal-form');
                if (form) {
                    this.handleFormSubmit(modalId, form);
                } else if (config.onSubmit) {
                    config.onSubmit(modalId, event);
                }
                break;

            case 'confirm':
                if (config.onConfirm) {
                    config.onConfirm(modalId, event);
                }
                this.close(modalId);
                break;

            case 'cancel':
                if (config.onCancel) {
                    config.onCancel(modalId, event);
                }
                this.close(modalId);
                break;

            default:
                if (config.onAction) {
                    config.onAction(action, modalId, event);
                }
                break;
        }
    }

    handleFormSubmit(modalId, form) {
        const modal = this.activeModals.get(modalId);
        if (!modal) return;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Validate form
        const validation = this.validateForm(form);
        if (!validation.isValid) {
            this.showFormErrors(form, validation.errors);
            return;
        }

        // Clear any existing errors
        this.clearFormErrors(form);

        // Call submit handler
        if (modal.config.onSubmit) {
            const result = modal.config.onSubmit(data, modalId, form);
            
            // Handle async submission
            if (result instanceof Promise) {
                this.setFormLoading(form, true);
                result
                    .then(() => {
                        this.close(modalId);
                    })
                    .catch((error) => {
                        this.showFormErrors(form, { general: error.message || 'An error occurred' });
                    })
                    .finally(() => {
                        this.setFormLoading(form, false);
                    });
            } else if (result !== false) {
                // Close modal if submission was successful (not explicitly false)
                this.close(modalId);
            }
        }
    }

    validateForm(form) {
        const errors = {};
        let isValid = true;

        // Validate required fields
        form.querySelectorAll('[required]').forEach(field => {
            if (!field.value.trim()) {
                errors[field.name] = 'This field is required';
                isValid = false;
            }
        });

        // Validate email fields
        form.querySelectorAll('input[type="email"]').forEach(field => {
            if (field.value && !this.isValidEmail(field.value)) {
                errors[field.name] = 'Please enter a valid email address';
                isValid = false;
            }
        });

        // Validate number fields
        form.querySelectorAll('input[type="number"]').forEach(field => {
            if (field.value && isNaN(field.value)) {
                errors[field.name] = 'Please enter a valid number';
                isValid = false;
            }
        });

        return { isValid, errors };
    }

    showFormErrors(form, errors) {
        // Clear existing errors
        this.clearFormErrors(form);

        Object.entries(errors).forEach(([fieldName, message]) => {
            if (fieldName === 'general') {
                // Show general error at top of form
                const errorDiv = document.createElement('div');
                errorDiv.className = 'alert alert-danger';
                errorDiv.textContent = message;
                form.insertBefore(errorDiv, form.firstChild);
            } else {
                // Show field-specific error
                const field = form.querySelector(`[name="${fieldName}"]`);
                if (field) {
                    const formGroup = field.closest('.form-group');
                    if (formGroup) {
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'form-error';
                        errorDiv.textContent = message;
                        formGroup.appendChild(errorDiv);
                        
                        field.classList.add('form-input-error');
                    }
                }
            }
        });
    }

    clearFormErrors(form) {
        // Remove error messages
        form.querySelectorAll('.form-error, .alert-danger').forEach(el => el.remove());
        
        // Remove error styling
        form.querySelectorAll('.form-input-error').forEach(el => {
            el.classList.remove('form-input-error');
        });
    }

    setFormLoading(form, loading) {
        const submitBtn = form.querySelector('button[type="submit"], [data-modal-action="submit"]');
        if (submitBtn) {
            if (loading) {
                submitBtn.disabled = true;
                submitBtn.classList.add('loading');
                submitBtn.dataset.originalText = submitBtn.textContent;
                submitBtn.textContent = 'Loading...';
            } else {
                submitBtn.disabled = false;
                submitBtn.classList.remove('loading');
                if (submitBtn.dataset.originalText) {
                    submitBtn.textContent = submitBtn.dataset.originalText;
                    delete submitBtn.dataset.originalText;
                }
            }
        }
    }

    show(modalId) {
        const modal = this.activeModals.get(modalId);
        if (!modal) return;

        const overlay = modal.overlay;
        
        // Add to DOM and trigger reflow
        requestAnimationFrame(() => {
            overlay.classList.add('active');
            
            // Focus management
            const firstFocusable = overlay.querySelector('input, select, textarea, button');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        });

        // Call onShow callback
        if (modal.config.onShow) {
            modal.config.onShow(modalId);
        }
    }

    close(modalId) {
        const modal = this.activeModals.get(modalId);
        if (!modal) return;

        const overlay = modal.overlay;
        
        // Call onClose callback
        if (modal.config.onClose) {
            const shouldClose = modal.config.onClose(modalId);
            if (shouldClose === false) return; // Prevent closing
        }

        // Animate out
        overlay.classList.remove('active');
        
        // Remove from DOM after animation
        setTimeout(() => {
            const modalElement = modal.element;
            if (modalElement && modalElement.parentNode) {
                modalElement.parentNode.removeChild(modalElement);
            }
            this.activeModals.delete(modalId);
        }, 300);
    }

    closeAll() {
        Array.from(this.activeModals.keys()).forEach(modalId => {
            this.close(modalId);
        });
    }

    closeTopModal() {
        const modalIds = Array.from(this.activeModals.keys());
        if (modalIds.length > 0) {
            this.close(modalIds[modalIds.length - 1]);
        }
    }

    update(modalId, updates) {
        const modal = this.activeModals.get(modalId);
        if (!modal) return;

        const modalElement = modal.element;

        if (updates.title) {
            const titleElement = modalElement.querySelector('.modal-title');
            if (titleElement) {
                titleElement.textContent = updates.title;
            }
        }

        if (updates.content) {
            const bodyElement = modalElement.querySelector('.modal-body');
            if (bodyElement) {
                bodyElement.innerHTML = updates.content;
            }
        }

        if (updates.buttons) {
            const footerElement = modalElement.querySelector('.modal-footer');
            if (footerElement) {
                footerElement.innerHTML = this.generateModalFooter(modalId, { buttons: updates.buttons }).replace('<div class="modal-footer">', '').replace('</div>', '');
                this.bindModalEvents(modalId);
            }
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    renderTemplate(template, data) {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] || '';
        });
    }

    // Predefined modal types for common use cases
    confirm(options) {
        return this.create({
            title: options.title || 'Confirm Action',
            content: options.message || 'Are you sure you want to proceed?',
            buttons: [
                {
                    text: options.cancelText || 'Cancel',
                    class: 'btn-secondary',
                    action: 'cancel'
                },
                {
                    text: options.confirmText || 'Confirm',
                    class: options.confirmClass || 'btn-primary',
                    action: 'confirm'
                }
            ],
            onConfirm: options.onConfirm,
            onCancel: options.onCancel,
            options: {
                size: 'small',
                ...options.modalOptions
            }
        });
    }

    alert(options) {
        return this.create({
            title: options.title || 'Alert',
            content: options.message || '',
            buttons: [
                {
                    text: options.buttonText || 'OK',
                    class: 'btn-primary',
                    action: 'close'
                }
            ],
            onClose: options.onClose,
            options: {
                size: 'small',
                ...options.modalOptions
            }
        });
    }

    prompt(options) {
        return this.create({
            title: options.title || 'Input Required',
            form: {
                fields: [
                    {
                        type: 'text',
                        name: 'value',
                        label: options.label || 'Value',
                        placeholder: options.placeholder || '',
                        value: options.defaultValue || '',
                        required: true
                    }
                ]
            },
            buttons: [
                {
                    text: options.cancelText || 'Cancel',
                    class: 'btn-secondary',
                    action: 'cancel'
                },
                {
                    text: options.submitText || 'Submit',
                    class: 'btn-primary',
                    action: 'submit'
                }
            ],
            onSubmit: (data) => {
                if (options.onSubmit) {
                    return options.onSubmit(data.value);
                }
            },
            onCancel: options.onCancel,
            options: {
                size: 'small',
                ...options.modalOptions
            }
        });
    }

    editEmployee(employee = {}) {
        return this.create({
            title: employee.id ? 'Edit Employee' : 'Add Employee',
            form: {
                fields: [
                    {
                        type: 'text',
                        name: 'firstName',
                        label: 'First Name',
                        value: employee.firstName || '',
                        required: true
                    },
                    {
                        type: 'text',
                        name: 'lastName',
                        label: 'Last Name',
                        value: employee.lastName || '',
                        required: true
                    },
                    {
                        type: 'email',
                        name: 'email',
                        label: 'Email',
                        value: employee.email || '',
                        required: true
                    },
                    {
                        type: 'select',
                        name: 'role',
                        label: 'Role',
                        value: employee.role || '',
                        required: true,
                        options: [
                            { value: 'employee', text: 'Employee' },
                            { value: 'admin', text: 'Administrator' }
                        ]
                    },
                    {
                        type: 'number',
                        name: 'hourlyRate',
                        label: 'Hourly Rate ($)',
                        value: employee.hourlyRate || '',
                        required: true
                    }
                ]
            },
            buttons: [
                {
                    text: 'Cancel',
                    class: 'btn-secondary',
                    action: 'cancel'
                },
                {
                    text: employee.id ? 'Update' : 'Create',
                    class: 'btn-primary',
                    action: 'submit'
                }
            ],
            onSubmit: async (data) => {
                // This would be handled by the calling code
                console.log('Employee data:', data);
                return true;
            }
        });
    }

    addNote(date, existingNote = '') {
        return this.create({
            title: `Add Note for ${date}`,
            form: {
                fields: [
                    {
                        type: 'textarea',
                        name: 'note',
                        label: 'Note',
                        value: existingNote,
                        placeholder: 'Enter your note here...',
                        rows: 4,
                        required: true
                    }
                ]
            },
            buttons: [
                {
                    text: 'Cancel',
                    class: 'btn-secondary',
                    action: 'cancel'
                },
                {
                    text: 'Save',
                    class: 'btn-primary',
                    action: 'submit'
                }
            ],
            onSubmit: async (data) => {
                // This would be handled by the calling code
                console.log('Note data:', data);
                return true;
            }
        });
    }
}

// Create global instance
const modalManager = new ModalManager();

// Make modalManager globally available
window.modalManager = modalManager;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalManager;
}

// Global convenience functions
window.showModal = (config) => modalManager.create(config);
window.closeModal = (modalId) => modalManager.close(modalId);
window.confirmAction = (options) => modalManager.confirm(options);
window.showAlert = (options) => modalManager.alert(options);
window.showPrompt = (options) => modalManager.prompt(options);

// Specialized logout confirmation function
window.confirmLogout = (options = {}) => {
    return modalManager.create({
        title: options.title || 'Confirm Logout',
        content: `
            <div class="text-center">
                <p>${options.message || 'Are you sure you want to logout? You will be redirected to the login page.'}</p>
                ${options.unsavedChanges ? '<p style="color: var(--color-orange-600); font-weight: 500;">⚠️ You have unsaved changes that will be lost.</p>' : ''}
            </div>
        `,
        buttons: [
            {
                text: options.cancelText || 'Cancel',
                class: 'btn-secondary',
                action: 'cancel'
            },
            {
                text: options.confirmText || 'Logout',
                class: options.unsavedChanges ? 'btn-warning' : 'btn-primary',
                action: 'confirm'
            }
        ],
        onConfirm: options.onConfirm,
        onCancel: options.onCancel,
        options: {
            size: 'sm',
            customClass: 'modal-logout-confirm',
            ...options.modalOptions
        }
    });
};