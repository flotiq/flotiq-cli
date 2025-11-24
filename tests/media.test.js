const fs = require('fs/promises');
const FlotiqApi = require('./../src/flotiq-api');
const { mediaImporter } = require('./../src/media');
const axios = require('axios');
const { rateLimitInterceptor, throttleInterceptor } = require('./../src/util');
const AxiosMockAdapter = require("axios-mock-adapter");
const logger = require('./../src/logger');

// This sets the mock adapter on the default instance
const mock = new AxiosMockAdapter(axios);

jest.mock('fs/promises');
jest.mock('node-fetch');
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

        global.fetch = jest.fn(() =>
            Promise.resolve({
                status: 404, // fetch should return 404 for importer to send postMedia request
            })
        );
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
        flotiqApi.flotiqApiUrl = mockApiUrl;
        const mediaApi = axios.create({
            baseURL: `${mockApiUrl}/api/media`,
            timeout: flotiqApi.timeout,
            headers: flotiqApi.headers,
        });
        rateLimitInterceptor(mediaApi, logger, 1);

        await mediaImporter(mockDirectory, flotiqApi, mediaApi);

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
        });
        flotiqApi.flotiqApiUrl = mockApiUrl;
        const mediaApi = axios.create({
            baseURL: `${mockApiUrl}/api/media`,
            timeout: flotiqApi.timeout,
            headers: flotiqApi.headers,
        });
        rateLimitInterceptor(mediaApi, logger, 1);
        throttleInterceptor(mediaApi, 1000); // 1 request per second
        const start = Date.now();
        await mediaImporter(mockDirectory, flotiqApi, mediaApi);

        const end = Date.now();
        const elapsed = end - start;
        expect(mock.history.post.length).toBe(2);
        // Check that importer respected throttle limit
        expect(elapsed).toBeGreaterThanOrEqual(1000); // at least 1 second for 2 uploads
    });
});
