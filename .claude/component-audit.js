#!/usr/bin/env node

/**
 * Comprehensive Component Import/Export Audit
 * Finds mismatched imports, circular references, and naming issues
 */

const fs = require('fs');
const path = require('path');

class ComponentAuditor {
  constructor() {
    this.issues = [];
    this.componentMap = new Map();
    this.imports = new Map();
    this.exports = new Map();
  }

  async auditAll() {
    console.log('🔍 COMPREHENSIVE COMPONENT AUDIT');
    console.log('='.repeat(50));
    
    await this.scanComponents();
    await this.findIssues();
    this.generateReport();
    
    return this.issues.length === 0;
  }

  async scanComponents() {
    console.log('📂 Scanning all React components...');
    
    const files = this.findReactFiles('src');
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // Analyze exports
        this.analyzeExports(file, content);
        
        // Analyze imports
        this.analyzeImports(file, content);
        
      } catch (error) {
        this.issues.push({
          type: 'FILE_ERROR',
          file,
          message: `Cannot read file: ${error.message}`
        });
      }
    }
    
    console.log(`✅ Scanned ${files.length} files`);
  }

  findReactFiles(dir) {
    const files = [];
    
    const walk = (currentDir) => {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          walk(fullPath);
        } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
          files.push(fullPath);
        }
      }
    };
    
    walk(dir);
    return files;
  }

  analyzeExports(file, content) {
    // Find default exports
    const defaultExportMatch = content.match(/export\s+default\s+(.+)/);
    if (defaultExportMatch) {
      this.exports.set(file, {
        type: 'default',
        name: defaultExportMatch[1].trim()
      });
    }
    
    // Find re-exports
    const reExportMatch = content.match(/export\s+{\s*default\s*}\s+from\s+['"]([^'"]+)['"]/);
    if (reExportMatch) {
      this.exports.set(file, {
        type: 'reexport',
        target: reExportMatch[1]
      });
    }
  }

  analyzeImports(file, content) {
    const imports = [];
    
    // Find all import statements
    const importRegex = /import\s+(?:(\w+)|\{([^}]+)\}|\*\s+as\s+(\w+))\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const [, defaultImport, namedImports, namespaceImport, from] = match;
      
      imports.push({
        default: defaultImport,
        named: namedImports ? namedImports.split(',').map(s => s.trim()) : [],
        namespace: namespaceImport,
        from: from
      });
    }
    
    this.imports.set(file, imports);
  }

  async findIssues() {
    console.log('🚨 Finding component issues...');
    
    // 1. Find circular imports
    this.findCircularImports();
    
    // 2. Find mismatched re-exports
    this.findMismatchedReExports();
    
    // 3. Find missing components
    this.findMissingComponents();
    
    // 4. Find naming convention issues
    this.findNamingIssues();
  }

  findCircularImports() {
    console.log('  🔄 Checking for circular imports...');
    
    for (const [file, exports] of this.exports.entries()) {
      if (exports.type === 'reexport') {
        const targetPath = this.resolvePath(file, exports.target);
        const targetExports = this.exports.get(targetPath);
        
        if (targetExports && targetExports.type === 'reexport') {
          const finalTarget = this.resolvePath(targetPath, targetExports.target);
          
          if (finalTarget === file) {
            this.issues.push({
              type: 'CIRCULAR_IMPORT',
              file,
              message: `Circular import detected: ${file} → ${targetPath} → ${finalTarget}`
            });
          }
        }
      }
    }
  }

  findMismatchedReExports() {
    console.log('  🔗 Checking re-export targets...');
    
    for (const [file, exports] of this.exports.entries()) {
      if (exports.type === 'reexport') {
        const targetPath = this.resolvePath(file, exports.target);
        
        if (!fs.existsSync(targetPath) && !fs.existsSync(targetPath + '.tsx') && !fs.existsSync(targetPath + '.ts')) {
          this.issues.push({
            type: 'MISSING_REEXPORT_TARGET',
            file,
            message: `Re-export target not found: ${exports.target} (resolved to ${targetPath})`
          });
        }
      }
    }
  }

  findMissingComponents() {
    console.log('  📁 Checking for missing component files...');
    
    for (const [file, imports] of this.imports.entries()) {
      for (const imp of imports) {
        if (imp.from.startsWith('.')) {
          const resolvedPath = this.resolvePath(file, imp.from);
          
          if (!fs.existsSync(resolvedPath) && 
              !fs.existsSync(resolvedPath + '.tsx') && 
              !fs.existsSync(resolvedPath + '.ts') &&
              !fs.existsSync(path.join(resolvedPath, 'index.tsx')) &&
              !fs.existsSync(path.join(resolvedPath, 'index.ts'))) {
            
            this.issues.push({
              type: 'MISSING_IMPORT',
              file,
              message: `Import target not found: ${imp.from} (resolved to ${resolvedPath})`
            });
          }
        }
      }
    }
  }

  findNamingIssues() {
    console.log('  📝 Checking naming conventions...');
    
    for (const [file] of this.exports.entries()) {
      const fileName = path.basename(file, path.extname(file));
      const dirName = path.basename(path.dirname(file));
      
      // Check if component files follow PascalCase
      if (fileName !== 'index' && fileName !== fileName.charAt(0).toUpperCase() + fileName.slice(1)) {
        this.issues.push({
          type: 'NAMING_CONVENTION',
          file,
          message: `Component file should use PascalCase: ${fileName}`
        });
      }
      
      // Check for inconsistent directory/file naming
      if (dirName === fileName && fs.existsSync(path.join(path.dirname(file), 'index.tsx'))) {
        this.issues.push({
          type: 'REDUNDANT_INDEX',
          file,
          message: `Redundant structure: ${dirName}/${fileName}.tsx should use index.tsx`
        });
      }
    }
  }

  resolvePath(fromFile, importPath) {
    const fromDir = path.dirname(fromFile);
    return path.resolve(fromDir, importPath);
  }

  generateReport() {
    console.log('\n📊 AUDIT REPORT');
    console.log('='.repeat(50));
    
    if (this.issues.length === 0) {
      console.log('🎉 NO ISSUES FOUND - All components properly linked!');
      return;
    }
    
    const issuesByType = this.groupBy(this.issues, 'type');
    
    for (const [type, issues] of Object.entries(issuesByType)) {
      console.log(`\n🚨 ${type} (${issues.length} issues):`);
      
      for (const issue of issues) {
        console.log(`  ❌ ${issue.file}`);
        console.log(`     ${issue.message}`);
      }
    }
    
    console.log(`\n💥 TOTAL ISSUES: ${this.issues.length}`);
    console.log('\n🔧 RECOMMENDED ACTIONS:');
    
    if (issuesByType.CIRCULAR_IMPORT) {
      console.log('  1. Fix circular imports by removing intermediate re-exports');
    }
    if (issuesByType.MISSING_REEXPORT_TARGET) {
      console.log('  2. Update re-export paths to point to correct components');
    }
    if (issuesByType.MISSING_IMPORT) {
      console.log('  3. Fix missing import paths or create missing files');
    }
    if (issuesByType.NAMING_CONVENTION) {
      console.log('  4. Rename files to follow PascalCase convention');
    }
  }

  groupBy(array, key) {
    return array.reduce((result, item) => {
      const group = item[key];
      if (!result[group]) result[group] = [];
      result[group].push(item);
      return result;
    }, {});
  }
}

async function main() {
  const auditor = new ComponentAuditor();
  const success = await auditor.auditAll();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Audit failed:', error.message);
    process.exit(1);
  });
}

module.exports = { ComponentAuditor };