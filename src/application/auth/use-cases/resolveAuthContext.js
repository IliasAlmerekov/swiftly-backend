import { authInvalidError, authRequiredError } from "../lib/errors.js";
import { assertTokenProviderPort } from "../ports/TokenProviderPort.js";
import { assertUserRepoPort } from "../ports/UserRepoPort.js";

const isValidAccessPayload = decoded =>
  decoded && decoded.tokenType === "access" && decoded.id;

export const createResolveAuthContextUseCase = ({ userRepo, tokenProvider }) => {
  const userRepositoryPort = assertUserRepoPort(userRepo);
  const tokenProviderPort = assertTokenProviderPort(tokenProvider);

  return async ({ accessToken }) => {
    if (!accessToken) {
      throw authRequiredError("Not authorized");
    }

    let decoded;
    try {
      decoded = tokenProviderPort.verifyAccessToken(accessToken);
    } catch {
      throw authInvalidError("Not authorized");
    }

    if (!isValidAccessPayload(decoded)) {
      throw authInvalidError("Not authorized");
    }

    const user = await userRepositoryPort.findByIdWithoutPassword(decoded.id);
    if (!user) {
      throw authInvalidError("Not authorized");
    }

    return user;
  };
};
