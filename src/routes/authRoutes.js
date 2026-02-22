import express from "express";
import { createAuthController } from "../controllers/authController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import container from "../container.js";

const router = express.Router();
const authController = createAuthController(container);

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authMiddleware, authController.logout);

// Route zum Abrufen aller Admin-User (für Ticket-Zuweisung)
router.get("/admins", authMiddleware, authController.getAdmins);

export default router;
