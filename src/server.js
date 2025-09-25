import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import process from "process";

import authRoutes from "./routes/authRoutes.js";
import ticketRoutes from "./routes/ticketRoutes.js";
import solutionRoutes from "./routes/solutionRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import { markInactiveUsersOffline } from "./controllers/userStatusController.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Authentifizierungs-Routen
app.use("/api/auth", authRoutes);

// Ticket-Routen
app.use("/api/tickets", ticketRoutes);

// Solution-Routen
app.use("/api/solutions", solutionRoutes);

// AI-Routen
app.use("/api/ai", aiRoutes);

// User-Routen
app.use("/api/users", userRoutes);

// Upload-Routen
app.use("/api/upload", uploadRoutes);

app.get("/", (req, res) => {
  res.send("API live");
});

// Health check endpoint for Render
app.get("/api/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    service: "ScooTeq Helpdesk Backend"
  });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`ScooTeq Helpdesk Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Start cleanup job for inactive users (every 5 minutes)
      setInterval(markInactiveUsersOffline, 5 * 60 * 1000);
    });
  })
  .catch((err) => {
    console.error("Database connection error:", err);
    process.exit(1);
  });
