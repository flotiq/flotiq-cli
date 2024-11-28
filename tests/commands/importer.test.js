const fs = require('fs/promises');
const glob = require('glob');
const fetch = require('node-fetch');
const FlotiqApi = require('./../../src/flotiq-api');
const { importer } = require('./../../commands/importer');

jest.mock('fs/promises');
jest.mock('glob', () => jest.fn());
jest.mock('node-fetch');
jest.mock('./../../src/flotiq-api');
jest.mock('./../../src/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));

describe('importer', () => {
    const mockDirectory = '/mock/directory';
    const mockApiUrl = 'https://dummy-api.flotiq.com';
    const mockApiKey = 'dummyApiKey';

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();

        // Mock glob
        glob.mockImplementation((pattern, callback) => {
            callback(null, [`${mockDirectory}/ContentTypeDefinition.json`]);
        });

        fs.stat.mockResolvedValue(true);

        // Mock fs.readFile
        fs.readFile.mockResolvedValue(
            JSON.stringify({ name: 'mockContentType' })
        );

        // Mock fetch
        fetch.mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({ id: 'mockId', data: [] }),
        });

        // Mock FlotiqApi
        FlotiqApi.mockImplementation(() => ({
            fetchContentTypeDefs: jest.fn().mockResolvedValue([]),
            updateContentTypeDefinition: jest.fn(),
            fetchContentObjects: jest.fn().mockResolvedValue([]),
            patchContentObjectBatch: jest.fn(),
            persistContentObjectBatch: jest.fn(),
        }));
    });

    it('should complete successfully with valid inputs', async () => {
        await expect(
            importer(mockDirectory, mockApiUrl, mockApiKey, false, false, true, false, false)
        ).resolves.not.toThrow();


        expect(fetch).toHaveBeenCalled();
        expect(FlotiqApi).toHaveBeenCalledWith(mockApiUrl, mockApiKey, expect.any(Object));
    });
});