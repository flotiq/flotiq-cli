const fs = require('fs/promises');
const FlotiqApi = require('./../src/flotiq-api');
const { mediaImporter } = require('./../src/media');
const axios = require('axios');
const AxiosMockAdapter = require("axios-mock-adapter");

// This sets the mock adapter on the default instance
const mock = new AxiosMockAdapter(axios);

jest.mock('fs/promises');
jest.mock('./../src/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));

describe('mediaImporter', () => {
    const mockDirectory = '/mock/directory';
    const mockApiUrl = 'https://dummy-api.flotiq.com';
    const mockApiKey = 'dummyApiKey';
    
    function mockFileCount(count) {
        const files = new Array(count).fill(null).map((_, number) => ({
            id: `file${number}`,
            url: `/image/0x0/dummy_media_id${number}.jpg`,
            mimeType: 'image/png',
            extension: 'png',
            fileName: `file${number}.png`
        }));
        fs.readFile.mockResolvedValue(JSON.stringify(files));
    }

    beforeEach(() => {
        jest.clearAllMocks();
        mock.onGet(new RegExp(`${mockApiUrl}/api/v1/internal/contenttype.*`)).reply(200, {
            data: []
        });

        mock.onGet(new RegExp(`${mockApiUrl}/image/.*`)).reply(404);
    });

    afterEach(() => {
        mock.reset();
    });

    it('should retry on 429 error during media upload', async () => {
        mockFileCount(1);
        const url = new RegExp(`${mockApiUrl}/api/media`);
        mock
         .onPost(url).replyOnce(429)
         .onPost(url).replyOnce(429)
         .onPost(url).reply(200, {
             id: 'new-media-id'
         });
        
        const flotiqApi = new FlotiqApi(`${mockApiUrl}/api/v1`,  mockApiKey, {
            batchSize: 100,
        });
        await mediaImporter(mockDirectory, flotiqApi);

        expect(mock.history.post.length).toBe(3);
        expect(mock.history.post[1]._retryCount).toEqual(2);
    });

    it('should respect writePerSecondLimit and throttle uploads', async () => {
        mockFileCount(2); // one file would be instant, two files should trigger throttling
        const url = new RegExp(`${mockApiUrl}/api/media`);
        mock
         .onPost(url).reply(200, {
             id: 'new-media-id'
         });
        
        const flotiqApi = new FlotiqApi(`${mockApiUrl}/api/v1`,  mockApiKey, {
            batchSize: 100,
            writePerSecondLimit: 1,
        });
        const start = Date.now();
        await mediaImporter(mockDirectory, flotiqApi);

        const end = Date.now();
        const elapsed = end - start;
        expect(mock.history.post.length).toBe(2);
        // With writePerSecondLimit=1, throttling applies to all API calls in this flow.
        expect(elapsed).toBeGreaterThanOrEqual(5000);
    }, 12000);
});
