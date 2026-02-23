import { createBootstrap } from "./composition/index.js";
import logger from "./utils/logger.js";

const bootstrap = createBootstrap();
bootstrap.registerProcessHandlers();

bootstrap.start().catch(async error => {
  logger.error({ err: error }, "Startup failed");
  const code = await bootstrap.shutdown("startup", error);
  process.exit(code);
});

export default bootstrap.app;

