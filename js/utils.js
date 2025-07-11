/**
 * Utility Functions for Bricks Attendance System
 * Reusable functions for date formatting, currency, validation, and business logic
 */

// Date Formatting Utilities
const DateUtils = {
    /**
     * Format date to readable string
     * @param {Date|string} date - Date to format
     * @param {string} format - Format type ('short', 'long', 'time', 'datetime')
     * @returns {string} Formatted date string
     */
    formatDate(date, format = 'short') {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'Invalid Date';

        const options = {
            short: { year: 'numeric', month: 'short', day: 'numeric' },
            long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
            time: { hour: '2-digit', minute: '2-digit', hour12: true },
            datetime: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true },
            iso: null // Will return ISO string
        };

        if (format === 'iso') {
            return d.toISOString().split('T')[0];
        }

        return d.toLocaleDateString('en-US', options[format]);
    },

    /**
     * Get relative time string (e.g., "2 hours ago", "in 3 days")
     * @param {Date|string} date - Date to compare
     * @returns {string} Relative time string
     */
    getRelativeTime(date) {
        const now = new Date();
        const target = new Date(date);
        const diffMs = target.getTime() - now.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffMs / (1000 * 60));

        if (Math.abs(diffDays) >= 1) {
            return diffDays > 0 ? `in ${diffDays} day${diffDays > 1 ? 's' : ''}` : `${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''} ago`;
        } else if (Math.abs(diffHours) >= 1) {
            return diffHours > 0 ? `in ${diffHours} hour${diffHours > 1 ? 's' : ''}` : `${Math.abs(diffHours)} hour${Math.abs(diffHours) > 1 ? 's' : ''} ago`;
        } else if (Math.abs(diffMinutes) >= 1) {
            return diffMinutes > 0 ? `in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}` : `${Math.abs(diffMinutes)} minute${Math.abs(diffMinutes) > 1 ? 's' : ''} ago`;
        } else {
            return 'just now';
        }
    },

    /**
     * Get start and end of current week
     * @param {Date} date - Reference date (defaults to today)
     * @returns {Object} Object with start and end dates
     */
    getCurrentWeek(date = new Date()) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        
        const start = new Date(d.setDate(diff));
        const end = new Date(d.setDate(diff + 6));
        
        return { start, end };
    },

    /**
     * Get start and end of current month
     * @param {Date} date - Reference date (defaults to today)
     * @returns {Object} Object with start and end dates
     */
    getCurrentMonth(date = new Date()) {
        const d = new Date(date);
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        
        return { start, end };
    },

    /**
     * Check if date is today
     * @param {Date|string} date - Date to check
     * @returns {boolean} True if date is today
     */
    isToday(date) {
        const today = new Date();
        const checkDate = new Date(date);
        return today.toDateString() === checkDate.toDateString();
    },

    /**
     * Get days between two dates
     * @param {Date|string} startDate - Start date
     * @param {Date|string} endDate - End date
     * @returns {number} Number of days between dates
     */
    getDaysBetween(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
};

// Currency Formatting Utilities
const CurrencyUtils = {
    /**
     * Format number as currency
     * @param {number} amount - Amount to format
     * @param {string} currency - Currency code (default: PHP)
     * @param {string} locale - Locale for formatting (default: en-PH)
     * @returns {string} Formatted currency string
     */
    formatCurrency(amount, currency = 'PHP', locale = 'en-PH') {
        if (isNaN(amount)) return '₱0.00';
        
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    },

    /**
     * Parse currency string to number
     * @param {string} currencyString - Currency string to parse
     * @returns {number} Parsed number
     */
    parseCurrency(currencyString) {
        if (typeof currencyString !== 'string') return 0;
        return parseFloat(currencyString.replace(/[^0-9.-]+/g, '')) || 0;
    },

    /**
     * Calculate percentage
     * @param {number} value - Value
     * @param {number} total - Total
     * @param {number} decimals - Number of decimal places
     * @returns {string} Formatted percentage
     */
    formatPercentage(value, total, decimals = 1) {
        if (total === 0) return '0%';
        const percentage = (value / total) * 100;
        return `${percentage.toFixed(decimals)}%`;
    }
};

