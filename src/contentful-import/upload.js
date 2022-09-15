const fetch = require('node-fetch');
const config = require("../configuration/config");
const FormData = require('form-data');

let headers = {
    accept: 'application/json',
};

const flotiqCtdUpload = async (data, apiKey) => {
    headers['X-AUTH-TOKEN'] = apiKey;

    let result = await fetch(config.apiUrl + '/api/v1/internal/contenttype', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {...headers, 'Content-Type': 'application/json'},
    })
    result.name = data.name;
    result.label = data.label;
    return result;
}

const flotiqCoUpload = async (data, apiKey) => {
    headers['X-AUTH-TOKEN'] = apiKey;

    let result = [];
    const limit = 100;
    for (i in data) {
        for (let j = 0; j < data[i].length; j += limit) {
            let page = data[i].slice(j, j + limit);
            result[i] = await fetch(
                'https://api.flotiq.com/api/v1/content/' + i + '/batch?updateExisting=true', {
                method: 'post',
                body: JSON.stringify(page),
                headers: { ...headers, 'Content-Type': 'application/json' }
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
            let response = await fetch(config.apiUrl + '/api/media', {
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

module.exports = { flotiqCtdUpload, flotiqCoUpload, flotiqMediaUpload }
