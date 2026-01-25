import User from "../models/userModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Set user online status
export const setUserOnline = asyncHandler(async (req, res) => {
  const userId = req.user.id; // From auth middleware

  await User.findByIdAndUpdate(userId, {
    isOnline: true,
    lastSeen: new Date(),
  });

  res.json({ message: "User status updated to online" });
});

// Set user offline status
export const setUserOffline = asyncHandler(async (req, res) => {
  const userId = req.user.id; // From auth middleware

  await User.findByIdAndUpdate(userId, {
    isOnline: false,
    lastSeen: new Date(),
  });

  res.json({ message: "User status updated to offline" });
});

// Update user activity (heartbeat)
export const updateUserActivity = asyncHandler(async (req, res) => {
  const userId = req.user.id; // From auth middleware

  await User.findByIdAndUpdate(userId, {
    isOnline: true,
    lastSeen: new Date(),
  });

  res.json({ message: "User activity updated" });
});

// Utility function to mark users offline if they haven't been seen for a while
export const markInactiveUsersOffline = async () => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

    await User.updateMany(
      {
        isOnline: true,
        lastSeen: { $lt: fiveMinutesAgo },
      },
      {
        isOnline: false,
      }
    );

    console.log("Inactive users marked offline");
  } catch (error) {
    console.error("Error marking inactive users offline:", error);
  }
};