// Time Calculation Utilities
const TimeUtils = {
    /**
     * Calculate hours between two times
     * @param {string} startTime - Start time (HH:MM format)
     * @param {string} endTime - End time (HH:MM format)
     * @returns {number} Hours worked (decimal)
     */
    calculateHours(startTime, endTime) {
        if (!startTime || !endTime) return 0;
        
        const start = this.timeToMinutes(startTime);
        const end = this.timeToMinutes(endTime);
        
        let diff = end - start;
        if (diff < 0) diff += 24 * 60; // Handle overnight shifts
        
        return diff / 60;
    },

    /**
     * Convert time string to minutes
     * @param {string} timeString - Time in HH:MM format
     * @returns {number} Minutes since midnight
     */
    timeToMinutes(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    },

    /**
     * Convert minutes to time string
     * @param {number} minutes - Minutes since midnight
     * @returns {string} Time in HH:MM format
     */
    minutesToTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    },

    /**
     * Format hours as readable string
     * @param {number} hours - Hours (decimal)
     * @returns {string} Formatted hours string
     */
    formatHours(hours) {
        if (hours === 0) return '0 hours';
        
        const wholeHours = Math.floor(hours);
        const minutes = Math.round((hours - wholeHours) * 60);
        
        let result = '';
        if (wholeHours > 0) {
            result += `${wholeHours} hour${wholeHours !== 1 ? 's' : ''}`;
        }
        if (minutes > 0) {
            if (result) result += ' ';
            result += `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        }
        
        return result || '0 minutes';
    },

    /**
     * Check if time is within business hours
     * @param {string} time - Time to check (HH:MM format)
     * @param {string} startHour - Business start hour (default: 09:00)
     * @param {string} endHour - Business end hour (default: 17:00)
     * @returns {boolean} True if within business hours
     */
    isBusinessHours(time, startHour = '09:00', endHour = '17:00') {
        const timeMinutes = this.timeToMinutes(time);
        const startMinutes = this.timeToMinutes(startHour);
        const endMinutes = this.timeToMinutes(endHour);
        
        return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
    }
};

// Form Validation Utilities
const ValidationUtils = {
    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} True if valid email
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    /**
     * Validate phone number format
     * @param {string} phone - Phone number to validate
     * @returns {boolean} True if valid phone
     */
    isValidPhone(phone) {
        const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
        return phoneRegex.test(phone);
    },

    /**
     * Validate required field
     * @param {string} value - Value to validate
     * @returns {boolean} True if not empty
     */
    isRequired(value) {
        return value !== null && value !== undefined && value.toString().trim() !== '';
    },

    /**
     * Validate minimum length
     * @param {string} value - Value to validate
     * @param {number} minLength - Minimum length required
     * @returns {boolean} True if meets minimum length
     */
    minLength(value, minLength) {
        return value && value.length >= minLength;
    },

    /**
     * Validate maximum length
     * @param {string} value - Value to validate
     * @param {number} maxLength - Maximum length allowed
     * @returns {boolean} True if within maximum length
     */
    maxLength(value, maxLength) {
        return !value || value.length <= maxLength;
    },

    /**
     * Validate numeric value
     * @param {string|number} value - Value to validate
     * @returns {boolean} True if numeric
     */
    isNumeric(value) {
        return !isNaN(value) && !isNaN(parseFloat(value));
    },

    /**
     * Validate positive number
     * @param {string|number} value - Value to validate
     * @returns {boolean} True if positive number
     */
    isPositive(value) {
        return this.isNumeric(value) && parseFloat(value) > 0;
    },

    /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @returns {Object} Validation result with strength and requirements
     */
    validatePassword(password) {
        const requirements = {
            minLength: password.length >= 8,
            hasUppercase: /[A-Z]/.test(password),
            hasLowercase: /[a-z]/.test(password),
            hasNumber: /\d/.test(password),
            hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        const metRequirements = Object.values(requirements).filter(Boolean).length;
        let strength = 'weak';
        
        if (metRequirements >= 4) strength = 'strong';
        else if (metRequirements >= 3) strength = 'medium';

        return {
            isValid: metRequirements >= 3,
            strength,
            requirements
        };
    }
};

// DOM Manipulation Utilities
const DOMUtils = {
    /**
     * Create element with attributes and content
     * @param {string} tag - HTML tag name
     * @param {Object} attributes - Element attributes
     * @param {string|Node} content - Element content
     * @returns {HTMLElement} Created element
     */
    createElement(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'dataset') {
                Object.entries(value).forEach(([dataKey, dataValue]) => {
                    element.dataset[dataKey] = dataValue;
                });
            } else {
                element.setAttribute(key, value);
            }
        });

        if (typeof content === 'string') {
            element.innerHTML = content;
        } else if (content instanceof Node) {
            element.appendChild(content);
        }

        return element;
    },

    /**
     * Add event listener with automatic cleanup
     * @param {HTMLElement} element - Target element
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     * @param {Object} options - Event options
     * @returns {Function} Cleanup function
     */
    addEventListenerWithCleanup(element, event, handler, options = {}) {
        element.addEventListener(event, handler, options);
        return () => element.removeEventListener(event, handler, options);
    },

    /**
     * Toggle class on element
     * @param {HTMLElement} element - Target element
     * @param {string} className - Class name to toggle
     * @param {boolean} force - Force add/remove
     */
    toggleClass(element, className, force) {
        if (force !== undefined) {
            element.classList.toggle(className, force);
        } else {
            element.classList.toggle(className);
        }
    },

    /**
     * Show element with animation
     * @param {HTMLElement} element - Element to show
     * @param {string} animation - Animation class
     */
    showElement(element, animation = 'fade-in') {
        element.style.display = '';
        element.classList.add(animation);
        element.classList.remove('hidden');
    },

    /**
     * Hide element with animation
     * @param {HTMLElement} element - Element to hide
     * @param {string} animation - Animation class
     */
    hideElement(element, animation = 'fade-out') {
        element.classList.add(animation);
        setTimeout(() => {
            element.style.display = 'none';
            element.classList.add('hidden');
            element.classList.remove(animation);
        }, 300);
    },

    /**
     * Get form data as object
     * @param {HTMLFormElement} form - Form element
     * @returns {Object} Form data object
     */
    getFormData(form) {
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            if (data[key]) {
                if (Array.isArray(data[key])) {
                    data[key].push(value);
                } else {
                    data[key] = [data[key], value];
                }
            } else {
                data[key] = value;
            }
        }
        
        return data;
    },

    /**
     * Scroll to element smoothly
     * @param {HTMLElement} element - Target element
     * @param {Object} options - Scroll options
     */
    scrollToElement(element, options = {}) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest',
            ...options
        });
    }
};

// Business Logic Utilities
const BusinessUtils = {
    /**
     * Calculate overtime hours
     * @param {number} totalHours - Total hours worked
     * @param {number} regularHours - Regular hours threshold (default: 40)
     * @returns {Object} Regular and overtime hours
     */
    calculateOvertime(totalHours, regularHours = 40) {
        const regular = Math.min(totalHours, regularHours);
        const overtime = Math.max(0, totalHours - regularHours);
        
        return { regular, overtime };
    },

    /**
     * Calculate gross pay
     * @param {number} regularHours - Regular hours worked
     * @param {number} overtimeHours - Overtime hours worked
     * @param {number} hourlyRate - Hourly rate
     * @param {number} overtimeMultiplier - Overtime multiplier (default: 1.5)
     * @returns {Object} Pay breakdown
     */
    calculateGrossPay(regularHours, overtimeHours, hourlyRate, overtimeMultiplier = 1.5) {
        const regularPay = regularHours * hourlyRate;
        const overtimePay = overtimeHours * hourlyRate * overtimeMultiplier;
        const grossPay = regularPay + overtimePay;
        
        return {
            regularPay,
            overtimePay,
            grossPay,
            regularHours,
            overtimeHours
        };
    },

    /**
     * Calculate pay period dates
     * @param {Date} date - Reference date
     * @param {string} frequency - Pay frequency ('weekly', 'biweekly', 'monthly')
     * @returns {Object} Pay period start and end dates
     */
    getPayPeriod(date = new Date(), frequency = 'biweekly') {
        const d = new Date(date);
        let start, end;

        switch (frequency) {
            case 'weekly':
                const weekStart = new Date(d);
                weekStart.setDate(d.getDate() - d.getDay());
                start = weekStart;
                end = new Date(weekStart);
                end.setDate(weekStart.getDate() + 6);
                break;

            case 'biweekly':
                // Assuming pay periods start on Sundays
                const daysSinceEpoch = Math.floor(d.getTime() / (1000 * 60 * 60 * 24));
                const weeksSinceEpoch = Math.floor(daysSinceEpoch / 7);
                const biweekNumber = Math.floor(weeksSinceEpoch / 2);
                
                start = new Date(biweekNumber * 14 * 24 * 60 * 60 * 1000);
                end = new Date(start);
                end.setDate(start.getDate() + 13);
                break;

            case 'monthly':
                start = new Date(d.getFullYear(), d.getMonth(), 1);
                end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                break;

            default:
                throw new Error('Invalid pay frequency');
        }

        return { start, end };
    },

    /**
     * Check if employee is late
     * @param {string} clockInTime - Clock in time (HH:MM)
     * @param {string} scheduledTime - Scheduled start time (HH:MM)
     * @param {number} graceMinutes - Grace period in minutes (default: 5)
     * @returns {Object} Late status and minutes late
     */
    checkLateness(clockInTime, scheduledTime, graceMinutes = 5) {
        const clockInMinutes = TimeUtils.timeToMinutes(clockInTime);
        const scheduledMinutes = TimeUtils.timeToMinutes(scheduledTime);
        const minutesLate = clockInMinutes - scheduledMinutes;
        
        const isLate = minutesLate > graceMinutes;
        
        return {
            isLate,
            minutesLate: Math.max(0, minutesLate),
            isWithinGrace: minutesLate > 0 && minutesLate <= graceMinutes
        };
    },

    /**
     * Calculate attendance percentage
     * @param {number} daysPresent - Days present
     * @param {number} totalDays - Total working days
     * @returns {number} Attendance percentage
     */
    calculateAttendanceRate(daysPresent, totalDays) {
        if (totalDays === 0) return 0;
        return Math.round((daysPresent / totalDays) * 100);
    },

    /**
     * Get next payday
     * @param {string} frequency - Pay frequency
     * @param {Date} lastPayday - Last payday
     * @returns {Date} Next payday
     */
    getNextPayday(frequency, lastPayday = new Date()) {
        const nextPayday = new Date(lastPayday);
        
        switch (frequency) {
            case 'weekly':
                nextPayday.setDate(lastPayday.getDate() + 7);
                break;
            case 'biweekly':
                nextPayday.setDate(lastPayday.getDate() + 14);
                break;
            case 'monthly':
                nextPayday.setMonth(lastPayday.getMonth() + 1);
                break;
            default:
                throw new Error('Invalid pay frequency');
        }
        
        return nextPayday;
    }
};

// General Utilities
const Utils = {
    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function calls
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Deep clone object
     * @param {Object} obj - Object to clone
     * @returns {Object} Cloned object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (let key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    },

    /**
     * Generate unique ID
     * @param {string} prefix - ID prefix
     * @returns {string} Unique ID
     */
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Capitalize first letter of string
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     */
    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    /**
     * Format file size
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Check if object is empty
     * @param {Object} obj - Object to check
     * @returns {boolean} True if empty
     */
    isEmpty(obj) {
        if (obj == null) return true;
        if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
        return Object.keys(obj).length === 0;
    }
};

// Focus Management Utilities
const FocusUtils = {
    /**
     * Manage focus state for elements
     * @param {HTMLElement} element - Element to manage focus for
     * @param {Object} options - Focus options
     */
    manageFocus(element, options = {}) {
        const {
            trapFocus = false,
            restoreFocus = true,
            skipLinks = false
        } = options;

        const previouslyFocused = document.activeElement;
        
        if (trapFocus) {
            this.trapFocus(element);
        }
        
        element.focus();
        
        return {
            restore: () => {
                if (restoreFocus && previouslyFocused) {
                    previouslyFocused.focus();
                }
            },
            release: () => {
                this.releaseFocusTrap(element);
            }
        };
    },

    /**
     * Trap focus within an element
     * @param {HTMLElement} element - Container element
     */
    trapFocus(element) {
        const focusableElements = this.getFocusableElements(element);
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const handleTabKey = (e) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };

        element.addEventListener('keydown', handleTabKey);
        element._focusTrapHandler = handleTabKey;
    },

    /**
     * Release focus trap
     * @param {HTMLElement} element - Container element
     */
    releaseFocusTrap(element) {
        if (element._focusTrapHandler) {
            element.removeEventListener('keydown', element._focusTrapHandler);
            delete element._focusTrapHandler;
        }
    },

    /**
     * Get all focusable elements within a container
     * @param {HTMLElement} container - Container element
     * @returns {Array} Array of focusable elements
     */
    getFocusableElements(container) {
        const focusableSelectors = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
            '[contenteditable="true"]'
        ].join(', ');

        return Array.from(container.querySelectorAll(focusableSelectors))
            .filter(el => {
                return el.offsetWidth > 0 && el.offsetHeight > 0 && 
                       getComputedStyle(el).visibility !== 'hidden';
            });
    },

    /**
     * Set focus to first focusable element
     * @param {HTMLElement} container - Container element
     * @returns {boolean} True if focus was set
     */
    focusFirstElement(container) {
        const focusableElements = this.getFocusableElements(container);
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
            return true;
        }
        return false;
    },

    /**
     * Announce content to screen readers
     * @param {string} message - Message to announce
     * @param {string} priority - Priority level ('polite' or 'assertive')
     */
    announce(message, priority = 'polite') {
        const announcer = document.getElementById('aria-live-announcer') || 
                         this.createLiveRegion();
        
        announcer.setAttribute('aria-live', priority);
        announcer.textContent = message;
        
        // Clear after announcement
        setTimeout(() => {
            announcer.textContent = '';
        }, 1000);
    },

    /**
     * Create ARIA live region for announcements
     * @returns {HTMLElement} Live region element
     */
    createLiveRegion() {
        const liveRegion = document.createElement('div');
        liveRegion.id = 'aria-live-announcer';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.position = 'absolute';
        liveRegion.style.left = '-10000px';
        liveRegion.style.width = '1px';
        liveRegion.style.height = '1px';
        liveRegion.style.overflow = 'hidden';
        document.body.appendChild(liveRegion);
        return liveRegion;
    }
};

// Responsive Breakpoint Utilities
const ResponsiveUtils = {
    breakpoints: {
        xs: 0,
        sm: 576,
        md: 768,
        lg: 992,
        xl: 1200,
        xxl: 1400
    },

    /**
     * Get current breakpoint
     * @returns {string} Current breakpoint name
     */
    getCurrentBreakpoint() {
        const width = window.innerWidth;
        const breakpointEntries = Object.entries(this.breakpoints)
            .sort(([,a], [,b]) => b - a);
        
        for (const [name, minWidth] of breakpointEntries) {
            if (width >= minWidth) {
                return name;
            }
        }
        return 'xs';
    },

    /**
     * Check if current viewport matches breakpoint
     * @param {string} breakpoint - Breakpoint to check
     * @param {string} operator - Comparison operator ('up', 'down', 'only')
     * @returns {boolean} True if matches
     */
    matches(breakpoint, operator = 'up') {
        const width = window.innerWidth;
        const breakpointValue = this.breakpoints[breakpoint];
        
        if (!breakpointValue && breakpointValue !== 0) {
            console.warn(`Unknown breakpoint: ${breakpoint}`);
            return false;
        }

        switch (operator) {
            case 'up':
                return width >= breakpointValue;
            case 'down':
                const nextBreakpoint = this.getNextBreakpoint(breakpoint);
                return width < (nextBreakpoint ? this.breakpoints[nextBreakpoint] : Infinity);
            case 'only':
                const nextBp = this.getNextBreakpoint(breakpoint);
                const maxWidth = nextBp ? this.breakpoints[nextBp] - 1 : Infinity;
                return width >= breakpointValue && width <= maxWidth;
            default:
                return false;
        }
    },

    /**
     * Get next breakpoint name
     * @param {string} current - Current breakpoint
     * @returns {string|null} Next breakpoint name
     */
    getNextBreakpoint(current) {
        const names = Object.keys(this.breakpoints);
        const currentIndex = names.indexOf(current);
        return currentIndex >= 0 && currentIndex < names.length - 1 ? 
               names[currentIndex + 1] : null;
    },

    /**
     * Add responsive event listener
     * @param {Function} callback - Callback function
     * @param {number} debounceMs - Debounce delay in milliseconds
     * @returns {Function} Cleanup function
     */
    addBreakpointListener(callback, debounceMs = 150) {
        let currentBreakpoint = this.getCurrentBreakpoint();
        
        const debouncedHandler = Utils.debounce(() => {
            const newBreakpoint = this.getCurrentBreakpoint();
            if (newBreakpoint !== currentBreakpoint) {
                const oldBreakpoint = currentBreakpoint;
                currentBreakpoint = newBreakpoint;
                callback(newBreakpoint, oldBreakpoint);
            }
        }, debounceMs);

        window.addEventListener('resize', debouncedHandler);
        
        return () => {
            window.removeEventListener('resize', debouncedHandler);
        };
    },

    /**
     * Check if device is mobile
     * @returns {boolean} True if mobile device
     */
    isMobile() {
        return this.matches('md', 'down');
    },

    /**
     * Check if device is tablet
     * @returns {boolean} True if tablet device
     */
    isTablet() {
        return this.matches('md', 'up') && this.matches('lg', 'down');
    },

    /**
     * Check if device is desktop
     * @returns {boolean} True if desktop device
     */
    isDesktop() {
        return this.matches('lg', 'up');
    }
};

// Accessibility Utilities
const AccessibilityUtils = {
    /**
     * Set ARIA attributes on element
     * @param {HTMLElement} element - Target element
     * @param {Object} attributes - ARIA attributes to set
     */
    setAriaAttributes(element, attributes) {
        Object.entries(attributes).forEach(([key, value]) => {
            const ariaKey = key.startsWith('aria-') ? key : `aria-${key}`;
            if (value === null || value === undefined) {
                element.removeAttribute(ariaKey);
            } else {
                element.setAttribute(ariaKey, value.toString());
            }
        });
    },

    /**
     * Toggle ARIA expanded state
     * @param {HTMLElement} element - Target element
     * @param {boolean} expanded - Expanded state
     */
    toggleExpanded(element, expanded) {
        element.setAttribute('aria-expanded', expanded.toString());
    },

    /**
     * Set up keyboard navigation for a list
     * @param {HTMLElement} container - Container element
     * @param {Object} options - Navigation options
     */
    setupKeyboardNavigation(container, options = {}) {
        const {
            itemSelector = '[role="menuitem"], [role="option"], .nav-item',
            orientation = 'vertical',
            wrap = true,
            activateOnEnter = true,
            activateOnSpace = true
        } = options;

        let currentIndex = -1;
        
        const getItems = () => Array.from(container.querySelectorAll(itemSelector))
            .filter(item => !item.hasAttribute('disabled') && 
                           getComputedStyle(item).display !== 'none');

        const setFocus = (index) => {
            const items = getItems();
            if (items[index]) {
                items.forEach((item, i) => {
                    item.setAttribute('tabindex', i === index ? '0' : '-1');
                });
                items[index].focus();
                currentIndex = index;
            }
        };

        const handleKeyDown = (e) => {
            const items = getItems();
            if (items.length === 0) return;

            let newIndex = currentIndex;
            let handled = false;

            const isVertical = orientation === 'vertical';
            const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
            const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

            switch (e.key) {
                case nextKey:
                    newIndex = wrap ? (currentIndex + 1) % items.length : 
                              Math.min(currentIndex + 1, items.length - 1);
                    handled = true;
                    break;
                case prevKey:
                    newIndex = wrap ? (currentIndex - 1 + items.length) % items.length : 
                              Math.max(currentIndex - 1, 0);
                    handled = true;
                    break;
                case 'Home':
                    newIndex = 0;
                    handled = true;
                    break;
                case 'End':
                    newIndex = items.length - 1;
                    handled = true;
                    break;
                case 'Enter':
                    if (activateOnEnter && items[currentIndex]) {
                        items[currentIndex].click();
                        handled = true;
                    }
                    break;
                case ' ':
                    if (activateOnSpace && items[currentIndex]) {
                        e.preventDefault();
                        items[currentIndex].click();
                        handled = true;
                    }
                    break;
            }

            if (handled) {
                e.preventDefault();
                if (newIndex !== currentIndex) {
                    setFocus(newIndex);
                }
            }
        };

        container.addEventListener('keydown', handleKeyDown);
        
        // Set initial focus
        const items = getItems();
        if (items.length > 0) {
            setFocus(0);
        }

        return {
            destroy: () => {
                container.removeEventListener('keydown', handleKeyDown);
            },
            setFocus,
            getCurrentIndex: () => currentIndex
        };
    },

    /**
     * Check if element is visible to screen readers
     * @param {HTMLElement} element - Element to check
     * @returns {boolean} True if visible to screen readers
     */
    isAccessible(element) {
        const style = getComputedStyle(element);
        return style.display !== 'none' &&
               style.visibility !== 'hidden' &&
               !element.hasAttribute('aria-hidden') &&
               element.getAttribute('aria-hidden') !== 'true';
    },

    /**
     * Create skip link for keyboard navigation
     * @param {string} targetId - ID of target element
     * @param {string} text - Link text
     * @returns {HTMLElement} Skip link element
     */
    createSkipLink(targetId, text = 'Skip to main content') {
        const skipLink = document.createElement('a');
        skipLink.href = `#${targetId}`;
        skipLink.className = 'skip-link';
        skipLink.textContent = text;
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 6px;
            background: #000;
            color: #fff;
            padding: 8px;
            text-decoration: none;
            z-index: 10000;
            border-radius: 4px;
        `;

        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '6px';
        });

        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });

        return skipLink;
    }
};

// Touch Gesture Utilities
const TouchUtils = {
    /**
     * Detect touch gestures on element
     * @param {HTMLElement} element - Target element
     * @param {Object} options - Gesture options
     * @returns {Object} Gesture handler with cleanup
     */
    detectGestures(element, options = {}) {
        const {
            swipeThreshold = 50,
            tapTimeout = 300,
            doubleTapTimeout = 300,
            longPressTimeout = 500,
            preventScroll = false
        } = options;

        let touchStart = null;
        let touchEnd = null;
        let tapCount = 0;
        let tapTimer = null;
        let longPressTimer = null;
        let isLongPress = false;

        const handlers = {
            onSwipeLeft: options.onSwipeLeft || (() => {}),
            onSwipeRight: options.onSwipeRight || (() => {}),
            onSwipeUp: options.onSwipeUp || (() => {}),
            onSwipeDown: options.onSwipeDown || (() => {}),
            onTap: options.onTap || (() => {}),
            onDoubleTap: options.onDoubleTap || (() => {}),
            onLongPress: options.onLongPress || (() => {}),
            onPinch: options.onPinch || (() => {}),
            onRotate: options.onRotate || (() => {})
        };

        const handleTouchStart = (e) => {
            if (preventScroll) {
                e.preventDefault();
            }

            touchStart = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
                time: Date.now()
            };

            isLongPress = false;
            
            // Start long press timer
            longPressTimer = setTimeout(() => {
                isLongPress = true;
                handlers.onLongPress(e, touchStart);
            }, longPressTimeout);

            // Handle multi-touch gestures
            if (e.touches.length === 2) {
                this.handleMultiTouch(e, handlers);
            }
        };

        const handleTouchMove = (e) => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }

            if (e.touches.length === 2) {
                this.handleMultiTouch(e, handlers);
            }
        };

        const handleTouchEnd = (e) => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }

            if (!touchStart || isLongPress) {
                touchStart = null;
                return;
            }

            touchEnd = {
                x: e.changedTouches[0].clientX,
                y: e.changedTouches[0].clientY,
                time: Date.now()
            };

            const deltaX = touchEnd.x - touchStart.x;
            const deltaY = touchEnd.y - touchStart.y;
            const deltaTime = touchEnd.time - touchStart.time;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            // Check for swipe
            if (distance > swipeThreshold && deltaTime < 1000) {
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    // Horizontal swipe
                    if (deltaX > 0) {
                        handlers.onSwipeRight(e, { deltaX, deltaY, distance });
                    } else {
                        handlers.onSwipeLeft(e, { deltaX, deltaY, distance });
                    }
                } else {
                    // Vertical swipe
                    if (deltaY > 0) {
                        handlers.onSwipeDown(e, { deltaX, deltaY, distance });
                    } else {
                        handlers.onSwipeUp(e, { deltaX, deltaY, distance });
                    }
                }
            } else if (distance < 10 && deltaTime < tapTimeout) {
                // Handle tap/double tap
                tapCount++;
                
                if (tapCount === 1) {
                    tapTimer = setTimeout(() => {
                        handlers.onTap(e, touchStart);
                        tapCount = 0;
                    }, doubleTapTimeout);
                } else if (tapCount === 2) {
                    clearTimeout(tapTimer);
                    handlers.onDoubleTap(e, touchStart);
                    tapCount = 0;
                }
            }

            touchStart = null;
            touchEnd = null;
        };

        element.addEventListener('touchstart', handleTouchStart, { passive: !preventScroll });
        element.addEventListener('touchmove', handleTouchMove, { passive: !preventScroll });
        element.addEventListener('touchend', handleTouchEnd, { passive: true });

        return {
            destroy: () => {
                element.removeEventListener('touchstart', handleTouchStart);
                element.removeEventListener('touchmove', handleTouchMove);
                element.removeEventListener('touchend', handleTouchEnd);
                if (longPressTimer) clearTimeout(longPressTimer);
                if (tapTimer) clearTimeout(tapTimer);
            }
        };
    },

    /**
     * Handle multi-touch gestures (pinch, rotate)
     * @param {TouchEvent} e - Touch event
     * @param {Object} handlers - Gesture handlers
     */
    handleMultiTouch(e, handlers) {
        if (e.touches.length !== 2) return;

        const touch1 = e.touches[0];
        const touch2 = e.touches[1];

        const distance = Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2)
        );

        const angle = Math.atan2(
            touch2.clientY - touch1.clientY,
            touch2.clientX - touch1.clientX
        ) * 180 / Math.PI;

        if (!this.lastMultiTouch) {
            this.lastMultiTouch = { distance, angle };
            return;
        }

        const deltaDistance = distance - this.lastMultiTouch.distance;
        const deltaAngle = angle - this.lastMultiTouch.angle;

        if (Math.abs(deltaDistance) > 5) {
            handlers.onPinch(e, {
                scale: distance / this.lastMultiTouch.distance,
                delta: deltaDistance
            });
        }

        if (Math.abs(deltaAngle) > 5) {
            handlers.onRotate(e, {
                angle: deltaAngle,
                totalAngle: angle
            });
        }

        this.lastMultiTouch = { distance, angle };
    },

    /**
     * Check if device supports touch
     * @returns {boolean} True if touch is supported
     */
    isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    },

    /**
     * Get touch-friendly size for interactive elements
     * @param {string} type - Element type ('button', 'link', 'input')
     * @returns {Object} Recommended dimensions
     */
    getTouchTargetSize(type = 'button') {
        const sizes = {
            button: { minWidth: 44, minHeight: 44 },
            link: { minWidth: 44, minHeight: 44 },
            input: { minWidth: 44, minHeight: 44 },
            icon: { minWidth: 32, minHeight: 32 }
        };

        return sizes[type] || sizes.button;
    }
};

// Color Contrast Utilities
const ColorUtils = {
    /**
     * Calculate relative luminance of a color
     * @param {string} color - Color in hex, rgb, or hsl format
     * @returns {number} Relative luminance (0-1)
     */
    getLuminance(color) {
        const rgb = this.parseColor(color);
        if (!rgb) return 0;

        const [r, g, b] = rgb.map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });

        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    },

    /**
     * Calculate contrast ratio between two colors
     * @param {string} color1 - First color
     * @param {string} color2 - Second color
     * @returns {number} Contrast ratio (1-21)
     */
    getContrastRatio(color1, color2) {
        const lum1 = this.getLuminance(color1);
        const lum2 = this.getLuminance(color2);
        
        const lighter = Math.max(lum1, lum2);
        const darker = Math.min(lum1, lum2);
        
        return (lighter + 0.05) / (darker + 0.05);
    },

    /**
     * Check if color combination meets WCAG contrast requirements
     * @param {string} foreground - Foreground color
     * @param {string} background - Background color
     * @param {string} level - WCAG level ('AA' or 'AAA')
     * @param {string} size - Text size ('normal' or 'large')
     * @returns {Object} Compliance result
     */
    checkContrast(foreground, background, level = 'AA', size = 'normal') {
        const ratio = this.getContrastRatio(foreground, background);
        
        const requirements = {
            AA: { normal: 4.5, large: 3 },
            AAA: { normal: 7, large: 4.5 }
        };

        const required = requirements[level][size];
        const passes = ratio >= required;

        return {
            ratio: Math.round(ratio * 100) / 100,
            required,
            passes,
            level,
            size
        };
    },

    /**
     * Parse color string to RGB values
     * @param {string} color - Color string
     * @returns {Array|null} RGB values [r, g, b] or null if invalid
     */
    parseColor(color) {
        if (!color) return null;

        // Handle hex colors
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            if (hex.length === 3) {
                return [
                    parseInt(hex[0] + hex[0], 16),
                    parseInt(hex[1] + hex[1], 16),
                    parseInt(hex[2] + hex[2], 16)
                ];
            } else if (hex.length === 6) {
                return [
                    parseInt(hex.slice(0, 2), 16),
                    parseInt(hex.slice(2, 4), 16),
                    parseInt(hex.slice(4, 6), 16)
                ];
            }
        }

        // Handle rgb/rgba colors
        const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
            return [
                parseInt(rgbMatch[1]),
                parseInt(rgbMatch[2]),
                parseInt(rgbMatch[3])
            ];
        }

        // Handle named colors (basic set)
        const namedColors = {
            black: [0, 0, 0],
            white: [255, 255, 255],
            red: [255, 0, 0],
            green: [0, 128, 0],
            blue: [0, 0, 255],
            yellow: [255, 255, 0],
            cyan: [0, 255, 255],
            magenta: [255, 0, 255],
            gray: [128, 128, 128],
            grey: [128, 128, 128]
        };

        return namedColors[color.toLowerCase()] || null;
    },

    /**
     * Get computed color from element
     * @param {HTMLElement} element - Target element
     * @param {string} property - CSS property ('color', 'background-color', etc.)
     * @returns {string} Computed color value
     */
    getComputedColor(element, property = 'color') {
        return getComputedStyle(element).getPropertyValue(property);
    },

    /**
     * Suggest accessible color alternatives
     * @param {string} foreground - Foreground color
     * @param {string} background - Background color
     * @param {string} level - WCAG level
     * @returns {Object} Suggested colors
     */
    suggestAccessibleColors(foreground, background, level = 'AA') {
        const currentRatio = this.getContrastRatio(foreground, background);
        const required = level === 'AAA' ? 7 : 4.5;

        if (currentRatio >= required) {
            return { foreground, background, ratio: currentRatio };
        }

        const fgLum = this.getLuminance(foreground);
        const bgLum = this.getLuminance(background);

        // Try darkening foreground or lightening background
        const suggestions = [];

        // Darken foreground
        let darkFg = this.adjustLuminance(foreground, -0.1);
        while (this.getContrastRatio(darkFg, background) < required && this.getLuminance(darkFg) > 0.05) {
            darkFg = this.adjustLuminance(darkFg, -0.05);
        }
        if (this.getContrastRatio(darkFg, background) >= required) {
            suggestions.push({
                type: 'darken-foreground',
                foreground: darkFg,
                background,
                ratio: this.getContrastRatio(darkFg, background)
            });
        }

        // Lighten background
        let lightBg = this.adjustLuminance(background, 0.1);
        while (this.getContrastRatio(foreground, lightBg) < required && this.getLuminance(lightBg) < 0.95) {
            lightBg = this.adjustLuminance(lightBg, 0.05);
        }
        if (this.getContrastRatio(foreground, lightBg) >= required) {
            suggestions.push({
                type: 'lighten-background',
                foreground,
                background: lightBg,
                ratio: this.getContrastRatio(foreground, lightBg)
            });
        }

        return suggestions.length > 0 ? suggestions[0] : null;
    },

    /**
     * Adjust luminance of a color
     * @param {string} color - Color to adjust
     * @param {number} adjustment - Luminance adjustment (-1 to 1)
     * @returns {string} Adjusted color
     */
    adjustLuminance(color, adjustment) {
        const rgb = this.parseColor(color);
        if (!rgb) return color;

        const adjusted = rgb.map(c => {
            const newValue = c + (adjustment * 255);
            return Math.max(0, Math.min(255, Math.round(newValue)));
        });

        return `rgb(${adjusted.join(', ')})`;
    }
};

// Enhanced Interaction Utilities
const InteractionUtils = {
    /**
     * Enhanced debounce with immediate execution option
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @param {boolean} immediate - Execute immediately on first call
     * @returns {Function} Debounced function
     */
    debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    },

    /**
     * Throttle with leading and trailing options
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @param {Object} options - Throttle options
     * @returns {Function} Throttled function
     */
    throttle(func, limit, options = {}) {
        const { leading = true, trailing = true } = options;
        let inThrottle;
        let lastFunc;
        let lastRan;

        return function(...args) {
            if (!inThrottle) {
                if (leading) func.apply(this, args);
                lastRan = Date.now();
                inThrottle = true;
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(() => {
                    if (Date.now() - lastRan >= limit) {
                        if (trailing) func.apply(this, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    },

    /**
     * Rate limit function calls
     * @param {Function} func - Function to rate limit
     * @param {number} maxCalls - Maximum calls per period
     * @param {number} period - Time period in milliseconds
     * @returns {Function} Rate limited function
     */
    rateLimit(func, maxCalls, period) {
        const calls = [];
        
        return function(...args) {
            const now = Date.now();
            
            // Remove old calls outside the period
            while (calls.length > 0 && calls[0] <= now - period) {
                calls.shift();
            }
            
            if (calls.length < maxCalls) {
                calls.push(now);
                return func.apply(this, args);
            }
            
            console.warn('Rate limit exceeded');
            return null;
        };
    },

    /**
     * Create cancelable function
     * @param {Function} func - Function to make cancelable
     * @returns {Object} Object with call and cancel methods
     */
    cancelable(func) {
        let canceled = false;
        
        return {
            call: (...args) => {
                if (!canceled) {
                    return func(...args);
                }
            },
            cancel: () => {
                canceled = true;
            },
            isCanceled: () => canceled
        };
    }
};

// Export all utilities
window.DateUtils = DateUtils;
window.CurrencyUtils = CurrencyUtils;
window.TimeUtils = TimeUtils;
window.ValidationUtils = ValidationUtils;
window.DOMUtils = DOMUtils;
window.BusinessUtils = BusinessUtils;
window.Utils = Utils;
window.FocusUtils = FocusUtils;
window.ResponsiveUtils = ResponsiveUtils;
window.AccessibilityUtils = AccessibilityUtils;
window.TouchUtils = TouchUtils;
window.ColorUtils = ColorUtils;
window.InteractionUtils = InteractionUtils;
