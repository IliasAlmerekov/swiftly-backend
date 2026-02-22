import {
  authInvalidRefreshError,
  authRequiredError,
  badRequestError,
} from "../lib/errors.js";
import { assertRefreshTokenRepoPort } from "../ports/RefreshTokenRepoPort.js";
import { assertTokenProviderPort } from "../ports/TokenProviderPort.js";

const isValidOwnedRefreshPayload = (decoded, userId) =>
  decoded &&
  decoded.tokenType === "refresh" &&
  decoded.id &&
  decoded.id === String(userId);

export const createLogoutUseCase = ({ refreshTokenRepo, tokenProvider }) => {
  const refreshTokenRepositoryPort = assertRefreshTokenRepoPort(refreshTokenRepo);
  const tokenProviderPort = assertTokenProviderPort(tokenProvider);

  return async ({ user, refreshToken, allSessions }) => {
    if (!user) {
      throw authRequiredError("Not authenticated");
    }

    if (allSessions) {
      await refreshTokenRepositoryPort.revokeAllByUser(user._id);
      return { success: true, message: "Logged out from all sessions" };
    }

    if (!refreshToken) {
      throw badRequestError(
        "refreshToken is required unless allSessions=true",
        "AUTH_REFRESH_REQUIRED"
      );
    }

    let decoded;
    try {
      decoded = tokenProviderPort.verifyRefreshToken(refreshToken);
    } catch {
      throw authInvalidRefreshError("Invalid refresh token");
    }

    if (!isValidOwnedRefreshPayload(decoded, user._id)) {
      throw authInvalidRefreshError("Invalid refresh token");
    }

    const tokenDoc = await refreshTokenRepositoryPort.findActiveByUserAndToken(
      user._id,
      refreshToken
    );
    if (tokenDoc) {
      await refreshTokenRepositoryPort.revoke(tokenDoc);
    }

    return { success: true, message: "Logged out" };
  };
};
