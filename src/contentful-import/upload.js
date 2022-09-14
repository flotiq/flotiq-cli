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
    // console.log("ctd[count]: ", result); //DEL
    return result;
}

const flotiqCoUpload = async (data, apiKey) => {
    headers['X-AUTH-TOKEN'] = apiKey;

    let result = [];
    const limit = 100;
    // console.log("data test:", JSON.stringify(data,null,2));//DEL
    for (i in data) {
        // console.log("\n\nTEST data[i]: ", i, ":\n", JSON.stringify(data[i], null, 2)); //DEL
        for (let j = 0; j < data[i].length; j += limit) {
            let page = data[i].slice(j, j + limit);
            result[i] = await fetch(
                'https://api.flotiq.com/api/v1/content/' + i + '/batch', {
                method: 'post',
                body: JSON.stringify(page),
                headers: { ...headers, 'Content-Type': 'application/json' }
            });
        }
    }
    return result;
}

const flotiqMediaUpload = async (apiKey, contentObject, images) => { //(!)
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
            // console.log("\n### POST MEDIA ###\n"); //DEL
            return await fetch(config.apiUrl + '/api/media', {
                method: 'POST',
                body: form,
                headers: headers,
            }).then(async res => {
                if (res.status < 200 || res.status >= 300) {
                    console.error(res.statusText + '(' + res.status + ')')
                }
                return res.json();
            });
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
