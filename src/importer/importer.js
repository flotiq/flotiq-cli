const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const config = require('../configuration/config');

let headers = {
    accept: 'application/json',
};

exports.importer = async (apiKey, directoryPath) => {
    directoryPath = path.resolve(directoryPath);
    console.log('Importing contents to Flotiq');
    const directoryImagePath = path.join(directoryPath, 'images');
    headers['X-AUTH-TOKEN'] = apiKey;
    let imageImportData = await importImages(directoryImagePath, headers);

    let directories = [];
    try {
        directories = fs.readdirSync(directoryPath);
    } catch(e) {
        console.error('Incorrect import directory, cannot find .flotiq directory inside!');
        process.exit(1);
    }

    for (let i = 0; i < directories.length; i++) {
        const directory = directories[i];
        if (directory.indexOf(`ContentType`) === 0) {
            let contentTypeName = await importContentTypedDefinitions(path.join(directoryPath, directory), headers);

            await importContentObjects(path.join(directoryPath, directory), imageImportData, contentTypeName, headers);
        }
    }

    async function importContentTypedDefinitions(directoryPath, headers) {
        let contentDefinition = require(path.resolve(directoryPath, 'ContentTypeDefinition.json'));
        let result = await fetch(config.apiUrl + '/api/v1/internal/contenttype', {
            method: 'POST',
            body: JSON.stringify(contentDefinition),
            headers: {...headers, 'Content-Type': 'application/json'},
        });
        resultNotify(result, 'Definition', contentDefinition.name);
        return contentDefinition.name;
    }

    /**
     * images
     * @type {*[]}
     */
    async function importImages(directoryImagePath, headers) {
        let imageToReplace = [];
        let imageForReplacing = {};
        if (fs.existsSync(directoryImagePath)) {
            let files = fs.readdirSync(directoryImagePath);
            await Promise.all(files.map(async function (file) {
                const fileId = file.split('.')[0];
                imageToReplace.push(fileId);
                let image = await fetch(config.apiUrl + '/api/v1/content/_media?filters={"fileName":{"filter":"' + file + '","type":"contains"}}', {headers: headers});
                image = await image.json();
                if (image.count) {
                    imageForReplacing[fileId] = image.data[0].id
                } else {
                    const form = new FormData();
                    form.append('file', fs.createReadStream(path.resolve(directoryImagePath, file)), file);
                    form.append('type', 'image');
                    form.append('save', '1');
                    let result = await fetch(config.apiUrl + '/api/media', {
                        method: 'POST',
                        body: form,
                        headers: headers,
                    })
                    let contentObject = {};
                    if (result.status === 200) {
                        contentObject = await result.json();
                    }

                    resultNotify(result, 'Image', contentObject.id);
                    imageForReplacing[fileId] = contentObject.id
                }
            }))
        }

        return {imageToReplace, imageForReplacing};
    }

    async function importContentObjects(directoryPath, imageImportData, contentTypeName, headers) {
        let files = fs.readdirSync(directoryPath);
        await Promise.all(files.map(async function (file) {
            if (file.indexOf('contentObject') === 0) {
                let contentObject = require(path.resolve(directoryPath, file));
                let response = await fetch(
                    config.apiUrl + '/api/v1/content/' + contentTypeName + '/' + contentObject.id,
                    {method: 'HEAD', headers: headers}
                );

                let method = 'POST';
                let url = config.apiUrl + '/api/v1/content/' + contentTypeName;

                if (response.ok) {
                    method = 'PUT';
                    url += '/' + contentObject.id
                }
                let contentObjectString = JSON.stringify(contentObject);
                imageImportData.imageToReplace.forEach((image) => {
                    //ensure that every occurrence of image is replaced, as the same image can be used in main image and gallery for example
                    const regex = new RegExp(image, 'g')
                    contentObjectString = contentObjectString.replace(regex, imageImportData.imageForReplacing[image])
                });

                let result = await fetch(url, {
                    method: method,
                    body: contentObjectString,
                    headers: {...headers, 'Content-Type': 'application/json'},
                });

                resultNotify(result, 'Object', contentObject.name);
            }
        }))
    }

    function resultNotify(response, context, name) {
        if (response.status === 400) {
            console.log(response.json().then((data) => {
                console.log(data);
            }));
            console.log(context + ' : "' + name + '" existing, trying use it.');
        } else if (response.status === 200) {
            console.log(context + ' : "' + name + '" added');
        } else {
            console.log(context + ' : "' + name + '" has not been added: ' + response.statusText);
            process.exit(1);
        }
    }
};
