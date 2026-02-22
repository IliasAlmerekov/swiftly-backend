import { assertPort } from "../../ports/assertPort.js";

const TOKEN_PROVIDER_METHODS = [
  "signAccessToken",
  "signRefreshToken",
  "verifyAccessToken",
  "verifyRefreshToken",
  "resolveTokenExpiryDate",
];

export const assertTokenProviderPort = tokenProvider =>
  assertPort("TokenProviderPort", tokenProvider, TOKEN_PROVIDER_METHODS);
