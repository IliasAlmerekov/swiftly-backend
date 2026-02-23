class UserService {
  constructor({ userRepository }) {
    this.userRepository = userRepository;
  }

  async getSupportUsers() {
    const supports = await this.userRepository.findSupportUsers();
    const now = new Date();
    const inactivityThreshold = 5 * 60 * 1000;

    const updatedSupports = await Promise.all(
      supports.map(async support => {
        const lastSeen = new Date(support.lastSeen);
        if (isNaN(lastSeen.getTime())) {
          if (support.isOnline) {
            await this.userRepository.findByIdAndUpdate(support._id, {
              isOnline: false,
            });
            support.isOnline = false;
          }
          return support;
        }

        const isInactive = now - lastSeen > inactivityThreshold;
        if (support.isOnline && isInactive) {
          await this.userRepository.findByIdAndUpdate(support._id, {
            isOnline: false,
          });
          support.isOnline = false;
        }
        return support;
      })
    );

    const onlineSupports = updatedSupports.filter(
      support => support.isOnline
    ).length;
    const totalSupports = updatedSupports.length;

    return {
      users: updatedSupports,
      onlineCount: onlineSupports,
      totalCount: totalSupports,
    };
  }

  async getUserProfile(userId) {
    const user = await this.userRepository
      .findById(userId)
      .select("-password")
      .populate("manager", "name email avatar department position");
    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }
    return user;
  }

  async updateUserProfile(userId, updateData) {
    const allowedUpdates = [
      "name",
      "company",
      "department",
      "position",
      "manager",
      "country",
      "city",
      "address",
      "postalCode",
    ];
    const updates = Object.keys(updateData);
    const isValidOperation = updates.every(update =>
      allowedUpdates.includes(update)
    );

    if (!isValidOperation) {
      const error = new Error("Invalid fields for update");
      error.status = 400;
      throw error;
    }

    const user = await this.userRepository
      .findByIdAndUpdate(userId, updateData, { new: true, runValidators: true })
      .select("-password")
      .populate("manager", "name email avatar department position");

    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    return user;
  }

  async getUserById(userId) {
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      const error = new Error("Invalid user ID format");
      error.status = 400;
      throw error;
    }

    const user = await this.userRepository
      .findById(userId)
      .select("-password")
      .populate("manager", "name email avatar department position");

    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    return user;
  }

  async updateUserProfileById(requestingUser, userId, updateData) {
    if (requestingUser.role !== "admin") {
      const error = new Error("Access denied. Admin privileges required.");
      error.status = 403;
      throw error;
    }
    return this.updateUserProfile(userId, updateData);
  }

  async getAllUsers() {
    return this.userRepository.findAll().select("-password");
  }

  async setUserOnline(userId) {
    await this.userRepository.findByIdAndUpdate(userId, {
      isOnline: true,
      lastSeen: new Date(),
    });
  }

  async setUserOffline(userId) {
    await this.userRepository.findByIdAndUpdate(userId, {
      isOnline: false,
      lastSeen: new Date(),
    });
  }

  async updateUserActivity(userId) {
    await this.userRepository.findByIdAndUpdate(userId, {
      isOnline: true,
      lastSeen: new Date(),
    });
  }

  async markInactiveUsersOffline() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    await this.userRepository.updateMany(
      { isOnline: true, lastSeen: { $lt: fiveMinutesAgo } },
      { isOnline: false }
    );
  }

  async updateAvatar(userId, avatar) {
    return this.userRepository
      .findByIdAndUpdate(
        userId,
        {
          avatar: {
            public_id: avatar.publicId,
            url: avatar.url,
          },
        },
        { new: true }
      )
      .select("-password");
  }
}

export default UserService;
