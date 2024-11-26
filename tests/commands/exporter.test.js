const fs = require("fs/promises");
const fetch = require("node-fetch");
const FlotiqApi = require("./../../src/flotiq-api");
const logger = require("./../../src/logger");
const { exporter } = require("./../../commands/exporter");

jest.mock("fs/promises");
jest.mock("node-fetch");
jest.mock("./../../src/flotiq-api", () => {
    return jest.fn().mockImplementation(() => ({
        fetchContentType: jest.fn().mockResolvedValue([]), // Dodaj tę metodę!
        fetchContentTypeDefs: jest.fn().mockResolvedValue([]),
        fetchContentObjects: jest.fn(),
    }));
});
jest.mock("./../../src/logger");

const directory = "/tmp/export-dir";
const flotiqApiUrl = "https://dummy-api.flotiq.com";
const flotiqApiKey = "dummyApiKey";

describe("exporter", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should handle empty content types using FlotiqApi", async () => {
        FlotiqApi.mockImplementation(() => ({
            fetchContentType: jest.fn().mockResolvedValue([]),
            fetchContentTypeDefs: jest.fn().mockResolvedValue([]),
            fetchContentObjects: jest.fn().mockResolvedValue([]),
        }));

        fs.lstat.mockResolvedValue({ isDirectory: () => true });
        fs.readdir.mockResolvedValue([]);
        fs.mkdir.mockResolvedValue();

        await exporter(directory, flotiqApiUrl, flotiqApiKey, false, null);

        expect(fs.writeFile).not.toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalledWith("Nothing to do");
    });

    it("should export content type definitions and content objects correctly", async () => {
        const mockContentTypeDefs = [
            { name: "testType", label: "Test Type", internal: false },
            { name: "_media", label: "Media", internal: true },
        ];
        const mockContentObjects = [
            { id: "1", name: "Test Object" },
            { id: "2", name: "Another Object" },
        ];
        const mockMediaObjects = [
            { id: "media1", url: "/media/test.jpg", extension: "jpg" },
        ];

        FlotiqApi.mockImplementation(() => ({
            fetchContentType: jest.fn().mockResolvedValue(mockContentTypeDefs),
            fetchContentTypeDefs: jest.fn().mockResolvedValue(mockContentTypeDefs),
            fetchContentObjects: jest
                .fn()
                .mockImplementation((type) =>
                    type === "_media" ? mockMediaObjects : mockContentObjects
                ),
        }));

        fs.lstat.mockResolvedValue({ isDirectory: () => true });
        fs.readdir.mockResolvedValue([]);
        fs.mkdir.mockResolvedValue();
        fs.writeFile.mockResolvedValue();

        fetch.mockResolvedValue({
            arrayBuffer: jest.fn().mockResolvedValue(Buffer.from("dummy-media-data")),
        });

        await exporter(directory, flotiqApiUrl, flotiqApiKey, false, null);

        expect(fs.mkdir).toHaveBeenCalled();
        expect(fs.writeFile).toHaveBeenCalled();
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/media/test.jpg"));
    });
});