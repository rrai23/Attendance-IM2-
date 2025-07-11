// Theming system for the Bricks Attendance System
class Theming {
    static STORAGE_KEY = 'bricks_theme';
    static THEMES = {
        LIGHT: 'light',
        DARK: 'dark',
        AUTO: 'auto'
    };

    static PAGE_ACCENT_COLORS = {
        login: '#007AFF',
        dashboard: '#007AFF', 
        analytics: '#5856D6',
        settings: '#AF52DE',
        employee: '#FF9500'
    };

    constructor() {
        this.currentTheme = this.getStoredTheme() || Theming.THEMES.AUTO;
        this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        this.initializeTheme();
        this.setupMediaQueryListener();
    }

    /**
     * Initialize theme on page load
     */
    initializeTheme() {
        this.applyTheme(this.currentTheme);
        this.applyPageAccentColor();
        this.setupThemeToggle();
    }

    /**
     * Get stored theme preference
     * @returns {string}
     */
    getStoredTheme() {
        try {
            return localStorage.getItem(Theming.STORAGE_KEY);
        } catch (error) {
            console.error('Error getting stored theme:', error);
            return null;
        }
    }

    /**
     * Store theme preference
     * @param {string} theme 
     */
    setStoredTheme(theme) {
        try {
            localStorage.setItem(Theming.STORAGE_KEY, theme);
        } catch (error) {
            console.error('Error storing theme:', error);
        }
    }

