import { createApp, getDefaultContainer } from "../src/composition/index.js";

const container = getDefaultContainer();
const app = createApp({
  container,
  disableRateLimiting: true,
  registerBeforeErrorHandlers: instance => {
    instance.get("/__test/error", (_req, _res, next) => {
      next(new Error("Test error"));
    });
  },
});

export default app;
