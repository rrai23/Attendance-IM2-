/**
 * Theme Management Module
 * Handles light/dark mode switching, accent color management, and theme persistence
 */

class ThemeManager {
    constructor() {
        this.currentTheme = 'light';
        this.currentPage = 'dashboard';
        this.storageKey = 'bricks_theme';
        this.transitionDuration = 300;
        
        // Page-specific accent colors
        this.accentColors = {
            dashboard: {
                primary: '#007aff',
                light: 'rgba(0, 122, 255, 0.1)',
                hover: 'rgba(0, 122, 255, 0.8)'
            },
            analytics: {
                primary: '#34c759',
                light: 'rgba(52, 199, 89, 0.1)',
                hover: 'rgba(52, 199, 89, 0.8)'
            },
            payroll: {
                primary: '#af52de',
                light: 'rgba(175, 82, 222, 0.1)',
                hover: 'rgba(175, 82, 222, 0.8)'
            },
            settings: {
                primary: '#ff9500',
                light: 'rgba(255, 149, 0, 0.1)',
                hover: 'rgba(255, 149, 0, 0.8)'
            },
            employee: {
                primary: '#5ac8fa',
                light: 'rgba(90, 200, 250, 0.1)',
                hover: 'rgba(90, 200, 250, 0.8)'
            },
            employees: {
                primary: '#667eea',
                light: 'rgba(102, 126, 234, 0.1)',
                hover: 'rgba(102, 126, 234, 0.8)'
            },
            'employee-management': {
                primary: '#667eea',
                light: 'rgba(102, 126, 234, 0.1)',
                hover: 'rgba(102, 126, 234, 0.8)'
            },
            security: {
                primary: '#ff3b30',
                light: 'rgba(255, 59, 48, 0.1)',
                hover: 'rgba(255, 59, 48, 0.8)'
            },
            login: {
                primary: '#007aff',
                light: 'rgba(0, 122, 255, 0.1)',
                hover: 'rgba(0, 122, 255, 0.8)'
            }
        };

        this.init();
    }

    /**
     * Initialize the theme manager
     */
    init() {
        this.loadThemePreferences();
        this.detectCurrentPage();
        this.applyTheme();
        this.setupThemeToggle();
        this.setupSystemThemeListener();
        this.setupHashChangeListener();
        this.addTransitionClass();
    }

    /**
     * Load theme preferences from localStorage
     */
    loadThemePreferences() {
        try {
            const savedTheme = localStorage.getItem(this.storageKey);
            if (savedTheme) {
                this.currentTheme = savedTheme;
            } else {
                this.currentTheme = this.detectSystemTheme();
            }
        } catch (error) {
            console.warn('Failed to load theme preferences:', error);
            this.currentTheme = this.detectSystemTheme();
        }
    }

    /**
     * Save theme preferences to localStorage
     */
    saveThemePreferences() {
        try {
            localStorage.setItem(this.storageKey, this.currentTheme);
        } catch (error) {
            console.warn('Failed to save theme preferences:', error);
        }
    }

    /**
     * Detect system theme preference
     */
    detectSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    /**
     * Detect current page from URL or body class
     */
    detectCurrentPage() {
        // Try to get page from URL
        const path = window.location.pathname;
        const hash = window.location.hash.replace('#', '');
        const filename = path.split('/').pop().replace('.html', '');
        
        // Handle hash-based navigation (like employee.html#security)
        if (filename === 'employee' && hash && this.accentColors[hash]) {
            this.currentPage = hash;
            console.log(`🎨 Theme manager detected page from hash: ${hash}`);
            return hash;
        }
        
        // Check if the filename has defined accent colors
        if (this.accentColors[filename]) {
            this.currentPage = filename;
            console.log(`🎨 Theme manager detected page from filename: ${filename}`);
            return filename;
        }

        // Try to get page from body class
        const bodyClasses = document.body.classList;
        for (const className of bodyClasses) {
            if (className.startsWith('page-')) {
                const pageName = className.replace('page-', '');
                if (this.accentColors[pageName]) {
                    this.currentPage = pageName;
                    console.log(`🎨 Theme manager detected page from body class: ${pageName}`);
                    return pageName;
                }
            }
        }

        // Default to dashboard
        this.currentPage = 'dashboard';
        console.log('🎨 Theme manager defaulting to: dashboard');
        return 'dashboard';
    }

    /**
     * Apply the current theme and accent colors
     */
    applyTheme() {
        const root = document.documentElement;
        const body = document.body;

        // Apply theme data attribute
        root.setAttribute('data-theme', this.currentTheme);
        
        // Apply theme class to body for compatibility
        body.classList.remove('dark-mode', 'light-mode');
        if (this.currentTheme === 'dark') {
            body.classList.add('dark-mode');
        } else {
            body.classList.add('light-mode');
        }
        
        // Add page class to body
        body.classList.remove(...Object.keys(this.accentColors).map(page => `page-${page}`));
        body.classList.add(`page-${this.currentPage}`);

        // Update accent color CSS custom properties
        this.updateAccentColors();

        // Update theme selectors
        this.updateThemeSelectors();

        // Dispatch theme change event
        this.dispatchThemeChangeEvent();
    }

