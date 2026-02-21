import { assertPort } from "./assertPort.js";

const USER_REPOSITORY_METHODS = ["findSupportUserById"];

export const assertUserRepositoryPort = userRepository =>
  assertPort("UserRepositoryPort", userRepository, USER_REPOSITORY_METHODS);
