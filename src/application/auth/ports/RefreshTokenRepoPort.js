import { assertPort } from "../../ports/assertPort.js";

const REFRESH_TOKEN_REPO_METHODS = [
  "create",
  "findActiveByUserAndToken",
  "revoke",
  "revokeAllByUser",
];

export const assertRefreshTokenRepoPort = refreshTokenRepo =>
  assertPort(
    "RefreshTokenRepoPort",
    refreshTokenRepo,
    REFRESH_TOKEN_REPO_METHODS
  );
