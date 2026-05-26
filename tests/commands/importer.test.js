import fs from "fs/promises";
import os from "os";
import path from "path";
import { jest } from "@jest/globals";
import logger from "@flotiq/api/src/logger.js";
import { importer } from "./../../commands/importer.js";

describe("importer", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
        jest.spyOn(logger, "info").mockImplementation(() => {});
        jest.spyOn(logger, "warn").mockImplementation(() => {});
        jest.spyOn(logger, "error").mockImplementation(() => {});
    });

    it("should complete successfully with valid inputs", async () => {
        const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "flotiq-import-"));
        const ctdDir = path.join(tmpDir, "ContentTypeMockContentType");
        await fs.mkdir(ctdDir, { recursive: true });

        await fs.writeFile(
            path.join(ctdDir, "ContentTypeDefinition.json"),
            JSON.stringify({
                name: "mockContentType",
                label: "Mock",
                internal: false,
            })
        );
        await fs.writeFile(
            path.join(ctdDir, "contentObjectMockContentType.json"),
            `${JSON.stringify({ id: "1", internal: { contentType: "mockContentType" } })}\n`
        );

        const flotiqApi = {
            fetchContentTypeDefinition: jest.fn().mockResolvedValue(undefined),
            fetchContentTypeDefs: jest.fn().mockResolvedValue([
                { name: "mockContentType", label: "Mock", internal: false, featuredImage: [] },
            ]),
            updateContentTypeDefinition: jest.fn().mockResolvedValue({ status: 200 }),
            fetchContentObjects: jest.fn().mockResolvedValue([]),
            patchContentObjectBatch: jest.fn(),
            persistContentObjectBatch: jest.fn().mockResolvedValue(undefined),
            createOrUpdate: jest.fn().mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({ id: "ctd-1" }),
            }),
            checkIfClear: jest.fn().mockResolvedValue(true),
            publishContentObject: jest.fn(),
        };

        try {
            const result = await importer(
                tmpDir,
                flotiqApi,
                false,
                false,
                true,
                false,
                false
            );

            expect(result).toEqual([
                [{ ctdName: "mockContentType", featuredImage: undefined }],
                [{ name: "mockContentType", label: "Mock", internal: false, featuredImage: [] }],
                [],
                {
                    importedCtdCount: 1,
                    importedContentObjectsCount: 1,
                },
            ]);
            expect(flotiqApi.createOrUpdate).toHaveBeenCalledTimes(1);
            expect(flotiqApi.persistContentObjectBatch).toHaveBeenCalledTimes(2);
        } finally {
            await fs.rm(tmpDir, { recursive: true, force: true });
        }
    });
});
