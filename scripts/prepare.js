const isCi = process.env.CI === "true";
const isProduction = process.env.NODE_ENV === "production";
const isRender = process.env.RENDER === "true";

if (isCi || isProduction || isRender) {
  process.exit(0);
}

try {
  const { default: husky } = await import("husky");
  husky();
} catch (error) {
  const message = error?.message ?? "";
  const isMissingHusky =
    error?.code === "ERR_MODULE_NOT_FOUND" ||
    message.includes("Cannot find package 'husky'");

  if (isMissingHusky) {
    process.exit(0);
  }

  throw error;
}
