const fs = require('fs/promises');
const fetch = require('node-fetch');
const axios = require('axios');
const logger = require('./../src/logger');
const FlotiqApi = require('./../src/flotiq-api');
const { mediaImporter } = require('./../src/media');

jest.mock('axios');
jest.mock('fs/promises');
jest.mock('node-fetch');
jest.mock('./../src/flotiq-api');
jest.mock('./../src/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));

describe('mediaImporter', () => {
    const mockDirectory = '/mock/directory';
    const mockApiUrl = 'https://dummy-api.flotiq.com';
    const mockApiKey = 'dummyApiKey';

    beforeEach(() => {
        jest.clearAllMocks();

        FlotiqApi.mockImplementation(() => ({
            fetchContentTypeDefinition: jest.fn().mockResolvedValue([]),
            fetchContentTypeDefs: jest.fn().mockResolvedValue([]),
            updateContentTypeDefinition: jest.fn(),
            fetchContentObjects: jest.fn().mockResolvedValue([]),
            patchContentObjectBatch: jest.fn(),
            persistContentObjectBatch: jest.fn(),
            createOrUpdate: jest.fn().mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({success:true})
            }),
            middleware: {
                put: jest.fn(),
                delete: jest.fn().mockResolvedValue(undefined)
            }
        }));

        global.fetch = jest.fn(() =>
            Promise.resolve({
                status: 404, // fetch should return 404 for importer to send postMedia request
            })
        );
    
        // Mock fs.readFile
        fs.readFile.mockResolvedValue(
            JSON.stringify([
                {
                    id: 'file1',
                    url: '/image/0x0/dummy_media_id.jpg',
                    mimeType: 'image/png',
                    extension: 'png',
                    fileName: 'file1.png'
                }
            ])
        );
    });



    it('should retry on 429 error during media upload', async () => {
        const flotiqApi = new FlotiqApi(`${mockApiUrl}/api/v1`,  mockApiKey, {
            batchSize: 100,
        });
        flotiqApi.flotiqApiUrl = mockApiUrl;

        const mockMediaApi = {
            post: jest.fn()
                .mockRejectedValueOnce({
                    response: { 
                        status: 429, 
                        message: 'Too Many Requests' 
                    }
                })
                .mockResolvedValueOnce({
                    data: { id: 'new-media-id' }
                })
        };

        await mediaImporter(mockDirectory, flotiqApi, mockMediaApi, 1);

        expect(mockMediaApi.post).toHaveBeenCalledTimes(2);
    });

    it('should respect internalWpsLimit and throttle uploads', async () => {
        const flotiqApi = new FlotiqApi(`${mockApiUrl}/api/v1`,  mockApiKey, {
            batchSize: 100,
        });
        flotiqApi.flotiqApiUrl = mockApiUrl;

        const mockMediaApi = {
            post: jest.fn()
                .mockResolvedValueOnce({
                    data: { id: 'new-media-id' }
                })
        };

        const start = Date.now();
        await mediaImporter(mockDirectory, flotiqApi, mockMediaApi, 1); // internalWpsLimit = 1

        const end = Date.now();
        const elapsed = end - start;

        expect(mockMediaApi.post).toHaveBeenCalledTimes(1);
        // Check that importer respected throttle limit
        expect(elapsed).toBeGreaterThanOrEqual(1000); // at least 1 second
    });
});
