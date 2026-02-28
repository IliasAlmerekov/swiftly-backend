import { describe, expect, test } from "@jest/globals";
import {
  authEndpointPolicy,
  authModes,
  getAuthEndpointPolicy,
} from "../../src/config/authEndpointPolicy.js";

describe("authEndpointPolicy", () => {
  test("defines auth mode for each auth route", () => {
    expect(authEndpointPolicy["POST /register"].authMode).toBe(authModes.none);
    expect(authEndpointPolicy["POST /login"].authMode).toBe(authModes.none);
    expect(authEndpointPolicy["GET /csrf"].authMode).toBe(authModes.none);
    expect(authEndpointPolicy["POST /refresh"].authMode).toBe(authModes.none);
    expect(authEndpointPolicy["POST /logout"].authMode).toBe(
      authModes.required
    );
    expect(authEndpointPolicy["GET /me"].authMode).toBe(authModes.required);
    expect(authEndpointPolicy["GET /admins"].authMode).toBe(authModes.required);
  });

  test("resolves policies with case-insensitive method input", () => {
    expect(
      getAuthEndpointPolicy({ method: "post", path: "/refresh" }).authMode
    ).toBe(authModes.none);
    expect(
      getAuthEndpointPolicy({ method: "get", path: "/csrf" }).authMode
    ).toBe(authModes.none);
    expect(getAuthEndpointPolicy({ method: "get", path: "/me" }).authMode).toBe(
      authModes.required
    );
  });

  test("throws when endpoint is missing in registry", () => {
    expect(() =>
      getAuthEndpointPolicy({ method: "post", path: "/unknown" })
    ).toThrow("Auth endpoint policy is missing for: POST /unknown");
  });
});
