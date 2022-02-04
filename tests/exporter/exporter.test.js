const exporter = require('../../src/exporter/exporter');
const {when, resetAllWhenMocks, verifyAllWhenMocksCalled} = require('jest-when');
const assert = require('assert');
const config = require('../../src/configuration/config');

jest.mock('node-fetch');
const fetch = require('node-fetch');
const {Response} = jest.requireActual('node-fetch');

beforeEach(() => {
    resetAllWhenMocks()
})

describe('Exporter test', () => {
    test('Success export', async () => {
        let apiKey = 'test-apy-key';
        let directoryPath = 'path';

        mockContentTypesDefinition(apiKey, 1);
        mockContentObjects(apiKey, 'Type-1-name', 1);
        mockContentObjects(apiKey, 'Type-1-name', 2);
        mockContentTypesDefinition(apiKey, 2);
        mockContentObjects(apiKey, 'Type-2-name', 1);
        mockContentObjects(apiKey, 'Type-2-name', 2);

        let result = await exporter.export(apiKey, directoryPath);

        verifyAllWhenMocksCalled();

        assert.equal(2, result.totalTypesDefinition);
        assert.equal(40, result.totalObjects);
    })
})

const mockContentTypesDefinition = (apiKey, page) => {
    let ctdList = require('./mocks/ctds-page2');
    if (page === 1) {
        ctdList = require('./mocks/ctds-page1');
    }
    const CTDS = JSON.stringify(ctdList.ctds);
    when(fetch)
        .expectCalledWith(
            expect.stringContaining(`${config.apiUrl}/api/v1/internal/contenttype?auth_token=${apiKey}&internal=0&page=${page}&limit=100`),
            {method: 'GET'}
        )
        .mockReturnValueOnce(Promise.resolve(new Response(CTDS)));
}

const mockContentObjects = (apiKey, type, page) => {
    let coList = require('./mocks/ctos1-page-2');
    if (page === 1) {
        coList = require('./mocks/ctos1-page-1');
    }
    const CTOS = JSON.stringify(coList.ctds);
    when(fetch)
        .expectCalledWith(
            expect.stringContaining(`${config.apiUrl}/api/v1/content/${type}?auth_token=${apiKey}&page=${page}&limit=10`),
            {method: 'GET'}
        )
        .mockReturnValueOnce(Promise.resolve(new Response(CTOS)));
}
