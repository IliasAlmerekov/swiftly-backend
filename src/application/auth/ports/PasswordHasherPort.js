import { assertPort } from "../../ports/assertPort.js";

const PASSWORD_HASHER_METHODS = ["hash", "compare"];

export const assertPasswordHasherPort = passwordHasher =>
  assertPort("PasswordHasherPort", passwordHasher, PASSWORD_HASHER_METHODS);
