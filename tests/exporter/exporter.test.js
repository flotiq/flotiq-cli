const exporter = require('../../src/exporter/exporter');
const {when, resetAllWhenMocks, verifyAllWhenMocksCalled} = require("jest-when");
jest.mock('node-fetch');
const fetch = require("node-fetch");
const {Response} = jest.requireActual('node-fetch');
const config = require("../../src/configuration/config");

const ctd1List = require('./mocks/ctds-page1');
const CTDS1 = JSON.stringify(ctd1List.ctds);

const ctd2List = require('./mocks/ctds-page1');
const CTDS2 = JSON.stringify(ctd2List.ctds);

const coList1 = require('./mocks/ctos1-page-1');
const CTOS1 = JSON.stringify(coList1.ctds);

const coList2 = require('./mocks/ctos1-page-2');
const assert = require("assert");
const CTOS2 = JSON.stringify(coList2.ctds);

beforeEach(() => {
    resetAllWhenMocks()
})

describe('Exporter test', () => {
    test('Success export', async () => {
        let apiKey = 'test-apy-key';
        let directoryPath = 'path';

        when(fetch)
            .expectCalledWith(
                expect.stringContaining(`${config.apiUrl}/api/v1/internal/contenttype?auth_token=${apiKey}&internal=0&page=1&limit=100`),
                {method: 'GET'}
            )
            .mockReturnValueOnce(Promise.resolve(new Response(CTDS1)));

        when(fetch)
            .expectCalledWith(
                expect.stringContaining(`${config.apiUrl}/api/v1/content/Type-1-name?auth_token=${apiKey}&page=1&limit=10`),
                {method: 'GET'}
            )
            .mockReturnValueOnce(Promise.resolve(new Response(CTOS1)));

        when(fetch)
            .expectCalledWith(
                expect.stringContaining(`${config.apiUrl}/api/v1/content/Type-1-name?auth_token=${apiKey}&page=2&limit=10`),
                {method: 'GET'}
            )
            .mockReturnValueOnce(Promise.resolve(new Response(CTOS2)));

        when(fetch)
            .expectCalledWith(
                expect.stringContaining(`${config.apiUrl}/api/v1/internal/contenttype?auth_token=${apiKey}&internal=0&page=2&limit=100`),
                {method: 'GET'}
            )
            .mockReturnValueOnce(Promise.resolve(new Response(CTDS2)));

        when(fetch)
            .expectCalledWith(
                expect.stringContaining(`${config.apiUrl}/api/v1/content/Type-1-name?auth_token=${apiKey}&page=1&limit=10`),
                {method: 'GET'}
            )
            .mockReturnValueOnce(Promise.resolve(new Response(CTOS1)));

        when(fetch)
            .expectCalledWith(
                expect.stringContaining(`${config.apiUrl}/api/v1/content/Type-1-name?auth_token=${apiKey}&page=2&limit=10`),
                {method: 'GET'}
            )
            .mockReturnValueOnce(Promise.resolve(new Response(CTOS2)));

        let result = await exporter.export(apiKey, directoryPath);

        verifyAllWhenMocksCalled();

        assert.equal(2, result.totalTypesDefinition);
        assert.equal(40, result.totalObjects);
    })
})
