import express from "express";
import upload from "../middlewares/uploadMiddleware.js";

export const createUploadRoutes = ({
  cloudUploadController,
  authMiddleware,
}) => {
  const router = express.Router();

  router.post(
    "/avatar",
    authMiddleware,
    upload.single("avatar"),
    cloudUploadController.uploadAvatar
  );

  return router;
};
