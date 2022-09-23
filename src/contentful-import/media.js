const config = require('../configuration/config');
const fetch = require('node-fetch');

const flotiqMedia = async (apiKey) => {
    let totalPages = 1;
    let page = 1;
    let allImages = [];
    let headers = {
        accept: 'application/json',
    };
    headers['X-AUTH-TOKEN'] = apiKey;
    for (page; page <= totalPages; page++) {
        let images = await fetch(config.apiUrl + '/api/v1/content/_media?limit=1000&page=' + page, {headers: headers})
        let imagesJson = await images.json();
        totalPages = imagesJson.total_pages;
        allImages = [...allImages, ...imagesJson.data];
    }
    return allImages;
}

const cfMediaToObject = (data, trans) => {
    const assets = [];
    for (let i in data) {
        assets[i] = {
            fileName: data[i].fields.file[trans].fileName,
            url: 'http:' + data[i].fields.file[trans].url,
            mime_type: data[i].fields.file[trans].contentType,
            cf_id: data[i].sys.id
        }
    }
    return (assets);
}

module.exports = {cfMediaToObject, flotiqMedia}
