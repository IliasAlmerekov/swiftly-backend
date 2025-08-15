// 🛠️ TEST UTILITIES - Helper functions to make testing easier
// 
// This file contains common functions that our tests use
// It helps avoid repeating the same code in multiple test files

import request from 'supertest';
import app from './app.js';

/**
 * Creates a user and returns their authentication token
 * 
 * @param {Object} userData - User data for registration
 * @param {string} userData.email - User's email
 * @param {string} userData.password - User's password  
 * @param {string} userData.name - User's name
 * @param {string} [userData.role='user'] - User's role (user or admin)
 * @returns {Promise<{token: string, user: Object}>} Token and user data
 */
export const createUserAndGetToken = async (userData = {}) => {
  // Set default values if not provided
  const defaultUserData = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
    role: 'user',
    ...userData // Override with provided data
  };

  try {
    const response = await request(app)
      .post('/api/auth/register')
      .send(defaultUserData)
      .expect(201);
    
    return {
      token: response.body.token,
      user: { _id: response.body.userId } // Create user object with just the ID
    };
  } catch (error) {
    console.error('Failed to create user and get token:', error);
    throw error;
  }
};

/**
 * Creates an admin user and returns their authentication token
 * 
 * @param {Object} adminData - Admin user data
 * @returns {Promise<{token: string, user: Object}>} Token and user data
 */
export const createAdminAndGetToken = async (adminData = {}) => {
  const defaultAdminData = {
    email: 'admin@example.com',
    password: 'adminpassword123',
    name: 'Admin User',
    role: 'admin',
    ...adminData
  };

  return createUserAndGetToken(defaultAdminData);
};

/**
 * Creates a ticket for a user
 * 
 * @param {string} token - Authentication token
 * @param {Object} ticketData - Ticket data
 * @param {string} ticketData.title - Ticket title
 * @param {string} ticketData.description - Ticket description
 * @param {string} [ticketData.priority='medium'] - Ticket priority
 * @param {string} [ticketData.category='general'] - Ticket category
 * @returns {Promise<Object>} Created ticket
 */
export const createTicket = async (token, ticketData = {}) => {
  const defaultTicketData = {
    title: 'Test Ticket',
    description: 'Test ticket description',
    priority: 'medium',
    category: 'general',
    ...ticketData
  };

  try {
    const response = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send(defaultTicketData)
      .expect(201);
    
    return response.body;
  } catch (error) {
    console.error('Failed to create ticket:', error);
    throw error;
  }
};

/**
 * Creates multiple test users with different roles
 * Useful for tests that need various user types
 * 
 * @returns {Promise<Object>} Object with regular user and admin user tokens
 */
export const createTestUsers = async () => {
  const regularUser = await createUserAndGetToken({
    email: 'user@test.com',
    name: 'Regular User',
    role: 'user'
  });

  const adminUser = await createAdminAndGetToken({
    email: 'admin@test.com',
    name: 'Admin User'
  });

  return {
    regularUser,
    adminUser
  };
};

/**
 * Helper to make authenticated requests
 * 
 * @param {string} method - HTTP method (get, post, put, delete)
 * @param {string} url - Request URL
 * @param {string} token - Authentication token
 * @param {Object} [data] - Request body data
 * @returns {Promise} Supertest request
 */
export const makeAuthenticatedRequest = (method, url, token, data = null) => {
  const req = request(app)[method.toLowerCase()](url)
    .set('Authorization', `Bearer ${token}`);
  
  if (data && (method.toLowerCase() === 'post' || method.toLowerCase() === 'put')) {
    req.send(data);
  }
  
  return req;
};

/**
 * Sample data generators for tests
 */
export const sampleData = {
  user: {
    email: 'sample@example.com',
    password: 'samplepassword123',
    name: 'Sample User',
    role: 'user'
  },
  
  admin: {
    email: 'sampleadmin@example.com', 
    password: 'adminpassword123',
    name: 'Sample Admin',
    role: 'admin'
  },
  
  ticket: {
    title: 'Sample Ticket',
    description: 'This is a sample ticket for testing',
    priority: 'medium',
    category: 'technical'
  },
  
  comment: {
    text: 'This is a test comment'
  }
};

/**
 * Validation helpers
 */
export const validators = {
  /**
   * Checks if a response has the expected user properties
   */
  expectValidUser: (user) => {
    expect(user).toHaveProperty('_id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('role');
    expect(user).not.toHaveProperty('password'); // Password should never be returned
  },
  
  /**
   * Checks if a response has the expected ticket properties
   */
  expectValidTicket: (ticket) => {
    expect(ticket).toHaveProperty('_id');
    expect(ticket).toHaveProperty('title');
    expect(ticket).toHaveProperty('description');
    expect(ticket).toHaveProperty('status');
    expect(ticket).toHaveProperty('priority');
    expect(ticket).toHaveProperty('owner');
    expect(ticket).toHaveProperty('createdAt');
  }
};

export default {
  createUserAndGetToken,
  createAdminAndGetToken,
  createTicket,
  createTestUsers,
  makeAuthenticatedRequest,
  sampleData,
  validators
};