    /**
     * Update accent color CSS custom properties
     */
    updateAccentColors() {
        const root = document.documentElement;
        const colors = this.accentColors[this.currentPage];

        if (colors) {
            root.style.setProperty('--accent-primary', colors.primary);
            root.style.setProperty('--accent-light', colors.light);
            root.style.setProperty('--accent-hover', colors.hover);
            console.log(`🎨 Applied accent colors for "${this.currentPage}":`, colors.primary);
        } else {
            console.warn(`🎨 No accent colors found for page: "${this.currentPage}"`);
        }
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        this.saveThemePreferences();
        
        // Add a subtle animation effect
        this.addThemeTransitionEffect();
    }

    /**
     * Set a specific theme
     */
    setTheme(theme) {
        if (theme !== 'light' && theme !== 'dark') {
            console.warn('Invalid theme:', theme);
            return;
        }

        this.currentTheme = theme;
        this.applyTheme();
        this.saveThemePreferences();
        
        // Add a subtle animation effect
        this.addThemeTransitionEffect();
    }

    /**
     * Set the current page and update accent colors
     */
    setPage(page) {
        if (!this.accentColors[page]) {
            console.warn(`🎨 Theme manager: Invalid page "${page}", available pages:`, Object.keys(this.accentColors));
            return;
        }

        console.log(`🎨 Theme manager: Setting page to "${page}"`);
        this.currentPage = page;
        this.applyTheme();
        this.saveThemePreferences();
        console.log(`✅ Theme manager: Successfully applied theme for "${page}"`);
    }

    /**
     * Get current theme
     */
    getTheme() {
        return this.currentTheme;
    }

    /**
     * Get current page
     */
    getPage() {
        return this.currentPage;
    }

    /**
     * Check if current theme is dark
     */
    isDarkTheme() {
        return this.currentTheme === 'dark';
    }

    /**
     * Get accent colors for current page
     */
    getAccentColors() {
        return this.accentColors[this.currentPage];
    }

    /**
     * Setup theme toggle button
     */
    setupThemeToggle() {
        // Setup sidebar theme selector
        this.setupSidebarThemeSelector();
        
        // Setup login page theme selector
        this.setupLoginThemeSelector();
        
        // Update initial states
        this.updateThemeSelectors();
    }

    /**
     * Setup sidebar theme selector
     */
    setupSidebarThemeSelector() {
        const themeOptions = document.querySelectorAll('.theme-selector .theme-option');
        
        themeOptions.forEach(option => {
            option.addEventListener('click', () => {
                const theme = option.getAttribute('data-theme');
                this.setTheme(theme);
            });
        });
    }

    /**
     * Setup login page theme selector
     */
    setupLoginThemeSelector() {
        const loginThemeOptions = document.querySelectorAll('.login-theme-toggle .theme-option');
        
        loginThemeOptions.forEach(option => {
            option.addEventListener('click', () => {
                const theme = option.getAttribute('data-theme');
                this.setTheme(theme);
            });
        });
    }

    /**
     * Update theme selector buttons to reflect current theme
     */
    updateThemeSelectors() {
        // Update sidebar theme selector
        const sidebarOptions = document.querySelectorAll('.theme-selector .theme-option');
        sidebarOptions.forEach(option => {
            const theme = option.getAttribute('data-theme');
            if (theme === this.currentTheme) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });

        // Update login theme selector
        const loginOptions = document.querySelectorAll('.login-theme-toggle .theme-option');
        loginOptions.forEach(option => {
            const theme = option.getAttribute('data-theme');
            if (theme === this.currentTheme) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    }

    /**
     * Create theme toggle button element (legacy support)
     */
    createThemeToggle() {
        const toggle = document.createElement('button');
        toggle.className = 'theme-toggle';
        toggle.setAttribute('aria-label', 'Toggle theme');
        toggle.setAttribute('title', 'Toggle light/dark theme');
        toggle.style.display = 'none'; // Hide by default since we use sidebar selector
        
        const icon = document.createElement('span');
        icon.className = 'theme-toggle-icon';
        toggle.appendChild(icon);

        return toggle;
    }

    /**
     * Update theme toggle icon based on current theme (legacy support)
     */
    updateThemeToggleIcon() {
        // Update theme selectors instead
        this.updateThemeSelectors();
    }

    /**
     * Setup system theme change listener
     */
    setupSystemThemeListener() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            mediaQuery.addEventListener('change', (e) => {
                // Only auto-switch if user hasn't manually set a preference
                const saved = localStorage.getItem(this.storageKey);
                if (!saved) {
                    this.currentTheme = e.matches ? 'dark' : 'light';
                    this.applyTheme();
                }
            });
        }
    }

