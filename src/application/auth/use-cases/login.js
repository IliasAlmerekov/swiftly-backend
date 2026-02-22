import { issueTokenPair } from "../lib/issueTokenPair.js";
import { authInvalidError } from "../lib/errors.js";
import { assertPasswordHasherPort } from "../ports/PasswordHasherPort.js";
import { assertRefreshTokenRepoPort } from "../ports/RefreshTokenRepoPort.js";
import { assertTokenProviderPort } from "../ports/TokenProviderPort.js";
import { assertUserRepoPort } from "../ports/UserRepoPort.js";

export const createLoginUseCase = ({
  userRepo,
  refreshTokenRepo,
  passwordHasher,
  tokenProvider,
}) => {
  const userRepositoryPort = assertUserRepoPort(userRepo);
  const refreshTokenRepositoryPort = assertRefreshTokenRepoPort(refreshTokenRepo);
  const passwordHasherPort = assertPasswordHasherPort(passwordHasher);
  const tokenProviderPort = assertTokenProviderPort(tokenProvider);

  return async ({ email, password }) => {
    const user = await userRepositoryPort.findByEmail(email);
    if (!user) {
      throw authInvalidError("Invalid email or password");
    }

    const isMatch = await passwordHasherPort.compare(password, user.password);
    if (!isMatch) {
      throw authInvalidError("Invalid email or password");
    }

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
