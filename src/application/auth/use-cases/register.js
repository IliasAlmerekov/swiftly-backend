import { assertRefreshTokenRepoPort } from "../ports/RefreshTokenRepoPort.js";
import { assertTokenProviderPort } from "../ports/TokenProviderPort.js";
import { assertUserRepoPort } from "../ports/UserRepoPort.js";
import { issueTokenPair } from "../lib/issueTokenPair.js";

export const createRegisterUseCase = ({
  userRepo,
  refreshTokenRepo,
  tokenProvider,
}) => {
  const userRepositoryPort = assertUserRepoPort(userRepo);
  const refreshTokenRepositoryPort = assertRefreshTokenRepoPort(refreshTokenRepo);
  const tokenProviderPort = assertTokenProviderPort(tokenProvider);

  return async ({ email, password, name }) => {
    const user = await userRepositoryPort.create({
      email,
      password,
      name,
      role: "user",
    });

    const { accessToken, refreshToken } = await issueTokenPair({
      user,
      tokenProvider: tokenProviderPort,
      refreshTokenRepo: refreshTokenRepositoryPort,
    });

    return {
      userId: user._id,
      accessToken,
      refreshToken,
    };
  };
};
