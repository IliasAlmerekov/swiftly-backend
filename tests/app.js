// This file creates a simple version of our app for testing
// It's like our main server.js but without starting the actual server

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "../src/routes/authRoutes.js";
import ticketRoutes from "../src/routes/ticketRoutes.js";
import { errorHandler } from "../src/middlewares/errorHandler.js";

// Load environment variables for testing
dotenv.config();

// Create the Express app
const app = express();

// Set up middleware (the things that process requests)
app.use(cors());
app.use(express.json()); // This lets us read JSON data from requests

// Set up our routes (the different URLs our app responds to)
app.use("/api/auth", authRoutes);      // Routes for login/register
app.use("/api/tickets", ticketRoutes); // Routes for tickets

// Simple test route
app.get("/", (req, res) => {
  res.send("API live");
});

// Health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    service: "ScooTeq Helpdesk Backend"
  });
});

app.use(errorHandler);

// Export the app so tests can use it
export default app;
