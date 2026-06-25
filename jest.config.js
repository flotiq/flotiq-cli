import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  clearMocks: true,
  maxWorkers: 1,
  testRegex: "tests/.*\\.(spec|test)\\.[jt]s?x?",
  testTimeout: 30000,
  rootDir: __dirname,
  verbose: true,
};
