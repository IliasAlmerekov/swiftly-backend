import { assertPort } from "../../ports/assertPort.js";

const USER_REPO_METHODS = [
  "create",
  "findByEmail",
  "findById",
  "findByIdWithoutPassword",
  "findAssignableAdmins",
];

export const assertUserRepoPort = userRepo =>
  assertPort("AuthUserRepoPort", userRepo, USER_REPO_METHODS);
