import { asyncHandler } from "../utils/asyncHandler.js";

export const createCloudUploadController = ({ userService, fileStorage }) => ({
  uploadAvatar: asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      const uploadedAvatar = await fileStorage.uploadUserAvatar(req.file.path);
      const userId = req.user.id || req.user._id;
      const user = await userService.updateAvatar(userId, uploadedAvatar);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(200).json({
        success: true,
        message: "Avatar uploaded successfully",
        user,
      });
    } finally {
      await fileStorage.removeTemporaryFile(req.file.path);
    }
  }),
});
