const requireRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

const requireRoleOrSelf = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (roles.includes(req.user.role)) {
      return next();
    }
    const { userId } = req.params;
    if (userId && req.user._id && userId.toString() === req.user._id.toString()) {
      return next();
    }
    return res.status(403).json({ message: "Access denied" });
  };
};

export { requireRole, requireRoleOrSelf };
