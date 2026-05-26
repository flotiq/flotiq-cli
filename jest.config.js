import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  clearMocks: true,
  testRegex: "tests/.*\\.(spec|test)\\.[jt]s?x?",
  rootDir: __dirname,
  verbose: true,
};
