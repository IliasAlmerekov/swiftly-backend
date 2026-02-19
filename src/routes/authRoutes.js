import express from "express";
import {
  register,
  login,
  refresh,
  logout,
  getAdmins,
} from "../controllers/authController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", authMiddleware, logout);

// Route zum Abrufen aller Admin-User (für Ticket-Zuweisung)
router.get("/admins", authMiddleware, getAdmins);

export default router;