    /**
     * Setup hash change listener for employee page sections
     */
    setupHashChangeListener() {
        window.addEventListener('hashchange', () => {
            const newPage = this.detectCurrentPage();
            console.log(`🎨 Hash changed, theme manager updating to: ${newPage}`);
            this.applyTheme();
        });
    }

    /**
     * Add transition class to prevent flash during theme changes
     */
    addTransitionClass() {
        const style = document.createElement('style');
        style.textContent = `
            .theme-transition * {
                transition: background-color 300ms cubic-bezier(0.4, 0, 0.2, 1),
                           color 300ms cubic-bezier(0.4, 0, 0.2, 1),
                           border-color 300ms cubic-bezier(0.4, 0, 0.2, 1),
                           box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) !important;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Add theme transition effect
     */
    addThemeTransitionEffect() {
        document.body.classList.add('theme-transition');
        
        setTimeout(() => {
            document.body.classList.remove('theme-transition');
        }, this.transitionDuration);
    }

    /**
     * Dispatch theme change event
     */
    dispatchThemeChangeEvent() {
        const event = new CustomEvent('themechange', {
            detail: {
                theme: this.currentTheme,
                page: this.currentPage,
                accentColors: this.getAccentColors()
            }
        });
        
        document.dispatchEvent(event);
    }

    /**
     * Update theme based on time of day (optional feature)
     */
    enableAutoTheme() {
        const hour = new Date().getHours();
        const shouldBeDark = hour < 6 || hour > 18;
        
        if (shouldBeDark && this.currentTheme === 'light') {
            this.setTheme('dark');
        } else if (!shouldBeDark && this.currentTheme === 'dark') {
            this.setTheme('light');
        }
    }

    /**
     * Get theme preferences for export
     */
    exportPreferences() {
        return {
            theme: this.currentTheme,
            page: this.currentPage,
            accentColors: this.accentColors,
            timestamp: Date.now()
        };
    }

    /**
     * Import theme preferences
     */
    importPreferences(preferences) {
        try {
            if (preferences.theme) {
                this.currentTheme = preferences.theme;
            }
            if (preferences.page && this.accentColors[preferences.page]) {
                this.currentPage = preferences.page;
            }
            
            this.applyTheme();
            this.saveThemePreferences();
            
            return true;
        } catch (error) {
            console.error('Failed to import theme preferences:', error);
            return false;
        }
    }

    /**
     * Reset to default theme
     */
    resetToDefault() {
        this.currentTheme = this.detectSystemTheme();
        this.currentPage = this.detectCurrentPage();
        this.applyTheme();
        
        // Clear saved preferences
        try {
            localStorage.removeItem(this.storageKey);
        } catch (error) {
            console.warn('Failed to clear theme preferences:', error);
        }
    }

    /**
     * Add custom accent color for a page
     */
    addCustomAccentColor(page, colors) {
        if (!colors.primary || !colors.light || !colors.hover) {
            console.error('Invalid accent color configuration');
            return false;
        }

        this.accentColors[page] = {
            primary: colors.primary,
            light: colors.light,
            hover: colors.hover
        };

        // Apply if this is the current page
        if (this.currentPage === page) {
            this.updateAccentColors();
        }

        return true;
    }

    /**
     * Get all available themes
     */
    getAvailableThemes() {
        return ['light', 'dark'];
    }

    /**
     * Get all available pages
     */
    getAvailablePages() {
        return Object.keys(this.accentColors);
    }

    /**
     * Destroy theme manager and cleanup
     */
    destroy() {
        // Remove event listeners
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            themeToggle.remove();
        }

        // Remove custom styles
        const customStyles = document.querySelector('style[data-theme-manager]');
        if (customStyles) {
            customStyles.remove();
        }

        // Clear any intervals or timeouts
        if (this.autoThemeInterval) {
            clearInterval(this.autoThemeInterval);
        }
    }
}

// Create and export theme manager instance
const themeManager = new ThemeManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = themeManager;
} else if (typeof window !== 'undefined') {
    window.themeManager = themeManager;
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        themeManager.init();
    });
} else {
    themeManager.init();
}

// Utility functions for easy access
window.toggleTheme = () => themeManager.toggleTheme();
window.setTheme = (theme) => themeManager.setTheme(theme);
window.setPage = (page) => themeManager.setPage(page);
window.getTheme = () => themeManager.getTheme();
window.isDarkTheme = () => themeManager.isDarkTheme();

// Export the class for advanced usage
window.ThemeManager = ThemeManager;