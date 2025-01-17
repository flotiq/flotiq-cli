const axios = require('axios');
const FlotiqApi = require('./../src/flotiq-api');

jest.mock('axios');

describe('FlotiqApi', () => {
    const mockApiUrl = 'https://dummy-api.flotiq.com';
    const mockApiKey = 'dummyApiKey';
  
    it('method persistContentObjectBatch should retry when receiving a 429 status', async () => {
        // Mock first response from Axios as 429, seconds as 200
        const postMock = jest.fn()
            .mockRejectedValueOnce({ response: { status: 429 } })
            .mockResolvedValueOnce({ ok: true });

        axios.create.mockReturnValue({
            post: postMock,
        });

        const flotiqApi = new FlotiqApi(`${mockApiUrl}/api/v1`, mockApiKey, {
            batchSize: 100,
            internalWpsLimit: 5,
        });

        const obj = new Array(100).fill({});
        await flotiqApi.persistContentObjectBatch('mockContentType', obj);

        // Expect first call to be 429, then after retry: success
        expect(postMock).toHaveBeenCalledTimes(2);
        expect(postMock).toHaveBeenCalledWith(expect.anything(), expect.arrayContaining([{}]));
    });

    it('method patchContentObjectBatch should retry when receiving a 429 status', async () => {
        // Mock first response from Axios as 429, seconds as 200
        const patchMock = jest.fn()
            .mockRejectedValueOnce({ response: { status: 429 } })
            .mockResolvedValueOnce({ ok: true });

        axios.create.mockReturnValue({
            patch: patchMock,
        });

        const flotiqApi = new FlotiqApi(`${mockApiUrl}/api/v1`, mockApiKey, {
            batchSize: 100,
            internalWpsLimit: 5,
        });

        const obj = new Array(100).fill({});
        await flotiqApi.patchContentObjectBatch('mockContentType', obj);

        // Expect first call to be 429, then after retry: success
        expect(patchMock).toHaveBeenCalledTimes(2);
        expect(patchMock).toHaveBeenCalledWith(expect.anything(), expect.arrayContaining([{}]));
    });
});
