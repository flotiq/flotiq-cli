import { jest } from "@jest/globals";

const exportXlsx = jest.fn().mockResolvedValue(undefined);
const importXlsx = jest.fn().mockResolvedValue(undefined);
const inquirerPrompt = jest.fn().mockResolvedValue({
    flotiqApiKey: "prompt-api-key",
    ctdName: "prompt-ctd",
    filePath: "/tmp/prompt.xlsx",
});

jest.unstable_mockModule("flotiq-excel-migrator", () => ({
    exportXlsx,
    importXlsx,
}));

jest.unstable_mockModule("inquirer", () => ({
    default: {
        prompt: inquirerPrompt,
    },
}));

async function runCli(argv) {
    const originalArgv = process.argv;
    process.argv = ["node", "flotiq", ...argv];

    try {
        await import(`./../../src/command/command.js?test=${Date.now()}-${Math.random()}`);
        await new Promise((resolve) => setTimeout(resolve, 0));
    } finally {
        process.argv = originalArgv;
    }
}

describe("excel CLI commands", () => {
    const originalApiKey = process.env.FLOTIQ_API_KEY;

    beforeEach(() => {
        exportXlsx.mockClear();
        importXlsx.mockClear();
        inquirerPrompt.mockClear();
        process.env.FLOTIQ_API_KEY = "";
    });

    afterAll(() => {
        process.env.FLOTIQ_API_KEY = originalApiKey;
    });

    it("excel-export should call exportXlsx for positional arguments", async () => {
        await runCli(["excel-export", "product", "/tmp/export.xlsx", "test-api-key"]);

        expect(exportXlsx).toHaveBeenCalledTimes(1);
        expect(importXlsx).not.toHaveBeenCalled();
    });

    it("excel-import should call importXlsx for positional arguments", async () => {
        await runCli(["excel-import", "product", "/tmp/import.xlsx", "test-api-key"]);

        expect(importXlsx).toHaveBeenCalledTimes(1);
    });
});
