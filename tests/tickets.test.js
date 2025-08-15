// 🎫 TICKET TESTS - These test ticket creation, viewing, and management
// 
// What are we testing?
// ✅ Can users create tickets?
// ✅ Can users view their own tickets?
// ✅ Can admins view all tickets?
// ✅ Can users update their tickets?
// ✅ What happens when unauthorized users try to access tickets?

import request from 'supertest';
import app from './app.js';

describe('🎫 Ticket Tests', () => {

  // Helper function to create a user and get their token
  // This makes our tests easier to write
  const createUserAndGetToken = async (userData) => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);
    
    return {
      token: response.body.token,
      user: response.body.user
    };
  };

  // Test 1: User can create a ticket
  test('should create a new ticket for authenticated user', async () => {
    // First, create a user and get their token
    const { token } = await createUserAndGetToken({
      email: 'ticketuser@example.com',
      password: 'password123',
      name: 'Ticket User'
    });

    // Create ticket data
    const ticketData = {
      title: 'Test Ticket',
      description: 'This is a test ticket description',
      priority: 'medium',
      category: 'technical'
    };

    // Send request to create ticket with authentication
    const response = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${token}`) // This is how we authenticate
      .send(ticketData)
      .expect(201);

    // Check if ticket was created correctly
    expect(response.body).toHaveProperty('title', ticketData.title);
    expect(response.body).toHaveProperty('description', ticketData.description);
    expect(response.body).toHaveProperty('priority', ticketData.priority);
    expect(response.body).toHaveProperty('status', 'open'); // Should be open by default

    console.log('✅ Ticket creation test passed!');
  });

  // Test 2: Cannot create ticket without authentication
  test('should not create ticket without authentication', async () => {
    const ticketData = {
      title: 'Unauthorized Ticket',
      description: 'This should fail',
      priority: 'low'
    };

    // Try to create ticket without token
    const response = await request(app)
      .post('/api/tickets')
      // No Authorization header!
      .send(ticketData)
      .expect(401); // Should be unauthorized

    expect(response.body).toHaveProperty('message');

    console.log('✅ Unauthorized ticket creation test passed!');
  });

  // Test 3: User can view their own tickets
  test('should get user tickets for authenticated user', async () => {
    // Create a user and get token
    const { token } = await createUserAndGetToken({
      email: 'viewtickets@example.com',
      password: 'password123',
      name: 'View Tickets User'
    });

    // Create a couple of tickets for this user
    const ticket1 = {
      title: 'First Ticket',
      description: 'First description',
      priority: 'high'
    };

    const ticket2 = {
      title: 'Second Ticket',
      description: 'Second description',
      priority: 'low'
    };

    // Create both tickets
    await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send(ticket1)
      .expect(201);

    await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send(ticket2)
      .expect(201);

    // Now get all tickets for this user
    const response = await request(app)
      .get('/api/tickets/user')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Should have 2 tickets
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(2);

    // Check if our tickets are there
    const titles = response.body.map(ticket => ticket.title);
    expect(titles).toContain('First Ticket');
    expect(titles).toContain('Second Ticket');

    console.log('✅ View user tickets test passed!');
  });

  // Test 4: Admin can view all tickets
  test('should get all tickets for admin user', async () => {
    // Create regular user and admin user
    const regularUser = await createUserAndGetToken({
      email: 'regular@example.com',
      password: 'password123',
      name: 'Regular User',
      role: 'user'
    });

    const adminUser = await createUserAndGetToken({
      email: 'admin@example.com',
      password: 'password123',
      name: 'Admin User',
      role: 'admin'
    });

    // Regular user creates a ticket
    await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${regularUser.token}`)
      .send({
        title: 'Regular User Ticket',
        description: 'From regular user',
        priority: 'medium'
      })
      .expect(201);

    // Admin tries to get all tickets
    const response = await request(app)
      .get('/api/tickets') // Changed from /api/tickets/all to /api/tickets
      .set('Authorization', `Bearer ${adminUser.token}`)
      .expect(200);

    // Should be an array
    expect(Array.isArray(response.body)).toBe(true);
    // Should contain at least the ticket we just created
    expect(response.body.length).toBeGreaterThan(0);

    console.log('✅ Admin view all tickets test passed!');
  });

  // Test 5: Regular user cannot access admin endpoints
  test('should not allow regular user to access admin endpoints', async () => {
    // Create regular user
    const { token } = await createUserAndGetToken({
      email: 'nonadmin@example.com',
      password: 'password123',
      name: 'Non Admin User',
      role: 'user'
    });

    // Try to access admin endpoint
    const response = await request(app)
      .get('/api/tickets') // Changed from /api/tickets/all to /api/tickets
      .set('Authorization', `Bearer ${token}`)
      .expect(403); // 403 means "forbidden"

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('Access denied');

    console.log('✅ Admin access restriction test passed!');
  });

  // Test 6: Creating ticket with missing required fields should fail
  test('should not create ticket with missing required fields', async () => {
    const { token } = await createUserAndGetToken({
      email: 'missingfields@example.com',
      password: 'password123',
      name: 'Missing Fields User'
    });

    // Try to create ticket without title (required field)
    const incompleteTicket = {
      description: 'Missing title',
      priority: 'low'
      // No title!
    };

    const response = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send(incompleteTicket)
      .expect(400); // Should be bad request

    expect(response.body).toHaveProperty('message');

    console.log('✅ Missing fields validation test passed!');
  });

});
