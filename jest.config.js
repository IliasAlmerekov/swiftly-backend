export default {
  // Use Node.js environment for testing
  testEnvironment: 'node',
  
  // Transform settings for ES modules
  transform: {},
  
  // Module name mapping
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/src/**/*.test.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Set timeout for tests
  testTimeout: 30000,
  
  // Coverage settings
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js', // Exclude main server file
    '!src/**/*.test.js'
  ],
  
  // Verbose output to help beginners understand what's happening
  verbose: true
};
