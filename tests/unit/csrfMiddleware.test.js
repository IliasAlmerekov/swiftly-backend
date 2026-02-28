import express from "express";
import request from "supertest";
import { createCsrfProtectionMiddleware } from "../../src/middlewares/csrfMiddleware.js";
import { errorHandler } from "../../src/middlewares/errorHandler.js";

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use(createCsrfProtectionMiddleware());

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "OK" });
  });

  app.post("/api/write", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use(errorHandler);

  return app;
};

describe("csrf middleware", () => {
  test("issues csrf cookie on safe method", async () => {
    const app = createApp();
    const response = await request(app).get("/api/health").expect(200);

    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^(__Host-swiftly_helpdesk_csrf|swiftly_helpdesk_csrf)=/
        ),
      ])
    );
  });

  test("rejects state-changing request without csrf header", async () => {
    const app = createApp();
    const agent = request.agent(app);
    await agent.get("/api/health").expect(200);

    await agent
      .post("/api/write")
      .send({ hello: "world" })
      .expect(403)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          code: "CSRF_INVALID",
          message: "Invalid CSRF token",
        });
      });
  });

  test("rejects state-changing request with mismatched csrf token", async () => {
    const app = createApp();
    const agent = request.agent(app);
    await agent.get("/api/health").expect(200);

    await agent
      .post("/api/write")
      .set("X-CSRF-Token", "mismatched-token")
      .send({ hello: "world" })
      .expect(403)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          code: "CSRF_INVALID",
          message: "Invalid CSRF token",
        });
      });
  });

  test("allows state-changing request with matching csrf token", async () => {
    const app = createApp();
    const agent = request.agent(app);
    const csrfResponse = await agent.get("/api/health").expect(200);
    const csrfCookie = csrfResponse.headers["set-cookie"].find(cookie =>
      cookie.startsWith("__Host-swiftly_helpdesk_csrf=")
    );
    const fallbackCsrfCookie = csrfResponse.headers["set-cookie"].find(cookie =>
      cookie.startsWith("swiftly_helpdesk_csrf=")
    );
    const tokenCookie = csrfCookie || fallbackCsrfCookie;
    const csrfToken = tokenCookie.split(";")[0].split("=").slice(1).join("=");

    await agent
      .post("/api/write")
      .set("X-CSRF-Token", csrfToken)
      .send({ hello: "world" })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({ ok: true });
      });
  });
});
