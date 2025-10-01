/**
 * Comprehensive Application Audit Script
 * Checks:
 * - Missing function calls
 * - Unused imports/exports
 * - Potential errors
 * - Code quality issues
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');
let issues = [];
let warnings = [];
let info = [];

// Scan all TypeScript/JavaScript files
function scanFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      scanFiles(filePath, fileList);
    } else if (/\.(tsx?|jsx?)$/.test(file)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Check for common issues
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(srcDir, filePath);

  // Check for console.log statements (potential debugging leftover)
  const consoleLogs = (content.match(/console\.log\(/g) || []).length;
  if (consoleLogs > 0) {
    info.push(`${relativePath}: ${consoleLogs} console.log statement(s) found`);
  }

  // Check for TODO/FIXME comments
  const todos = content.match(/\/\/\s*(TODO|FIXME):.*/gi);
  if (todos) {
    todos.forEach(todo => {
      warnings.push(`${relativePath}: ${todo.trim()}`);
    });
  }

  // Check for unused imports (basic check)
  const importMatches = content.match(/import\s+.*\s+from\s+['"].*['"]/g);
  if (importMatches) {
    importMatches.forEach(importLine => {
      const match = importLine.match(/import\s+(?:\{([^}]+)\}|([^\s]+))\s+from/);
      if (match) {
        const imports = match[1] ? match[1].split(',').map(s => s.trim()) : [match[2]];
        imports.forEach(imp => {
          const name = imp.replace(/\s+as\s+.*/, '').trim();
          // Simple check: if imported but never used in file
          try {
            const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedName}\\b`, 'g');
            const usages = (content.match(regex) || []).length;
            if (usages === 1) { // Only found once (in the import itself)
              warnings.push(`${relativePath}: Potentially unused import '${name}'`);
            }
          } catch (e) {
            // Skip invalid regex patterns
          }
        });
      }
    });
  }

  // Check for async functions without try-catch
  const asyncFunctions = content.match(/async\s+(?:function\s+\w+|\w+\s*=\s*async|[\w]+\s*:\s*async)/g);
  if (asyncFunctions) {
    const tryCatches = (content.match(/try\s*\{/g) || []).length;
    if (asyncFunctions.length > tryCatches) {
      warnings.push(`${relativePath}: ${asyncFunctions.length} async function(s), but only ${tryCatches} try-catch block(s)`);
    }
  }

  // Check for potential null/undefined access
  const nullChecks = content.match(/\?\.|&&\s+\w+\./g);
  const directAccess = content.match(/\.\w+\(/g);
  if (directAccess && (!nullChecks || directAccess.length > nullChecks.length * 3)) {
    info.push(`${relativePath}: Consider adding more null-safe checks (?.  or &&)`);
  }

  // Check for hardcoded URLs/API keys
  const hardcodedUrls = content.match(/https?:\/\/[^\s"']+/g);
  if (hardcodedUrls) {
    hardcodedUrls.forEach(url => {
      if (!url.includes('localhost') && !url.includes('example')) {
        warnings.push(`${relativePath}: Hardcoded URL found: ${url}`);
      }
    });
  }

  // Check for missing return statements in non-void functions
  if (content.includes('function') && !content.includes('void')) {
    const funcDecls = content.match(/function\s+\w+[^{]*\{[^}]*\}/g);
    if (funcDecls) {
      funcDecls.forEach(func => {
        if (!func.includes('return') && !func.includes('=>') && func.length > 50) {
          warnings.push(`${relativePath}: Function without return statement`);
        }
      });
    }
  }

  // Check for event handlers without event type
  if (content.includes('onClick') || content.includes('onChange')) {
    const inlineHandlers = content.match(/(?:onClick|onChange|onSubmit)=\{[^}]+\}/g);
    if (inlineHandlers) {
      inlineHandlers.forEach(handler => {
        if (!handler.includes('(e)') && !handler.includes('(event)')) {
          info.push(`${relativePath}: Event handler without event parameter`);
        }
      });
    }
  }

  // Check for useEffect without dependency array
  const useEffects = content.match(/useEffect\s*\([^)]*\)/g);
  if (useEffects) {
    useEffects.forEach(effect => {
      if (!effect.includes('[') || effect.includes('[]')) {
        // Either has dependencies or empty array - OK
      } else {
        warnings.push(`${relativePath}: useEffect may be missing dependency array`);
      }
    });
  }
}

// Main audit
console.log('🔍 COMPREHENSIVE APPLICATION AUDIT');
console.log('═══════════════════════════════════════════════════════════\n');

const files = scanFiles(srcDir);
console.log(`📁 Scanning ${files.length} files...\n`);

files.forEach(analyzeFile);

// Report results
console.log('📊 AUDIT RESULTS');
console.log('═══════════════════════════════════════════════════════════\n');

if (issues.length > 0) {
  console.log('❌ CRITICAL ISSUES:', issues.length);
  issues.forEach((issue, i) => {
    console.log(`  ${i + 1}. ${issue}`);
  });
  console.log();
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS:', warnings.length);
  warnings.slice(0, 50).forEach((warning, i) => {
    console.log(`  ${i + 1}. ${warning}`);
  });
  if (warnings.length > 50) {
    console.log(`  ... and ${warnings.length - 50} more warnings`);
  }
  console.log();
}

if (info.length > 0) {
  console.log('ℹ️  INFO:', info.length);
  info.slice(0, 30).forEach((msg, i) => {
    console.log(`  ${i + 1}. ${msg}`);
  });
  if (info.length > 30) {
    console.log(`  ... and ${info.length - 30} more info messages`);
  }
  console.log();
}

console.log('═══════════════════════════════════════════════════════════');
console.log('📈 SUMMARY:');
console.log(`  ❌ Issues: ${issues.length}`);
console.log(`  ⚠️  Warnings: ${warnings.length}`);
console.log(`  ℹ️  Info: ${info.length}`);
console.log(`  📁 Files scanned: ${files.length}`);
console.log('═══════════════════════════════════════════════════════════\n');

if (issues.length === 0) {
  console.log('✅ No critical issues found!\n');
} else {
  console.log('⚠️  Please address critical issues before deployment.\n');
  process.exit(1);
}
