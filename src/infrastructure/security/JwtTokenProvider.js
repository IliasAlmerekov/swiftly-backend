import crypto from "crypto";
import jwt from "jsonwebtoken";
import { config } from "../../config/env.js";

const buildAccessPayload = user => ({
  id: user._id.toString(),
  role: user.role,
  email: user.email,
  name: user.name,
  tokenType: "access",
});

const buildRefreshPayload = user => ({
  id: user._id.toString(),
  tokenType: "refresh",
  jti: crypto.randomUUID(),
});

class JwtTokenProvider {
  signAccessToken(user) {
    return jwt.sign(buildAccessPayload(user), config.jwtSecret, {
      expiresIn: config.jwtExpires,
    });
  }

  signRefreshToken(user) {
    return jwt.sign(buildRefreshPayload(user), config.jwtRefreshSecret, {
      expiresIn: config.jwtRefreshExpires,
    });
  }

  verifyAccessToken(token) {
    return jwt.verify(token, config.jwtSecret);
  }

  verifyRefreshToken(token) {
    return jwt.verify(token, config.jwtRefreshSecret);
  }

  resolveTokenExpiryDate(token) {
    const decoded = jwt.decode(token);
    if (!decoded || typeof decoded !== "object" || !decoded.exp) {
      throw new Error("Invalid token expiration");
    }

    return new Date(decoded.exp * 1000);
  }
}

export default JwtTokenProvider;
