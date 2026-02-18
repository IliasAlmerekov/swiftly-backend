import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import { createUserController } from "../controllers/getUser.js";
import container from "../container.js";
import {
  setUserOnline,
  setUserOffline,
  updateUserActivity,
} from "../controllers/userStatusController.js";
import {
  requireRole,
  requireRoleOrSelf,
} from "../middlewares/roleMiddleware.js";

const router = express.Router();
const userController = createUserController(container);

// Get all support users with online status
router.get("/support", authMiddleware, userController.getUser);

// Get current user's profile
router.get("/profile", authMiddleware, userController.getUserProfile);

// Update user online status
router.put("/status/online", authMiddleware, setUserOnline);
router.put("/status/offline", authMiddleware, setUserOffline);
router.put("/status/activity", authMiddleware, updateUserActivity);

// Get all users (admin only); support1 gets own profile for legacy frontend usage
router.get(
  "/",
  authMiddleware,
  requireRole(["admin", "support1"]),
  userController.getAllUsers
);

// Get user profile by ID (admin only)
router.get(
  "/:userId",
  authMiddleware,
  requireRoleOrSelf(["admin"]),
  userController.getUserById
);

// Update user profile
router.put("/profile", authMiddleware, userController.updateUserProfile);

// Update user profile by ID (admin only)
router.put(
  "/:userId",
  authMiddleware,
  requireRole(["admin"]),
  userController.updateUserProfileById
);

export default router;
