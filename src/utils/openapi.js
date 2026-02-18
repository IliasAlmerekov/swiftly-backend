import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const openApiPath = path.resolve(__dirname, "../../docs/openapi.json");

export const openApiSpec = JSON.parse(fs.readFileSync(openApiPath, "utf8"));
