import { jest } from "@jest/globals";

const inquirerPrompt = jest.fn();
const getFlotiqApi = jest.fn();
const purgeContentObjects = jest.fn();

jest.unstable_mockModule("inquirer", () => ({
    default: {
        prompt: inquirerPrompt,
    },
}));

jest.unstable_mockModule("@flotiq/api", () => ({
    getFlotiqApi,
}));

jest.unstable_mockModule("../../src/purifier/purifier.js", () => ({
    default: purgeContentObjects,
}));

const purgeApi = { name: "purge-api" };

const commandModule = await import("../../src/purifier/command.js");
const configModule = await import("../../src/configuration/config.js");

const { handler, resolveApiKey, resolvePurgeOptions } = commandModule;
const config = configModule.default;

describe("purifier command", () => {
    const originalApiKey = process.env.FLOTIQ_API_KEY;
    const originalExit = process.exit;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.FLOTIQ_API_KEY = "";
        getFlotiqApi.mockReturnValue(purgeApi);
        inquirerPrompt.mockResolvedValue({ confirmation: "Y" });
    });

    afterAll(() => {
        process.env.FLOTIQ_API_KEY = originalApiKey;
        process.exit = originalExit;
    });

    it("should resolve space purge options", () => {
        expect(resolvePurgeOptions({ spaceId: "space_1" })).toEqual({
            type: "space",
            spaceId: "space_1",
            ctdName: undefined,
            deleteSchema: false,
        });
    });

    it("should resolve ctd purge options with schema deletion", () => {
        expect(resolvePurgeOptions({ ctdName: "article", deleteSchema: true })).toEqual({
            type: "ctd",
            spaceId: undefined,
            ctdName: "article",
            deleteSchema: true,
        });
    });

    it("should reject missing purge target", () => {
        expect(() => resolvePurgeOptions({})).toThrow(
            "Choose purge target with --spaceId <spaceId> or --ctdName <ctdName>"
        );
    });

    it("should reject conflicting purge targets", () => {
        expect(() => resolvePurgeOptions({ spaceId: "space_1", ctdName: "article" })).toThrow(
            "Use only one purge target at a time: --spaceId or --ctdName"
        );
    });

    it("should reject deleteSchema for space purge", () => {
        expect(() => resolvePurgeOptions({ spaceId: "space_1", deleteSchema: true })).toThrow(
            "--deleteSchema can be used only with --ctdName"
        );
    });

    it("should resolve api key from argv first", () => {
        process.env.FLOTIQ_API_KEY = "env-api-key";

        expect(resolveApiKey({ flotiqApiKey: "argv-api-key" })).toBe("argv-api-key");
    });

    it("should resolve api key from environment", () => {
        process.env.FLOTIQ_API_KEY = "env-api-key";

        expect(resolveApiKey({})).toBe("env-api-key");
    });

    it("handler should call purifier for space purge", async () => {
        await handler({
            flotiqApiKey: "test-api-key",
            spaceId: "space_1",
            deleteSchema: false,
        });

        expect(getFlotiqApi).toHaveBeenCalledWith(`${config.apiUrl}/api/v1`, "test-api-key");
        expect(purgeContentObjects).toHaveBeenCalledWith(purgeApi, {
            type: "space",
            spaceId: "space_1",
            ctdName: undefined,
            deleteSchema: false,
        });
    });

    it("handler should call purifier for ctd purge with deleteSchema", async () => {
        await handler({
            flotiqApiKey: "test-api-key",
            ctdName: "article",
            deleteSchema: true,
        });

        expect(purgeContentObjects).toHaveBeenCalledWith(purgeApi, {
            type: "ctd",
            spaceId: undefined,
            ctdName: "article",
            deleteSchema: true,
        });
    });

    it("handler should throw when api key is missing", async () => {
        await expect(handler({ spaceId: "space_1" })).rejects.toThrow("Api key not found");
    });

    it("handler should stop when purge is not confirmed", async () => {
        const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
        inquirerPrompt.mockResolvedValue({ confirmation: "N" });
        process.exit = jest.fn(() => {
            throw new Error("process.exit:1");
        });

        await expect(handler({ flotiqApiKey: "test-api-key", spaceId: "space_1" })).rejects.toThrow(
            "process.exit:1"
        );

        expect(consoleLogSpy).toHaveBeenCalledWith("I'm finishing, no data has been deleted");
        expect(purgeContentObjects).not.toHaveBeenCalled();
        consoleLogSpy.mockRestore();
    });
});