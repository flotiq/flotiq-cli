const fetch = require('node-fetch')
const path = require('path')
const fs = require('fs')
const FormData = require('form-data')
const config = require('../configuration/config');

let headers = {
    accept: 'application/json',
}

exports.importer = async (apiKey, directoryPath) => {
    console.log('Importing contents to Flotiq');
    const directoryImagePath = path.join(directoryPath, 'images');
    headers['X-AUTH-TOKEN'] = apiKey

    let contentTypeName = await importContentTypedDefinitions(directoryPath, headers);
    let imageImportData = await importImages(directoryImagePath, headers);
    await importObjects(directoryPath, imageImportData, headers, contentTypeName);

    async function importContentTypedDefinitions(directoryPath, headers) {
        let contentDefinition = require(directoryPath + '/ContentTypeDefinition.json')
        let result = await fetch(config.apiUrl + '/api/v1/internal/contenttype', {
            method: 'POST',
            body: JSON.stringify(contentDefinition),
            headers: {...headers, 'Content-Type': 'application/json'},
        })
        resultNotify(result, 'Definition', contentDefinition.name);
        return contentDefinition.name;
    }

    /**
     * images
     * @type {*[]}
     */
    async function importImages(directoryImagePath, headers) {
        let imageToReplace = []
        let imageForReplacing = []
        if (fs.existsSync(directoryImagePath)) {
            let files = fs.readdirSync(directoryImagePath)
            await Promise.all(files.map(async function (file) {
                imageToReplace.push(file.replace('.jpg', ''))
                let image = await fetch(config.apiUrl + '/api/v1/content/_media?filters={"fileName":{"filter":"' + file + '","type":"contains"}}', {headers: headers})
                image = await image.json()
                if (image.count) {
                    imageForReplacing.push(image.data[0].id)
                } else {
                    const form = new FormData()
                    form.append('file', fs.createReadStream(directoryImagePath + '/' + file), file)
                    form.append('type', 'image')
                    let contentObject = await fetch(config.apiUrl + '/api/media', {
                        method: 'POST',
                        body: form,
                        headers: headers,
                    }).then(res => res.json())
                    let result = await fetch(config.apiUrl + '/api/v1/content/_media', {
                        method: 'POST',
                        body: JSON.stringify(contentObject),
                        headers: {...headers, 'Content-Type': 'application/json'},
                    })

                    resultNotify(result, 'Image', contentObject.name);
                    imageForReplacing.push(contentObject.id);
                }
            }))
        }

        return {imageToReplace, imageForReplacing};
    }

    async function importObjects(directoryPath, imageImportData, headers, contentTypeName) {
        let files = fs.readdirSync(directoryPath)
        await Promise.all(files.map(async function (file) {
            if (file.indexOf('contentObject') === 0) {
                let contentObject = require(directoryPath + '/' + file)
                let response = await fetch(
                    config.apiUrl + '/api/v1/content/' + contentTypeName + '/' + contentObject.id,
                    {method: 'HEAD', headers: headers}
                );

                let method = 'POST'
                let url = config.apiUrl + '/api/v1/content/' + contentTypeName

                if (response.ok) {
                    method = 'PUT'
                    url += '/' + contentObject.id
                }
                let contentObjectString = JSON.stringify(contentObject)
                imageImportData.imageToReplace.forEach((image, index) => {
                    contentObjectString = contentObjectString.replace(image, imageImportData.imageForReplacing[index])
                })

                let result = await fetch(url, {
                    method: method,
                    body: contentObjectString,
                    headers: {...headers, 'Content-Type': 'application/json'},
                })

                resultNotify(result, 'Object', contentObject.name);
            }
        }))
    }

    function resultNotify(response, context, name) {
        if (response.status === 400) {
            console.log('\x1b[43m' + context + ' : "' + name + '" existing, trying use it.');
        } else if (response.status === 200) {
            console.log('\x1b[42m' + context + ' : "' + name + '" added');
        } else {
            console.log('\x1b[41m' + context + ' : "' + name + '" has not been added: ' + response.statusText);
            process.exit(1);
        }
    }
}
