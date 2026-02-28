import {
  afterAll,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";

const originalEnv = { ...process.env };

const loadCsrfConfig = async () => {
  const mod = await import(
    `../../src/config/csrf.js?test=${Date.now()}-${Math.random()}`
  );
  return mod.csrfConfig;
};

describe("csrf config", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("uses safe local defaults outside production", async () => {
    const csrfConfig = await loadCsrfConfig();

    expect(csrfConfig.cookieOptions.sameSite).toBe("lax");
    expect(csrfConfig.cookieOptions.secure).toBe(false);
  });

  test("uses cross-site production defaults", async () => {
    process.env.NODE_ENV = "production";
    process.env.MONGO_URI = "mongodb://example.test:27017/app";
    process.env.JWT_SECRET = "prod-secret";
    process.env.JWT_REFRESH_SECRET = "prod-refresh-secret";
    process.env.CLOUDINARY_URL = "cloudinary://api:key@cloud";

    const csrfConfig = await loadCsrfConfig();

    expect(csrfConfig.cookieOptions.sameSite).toBe("none");
    expect(csrfConfig.cookieOptions.secure).toBe(true);
  });
});
