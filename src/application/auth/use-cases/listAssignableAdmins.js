import { authRequiredError } from "../lib/errors.js";
import { assertUserRepoPort } from "../ports/UserRepoPort.js";

export const createListAssignableAdminsUseCase = ({ userRepo }) => {
  const userRepositoryPort = assertUserRepoPort(userRepo);

  return async ({ user }) => {
    if (!user) {
      throw authRequiredError("Not authenticated");
    }

    return userRepositoryPort.findAssignableAdmins();
  };
};
