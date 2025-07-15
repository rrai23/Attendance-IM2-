const fs = require('fs');
const path = require('path');

/**
 * Remove DirectFlow compatibility layer from all HTML files
 */
class CompatibilityLayerRemover {
    constructor() {
        this.rootDir = __dirname;
        this.processedFiles = [];
    }

    /**
     * Remove compatibility layer from all HTML files
     */
    async removeCompatibilityLayer() {
        console.log('🔄 Removing DirectFlow compatibility layer from all files...');
        
        // Get all HTML files
        const htmlFiles = this.getHtmlFiles();
        
        for (const file of htmlFiles) {
            console.log(`Processing: ${file}`);
            await this.processFile(file);
        }
        
        console.log('✅ Compatibility layer removal complete');
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
            
            // Remove compatibility layer script tag
            const compatibilityLayerPattern = /\\s*<script src="js\/directflow-compatibility\.js"[^>]*><\/script>\\s*/g;
            
            let newContent = content;
            
            // Remove compatibility layer script reference
            if (compatibilityLayerPattern.test(content)) {
                newContent = content.replace(compatibilityLayerPattern, '');
                modified = true;
                console.log(`  ✅ Removed compatibility layer from ${path.basename(filePath)}`);
            }
            
            // Also remove any weird prepended compatibility scripts
            const prependedPattern = /^\\s*<script src="js\/directflow\.js"><\/script>\\s*<script src="js\/directflow-compatibility\.js"><\/script>\\s*/;
            if (prependedPattern.test(newContent)) {
                newContent = newContent.replace(prependedPattern, '');
                modified = true;
                console.log(`  ✅ Removed prepended compatibility scripts from ${path.basename(filePath)}`);
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

// Run the compatibility layer removal
const remover = new CompatibilityLayerRemover();
remover.removeCompatibilityLayer().then(() => {
    console.log('\\n🎉 DirectFlow compatibility layer removal completed!');
}).catch(error => {
    console.error('❌ Error removing compatibility layer:', error);
});
