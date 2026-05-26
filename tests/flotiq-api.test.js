import AxiosMockAdapter from "axios-mock-adapter";
import FlotiqApi from "@flotiq/api";

describe('FlotiqApi', () => {
    const mockApiUrl = 'https://dummy-api.flotiq.com';
    const mockApiKey = 'dummyApiKey';
    let mock;
    
    afterEach(() => {
        if (mock) {
            mock.reset();
        }
    });
  
    it('method persistContentObjectBatch should retry when receiving a 429 status', async () => {
        const flotiqApi = new FlotiqApi(`${mockApiUrl}/api/v1`, mockApiKey, {
            batchSize: 100,
            writePerSecondLimit: 5,
        });
        mock = new AxiosMockAdapter(flotiqApi.middleware);

        // Mock first response from Axios as 429, seconds as 200
        const url = '/content/mockContentType/batch?updateExisting=true';
        mock
            .onPost(url).replyOnce(429)
            .onPost(url).replyOnce(429)
            .onPost(url).reply(200);

        const obj = new Array(100).fill({});
        await flotiqApi.persistContentObjectBatch('mockContentType', obj);

        // Expect first call to be 429, then after retry: success
        expect(mock.history.post.length).toBe(3);
        expect(mock.history.post[1]._retryCount).toEqual(2);
    });

    it('method patchContentObjectBatch should retry when receiving a 429 status', async () => {
        const flotiqApi = new FlotiqApi(`${mockApiUrl}/api/v1`, mockApiKey, {
            batchSize: 100,
            writePerSecondLimit: 5,
        });
        mock = new AxiosMockAdapter(flotiqApi.middleware);

        // Mock first response from Axios as 429, seconds as 200
        const url = '/content/mockContentType/batch';
        mock
            .onPatch(url).replyOnce(429)
            .onPatch(url).reply(200);

        const obj = new Array(100).fill({});
        await flotiqApi.patchContentObjectBatch('mockContentType', obj);

        // Expect first call to be 429, then after retry: success
        expect(mock.history.patch.length).toBe(2);
        expect(mock.history.patch[1]._retryCount).toEqual(1);
    });
});
