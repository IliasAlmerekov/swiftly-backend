# 🧪 Testing Guide for Beginners

This guide will help you understand and run tests for your ScooTeq Helpdesk backend.

## What are tests?

Tests are like automatic quality checks for your code. They help make sure your application works correctly and catch bugs before your users find them!

## What we're testing

Our tests check three main areas:

### 1. 🏠 Basic API Tests (`basic.test.js`)
- ✅ Can we connect to our API?
- ✅ Do our basic routes work?
- ✅ Do we handle errors correctly?

### 2. 🔐 Authentication Tests (`auth.test.js`)
- ✅ Can users register with valid information?
- ✅ What happens with missing information?
- ✅ Can users log in correctly?
- ✅ Are wrong passwords rejected?

### 3. 🎫 Ticket Tests (`tickets.test.js`)
- ✅ Can users create tickets?
- ✅ Can users see their tickets?
- ✅ Can admins see all tickets?
- ✅ Are permissions working correctly?

## How to run tests

### Run all tests
\`\`\`bash
npm test
\`\`\`

### Run tests and watch for changes
\`\`\`bash
npm run test:watch
\`\`\`

### Run tests with coverage (see how much code is tested)
\`\`\`bash
npm run test:coverage
\`\`\`

### Run specific test file
\`\`\`bash
npm test basic.test.js
npm test auth.test.js
npm test tickets.test.js
\`\`\`

## Understanding test results

When you run tests, you'll see output like this:

\`\`\`
✅ Homepage test passed!
✅ Health check test passed!
✅ 404 test passed!

PASS tests/basic.test.js
  🏠 Basic API Tests
    ✓ should return API live message on homepage (25ms)
    ✓ should return health status (15ms)  
    ✓ should return 404 for non-existent routes (12ms)
\`\`\`

- ✅ **Green checkmarks**: Tests passed! 🎉
- ❌ **Red X's**: Tests failed - something needs fixing
- **Numbers in parentheses**: How long the test took to run

## What happens during testing?

1. **Setup**: Creates a fake database in memory
2. **Run tests**: Checks if everything works correctly
3. **Cleanup**: Deletes test data so tests don't interfere with each other
4. **Teardown**: Closes the fake database

## Tips for beginners

1. **Read the test names**: They describe what's being tested
2. **Look at the comments**: Each test file has explanations
3. **Don't worry if some tests fail initially**: That's normal! Fix one at a time
4. **Use `npm run test:watch`**: It runs tests automatically when you change code
5. **Tests use a fake database**: Your real data is safe!

## Common test terms

- **`describe`**: Groups related tests together
- **`test` or `it`**: A single test case
- **`expect`**: Checks if something is what we expected
- **`beforeAll`**: Runs once before all tests start
- **`afterEach`**: Runs after each individual test
- **`supertest`**: Helps us test API endpoints
- **`jest`**: The testing framework we use

## Troubleshooting

### Tests fail with database errors
Make sure MongoDB Memory Server is installed:
\`\`\`bash
npm install --save-dev mongodb-memory-server
\`\`\`

### Tests timeout
Some tests might take longer. This is normal for database operations.

### Import/Export errors
Make sure your Node.js version supports ES modules (Node 14+).

## Need help?

1. Read the test file comments - they explain what each test does
2. Run tests one file at a time to isolate issues
3. Check the console output for helpful error messages
4. Remember: failing tests are good! They tell you what needs fixing

Happy testing! 🚀
