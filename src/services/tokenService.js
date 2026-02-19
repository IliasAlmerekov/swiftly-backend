import crypto from "crypto";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import RefreshToken from "../models/refreshTokenModel.js";

const resolveTokenExpiryDate = token => {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded !== "object" || !decoded.exp) {
    throw new Error("Invalid token expiration");
  }
  return new Date(decoded.exp * 1000);
};

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

export const signAccessToken = user =>
  jwt.sign(buildAccessPayload(user), config.jwtSecret, {
    expiresIn: config.jwtExpires,
  });

export const signRefreshToken = user =>
  jwt.sign(buildRefreshPayload(user), config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpires,
  });

export const issueTokenPair = async user => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const tokenHash = RefreshToken.hashToken(refreshToken);

  await RefreshToken.create({
    user: user._id,
    tokenHash,
    expiresAt: resolveTokenExpiryDate(refreshToken),
  });

  return { accessToken, refreshToken };
};

export const verifyAccessToken = token => jwt.verify(token, config.jwtSecret);

export const verifyRefreshToken = token =>
  jwt.verify(token, config.jwtRefreshSecret);

export const findActiveRefreshToken = async (userId, refreshToken) => {
  const tokenHash = RefreshToken.hashToken(refreshToken);
  return RefreshToken.findOne({
    user: userId,
    tokenHash,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });
};

export const revokeRefreshToken = async (tokenDoc, replacedByToken = null) => {
  if (!tokenDoc || tokenDoc.revokedAt) return;

  tokenDoc.revokedAt = new Date();
  tokenDoc.replacedByTokenHash = replacedByToken
    ? RefreshToken.hashToken(replacedByToken)
    : null;

  await tokenDoc.save();
};

export const revokeAllUserRefreshTokens = async userId => {
  await RefreshToken.updateMany(
    { user: userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
};
