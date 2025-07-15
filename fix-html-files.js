const fs = require('fs');
const path = require('path');

/**
 * Fix malformed HTML files and remove compatibility layer
 */
class HtmlFixer {
    constructor() {
        this.rootDir = __dirname;
        this.processedFiles = [];
    }

    /**
     * Fix all HTML files
     */
    async fixAllHtmlFiles() {
        console.log('🔄 Fixing HTML files and removing compatibility layer...');
        
        // Get all HTML files
        const htmlFiles = this.getHtmlFiles();
        
        for (const file of htmlFiles) {
            console.log(`Processing: ${path.basename(file)}`);
            await this.processFile(file);
        }
        
        console.log('✅ HTML file fixing complete');
        console.log(`📊 Processed ${this.processedFiles.length} files`);
        
        return this.processedFiles;
    }

    /**
     * Get all HTML files in the project
     */
    getHtmlFiles() {
        const htmlFiles = [];
        const files = fs.readdirSync(this.rootDir);
        
        for (const file of files) {
            if (file.endsWith('.html')) {
                htmlFiles.push(path.join(this.rootDir, file));
            }
        }
        
        return htmlFiles;
    }

    /**
     * Process a single HTML file
     */
    async processFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            let modified = false;
            let newContent = content;
            
            // Fix malformed prepended scripts
            const malformedPattern = /^\\s*<script src="js\/directflow\.js"><\/script>\\s*<script src="js\/directflow-compatibility\.js"><\/script>\\s*<!DOCTYPE html>/;
            if (malformedPattern.test(content)) {
                newContent = content.replace(malformedPattern, '<!DOCTYPE html>');
                modified = true;
                console.log(`  ✅ Fixed malformed prepended scripts in ${path.basename(filePath)}`);
            }
            
            // Remove compatibility layer script tags
            const compatibilityPattern = /<script src="js\/directflow-compatibility\.js"[^>]*><\/script>/g;
            if (compatibilityPattern.test(newContent)) {
                newContent = newContent.replace(compatibilityPattern, '');
                modified = true;
                console.log(`  ✅ Removed compatibility layer script from ${path.basename(filePath)}`);
            }
            
            // Write back if modified
            if (modified) {
                fs.writeFileSync(filePath, newContent);
                this.processedFiles.push(filePath);
            }
            
        } catch (error) {
            console.error(`❌ Error processing ${filePath}:`, error.message);
        }
    }
}

// Run the HTML fixer
const fixer = new HtmlFixer();
fixer.fixAllHtmlFiles().then(() => {
    console.log('\\n🎉 HTML file fixing completed!');
}).catch(error => {
    console.error('❌ Error fixing HTML files:', error);
});
