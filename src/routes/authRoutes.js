import express from "express";

export const createAuthRoutes = ({ authController, authMiddleware }) => {
  const router = express.Router();

  router.post("/register", authController.register);
  router.post("/login", authController.login);
  router.post("/refresh", authController.refresh);
  router.post("/logout", authMiddleware, authController.logout);
  router.get("/me", authMiddleware, authController.me);
  router.get("/admins", authMiddleware, authController.getAdmins);

  return router;
};
