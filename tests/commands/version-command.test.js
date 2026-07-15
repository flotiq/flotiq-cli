import { execFileSync } from "child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliBinPath = path.resolve(__dirname, "../../bin/flotiq");
const cliPackageJsonPath = path.resolve(__dirname, "../../package.json");
const cliVersion = JSON.parse(readFileSync(cliPackageJsonPath, "utf8")).version;

function runVersionCommand(cwd) {
    return execFileSync(process.execPath, [cliBinPath, "--version"], {
        cwd,
        encoding: "utf8",
    }).trim();
}

describe("CLI version output", () => {
    let tempDir;

    afterEach(() => {
        if (tempDir) {
            rmSync(tempDir, { recursive: true, force: true });
            tempDir = undefined;
        }
    });

    it("should ignore package.json from the current working directory", () => {
        tempDir = mkdtempSync(path.join(tmpdir(), "flotiq-version-"));
        writeFileSync(
            path.join(tempDir, "package.json"),
            JSON.stringify({ name: "foreign-project", version: "4.57.2" })
        );

        expect(runVersionCommand(tempDir)).toBe(cliVersion);
    });

    it("should print installed CLI version when cwd has no package.json", () => {
        tempDir = mkdtempSync(path.join(tmpdir(), "flotiq-version-"));

        expect(runVersionCommand(tempDir)).toBe(cliVersion);
    });
});