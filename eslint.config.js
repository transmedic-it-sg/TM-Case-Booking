// Simplified ESLint v9 configuration without external dependencies
// Temporarily excluding TypeScript files due to parser conflicts
module.exports = [
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        crypto: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        history: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        
        // Node.js globals for build scripts
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        
        // Testing globals
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        
        // React globals
        React: 'readonly',
        JSX: 'readonly'
      }
    },
    rules: {
      // Basic error prevention
      'no-undef': 'error',
      'no-unused-vars': 'warn',
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-empty': 'error',
      
      // Basic JavaScript rules only (no TypeScript parser needed)
      
      // React specific rules would go here when we add React ESLint plugin
      // For now, keeping minimal config for working linting
    }
  },
  {
    files: ['**/*.test.{js,jsx}', '**/*.spec.{js,jsx}'],
    rules: {
      'no-console': 'off' // Allow console in tests
    }
  },
  {
    // Ignore TypeScript files temporarily due to parser conflicts
    ignores: ['**/*.{ts,tsx}']
  }
];