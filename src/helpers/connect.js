const config = require('../configuration/config');
const fetch = require('node-fetch');
const FormData = require('form-data');

exports.wordpress = async (wordpressUrl, perPage, page, totalPages, type) => {
    console.log('Fetching ' + wordpressUrl + '?rest_route=/wp/v2/' + type + '&per_page=' + perPage + '&page=' + page + '&orderby=id');
    let response = await fetch(wordpressUrl + '?rest_route=/wp/v2/' + type + '&per_page=' + perPage + '&page=' + page + '&orderby=id', {
        method: 'GET'
    });
    let totalCount = response.headers.get('X-WP-Total');
    totalPages = response.headers.get('X-WP-TotalPages');
    let responseJson = await response.json();
    return {totalCount: totalCount, totalPages: totalPages, responseJson: responseJson}
}

exports.flotiq = async (apiKey, contentTypeName, contentObject) => {
    let headers = {
        accept: 'application/json',
    };
    headers['X-AUTH-TOKEN'] = apiKey;

    let method = 'POST';
    let url = config.apiUrl + '/api/v1/content/' + contentTypeName + '/batch?updateExisting=true';

    return await fetch(url, {
        method: method,
        body: JSON.stringify(contentObject),
        headers: {...headers, 'Content-Type': 'application/json'},
    });
}

exports.flotiqMedia = async (apiKey) => {
    let totalPages = 1;
    let totalCount = 0;
    let page = 1;
    let allImages = [];
    let headers = {
        accept: 'application/json',
    };
    headers['X-AUTH-TOKEN'] = apiKey;
    for(page; page <= totalPages; page++) {
        console.log('Fetching ' + config.apiUrl + '/api/v1/content/_media?limit=1000&page=' + page);
        let images = await fetch(config.apiUrl + '/api/v1/content/_media?limit=1000&page=' + page, {headers: headers})
        let imagesJson = await images.json();
        totalCount = imagesJson.total_count;
        totalPages = imagesJson.total_pages;
        allImages = [...allImages, ...imagesJson.data];
    }
    return allImages;
}

exports.flotiqMediaUpload = async (apiKey, contentTypeName, contentObject, images, retry = 0) => {
    let headers = {
        accept: 'application/json',
    };
    headers['X-AUTH-TOKEN'] = apiKey;

    try {
        if (!images[contentObject.fileName]) {
            let file = await fetch(encodeURI(contentObject.url));
            if(file.status === 200) {
                file = await file.buffer();
                const form = new FormData();
                form.append('file', file, contentObject.fileName);
                if (imageMimeType(contentObject.mime_type)) {
                    form.append('type', 'image');
                } else {
                    form.append('type', 'file');
                }
                form.append('save', '1');
                return await fetch(config.apiUrl + '/api/media', {
                    method: 'POST',
                    body: form,
                    headers: headers,
                }).then(async res => {
                    if (res.status < 200 || res.status >= 300) {
                        throw new Error(res.statusText + '(' + res.status + ')');
                    }
                    return res.json()
                });
            }
        } else {
            return images[contentObject.fileName];
        }
    } catch (e) {
        if (retry < 5) {
            return await exports.flotiqMediaUpload(apiKey, contentTypeName, contentObject, images, ++retry);
        }
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
