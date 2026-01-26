// This file sets up the test environment
// It runs before every test to prepare everything

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';
import { URL } from 'url';
import fs from 'fs';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set fallback environment variables for CI/CD
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-secret-key-for-gitlab-ci';
}
if (!process.env.JWT_EXPIRES) {
  process.env.JWT_EXPIRES = '1h';
}
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

console.log('🔧 Test environment setup:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Missing');

// Create a fake database in memory for testing
let mongoServer;

const isAlpine = () => {
  try {
    const content = fs.readFileSync('/etc/os-release', 'utf8');
    return /ID=alpine/.test(content);
  } catch {
    return false;
  }
};

const buildWorkerDbUri = baseUri => {
  try {
    const workerId = process.env.JEST_WORKER_ID || '1';
    const uri = new URL(baseUri);
    const dbName = uri.pathname && uri.pathname !== '/' ? uri.pathname.slice(1) : 'helpdesk_test';
    uri.pathname = `/${dbName}_${workerId}`;
    return uri.toString();
  } catch {
    return baseUri;
  }
};

// This runs once before all tests start
beforeAll(async () => {
  try {
    if (isAlpine()) {
      throw new Error('MongoMemoryServer is not supported on Alpine');
    }
    // Create an in-memory MongoDB database for testing
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connect to the test database
    await mongoose.connect(mongoUri);
    
    console.log('✅ Test database connected');
  } catch (error) {
    console.error('❌ MongoDB Memory Server Fehler:', error.message);
    
    // Fallback: Verwende echte MongoDB wenn Memory Server fehlschlägt
    if (process.env.MONGO_URI) {
      const workerUri = buildWorkerDbUri(process.env.MONGO_URI);
      console.log('🔄 Fallback: Verwende echte Test-Datenbank');
      await mongoose.connect(workerUri);
      console.log('✅ Echte Test-Datenbank verbunden');
    } else {
      throw new Error('Weder Memory Server noch Test-Datenbank verfügbar');
    }
  }
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

// This runs once after all tests finish
afterAll(async () => {
  // Disconnect from the database and stop the server
  await mongoose.disconnect();
  
  if (mongoServer) {
    await mongoServer.stop();
  }
  
  console.log('❌ Test database disconnected');
});

export { mongoServer };
