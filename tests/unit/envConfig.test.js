import { afterAll, beforeEach, describe, expect, jest, test } from "@jest/globals";

const originalEnv = { ...process.env };

const loadConfig = async () => {
  const mod = await import(`../../src/config/env.js?test=${Date.now()}-${Math.random()}`);
  return mod.config;
};

describe("config auth defaults", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, NODE_ENV: "test" };
    delete process.env.AUTH_LEGACY_TOKEN_BODY;
    delete process.env.AUTH_LEGACY_BEARER_AUTH;
    delete process.env.AUTH_LEGACY_REFRESH_BODY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("does not expose removed legacy auth flags", async () => {
    const config = await loadConfig();

    expect(config).not.toHaveProperty("legacyTokenBody");
    expect(config).not.toHaveProperty("legacyBearerAuth");
    expect(config).not.toHaveProperty("legacyRefreshBody");
  });

  test("ignores removed legacy env vars when provided", async () => {
    process.env.AUTH_LEGACY_TOKEN_BODY = "false";
    process.env.AUTH_LEGACY_BEARER_AUTH = "true";
    process.env.AUTH_LEGACY_REFRESH_BODY = "true";

    const config = await loadConfig();

    expect(config).not.toHaveProperty("legacyTokenBody");
    expect(config).not.toHaveProperty("legacyBearerAuth");
    expect(config).not.toHaveProperty("legacyRefreshBody");
  });
});
