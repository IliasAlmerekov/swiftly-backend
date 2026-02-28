import { assertPasswordHasherPort } from "../ports/PasswordHasherPort.js";
import { assertRefreshTokenRepoPort } from "../ports/RefreshTokenRepoPort.js";
import { assertTokenProviderPort } from "../ports/TokenProviderPort.js";
import { assertUserRepoPort } from "../ports/UserRepoPort.js";
import { issueTokenPair } from "../lib/issueTokenPair.js";

export const createRegisterUseCase = ({
  userRepo,
  refreshTokenRepo,
  passwordHasher,
  tokenProvider,
}) => {
  const userRepositoryPort = assertUserRepoPort(userRepo);
  const refreshTokenRepositoryPort =
    assertRefreshTokenRepoPort(refreshTokenRepo);
  const passwordHasherPort = assertPasswordHasherPort(passwordHasher);
  const tokenProviderPort = assertTokenProviderPort(tokenProvider);

  return async ({ email, password, name }) => {
    const hashedPassword = await passwordHasherPort.hash(password);

    const user = await userRepositoryPort.create({
      email,
      password: hashedPassword,
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
