const axios = require('axios');
const FlotiqApi = require('./../src/flotiq-api');
const AxiosMockAdapter = require("axios-mock-adapter");

// This sets the mock adapter on the default instance
const mock = new AxiosMockAdapter(axios);

describe('FlotiqApi', () => {
    const mockApiUrl = 'https://dummy-api.flotiq.com';
    const mockApiKey = 'dummyApiKey';
    
    afterEach(() => {
        mock.reset();
    });
  
    it('method persistContentObjectBatch should retry when receiving a 429 status', async () => {
        // Mock first response from Axios as 429, seconds as 200
        const url = new RegExp(`${mockApiUrl}/api/v1/content/mockContentType/batch.*`);
        mock
            .onPost(url).replyOnce(429)
            .onPost(url).replyOnce(429)
            .onPost(url).reply(200);

        const flotiqApi = new FlotiqApi(`${mockApiUrl}/api/v1`, mockApiKey, {
            batchSize: 100,
            writePerSecondLimit: 5,
        });

        const obj = new Array(100).fill({});
        await flotiqApi.persistContentObjectBatch('mockContentType', obj);

        // Expect first call to be 429, then after retry: success
        expect(mock.history.post.length).toBe(3);
        expect(mock.history.post[1]._retryCount).toEqual(2);
    });

    it('method patchContentObjectBatch should retry when receiving a 429 status', async () => {
        // Mock first response from Axios as 429, seconds as 200
        const url = new RegExp(`${mockApiUrl}/api/v1/content/mockContentType/batch.*`);
        mock
            .onPatch(url).replyOnce(429)
            .onPatch(url).reply(200);

        const flotiqApi = new FlotiqApi(`${mockApiUrl}/api/v1`, mockApiKey, {
            batchSize: 100,
            writePerSecondLimit: 5,
        });

        const obj = new Array(100).fill({});
        await flotiqApi.patchContentObjectBatch('mockContentType', obj);

        // Expect first call to be 429, then after retry: success
        expect(mock.history.patch.length).toBe(2);
        expect(mock.history.patch[1]._retryCount).toEqual(1);
    });
});
