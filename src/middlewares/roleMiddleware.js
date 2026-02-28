import { AppError } from "../utils/AppError.js";

const FORBIDDEN = () =>
  new AppError("Access denied", { statusCode: 403, code: "FORBIDDEN" });

const requireRole = (roles = []) => {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(FORBIDDEN());
    }
    next();
  };
};

const requireRoleOrSelf = (roles = []) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(FORBIDDEN());
    }
    if (roles.includes(req.user.role)) {
      return next();
    }
    const { userId } = req.params;
    if (
      userId &&
      req.user._id &&
      userId.toString() === req.user._id.toString()
    ) {
      return next();
    }
    return next(FORBIDDEN());
  };
};

export { requireRole, requireRoleOrSelf };
