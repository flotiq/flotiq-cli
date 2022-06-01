const fetch = require("node-fetch");
const config = require("../configuration/config");

const fetchContentTypeDefinitions = async (apiKey, page = 1, limit = 100, internal = 0) => {
    return fetch(
        `${config.apiUrl}/api/v1/internal/contenttype?auth_token=${apiKey}&internal=${internal}&page=${page}&limit=${limit}`,
        {method: 'GET'}
    );
}

const fetchContentObjects = async (apiKey, ctdName, page = 1, limit = 10) => {
    return fetch(
        `${config.apiUrl}/api/v1/content/${ctdName}?auth_token=${apiKey}&page=${page}&limit=${limit}`,
        {method: 'GET'}
    );
}

const fetchMedia = async (apiKey, page = 1, limit = 10) => {
    let media = await fetchContentObjects(apiKey, '_media', page, limit);
    return await media.json();
}

module.exports = {fetchContentTypeDefinitions, fetchContentObjects, fetchMedia}
