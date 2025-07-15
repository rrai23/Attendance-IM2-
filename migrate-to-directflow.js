/**
 * DirectFlow Migration Script
 * 
 * This script helps migrate from the old unified data services to DirectFlow
 * by updating HTML files and providing compatibility shims.
 */

const fs = require('fs').promises;
const path = require('path');

class DirectFlowMigration {
    constructor() {
        this.rootDir = process.cwd();
        this.htmlFiles = [];
        this.jsFiles = [];
        this.backupDir = path.join(this.rootDir, 'migration-backups');
    }

    /**
     * Run the complete migration
     */
    async migrate() {
        console.log('🔄 Starting DirectFlow migration...');
        
        try {
            // Step 1: Create backup directory
            await this.createBackupDir();
            
            // Step 2: Find all HTML files
            await this.findHtmlFiles();
            
            // Step 3: Find all JS files
            await this.findJsFiles();
            
            // Step 4: Create backup of files to be modified
            await this.createBackups();
            
            // Step 5: Update HTML files
            await this.updateHtmlFiles();
            
            // Step 6: Create compatibility shim
            await this.createCompatibilityShim();
            
            // Step 7: Generate migration report
            await this.generateReport();
            
            console.log('✅ DirectFlow migration completed successfully!');
            
        } catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        }
    }

    /**
     * Create backup directory
     */
    async createBackupDir() {
        try {
            await fs.mkdir(this.backupDir, { recursive: true });
            console.log('📁 Created backup directory');
        } catch (error) {
            console.warn('Backup directory may already exist');
        }
    }

    /**
     * Find all HTML files
     */
    async findHtmlFiles() {
        const files = await fs.readdir(this.rootDir);
        this.htmlFiles = files.filter(file => file.endsWith('.html'));
        console.log(`📄 Found ${this.htmlFiles.length} HTML files`);
    }

    /**
     * Find all JS files
     */
    async findJsFiles() {
        const jsDir = path.join(this.rootDir, 'js');
        try {
            const files = await fs.readdir(jsDir);
            this.jsFiles = files.filter(file => file.endsWith('.js'));
            console.log(`📄 Found ${this.jsFiles.length} JS files`);
        } catch (error) {
            console.warn('JS directory not found');
        }
    }

    /**
     * Create backups of files to be modified
     */
    async createBackups() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        for (const file of this.htmlFiles) {
            const filePath = path.join(this.rootDir, file);
            const backupPath = path.join(this.backupDir, `${file}.${timestamp}.backup`);
            
            try {
                await fs.copyFile(filePath, backupPath);
                console.log(`📋 Backed up ${file}`);
            } catch (error) {
                console.warn(`Failed to backup ${file}:`, error.message);
            }
        }
    }

    /**
     * Update HTML files to use DirectFlow
     */
    async updateHtmlFiles() {
        for (const file of this.htmlFiles) {
            const filePath = path.join(this.rootDir, file);
            
            try {
                let content = await fs.readFile(filePath, 'utf8');
                let modified = false;
                
                // Replace old script includes
                const oldScripts = [
                    'js/unified-data-service.js',
                    'js/unified-employee-manager.js',
                    'js/backend-api-service.js',
                    'js/data-manager.js'
                ];
                
                for (const oldScript of oldScripts) {
                    const oldScriptTag = `<script src="${oldScript}"></script>`;
                    const oldScriptTagWithError = `<script src="${oldScript}" onerror="console.error('Failed to load ${oldScript}')"></script>`;
                    
                    if (content.includes(oldScriptTag) || content.includes(oldScriptTagWithError)) {
                        content = content.replace(new RegExp(oldScriptTag.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'g'), '');
                        content = content.replace(new RegExp(oldScriptTagWithError.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'g'), '');
                        modified = true;
                    }
                }
                
                // Add DirectFlow script if not already present
                if (!content.includes('js/directflow.js')) {
                    // Find the last script tag and add DirectFlow before it
                    const lastScriptIndex = content.lastIndexOf('</script>');
                    if (lastScriptIndex > -1) {
                        const insertPosition = content.indexOf('\\n', lastScriptIndex) + 1;
                        const directFlowScript = '    <script src="js/directflow.js"></script>\\n    <script src="js/directflow-compatibility.js"></script>\\n';
                        content = content.slice(0, insertPosition) + directFlowScript + content.slice(insertPosition);
                        modified = true;
                    }
                }
                
                if (modified) {
                    await fs.writeFile(filePath, content, 'utf8');
                    console.log(`✅ Updated ${file}`);
                }
                
            } catch (error) {
                console.error(`❌ Failed to update ${file}:`, error.message);
            }
        }
    }

    /**
     * Create compatibility shim for backward compatibility
     */
    async createCompatibilityShim() {
        const shimContent = `/**
 * DirectFlow Compatibility Shim
 * 
 * Provides backward compatibility for old unified data service calls
 * This ensures existing code continues to work with DirectFlow
 */

(function() {
    'use strict';
    
    // Wait for DirectFlow to be available
    function waitForDirectFlow() {
        return new Promise((resolve) => {
            if (window.directFlow && window.directFlow.isReady()) {
                resolve();
            } else {
                // Check every 100ms
                const interval = setInterval(() => {
                    if (window.directFlow && window.directFlow.isReady()) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 100);
            }
        });
    }

    // Initialize compatibility layer
    waitForDirectFlow().then(() => {
        console.log('🔄 Initializing DirectFlow compatibility layer...');
        
        // Alias for backward compatibility
        window.dataService = window.directFlow;
        window.unifiedDataService = window.directFlow;
        window.dataManager = window.directFlow;
        
        // Create UnifiedEmployeeManager compatibility
        window.UnifiedEmployeeManager = class {
            constructor() {
                this.directFlow = window.directFlow;
            }
            
            async getEmployees() {
                return await this.directFlow.getEmployees();
            }
            
            async getAttendanceRecords() {
                return await this.directFlow.getAttendanceRecords();
            }
            
            async getAttendanceOverview() {
                return await this.directFlow.getAttendanceOverview();
            }
            
            async getSettings() {
                return await this.directFlow.getSettings();
            }
            
            async saveEmployee(employee) {
                if (employee.id) {
                    return await this.directFlow.updateEmployee(employee.id, employee);
                } else {
                    return await this.directFlow.createEmployee(employee);
                }
            }
            
            async deleteEmployee(employeeId) {
                return await this.directFlow.deleteEmployee(employeeId);
            }
            
            async saveAttendanceRecord(record) {
                if (record.id) {
                    return await this.directFlow.updateAttendanceRecord(record.id, record);
                } else {
                    return await this.directFlow.createAttendanceRecord(record);
                }
            }
            
            async deleteAttendanceRecord(recordId) {
                return await this.directFlow.deleteAttendanceRecord(recordId);
            }
            
            async getAllData() {
                return await this.directFlow.getAllData();
            }
            
            async syncData(data) {
                return await this.directFlow.syncData(data);
            }
            
            addEventListener(event, callback) {
                this.directFlow.addEventListener(event, callback);
            }
            
            removeEventListener(event, callback) {
                this.directFlow.removeEventListener(event, callback);
            }
            
            emit(event, data) {
                this.directFlow.emit(event, data);
            }
        };
        
        // Create instance for backward compatibility
        window.unifiedEmployeeManager = new window.UnifiedEmployeeManager();
        
        // BackendApiService compatibility
        window.BackendApiService = class {
            constructor() {
                this.directFlow = window.directFlow;
                this.isAvailable = this.directFlow.isReady();
            }
            
            async ensureAuthenticated() {
                return this.directFlow.isReady();
            }
            
            async syncToBackend(employees, attendance) {
                return await this.directFlow.syncData({ employees, attendance });
            }
            
            async getDataFromBackend() {
                return await this.directFlow.getAllData();
            }
            
            setAuthToken(token) {
                this.directFlow.setAuthToken(token);
            }
        };
        
        // Create instance for backward compatibility
        window.backendApiService = new window.BackendApiService();
        
        // LocalStorageDataService compatibility (deprecated - shows warning)
        window.LocalStorageDataService = class {
            constructor() {
                console.warn('⚠️  LocalStorageDataService is deprecated. Use DirectFlow instead.');
                this.directFlow = window.directFlow;
            }
            
            async getEmployees() {
                console.warn('⚠️  Using deprecated LocalStorageDataService. Redirecting to DirectFlow.');
                return await this.directFlow.getEmployees();
            }
            
            async getAttendanceRecords() {
                console.warn('⚠️  Using deprecated LocalStorageDataService. Redirecting to DirectFlow.');
                return await this.directFlow.getAttendanceRecords();
            }
            
            async getSettings() {
                console.warn('⚠️  Using deprecated LocalStorageDataService. Redirecting to DirectFlow.');
                return await this.directFlow.getSettings();
            }
        };
        
        // Mock localStorage dependencies to show deprecation warnings
        const originalGetItem = localStorage.getItem;
        const originalSetItem = localStorage.setItem;
        
        localStorage.getItem = function(key) {
            if (key.includes('bricks_') || key.includes('employee_') || key.includes('attendance_')) {
                console.warn(\`⚠️  Deprecated localStorage access for \${key}. Use DirectFlow instead.\`);
            }
            return originalGetItem.call(this, key);
        };
        
        localStorage.setItem = function(key, value) {
            if (key.includes('bricks_') || key.includes('employee_') || key.includes('attendance_')) {
                console.warn(\`⚠️  Deprecated localStorage write for \${key}. Use DirectFlow instead.\`);
            }
            return originalSetItem.call(this, key, value);
        };
        
        console.log('✅ DirectFlow compatibility layer initialized');
        
        // Emit event for pages waiting for initialization
        window.dispatchEvent(new CustomEvent('directflow-compatibility-ready'));
    });
})();`;

        const shimPath = path.join(this.rootDir, 'js', 'directflow-compatibility.js');
        await fs.writeFile(shimPath, shimContent, 'utf8');
        console.log('✅ Created compatibility shim');
    }

    /**
     * Generate migration report
     */
    async generateReport() {
        const reportContent = `# DirectFlow Migration Report

## Migration Summary
- Date: ${new Date().toISOString()}
- HTML files processed: ${this.htmlFiles.length}
- JS files found: ${this.jsFiles.length}

## Changes Made

### 1. Script Replacements
The following scripts have been replaced with DirectFlow:
- \`js/unified-data-service.js\` → \`js/directflow.js\`
- \`js/unified-employee-manager.js\` → \`js/directflow.js\`
- \`js/backend-api-service.js\` → \`js/directflow.js\`
- \`js/data-manager.js\` → \`js/directflow.js\`

### 2. Compatibility Layer
- Created \`js/directflow-compatibility.js\` for backward compatibility
- Existing code should continue to work without changes
- Deprecation warnings will be shown in console for localStorage usage

### 3. Key Benefits
- ✅ No localStorage dependencies
- ✅ Direct backend communication only
- ✅ Streamlined API calls
- ✅ Better error handling
- ✅ Event-driven architecture
- ✅ Backward compatibility maintained

### 4. Migration Actions Required

#### For Developers:
1. Update code to use \`window.directFlow\` instead of old services
2. Replace localStorage calls with DirectFlow methods
3. Update authentication flow to use DirectFlow
4. Test all pages for functionality

#### For Users:
- No action required - compatibility layer handles existing functionality

### 5. Files Modified
${this.htmlFiles.map(file => `- ${file}`).join('\n')}

### 6. New Files Created
- \`js/directflow.js\` - Main DirectFlow data manager
- \`js/directflow-compatibility.js\` - Compatibility shim
- \`migration-backups/\` - Backup directory with original files

### 7. Deprecated Features
- localStorage data persistence (use backend instead)
- Mock data fallbacks (backend required)
- Offline functionality (backend required)
- CrossTabDataSync (use DirectFlow events instead)

### 8. Next Steps
1. Test all pages for functionality
2. Monitor console for deprecation warnings
3. Gradually migrate code to use DirectFlow directly
4. Remove compatibility shim once migration is complete

## API Changes

### Old Usage:
\`\`\`javascript
// Old unified data service
window.dataService.getEmployees();
window.unifiedEmployeeManager.getAttendanceRecords();
window.backendApiService.syncToBackend(data);
\`\`\`

### New Usage:
\`\`\`javascript
// New DirectFlow
window.directFlow.getEmployees();
window.directFlow.getAttendanceRecords();
window.directFlow.syncData(data);
\`\`\`

## Testing Checklist
- [ ] Login functionality works
- [ ] Employee management works
- [ ] Attendance tracking works
- [ ] Payroll generation works
- [ ] Settings management works
- [ ] All pages load without errors
- [ ] API calls are working
- [ ] Authentication is maintained
- [ ] Events are firing correctly
- [ ] No localStorage dependency errors

## Rollback Instructions
If issues occur, restore from backup files in \`migration-backups/\` directory.
`;

        const reportPath = path.join(this.rootDir, 'DIRECTFLOW_MIGRATION_REPORT.md');
        await fs.writeFile(reportPath, reportContent, 'utf8');
        console.log('📋 Generated migration report');
    }
}

// Run migration if called directly
if (require.main === module) {
    const migration = new DirectFlowMigration();
    migration.migrate()
        .then(() => {
            console.log('🎉 Migration completed successfully!');
            console.log('📋 Check DIRECTFLOW_MIGRATION_REPORT.md for details');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Migration failed:', error);
            process.exit(1);
        });
}

module.exports = DirectFlowMigration;
