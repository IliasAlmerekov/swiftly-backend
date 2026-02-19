import User from "../models/userModel.js";
import { AppError } from "../utils/AppError.js";
import { verifyAccessToken } from "../services/tokenService.js";

// Middleware zur Authentifizierung des Benutzers
// Prüft das Access-Token und fügt die User-Info zu req.user hinzu
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(
        new AppError("Not authorized", {
          statusCode: 401,
          code: "AUTH_REQUIRED",
        })
      );
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    if (!decoded || decoded.tokenType !== "access") {
      return next(
        new AppError("Not authorized", {
          statusCode: 401,
          code: "AUTH_INVALID",
        })
      );
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return next(
        new AppError("Not authorized", {
          statusCode: 401,
          code: "AUTH_INVALID",
        })
      );
    }

    req.user = user;
    return next();
  } catch {
    return next(
      new AppError("Not authorized", {
        statusCode: 401,
        code: "AUTH_INVALID",
      })
    );
  }
};

export default authMiddleware;

