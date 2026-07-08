import { jest } from "@jest/globals";

const logger = {
    info: jest.fn(),
    error: jest.fn(),
};

const fsMock = {
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    copyFileSync: jest.fn(),
    writeFile: jest.fn(),
};

const execMock = jest.fn((cmd, callback) => {
    callback(null, "ok", "");
    return {
        stderr: { on: jest.fn() },
        stdout: { on: jest.fn() },
    };
});

jest.unstable_mockModule("@flotiq/api/logger.js", () => ({
    default: logger,
}));

jest.unstable_mockModule("fs", () => ({
    default: fsMock,
}));

jest.unstable_mockModule("child_process", () => ({
    exec: execMock,
}));

const projectSetupModule = await import("../../src/start/projectSetup.js");
const { setup, init, develop } = projectSetupModule;

describe("project setup", () => {
    const originalExit = process.exit;

    beforeEach(() => {
        jest.clearAllMocks();
        process.exit = originalExit;
        fsMock.readFileSync.mockReturnValue("");
        fsMock.writeFile.mockImplementation((path, content, callback) => callback(null));
        execMock.mockImplementation((cmd, callback) => {
            callback(null, "ok", "");
            return {
                stderr: { on: jest.fn() },
                stdout: { on: jest.fn() },
            };
        });
    });

    afterAll(() => {
        process.exit = originalExit;
    });

    it("setup should clone nextjs starter", async () => {
        await setup("demo-next", "https://github.com/flotiq/next-starter", "nextjs");

        expect(execMock).toHaveBeenCalledWith(
            "git clone https://github.com/flotiq/next-starter.git demo-next",
            expect.any(Function)
        );
        expect(logger.info).toHaveBeenCalledWith("Starting Nextjs setup");
    });

    it("setup should clone gatsby starter", async () => {
        await setup("demo-gatsby", "https://github.com/flotiq/gatsby-starter", "gatsby");

        expect(execMock).toHaveBeenCalledWith(
            "git clone https://github.com/flotiq/gatsby-starter.git demo-gatsby",
            expect.any(Function)
        );
        expect(logger.info).toHaveBeenCalledWith("Starting Gatsby setup");
    });

    it("setup should exit for invalid framework", async () => {
        const processExitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
            throw new Error("process.exit:1");
        });

        await expect(setup("demo", "https://example.com/repo", "invalid")).rejects.toThrow(
            "process.exit:1"
        );

        expect(logger.error).toHaveBeenCalledWith("Invalid framework!");
        processExitSpy.mockRestore();
    });

    it("setup should exit when shell command fails", async () => {
        execMock.mockImplementationOnce((cmd, callback) => {
            callback(new Error("exec failed"), "", "");
            return {
                stderr: { on: jest.fn() },
                stdout: { on: jest.fn() },
            };
        });

        const processExitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
            throw new Error("process.exit:1");
        });

        await expect(setup("demo", "https://example.com/repo", "nextjs")).rejects.toThrow(
            "process.exit:1"
        );

        expect(logger.error).toHaveBeenCalled();
        processExitSpy.mockRestore();
    });

    it("init should prepare nextjs env file", async () => {
        fsMock.readFileSync.mockReturnValue("FLOTIQ_API_KEY=");

        await init("demo-next", "api-key", "nextjs");

        expect(fsMock.readFileSync).toHaveBeenCalledWith("demo-next/.env.dist", "utf-8");
        expect(fsMock.writeFileSync).toHaveBeenCalledWith("demo-next/.env.local", "FLOTIQ_API_KEY=api-key");
    });

    it("init should prepare gatsby env files from template", async () => {
        fsMock.readFileSync.mockReturnValue("GATSBY_FLOTIQ_API_KEY=");

        await init("demo-gatsby", "gatsby-key", "gatsby");

        expect(fsMock.copyFileSync).toHaveBeenCalledWith("demo-gatsby/.flotiq/.env.dist", "demo-gatsby/.env");
        expect(fsMock.copyFileSync).toHaveBeenCalledWith(
            "demo-gatsby/.flotiq/.env.dist",
            "demo-gatsby/.env.development"
        );
        expect(fsMock.writeFileSync).toHaveBeenCalledWith("demo-gatsby/.env", "GATSBY_FLOTIQ_API_KEY=gatsby-key");
        expect(fsMock.writeFileSync).toHaveBeenCalledWith(
            "demo-gatsby/.env.development",
            "GATSBY_FLOTIQ_API_KEY=gatsby-key"
        );
    });

    it("init should fallback to write files when template copy fails", async () => {
        fsMock.copyFileSync.mockImplementation(() => {
            throw new Error("template missing");
        });

        await init("demo-gatsby", "fallback-key", "gatsby");

        expect(fsMock.writeFile).toHaveBeenCalledWith(
            "demo-gatsby/.env",
            "GATSBY_FLOTIQ_API_KEY=fallback-key\n",
            expect.any(Function)
        );
        expect(fsMock.writeFile).toHaveBeenCalledWith(
            "demo-gatsby/.env.development",
            "GATSBY_FLOTIQ_API_KEY=fallback-key\n",
            expect.any(Function)
        );
    });

    it("init should log error for invalid framework", async () => {
        await init("demo", "key", "invalid");

        expect(logger.error).toHaveBeenCalledWith("Invalid framework!");
    });

    it("develop should run nextjs commands", async () => {
        await develop("demo-next", "nextjs");

        expect(execMock.mock.calls[0][0]).toBe("cd demo-next && yarn install");
        expect(execMock.mock.calls[1][0]).toBe("cd demo-next && yarn next dev");
    });

    it("develop should run gatsby commands", async () => {
        await develop("demo-gatsby", "gatsby");

        expect(execMock.mock.calls[0][0]).toBe("cd demo-gatsby && yarn install");
        expect(execMock.mock.calls[1][0]).toContain("cd demo-gatsby && ");
        expect(execMock.mock.calls[1][0]).toContain(" develop ");
    });

    it("develop should log error for invalid framework", async () => {
        await develop("demo", "invalid");

        expect(logger.error).toHaveBeenCalledWith("Invalid framework!");
    });
});
