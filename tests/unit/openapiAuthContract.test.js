import { describe, expect, test } from "@jest/globals";
import { readFile } from "node:fs/promises";

const OPENAPI_PATH = "docs/openapi.json";

const readOpenApi = async () => {
  const raw = await readFile(OPENAPI_PATH, "utf8");
  return JSON.parse(raw);
};

describe("openapi auth contract drift check", () => {
  test("keeps auth-critical paths documented", async () => {
    const spec = await readOpenApi();
    const { paths } = spec;

    expect(paths).toHaveProperty("/api/auth/csrf");
    expect(paths).toHaveProperty("/api/auth/register");
    expect(paths).toHaveProperty("/api/auth/login");
    expect(paths).toHaveProperty("/api/auth/refresh");
    expect(paths).toHaveProperty("/api/auth/logout");
    expect(paths).toHaveProperty("/api/auth/me");
    expect(paths).toHaveProperty("/api/auth/admins");

    expect(paths["/api/auth/csrf"]).toHaveProperty("get");
    expect(paths["/api/auth/register"]).toHaveProperty("post");
    expect(paths["/api/auth/login"]).toHaveProperty("post");
    expect(paths["/api/auth/refresh"]).toHaveProperty("post");
    expect(paths["/api/auth/logout"]).toHaveProperty("post");
    expect(paths["/api/auth/me"]).toHaveProperty("get");
    expect(paths["/api/auth/admins"]).toHaveProperty("get");
  });

  test("keeps cookie auth scheme and protected endpoint security mapping", async () => {
    const spec = await readOpenApi();
    const cookieAuth = spec.components?.securitySchemes?.cookieAuth;

    expect(cookieAuth).toMatchObject({
      type: "apiKey",
      in: "cookie",
    });

    expect(spec.paths["/api/auth/me"].get.security).toEqual([
      { cookieAuth: [] },
    ]);
    expect(spec.paths["/api/auth/admins"].get.security).toEqual([
      { cookieAuth: [] },
    ]);
    expect(spec.paths["/api/auth/logout"].post.security).toEqual([
      { cookieAuth: [] },
    ]);
  });
});
