import User from "../models/userModel.js";
import { validateDto } from "../validation/validateDto.js";
import {
  authLoginDto,
  authLogoutDto,
  authRefreshDto,
  authRegisterDto,
} from "../validation/schemas.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import {
  findActiveRefreshToken,
  issueTokenPair,
  revokeAllUserRefreshTokens,
  revokeRefreshToken,
  verifyRefreshToken,
} from "../services/tokenService.js";

const buildAuthPayload = ({ userId, accessToken, refreshToken }) => ({
  token: accessToken,
  accessToken,
  refreshToken,
  userId,
});

// Registrierung eines neuen Benutzers
// Gibt Access- und Refresh-Token zurück
export const register = asyncHandler(async (req, res) => {
  const { email, password, name } = validateDto(authRegisterDto, req.body);

  const newUser = await User.create({ email, password, name, role: "user" });
  const { accessToken, refreshToken } = await issueTokenPair(newUser);

  res.status(201).json(
    buildAuthPayload({
      userId: newUser._id,
      accessToken,
      refreshToken,
    })
  );
});

// Login eines Benutzers
// Gibt Access- und Refresh-Token zurück
export const login = asyncHandler(async (req, res) => {
  const { email, password } = validateDto(authLoginDto, req.body);

  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError("Invalid email or password", {
      statusCode: 401,
      code: "AUTH_INVALID",
    });
  }

  const isMatch = await user.correctPassword(password);
  if (!isMatch) {
    throw new AppError("Invalid email or password", {
      statusCode: 401,
      code: "AUTH_INVALID",
    });
  }

  const { accessToken, refreshToken } = await issueTokenPair(user);

  res.status(200).json(
    buildAuthPayload({
      userId: user._id,
      accessToken,
      refreshToken,
    })
  );
});

// Ротация refresh-токена и выпуск новой пары
export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = validateDto(authRefreshDto, req.body);

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError("Invalid refresh token", {
      statusCode: 401,
      code: "AUTH_INVALID_REFRESH",
    });
  }

  if (!decoded || decoded.tokenType !== "refresh" || !decoded.id) {
    throw new AppError("Invalid refresh token", {
      statusCode: 401,
      code: "AUTH_INVALID_REFRESH",
    });
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    throw new AppError("Invalid refresh token", {
      statusCode: 401,
      code: "AUTH_INVALID_REFRESH",
    });
  }

  const currentTokenDoc = await findActiveRefreshToken(user._id, refreshToken);
  if (!currentTokenDoc) {
    throw new AppError("Refresh token revoked or expired", {
      statusCode: 401,
      code: "AUTH_REFRESH_REVOKED",
    });
  }

  const { accessToken, refreshToken: nextRefreshToken } =
    await issueTokenPair(user);

  await revokeRefreshToken(currentTokenDoc, nextRefreshToken);

  res.status(200).json(
    buildAuthPayload({
      userId: user._id,
      accessToken,
      refreshToken: nextRefreshToken,
    })
  );
});

// Logout текущей или всех сессий
export const logout = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError("Not authenticated", {
      statusCode: 401,
      code: "AUTH_REQUIRED",
    });
  }

  const { refreshToken, allSessions } = validateDto(
    authLogoutDto,
    req.body || {}
  );

  if (allSessions) {
    await revokeAllUserRefreshTokens(req.user._id);
    return res
      .status(200)
      .json({ success: true, message: "Logged out from all sessions" });
  }

  if (!refreshToken) {
    throw new AppError("refreshToken is required unless allSessions=true", {
      statusCode: 400,
      code: "AUTH_REFRESH_REQUIRED",
    });
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError("Invalid refresh token", {
      statusCode: 401,
      code: "AUTH_INVALID_REFRESH",
    });
  }

  if (
    !decoded ||
    decoded.tokenType !== "refresh" ||
    decoded.id !== String(req.user._id)
  ) {
    throw new AppError("Invalid refresh token", {
      statusCode: 401,
      code: "AUTH_INVALID_REFRESH",
    });
  }

  const tokenDoc = await findActiveRefreshToken(req.user._id, refreshToken);
  if (tokenDoc) {
    await revokeRefreshToken(tokenDoc);
  }

  return res.status(200).json({ success: true, message: "Logged out" });
});

// Alle Admins abrufen (für Ticket-Zuweisung)
export const getAdmins = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError("Not authenticated", {
      statusCode: 401,
      code: "AUTH_REQUIRED",
    });
  }

  const admins = await User.find({
    role: { $in: ["admin", "support1"] },
  }).select("name email _id role");

  if (!admins || admins.length === 0) {
    return res.status(200).json([]);
  }

  return res.status(200).json(admins);
});
