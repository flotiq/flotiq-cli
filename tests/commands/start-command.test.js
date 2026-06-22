import { jest } from "@jest/globals";

const inquirerPrompt = jest.fn();
const setup = jest.fn().mockResolvedValue(undefined);
const init = jest.fn().mockResolvedValue(undefined);
const develop = jest.fn().mockResolvedValue(undefined);
const importerHandler = jest.fn().mockResolvedValue(undefined);
const getFlotiqApi = jest.fn().mockReturnValue({ api: "mock" });

jest.unstable_mockModule("inquirer", () => ({
    default: {
        prompt: inquirerPrompt,
    },
}));

jest.unstable_mockModule("@flotiq/api", () => ({
    getFlotiqApi,
}));

jest.unstable_mockModule("../../src/start/projectSetup.js", () => ({
    default: {
        setup,
        init,
        develop,
    },
}));

jest.unstable_mockModule("../../commands/importer.js", () => ({
    importerCommand: {
        command: "import [directory] [flotiqApiKey]",
        describe: "Import content",
        builder: () => {},
        handler: () => {},
    },
    handler: importerHandler,
}));

jest.unstable_mockModule("../../commands/exporter.js", () => ({
    default: {
        command: "export [directory] [flotiqApiKey]",
        describe: "Export content",
        builder: () => {},
        handler: () => {},
    },
}));

jest.unstable_mockModule("../../src/purifier/command.js", () => ({
    default: {
        command: "purifier",
        describe: "Purge content",
        builder: () => {},
        handler: () => {},
    },
}));

jest.unstable_mockModule("../../src/sdk/sdk.js", () => ({
    default: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule("../../src/stats/stats.js", () => ({
    default: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule("flotiq-excel-migrator", () => ({
    exportXlsx: jest.fn().mockResolvedValue(undefined),
    importXlsx: jest.fn().mockResolvedValue(undefined),
}));

async function runCli(argv) {
    const originalArgv = process.argv;
    process.argv = ["node", "flotiq", ...argv];

    try {
        await import(`./../../src/command/command.js?test=${Date.now()}-${Math.random()}`);
        await new Promise((resolve) => setTimeout(resolve, 10));
    } finally {
        process.argv = originalArgv;
    }
}

describe("start CLI command", () => {
    const originalApiKey = process.env.FLOTIQ_API_KEY;
    const originalExit = process.exit;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.FLOTIQ_API_KEY = "";
        process.exit = originalExit;
        inquirerPrompt.mockResolvedValue({
            flotiqApiKey: "prompt-api-key",
            projectDirectory: "prompt-directory",
            url: "https://github.com/flotiq/flotiq-starter-gatsby",
        });
    });

    afterAll(() => {
        process.env.FLOTIQ_API_KEY = originalApiKey;
        process.exit = originalExit;
    });

    it("should start project with API key from environment", async () => {
        process.env.FLOTIQ_API_KEY = "env-api-key";
        const starterUrl = "https://github.com/flotiq/flotiq-starter-nextjs";

        await runCli(["start", "demo-app", starterUrl]);

        expect(setup).toHaveBeenCalledWith("demo-app", starterUrl, "nextjs");
        expect(init).toHaveBeenCalledWith("demo-app", "env-api-key", "nextjs");
        expect(develop).toHaveBeenCalledWith("demo-app", "nextjs");
        expect(importerHandler).toHaveBeenCalledWith({
            directory: "demo-app/.flotiq",
            flotiqApiKey: "env-api-key",
        });
    });

    it("should skip content import when --no-import is passed", async () => {
        const starterUrl = "https://github.com/flotiq/flotiq-starter-gatsby";

        await runCli([
            "start",
            "demo-gatsby",
            starterUrl,
            "argv-api-key",
            "gatsby",
            "--no-import",
        ]);

        expect(setup).toHaveBeenCalledWith("demo-gatsby", starterUrl, "gatsby");
        expect(init).toHaveBeenCalledWith("demo-gatsby", "argv-api-key", "gatsby");
        expect(develop).toHaveBeenCalledWith("demo-gatsby", "gatsby");
        expect(importerHandler).not.toHaveBeenCalled();
        expect(getFlotiqApi).not.toHaveBeenCalled();
    });

    it("should ask questions when required args are missing", async () => {
        await runCli(["start"]);

        expect(inquirerPrompt).toHaveBeenCalledTimes(1);
        expect(setup).toHaveBeenCalledWith(
            "prompt-directory",
            "https://github.com/flotiq/flotiq-starter-gatsby",
            "gatsby"
        );
        expect(init).toHaveBeenCalledWith("prompt-directory", "prompt-api-key", "gatsby");
        expect(develop).toHaveBeenCalledWith("prompt-directory", "gatsby");
        expect(importerHandler).toHaveBeenCalledWith({
            directory: "prompt-directory/.flotiq",
            flotiqApiKey: "prompt-api-key",
        });
    });

    it("should use provided api key when 4 positional args are passed", async () => {
        process.env.FLOTIQ_API_KEY = "env-api-key";
        const starterUrl = "https://github.com/flotiq/flotiq-starter-gatsby";

        await runCli(["start", "demo-positional", starterUrl, "argv-api-key"]);

        expect(setup).toHaveBeenCalledWith("demo-positional", starterUrl, "gatsby");
        expect(init).toHaveBeenCalledWith("demo-positional", "argv-api-key", "gatsby");
        expect(develop).toHaveBeenCalledWith("demo-positional", "gatsby");
        expect(importerHandler).toHaveBeenCalledWith({
            directory: "demo-positional/.flotiq",
            flotiqApiKey: "argv-api-key",
        });
    });

    it("should normalize framework from 5 positional args", async () => {
        await runCli([
            "start",
            "demo-framework",
            "https://github.com/flotiq/custom-starter",
            "argv-api-key",
            "--framework",
            "NeXtJs",
        ]);

        expect(setup).toHaveBeenCalledWith(
            "demo-framework",
            "https://github.com/flotiq/custom-starter",
            "nextjs"
        );
        expect(init).toHaveBeenCalledWith("demo-framework", "argv-api-key", "nextjs");
        expect(develop).toHaveBeenCalledWith("demo-framework", "nextjs");
    });

    it("should re-prompt for empty start answers", async () => {
        inquirerPrompt
            .mockResolvedValueOnce({
                flotiqApiKey: "",
                projectDirectory: "",
                url: "",
            })
            .mockResolvedValueOnce({ flotiqApiKey: "retry-api-key" })
            .mockResolvedValueOnce({ projectDirectory: "retry-directory" })
            .mockResolvedValueOnce({ url: "https://github.com/flotiq/flotiq-starter-nextjs" });

        await runCli(["start"]);

        expect(inquirerPrompt).toHaveBeenCalledTimes(4);
        expect(setup).toHaveBeenCalledWith(
            "retry-directory",
            "https://github.com/flotiq/flotiq-starter-nextjs",
            "nextjs"
        );
        expect(init).toHaveBeenCalledWith("retry-directory", "retry-api-key", "nextjs");
        expect(develop).toHaveBeenCalledWith("retry-directory", "nextjs");
    });


});
