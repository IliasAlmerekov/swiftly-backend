import { resolveDefaultAuthCookieNames } from "../../src/config/authCookies.js";

describe("authCookies defaults", () => {
  test("uses non-prefixed cookie names in development", () => {
    expect(resolveDefaultAuthCookieNames("development")).toEqual({
      accessToken: "swiftly_helpdesk_at",
      refreshToken: "swiftly_helpdesk_rt",
    });
  });

  test("uses __Host- prefixed cookie names outside development", () => {
    expect(resolveDefaultAuthCookieNames("test")).toEqual({
      accessToken: "__Host-swiftly_helpdesk_at",
      refreshToken: "__Host-swiftly_helpdesk_rt",
    });
    expect(resolveDefaultAuthCookieNames("production")).toEqual({
      accessToken: "__Host-swiftly_helpdesk_at",
      refreshToken: "__Host-swiftly_helpdesk_rt",
    });
  });
});
