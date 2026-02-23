import express from "express";
import {
  requireRole,
  requireRoleOrSelf,
} from "../middlewares/roleMiddleware.js";

export const createUserRoutes = ({
  userController,
  userStatusController,
  authMiddleware,
}) => {
  const router = express.Router();

  router.get("/support", authMiddleware, userController.getUser);
  router.get("/profile", authMiddleware, userController.getUserProfile);

  router.put(
    "/status/online",
    authMiddleware,
    userStatusController.setUserOnline
  );
  router.put(
    "/status/offline",
    authMiddleware,
    userStatusController.setUserOffline
  );
  router.put(
    "/status/activity",
    authMiddleware,
    userStatusController.updateUserActivity
  );

  router.get(
    "/",
    authMiddleware,
    requireRole(["admin", "support1"]),
    userController.getAllUsers
  );

  router.get(
    "/:userId",
    authMiddleware,
    requireRoleOrSelf(["admin"]),
    userController.getUserById
  );

  router.put("/profile", authMiddleware, userController.updateUserProfile);

  router.put(
    "/:userId",
    authMiddleware,
    requireRole(["admin"]),
    userController.updateUserProfileById
  );

  return router;
};
