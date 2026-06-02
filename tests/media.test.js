import AxiosMockAdapter from "axios-mock-adapter";
import fs from "fs/promises";
import { jest } from "@jest/globals";
import FlotiqApi from "@flotiq/api";
import logger from "@flotiq/api/logger.js";
import { mediaImporter } from "./../src/media.js";

let mock;

describe('mediaImporter', () => {
    const mockDirectory = '/mock/directory';
    const mockApiUrl = 'https://dummy-api.flotiq.com';
    const mockApiKey = 'dummyApiKey';

    beforeEach(() => {
        jest.restoreAllMocks();
        jest.spyOn(logger, "info").mockImplementation(() => {});
        jest.spyOn(logger, "warn").mockImplementation(() => {});
        jest.spyOn(logger, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        if (mock) {
            mock.reset();
        }
    });

    it('should retry on 429 error during media upload', async () => {
        jest.spyOn(fs, "readFile").mockImplementation(async (filePath) => {
            if (String(filePath).includes('contentObjectMedia.json')) {
                return JSON.stringify([
                    {
                        id: 'file0',
                        url: '/image/0x0/dummy_media_id0.jpg',
                        mimeType: 'image/png',
                        extension: 'png',
                        fileName: 'file0.png',
                        type: 'image',
                    },
                ]);
            }
            return Buffer.from('dummy-media-data');
        });

        const flotiqApi = new FlotiqApi(`${mockApiUrl}/api/v1`,  mockApiKey, {
            batchSize: 100,
        });
        mock = new AxiosMockAdapter(flotiqApi.middleware);
        mock
            .onGet('/internal/contenttype?internal=0&limit=1000').reply(200, { data: [] })
            .onGet('/internal/contenttype?internal=1&limit=1000').reply(200, { data: [] })
            .onGet(`${mockApiUrl}/image/0x0/dummy_media_id0.jpg`).reply(404)
            .onPost(`${mockApiUrl}/api/media`).replyOnce(429)
            .onPost(`${mockApiUrl}/api/media`).replyOnce(429)
            .onPost(`${mockApiUrl}/api/media`).reply(200, {
                id: 'new-media-id'
            })
            .onDelete('/content/_media/file0').reply(200);

        await mediaImporter(mockDirectory, flotiqApi);

        expect(mock.history.post.length).toBe(3);
        expect(mock.history.post[1]._retryCount).toEqual(2);
    });

    it('should respect writePerSecondLimit and throttle uploads', async () => {
        jest.spyOn(fs, "readFile").mockImplementation(async (filePath) => {
            if (String(filePath).includes('contentObjectMedia.json')) {
                return JSON.stringify([
                    {
                        id: 'file0',
                        url: '/image/0x0/dummy_media_id0.jpg',
                        mimeType: 'image/png',
                        extension: 'png',
                        fileName: 'file0.png',
                        type: 'image',
                    },
                    {
                        id: 'file1',
                        url: '/image/0x0/dummy_media_id1.jpg',
                        mimeType: 'image/png',
                        extension: 'png',
                        fileName: 'file1.png',
                        type: 'image',
                    },
                ]);
            }
            return Buffer.from('dummy-media-data');
        });

        const flotiqApi = new FlotiqApi(`${mockApiUrl}/api/v1`,  mockApiKey, {
            batchSize: 100,
            writePerSecondLimit: 1,
        });
        mock = new AxiosMockAdapter(flotiqApi.middleware);
        mock
            .onGet('/internal/contenttype?internal=0&limit=1000').reply(200, { data: [] })
            .onGet('/internal/contenttype?internal=1&limit=1000').reply(200, { data: [] })
            .onGet(new RegExp(`${mockApiUrl}/image/.*`)).reply(404)
            .onPost(`${mockApiUrl}/api/media`).reply(200, {
                id: 'new-media-id'
            })
            .onDelete(new RegExp('/content/_media/.*')).reply(200);

        const start = Date.now();
        await mediaImporter(mockDirectory, flotiqApi);

        const end = Date.now();
        const elapsed = end - start;
        expect(mock.history.post.length).toBe(2);
        // With writePerSecondLimit=1, throttling applies to all API calls in this flow.
        expect(elapsed).toBeGreaterThanOrEqual(5000);
    }, 12000);
});