    /**
     * Apply theme to document
     * @param {string} theme 
     */
    applyTheme(theme) {
        const html = document.documentElement;
        
        // Remove existing theme attributes
        html.removeAttribute('data-theme');
        
        let actualTheme = theme;
        
        // Resolve auto theme based on system preference
        if (theme === Theming.THEMES.AUTO) {
            actualTheme = this.mediaQuery.matches ? Theming.THEMES.DARK : Theming.THEMES.LIGHT;
        }
        
        // Apply theme attribute
        if (actualTheme === Theming.THEMES.DARK) {
            html.setAttribute('data-theme', 'dark');
        }
        
        // Update theme toggle icon
        this.updateThemeToggleIcon(theme);
        
        // Store the preference (not the resolved theme)
        this.currentTheme = theme;
        this.setStoredTheme(theme);

        // Trigger custom event for theme change
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: actualTheme, preference: theme }
        }));
    }

    /**
     * Get current active theme (resolved)
     * @returns {string}
     */
    getCurrentTheme() {
        if (this.currentTheme === Theming.THEMES.AUTO) {
            return this.mediaQuery.matches ? Theming.THEMES.DARK : Theming.THEMES.LIGHT;
        }
        return this.currentTheme;
    }

    /**
     * Get current theme preference (including auto)
     * @returns {string}
     */
    getThemePreference() {
        return this.currentTheme;
    }

    /**
     * Toggle between themes
     */
    toggleTheme() {
        const currentActiveTheme = this.getCurrentTheme();
        const nextTheme = currentActiveTheme === Theming.THEMES.LIGHT ? 
            Theming.THEMES.DARK : Theming.THEMES.LIGHT;
        
        this.applyTheme(nextTheme);
        
        // Add smooth transition effect
        this.addTransitionEffect();
    }

    /**
     * Set specific theme
     * @param {string} theme 
     */
    setTheme(theme) {
        if (Object.values(Theming.THEMES).includes(theme)) {
            this.applyTheme(theme);
            this.addTransitionEffect();
        }
    }

    /**
     * Apply page-specific accent color
     */
    applyPageAccentColor() {
        const body = document.body;
        const page = body.getAttribute('data-page');
        
        if (page && Theming.PAGE_ACCENT_COLORS[page]) {
            document.documentElement.style.setProperty(
                '--page-accent', 
                Theming.PAGE_ACCENT_COLORS[page]
            );
        }
    }

    /**
     * Update theme toggle icon based on current theme
     * @param {string} theme 
     */
    updateThemeToggleIcon(theme) {
        const themeToggles = document.querySelectorAll('.theme-toggle .theme-icon');
        
        themeToggles.forEach(toggle => {
            let icon = '🌙'; // Default dark icon
            
            if (theme === Theming.THEMES.AUTO) {
                icon = '🌓'; // Auto theme icon
            } else if (theme === Theming.THEMES.DARK) {
                icon = '☀️'; // Light icon (for switching to light)
            }
            
            toggle.textContent = icon;
        });
    }

    /**
     * Setup theme toggle button functionality
     */
    setupThemeToggle() {
        const themeToggles = document.querySelectorAll('.theme-toggle');
        
        themeToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleTheme();
            });
        });
    }

    /**
     * Setup media query listener for auto theme
     */
    setupMediaQueryListener() {
        this.mediaQuery.addEventListener('change', (e) => {
            if (this.currentTheme === Theming.THEMES.AUTO) {
                this.applyTheme(Theming.THEMES.AUTO);
                this.addTransitionEffect();
            }
        });
    }

    /**
     * Add smooth transition effect when changing themes
     */
    addTransitionEffect() {
        const body = document.body;
        body.style.transition = 'background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), color 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        
        // Remove transition after animation completes
        setTimeout(() => {
            body.style.transition = '';
        }, 300);
    }

    /**
     * Get theme preference for settings
     * @returns {object}
     */
    getThemeSettings() {
        return {
            current: this.currentTheme,
            options: [
                { value: Theming.THEMES.LIGHT, label: 'Light' },
                { value: Theming.THEMES.DARK, label: 'Dark' },
                { value: Theming.THEMES.AUTO, label: 'Auto (System)' }
            ]
        };
    }

    /**
     * Apply theme from settings
     * @param {string} theme 
     */
    applyThemeFromSettings(theme) {
        this.setTheme(theme);
    }

    /**
     * Get computed CSS custom property value
     * @param {string} property 
     * @returns {string}
     */
    getCSSCustomProperty(property) {
        return getComputedStyle(document.documentElement)
            .getPropertyValue(property).trim();
    }

    /**
     * Set CSS custom property value
     * @param {string} property 
     * @param {string} value 
     */
    setCSSCustomProperty(property, value) {
        document.documentElement.style.setProperty(property, value);
    }

    /**
     * Get theme-aware color for charts and components
     * @param {string} colorName 
     * @returns {string}
     */
    getThemeColor(colorName) {
        const colorMap = {
            primary: this.getCSSCustomProperty('--color-primary'),
            secondary: this.getCSSCustomProperty('--color-secondary'),
            tertiary: this.getCSSCustomProperty('--color-tertiary'),
            quaternary: this.getCSSCustomProperty('--color-quaternary'),
            success: this.getCSSCustomProperty('--color-success'),
            warning: this.getCSSCustomProperty('--color-warning'),
            error: this.getCSSCustomProperty('--color-error'),
            textPrimary: this.getCSSCustomProperty('--text-primary'),
            textSecondary: this.getCSSCustomProperty('--text-secondary'),
            textTertiary: this.getCSSCustomProperty('--text-tertiary'),
            bgPrimary: this.getCSSCustomProperty('--bg-primary'),
            bgSecondary: this.getCSSCustomProperty('--bg-secondary'),
            bgCard: this.getCSSCustomProperty('--bg-card'),
            borderPrimary: this.getCSSCustomProperty('--border-primary'),
            borderSecondary: this.getCSSCustomProperty('--border-secondary'),
            pageAccent: this.getCSSCustomProperty('--page-accent')
        };

        return colorMap[colorName] || colorMap.primary;
    }

    /**
     * Get theme-aware color palette for charts
     * @returns {object}
     */
    getChartColorPalette() {
        return {
            primary: [
                this.getThemeColor('primary'),
                this.getThemeColor('secondary'),
                this.getThemeColor('tertiary'),
                this.getThemeColor('quaternary'),
                this.getThemeColor('success'),
                this.getThemeColor('warning')
            ],
            background: this.getThemeColor('bgCard'),
            text: this.getThemeColor('textPrimary'),
            grid: this.getThemeColor('borderSecondary'),
            tooltip: {
                background: this.getThemeColor('bgCard'),
                text: this.getThemeColor('textPrimary'),
                border: this.getThemeColor('borderPrimary')
            }
        };
    }

    /**
     * Static method to initialize theming system
     * @returns {Theming}
     */
    static initialize() {
        return new Theming();
    }
}

// Initialize theming system when DOM is ready
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.BricksTheming = Theming.initialize();
        });
    } else {
        window.BricksTheming = Theming.initialize();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Theming;
} else if (typeof window !== 'undefined') {
    window.Theming = Theming;
}
