import User from '../models/userModel.js';

export const getUser = async (req, res) => {
    try {
        const supports = await User.find({
            role: { $in: ['admin'] }
        }).select('name email role status avatar department lastSeen isOnline');

        const now = new Date();
        const inactivityThreshold = 5 * 60 * 1000; // 5 minutes

        const updatedSupports = await Promise.all(supports.map(async (support) => {
            const lastSeen = new Date(support.lastSeen);
            if (isNaN(lastSeen.getTime())) {
                // Handle invalid date for lastSeen, maybe default to an old date
                console.error(`Invalid lastSeen date for user ${support._id}: ${support.lastSeen}`);
                // Assuming user is offline if lastSeen is invalid
                if (support.isOnline) {
                    await User.findByIdAndUpdate(support._id, { isOnline: false });
                    support.isOnline = false;
                }
                return support;
            }

            const isInactive = (now - lastSeen) > inactivityThreshold;
            if (support.isOnline && isInactive) {
                await User.findByIdAndUpdate(support._id, { isOnline: false });
                support.isOnline = false;
            }
            return support;
        }));

        const onlineSupports = updatedSupports.filter(support => support.isOnline).length;
        const totalSupports = updatedSupports.length;

        res.json({
            users: updatedSupports,
            onlineCount: onlineSupports,
            totalCount: totalSupports
        });
    } catch (error) {
        res.status(500).json({error: error.message});
    }
};

// Get current user's profile
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('manager', 'name email avatar department position');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    res.status(500).json({
      message: "Error fetching user profile",
      error: error.message,
    });
  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const allowedUpdates = ['name', 'company', 'department', 'position', 'manager', 'country', 'city', 'address', 'postalCode'];
    const updates = Object.keys(req.body);
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: "Invalid fields for update" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password').populate('manager', 'name email avatar department position');

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error in updateUserProfile:", error);
    res.status(400).json({
      message: "Error updating profile",
      error: error.message,
    });
  }
};

// Get user profile by ID (admin only)
export const getUserById = async (req, res) => {
  try {

    const { userId } = req.params;
    
    // Validate userId format (assuming MongoDB ObjectId)
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        message: "Invalid user ID format" 
      });
    }

    const user = await User.findById(userId)
      .select('-password')
      .populate('manager', 'name email avatar department position');
    
    if (!user) {
      return res.status(404).json({ 
        message: "User not found" 
      });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error in getUserById:", error);
    res.status(500).json({
      message: "Error fetching user profile",
      error: error.message,
    });
  }
};

// Update user profile by ID (admin only)
export const updateUserProfileById = async (req, res) => {
  try {
    // Check if the requesting user is an admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: "Access denied. Admin privileges required." 
      });
    }

    const { userId } = req.params;
    
    // Validate userId format (assuming MongoDB ObjectId)
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        message: "Invalid user ID format" 
      });
    }

    const allowedUpdates = ['name', 'company', 'department', 'position', 'manager', 'country', 'city', 'address', 'postalCode'];
    const updates = Object.keys(req.body);
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({ message: "Invalid fields for update" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      req.body,
      { new: true, runValidators: true }
    ).select('-password').populate('manager', 'name email avatar department position');

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error in updateUserProfileById:", error);
    res.status(400).json({
      message: "Error updating profile",
      error: error.message,
    });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    res.status(500).json({
      message: "Error fetching users",
      error: error.message,
    });
  }
};