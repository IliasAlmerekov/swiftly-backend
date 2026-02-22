class MongooseUserRepository {
  constructor({ User }) {
    if (!User) {
      throw new TypeError("User model is required");
    }
    this.User = User;
  }

  create(data) {
    return this.User.create(data);
  }

  findByEmail(email) {
    return this.User.findOne({ email });
  }

  findByIdWithoutPassword(userId) {
    return this.User.findById(userId).select("-password");
  }

  findAssignableAdmins() {
    return this.User.find({
      role: { $in: ["admin", "support1"] },
    }).select("name email _id role");
  }

  findSupportUsers() {
    return this.User.find({
      role: { $in: ["support1", "admin"] },
    }).select("name email role status avatar department lastSeen isOnline");
  }

  findSupportUserById(userId) {
    return this.User.findOne({
      _id: userId,
      role: { $in: ["support1", "admin"] },
    }).select("_id role");
  }

  findById(userId) {
    return this.User.findById(userId);
  }

  findByIdAndUpdate(userId, update, options = {}) {
    return this.User.findByIdAndUpdate(userId, update, options);
  }

  findAll() {
    return this.User.find();
  }

  updateMany(filter, update) {
    return this.User.updateMany(filter, update);
  }
}

export default MongooseUserRepository;
