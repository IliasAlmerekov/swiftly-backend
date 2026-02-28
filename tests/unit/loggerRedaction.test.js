import { loggerOptions } from "../../src/utils/logger.js";

describe("logger redaction", () => {
  test("redacts auth and csrf-sensitive headers", () => {
    expect(loggerOptions.redact).toMatchObject({
      remove: true,
    });
    expect(loggerOptions.redact.paths).toEqual(
      expect.arrayContaining([
        "req.headers.authorization",
        "req.headers.cookie",
        "req.headers.x-csrf-token",
      ])
    );
  });
});
