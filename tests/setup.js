// This file sets up the test environment
// It runs before every test to prepare everything

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Create a fake database in memory for testing
let mongoServer;

// This runs once before all tests start
beforeAll(async () => {
  // Create an in-memory MongoDB database for testing
  // This way we don't mess with the real database
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to the test database
  await mongoose.connect(mongoUri);
  
  console.log('✅ Test database connected');
});

// This runs after each individual test
afterEach(async () => {
  // Clean up the database after each test
  // This ensures tests don't affect each other
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
  
  console.log('🧹 Test database cleaned');
});

// This runs once after all tests are done
afterAll(async () => {
  // Disconnect from the database and stop the server
  await mongoose.disconnect();
  await mongoServer.stop();
  
  console.log('❌ Test database disconnected');
});

// Set a longer timeout for database operations
process.env.JEST_TIMEOUT = '30000';
