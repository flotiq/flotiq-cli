const fs = require('fs/promises');
const glob = require('glob');
const FlotiqApi = require('./../../src/flotiq-api');
const { importer } = require('./../../commands/importer');

jest.mock('fs/promises');
jest.mock('glob', () => jest.fn());
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

        // Mock FlotiqApi
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
        }));
    });

    it('should complete successfully with valid inputs', async () => {
        const flotiqApi = new FlotiqApi(`${mockApiUrl}/api/v1`,  mockApiKey, {
            batchSize: 100,
        });
        const expectedResult = [
            [{ctdName: "mockContentType", featuredImage: undefined}],
            [{name: "mockContentType"}],
            [],
                        {
                                importedCtdCount: 1,
                                importedContentObjectsCount: 1,
                        },
          ]
        ;
        const result = await importer(
            mockDirectory,
            flotiqApi,
            false,
            false,
            true,
            false,
            false
        );
        await expect(result).toEqual(expectedResult);


        expect(FlotiqApi).toHaveBeenCalledWith('https://dummy-api.flotiq.com/api/v1', mockApiKey, expect.any(Object));
    });
});
