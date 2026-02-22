import { issueTokenPair } from "../lib/issueTokenPair.js";
import {
  authInvalidRefreshError,
  authRefreshRevokedError,
} from "../lib/errors.js";
import { assertRefreshTokenRepoPort } from "../ports/RefreshTokenRepoPort.js";
import { assertTokenProviderPort } from "../ports/TokenProviderPort.js";
import { assertUserRepoPort } from "../ports/UserRepoPort.js";

const isValidRefreshPayload = decoded =>
  decoded && decoded.tokenType === "refresh" && decoded.id;

export const createRefreshUseCase = ({
  userRepo,
  refreshTokenRepo,
  tokenProvider,
}) => {
  const userRepositoryPort = assertUserRepoPort(userRepo);
  const refreshTokenRepositoryPort = assertRefreshTokenRepoPort(refreshTokenRepo);
  const tokenProviderPort = assertTokenProviderPort(tokenProvider);

  return async ({ refreshToken }) => {
    let decoded;
    try {
      decoded = tokenProviderPort.verifyRefreshToken(refreshToken);
    } catch {
      throw authInvalidRefreshError("Invalid refresh token");
    }

    if (!isValidRefreshPayload(decoded)) {
      throw authInvalidRefreshError("Invalid refresh token");
    }

    const user = await userRepositoryPort.findById(decoded.id);
    if (!user) {
      throw authInvalidRefreshError("Invalid refresh token");
    }

    const currentTokenDoc =
      await refreshTokenRepositoryPort.findActiveByUserAndToken(
        user._id,
        refreshToken
      );
    if (!currentTokenDoc) {
      throw authRefreshRevokedError("Refresh token revoked or expired");
    }

    const { accessToken, refreshToken: nextRefreshToken } = await issueTokenPair({
      user,
      tokenProvider: tokenProviderPort,
      refreshTokenRepo: refreshTokenRepositoryPort,
    });

    await refreshTokenRepositoryPort.revoke(currentTokenDoc, {
      replacedByToken: nextRefreshToken,
    });

    return {
      userId: user._id,
      accessToken,
      refreshToken: nextRefreshToken,
    };
  };
};
