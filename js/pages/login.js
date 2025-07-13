 // Login page functionality for the Bricks Attendance System
 class LoginPage {
     constructor() {
         this.form = document.getElementById('loginForm');
         this.usernameInput = document.getElementById('username');
         this.passwordInput = document.getElementById('password');
         this.loginButton = document.getElementById('loginButton');
         this.errorMessage = document.getElementById('errorMessage');
         
         this.init();
     }

     /**
      * Initialize login page
      */
     init() {
         // Check if already authenticated
         if (Auth.isAuthenticated()) {
             this.redirectToDashboard();
             return;
         }

         this.setupEventListeners();
         this.setupFloatingLabels();
         this.focusFirstInput();
     }

     /**
      * Setup event listeners
      */
     setupEventListeners() {
         if (this.form) {
             this.form.addEventListener('submit', (e) => this.handleLogin(e));
         }

         // Enter key support
         [this.usernameInput, this.passwordInput].forEach(input => {
             if (input) {
                 input.addEventListener('keypress', (e) => {
                     if (e.key === 'Enter') {
                         this.handleLogin(e);
                     }
                 });
             }
         });

         // Real-time validation
         [this.usernameInput, this.passwordInput].forEach(input => {
             if (input) {
                 input.addEventListener('input', () => this.clearError());
             }
         });
     }

     /**
      * Setup floating label animations
      */
     setupFloatingLabels() {
         const inputs = [this.usernameInput, this.passwordInput];
         
         inputs.forEach(input => {
             if (!input) return;

             // Set initial state
             this.updateFloatingLabel(input);

             // Handle focus and blur events
             input.addEventListener('focus', () => this.handleInputFocus(input));
             input.addEventListener('blur', () => this.handleInputBlur(input));
             input.addEventListener('input', () => this.updateFloatingLabel(input));
         });
     }

     /**
      * Handle input focus
      */
     handleInputFocus(input) {
         const formGroup = input.closest('.form-group');
         if (formGroup) {
             formGroup.classList.add('focused');
         }
     }

     /**
      * Handle input blur
      */
     handleInputBlur(input) {
         const formGroup = input.closest('.form-group');
         if (formGroup && !input.value.trim()) {
             formGroup.classList.remove('focused');
         }
     }

     /**
      * Update floating label state
      */
     updateFloatingLabel(input) {
         const formGroup = input.closest('.form-group');
         if (formGroup) {
             if (input.value.trim()) {
                 formGroup.classList.add('has-value');
             } else {
                 formGroup.classList.remove('has-value');
             }
         }
     }

     /**
      * Focus first input
      */
     focusFirstInput() {
         if (this.usernameInput) {
             setTimeout(() => {
                 this.usernameInput.focus();
             }, 300);
         }
     }

     /**
      * Handle login form submission
      */
     async handleLogin(e) {
         e.preventDefault();
         
         const username = this.usernameInput?.value.trim();
         const password = this.passwordInput?.value.trim();

         // Basic validation
         if (!username || !password) {
             this.showError('Please enter both username and password');
             return;
         }

         // Show loading state
         this.setLoadingState(true);
         this.clearError();

         try {
             // Attempt login
             const result = await Auth.login(username, password);
             
             if (result.success) {
                 // Show success animation
                 this.showSuccessAnimation();
                 
                 // Redirect after animation
                 setTimeout(() => {
                     this.redirectToDashboard();
                 }, 800);
             } else {
                 this.showError(result.error || 'Login failed');
                 this.setLoadingState(false);
                 this.shakeForm();
             }
         } catch (error) {
             console.error('Login error:', error);
             this.showError('An unexpected error occurred. Please try again.');
             this.setLoadingState(false);
             this.shakeForm();
         }
     }

     /**
      * Set loading state
      */
     setLoadingState(loading) {
         if (!this.loginButton) return;

         if (loading) {
             this.loginButton.classList.add('loading');
             this.loginButton.disabled = true;
         } else {
             this.loginButton.classList.remove('loading');
             this.loginButton.disabled = false;
         }
     }

     /**
      * Show error message
      */
     showError(message) {
         if (this.errorMessage) {
             this.errorMessage.textContent = message;
             this.errorMessage.classList.add('show');
         }
     }

     /**
      * Clear error message
      */
     clearError() {
         if (this.errorMessage) {
             this.errorMessage.classList.remove('show');
         }
     }

     /**
      * Shake form animation for errors
      */
     shakeForm() {
         const loginCard = document.querySelector('.login-card');
         if (loginCard) {
             loginCard.style.animation = 'shake 0.5s ease-in-out';
             setTimeout(() => {
                 loginCard.style.animation = '';
             }, 500);
         }
     }

     /**
      * Show success animation
      */
     showSuccessAnimation() {
         if (this.loginButton) {
             const buttonText = this.loginButton.querySelector('.button-text');
             if (buttonText) {
                 buttonText.textContent = 'Success!';
             }
             this.loginButton.style.backgroundColor = 'var(--color-success)';
         }

         // Add success animation to form
         const loginCard = document.querySelector('.login-card');
         if (loginCard) {
             loginCard.style.transform = 'scale(1.02)';
             loginCard.style.transition = 'transform 0.3s ease';
             
             setTimeout(() => {
                 loginCard.style.transform = 'scale(1)';
             }, 300);
         }
     }

     /**
      * Redirect to appropriate dashboard
      */
     redirectToDashboard() {
         const userRole = Auth.getCurrentUserRole();
         const targetPage = userRole === 'admin' ? '/IM2/dashboard.php' : '/IM2/employee.php';
         
         // Add page transition effect
         document.body.style.opacity = '0';
         document.body.style.transition = 'opacity 0.3s ease';
         
         setTimeout(() => {
             window.location.href = targetPage;
         }, 300);
     }

     /**
      * Handle forgot password (placeholder)
      */
     handleForgotPassword() {
         alert('Password reset functionality will be implemented in a future version.');
     }

     /**
      * Toggle password visibility
      */
     togglePasswordVisibility() {
         if (!this.passwordInput) return;

         const type = this.passwordInput.type === 'password' ? 'text' : 'password';
         this.passwordInput.type = type;

         // Update toggle icon if exists
         const toggleIcon = document.querySelector('.password-toggle');
         if (toggleIcon) {
             toggleIcon.textContent = type === 'password' ? '👁️' : '🙈';
         }
     }

     /**
      * Auto-fill demo credentials
      */
     fillDemoCredentials(role = 'admin') {
         if (this.usernameInput && this.passwordInput) {
             this.usernameInput.value = role;
             this.passwordInput.value = role;
             
             // Update floating labels
             this.updateFloatingLabel(this.usernameInput);
             this.updateFloatingLabel(this.passwordInput);
             
             // Focus login button
             if (this.loginButton) {
                 this.loginButton.focus();
             }
         }
     }

     /**
      * Handle keyboard shortcuts
      */
     handleKeyboardShortcuts(e) {
         // Ctrl/Cmd + Enter to submit
         if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
             this.handleLogin(e);
         }
         
         // Alt + A for admin demo
         if (e.altKey && e.key === 'a') {
             e.preventDefault();
             this.fillDemoCredentials('admin');
         }
         
         // Alt + E for employee demo
         if (e.altKey && e.key === 'e') {
             e.preventDefault();
             this.fillDemoCredentials('employee');
         }
     }

     /**
      * Setup demo credential shortcuts
      */
     setupDemoShortcuts() {
         const demoText = document.querySelector('.demo-credentials');
         if (demoText) {
             demoText.style.cursor = 'pointer';
             demoText.title = 'Click to auto-fill admin credentials, or use Alt+A for admin, Alt+E for employee';
             
             demoText.addEventListener('click', () => {
                 this.fillDemoCredentials('admin');
             });
         }

         // Global keyboard shortcuts
         document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
     }

     /**
      * Validate form inputs
      */
     validateForm() {
         const username = this.usernameInput?.value.trim();
         const password = this.passwordInput?.value.trim();
         
         const errors = [];
         
         if (!username) {
             errors.push('Username is required');
         } else if (username.length < 3) {
             errors.push('Username must be at least 3 characters');
         }
         
         if (!password) {
             errors.push('Password is required');
         } else if (password.length < 3) {
             errors.push('Password must be at least 3 characters');
         }
         
         return {
             isValid: errors.length === 0,
             errors
         };
     }

     /**
      * Show validation errors
      */
     showValidationErrors(errors) {
         if (errors.length > 0) {
             this.showError(errors[0]); // Show first error
         }
     }

     /**
      * Enhanced form submission with validation
      */
     async handleEnhancedLogin(e) {
         e.preventDefault();
         
         // Validate form
         const validation = this.validateForm();
         if (!validation.isValid) {
             this.showValidationErrors(validation.errors);
             this.shakeForm();
             return;
         }
         
         // Proceed with login
         await this.handleLogin(e);
     }
 }

 // CSS for shake animation
 const shakeKeyframes = `
 @keyframes shake {
     0%, 100% { transform: translateX(0); }
     10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
     20%, 40%, 60%, 80% { transform: translateX(8px); }
 }
 `;

 // Inject shake animation CSS
 if (typeof window !== 'undefined') {
     const style = document.createElement('style');
     style.textContent = shakeKeyframes;
     document.head.appendChild(style);
 }

 // Initialize login page when DOM is ready
 if (typeof window !== 'undefined') {
     document.addEventListener('DOMContentLoaded', () => {
         window.loginPage = new LoginPage();
     });
 }

 // Export for use in other modules
 if (typeof module !== 'undefined' && module.exports) {
     module.exports = LoginPage;
 } else if (typeof window !== 'undefined') {
     window.LoginPage = LoginPage;
 }