/**
 * this api client is deprecated, please use src/flotiq-api
 */
const fetch = require("node-fetch");
const config = require("../configuration/config");
const FormData = require('form-data');

let headers = {
    accept: 'application/json',
};

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

const updateContentTypeDefinition = async (data, apiKey) => {
    return fetch(`${config.apiUrl}/api/v1/internal/contenttype/${data.name}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json', 'X-AUTH-TOKEN': apiKey },
        json: true
    });
}

const flotiqCtdUpload = async (data, apiKey) => {
    headers['X-AUTH-TOKEN'] = apiKey;

    return fetch(`${config.apiUrl}/api/v1/internal/contenttype`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {...headers, 'Content-Type': 'application/json'},
    })
}

const flotiqCoUploadByCtd = async (contentObjects, apiKey) => {
    headers['X-AUTH-TOKEN'] = apiKey;

    let result = [];
    const limit = 100;
    for (let contentObjectName in contentObjects) {
        for (let j = 0; j < contentObjects[contentObjectName].length; j += limit) {
            let page = contentObjects[contentObjectName].slice(j, j + limit);
            result[contentObjectName] = await fetch(
                `${config.apiUrl}/api/v1/content/${contentObjectName}/batch?updateExisting=true`, {
                    method: 'post',
                    body: JSON.stringify(page),
                    headers: {...headers, 'Content-Type': 'application/json'}
                });
        }
    }
    return result;
}

const flotiqMediaUpload = async (apiKey, contentObject, images) => {
    headers['X-AUTH-TOKEN'] = apiKey;

    if (!images[contentObject.fileName]) {
        let file = await fetch(encodeURI(contentObject.url));
        if (file.status === 200) {
            file = await file.buffer();
            const form = new FormData();
            form.append('file', file, contentObject.fileName);
            if (imageMimeType(contentObject.mime_type)) {
                form.append('type', 'image');
            } else {
                form.append('type', 'file');
            }
            form.append('save', '1');
            let response = await fetch(`${config.apiUrl}/api/media`, {
                method: 'POST',
                body: form,
                headers: headers,
            });
            return await response.json();
        }
    } else {
        return images[contentObject.fileName];
    }

    function imageMimeType(mime_type) {
        return [
            "image/jpeg",
            "image/png",
            "image/apng",
            "image/bmp",
            "image/gif",
            "image/x-icon",
            "image/svg+xml",
            "image/tiff",
            "image/webp"
        ].indexOf(mime_type) > -1
    }
}

module.exports = {
    fetchContentTypeDefinitions,
    fetchContentObjects,
    fetchMedia,
    updateContentTypeDefinition,
    flotiqCtdUpload,
    flotiqCoUploadByCtd,
    flotiqMediaUpload
}
