import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import process from "process";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import authRoutes from "./routes/authRoutes.js";
import ticketRoutes from "./routes/ticketRoutes.js";
import solutionRoutes from "./routes/solutionRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import { markInactiveUsersOffline } from "./controllers/userStatusController.js";
import { errorHandler } from "./middlewares/errorHandler.js";

dotenv.config();

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length > 0) {
      return callback(null, allowedOrigins.includes(origin));
    }
    if (!isProduction) {
      const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
      return callback(null, isLocalhost);
    }
    return callback(new Error("Not allowed by CORS"));
  },
};

app.use(helmet({
  contentSecurityPolicy: false,
  hsts: isProduction
    ? { maxAge: 15552000, includeSubDomains: true, preload: true }
    : false,
}));
app.use(cors(corsOptions));
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

// Authentifizierungs-Routen
app.use("/api/auth", authLimiter, authRoutes);

// Ticket-Routen
app.use("/api/tickets", ticketRoutes);

// Solution-Routen
app.use("/api/solutions", solutionRoutes);

// AI-Routen
app.use("/api/ai", aiLimiter, aiRoutes);

// User-Routen
app.use("/api/users", userRoutes);

// Upload-Routen
app.use("/api/upload", uploadRoutes);

app.use(errorHandler);

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
