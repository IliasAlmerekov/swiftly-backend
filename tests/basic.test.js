// 🧪 BASIC TESTS - These test simple things to make sure our API is working
// 
// What are we testing?
// ✅ Can we connect to our API?
// ✅ Do our basic routes work?
// ✅ Do we get the right responses?

import request from 'supertest';
import app from './app.js';

const allowedOrigin = "https://swiftly-helpdesk.netlify.app";

// 📚 EXPLANATION:
// - `describe` groups related tests together
// - `test` (or `it`) is an individual test
// - `expect` checks if something is what we expected

describe('🏠 Basic API Tests', () => {
  
  // Test 1: Can we reach the homepage?
  test('should return API live message on homepage', async () => {
    // Send a GET request to the homepage
    const response = await request(app)
      .get('/')
      .expect(200); // We expect a 200 status (success)
    
    // Check if the response text is what we expect
    expect(response.text).toBe('API live');
    
    console.log('✅ Homepage test passed!');
  });

  // Test 2: Can we reach the health check?
  test('should return health status', async () => {
    // Send a GET request to the health endpoint
    const response = await request(app)
      .get('/api/health')
      .expect(200);
    
    // Check if the response has the right structure
    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('service', 'Swiftly Helpdesk Backend');
    expect(response.body).toHaveProperty('timestamp');
    
    console.log('✅ Health check test passed!');
  });

  // Test 3: What happens when we go to a page that doesn't exist?
  test('should return 404 for non-existent routes', async () => {
    // Try to access a route that doesn't exist
    const response = await request(app)
      .get('/api/non-existent-route')
      .expect(404);
    
    console.log('✅ 404 test passed!');
  });

  // Test 4: API docs endpoint should be available
  test("should serve API docs", async () => {
    const response = await request(app)
      .get("/api/docs/")
      .expect(200);

    expect(response.text).toContain("Swagger UI");
  });

  // Test 5: Error handler should return structured response
  test("should return structured error response", async () => {
    const response = await request(app)
      .get("/__test/error")
      .expect(500);

    expect(response.body).toHaveProperty("message", "Internal Server Error");
    expect(response.body).toHaveProperty("code", "INTERNAL_ERROR");
  });

  test("should handle API preflight requests globally", async () => {
    const response = await request(app)
      .options("/api/non-existent-route")
      .set("Origin", allowedOrigin)
      .set("Access-Control-Request-Method", "POST")
      .expect(204);

    expect(response.headers["access-control-allow-origin"]).toBe(allowedOrigin);
    expect(response.headers["access-control-allow-methods"]).toContain("POST");
  });

  test("should include CORS headers on 404 responses", async () => {
    const response = await request(app)
      .get("/api/non-existent-route")
      .set("Origin", allowedOrigin)
      .expect(404);

    expect(response.headers["access-control-allow-origin"]).toBe(allowedOrigin);
  });

  test("should include CORS headers on error responses", async () => {
    const response = await request(app)
      .get("/__test/error")
      .set("Origin", allowedOrigin)
      .expect(500);

    expect(response.headers["access-control-allow-origin"]).toBe(allowedOrigin);
  });

});
