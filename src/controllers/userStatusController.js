import { asyncHandler } from "../utils/asyncHandler.js";

export const createUserStatusController = ({ userService, logger }) => ({
  setUserOnline: asyncHandler(async (req, res) => {
    const userId = req.user.id || req.user._id;
    await userService.setUserOnline(userId);
    res.json({ message: "User status updated to online" });
  }),

  setUserOffline: asyncHandler(async (req, res) => {
    const userId = req.user.id || req.user._id;
    await userService.setUserOffline(userId);
    res.json({ message: "User status updated to offline" });
  }),

  updateUserActivity: asyncHandler(async (req, res) => {
    const userId = req.user.id || req.user._id;
    await userService.updateUserActivity(userId);
    res.json({ message: "User activity updated" });
  }),

  markInactiveUsersOffline: async () => {
    try {
      await userService.markInactiveUsersOffline();
      logger.info("Inactive users marked offline");
    } catch (error) {
      logger.error({ err: error }, "Error marking inactive users offline");
    }
  },
});
