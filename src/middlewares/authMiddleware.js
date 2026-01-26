import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { AppError } from "../utils/AppError.js";
import { config } from "../config/env.js";

// Middleware zur Authentifizierung des Benutzers
// Prüft das JWT-Token und fügt die User-Info zu req.user hinzu
const authMiddleware = async (req, res, next) => {
  try {
    // Token aus dem Header holen
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(
        new AppError("Not authorized", {
          statusCode: 401,
          code: "AUTH_REQUIRED"
        })
      );
    }
    const token = authHeader.split(" ")[1];

    // Token verifizieren
    const decoded = jwt.verify(token, config.jwtSecret);

    // User aus der Datenbank holen
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return next(
        new AppError("Not authorized", {
          statusCode: 401,
          code: "AUTH_INVALID"
        })
      );
    }

    // User-Info an die Anfrage anhängen
    req.user = user;
    next();
  } catch {
    next(
      new AppError("Not authorized", {
        statusCode: 401,
        code: "AUTH_INVALID"
      })
    );
  }
};

export default authMiddleware;
