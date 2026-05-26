import fs from "fs/promises";
import os from "os";
import path from "path";
import { jest } from "@jest/globals";
import { getFlotiqApi } from "@flotiq/api";
import logger from "@flotiq/api/src/logger.js";
import { exporter } from "./../../commands/exporter.js";

const flotiqApiUrl = "https://dummy-api.flotiq.com";
const flotiqApiKey = "dummyApiKey";

describe("exporter", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it("should handle empty content types using FlotiqApi", async () => {
        const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "flotiq-export-"));
        const directory = path.join(tmpDir, "export");
        await fs.mkdir(directory, { recursive: true });

        const writeFileSpy = jest.spyOn(fs, "writeFile");
        const loggerInfoSpy = jest.spyOn(logger, "info").mockImplementation(() => {});

        const flotiqApi = getFlotiqApi(flotiqApiUrl, flotiqApiKey, { batchSizeRead: 1000 });
        flotiqApi.fetchContentTypeDefs = jest.fn().mockResolvedValue([]);
        flotiqApi.fetchContentObjects = jest.fn().mockResolvedValue([]);
        flotiqApi.fetchMediaFile = jest.fn().mockResolvedValue(Buffer.from("dummy-media-data"));

        try {
            const result = await exporter(directory, flotiqApiUrl, flotiqApiKey, false, null, false);

            expect(writeFileSpy).not.toHaveBeenCalled();
            expect(loggerInfoSpy).toHaveBeenCalledWith("Nothing to do");
            expect(result).toEqual({
                exportedCtdCount: 0,
                exportedContentObjectsCount: 0,
            });
        } finally {
            await fs.rm(tmpDir, { recursive: true, force: true });
        }
    });

    it("should export content type definitions and content objects correctly", async () => {
        const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "flotiq-export-"));
        const directory = path.join(tmpDir, "export");
        await fs.mkdir(directory, { recursive: true });

        const mockContentTypeDefs = [
            { name: "testType", label: "Test Type", internal: false },
            { name: "_media", label: "Media", internal: true },
        ];
        const mockContentObjects = [
            { id: "1", name: "Test Object", internal: {} },
            { id: "2", name: "Another Object", internal: {} },
        ];
        const mockMediaObjects = [
            { id: "media1", url: "/media/test.jpg", extension: "jpg", internal: {} },
        ];

        jest.spyOn(logger, "info").mockImplementation(() => {});
        const flotiqApi = getFlotiqApi(flotiqApiUrl, flotiqApiKey, { batchSizeRead: 1000 });
        flotiqApi.fetchContentTypeDefs = jest.fn().mockResolvedValue(mockContentTypeDefs);
        flotiqApi.fetchContentObjects = jest
            .fn()
            .mockImplementation((type) =>
                type === "_media" ? mockMediaObjects : mockContentObjects
            );
        flotiqApi.fetchMediaFile = jest.fn().mockResolvedValue(Buffer.from("dummy-media-data"));

        try {
            const result = await exporter(directory, flotiqApiUrl, flotiqApiKey, false, null, false);

            expect(result).toEqual({
                exportedCtdCount: 2,
                exportedContentObjectsCount: 3,
            });

            await expect(
                fs.stat(path.join(directory, "ContentTypeTestType", "ContentTypeDefinition.json"))
            ).resolves.toBeDefined();
            await expect(
                fs.stat(path.join(directory, "InternalContentTypeMedia", "media1.jpg"))
            ).resolves.toBeDefined();
        } finally {
            await fs.rm(tmpDir, { recursive: true, force: true });
        }
    });
});
