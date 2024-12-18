const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const config = require('../configuration/config');
const parser = require("./parser/parser");

const CLI_GREEN = "\x1b[32m%s\x1b[0m";
const CLI_BLUE = "\x1b[36m%s\x1b[0m"

let headers = {
    accept: 'application/json',
};

exports.importer = async (apiKey, directoryPath, exit = true) => {
    directoryPath = path.resolve(directoryPath);
    console.log(`Importing contents to your Flotiq account`);
    console.log(`Reading '${directoryPath}'...`);
    const directoryImagePath = path.join(directoryPath, 'images');
    headers['X-AUTH-TOKEN'] = apiKey;
    let imageImportData = await importImages(directoryImagePath, headers);
    let nothingImported = false;

    let directories = [];
    try {
        directories = fs.readdirSync(directoryPath);
    } catch (e) {
        if (exit) {
            console.error(CLI_BLUE, 'Failed to open import directory!');
            process.exit(1)
        } else {
            return
        }
    }

    directories = directories.filter((element) => element !== 'images');

    for (const directory of directories) {
        if (directory.indexOf(`ContentType`) === 0) {
            let contentTypeName = await importContentTypedDefinitions(path.join(directoryPath, directory), headers);
            if (contentTypeName) {
                await importContentObjects(path.join(directoryPath, directory), imageImportData, contentTypeName, headers);
            } else {
                nothingImported = true;
            }
        } else {
            nothingImported = true;
        }
    }

    if (!nothingImported) {
        console.log(CLI_GREEN, 'You can manage added content using Flotiq Dashboard: https://editor.flotiq.com');
    } else {
        console.log(CLI_BLUE, 'Nothing to import!');
    }

    async function importContentTypedDefinitions(directoryPath, headers) {
        try {
            let contentDefinition = require(path.resolve(directoryPath, 'ContentTypeDefinition.json'));
            let result = await fetch(config.apiUrl + '/api/v1/internal/contenttype', {
                method: 'POST',
                body: JSON.stringify(contentDefinition),
                headers: {...headers, 'Content-Type': 'application/json'},
            });
            resultNotify(result, '✔ Definition', contentDefinition.name);
            return contentDefinition.name;
        } catch (e) {
            return null;
        }
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
                if (file === '.gitkeep') {
                    return;
                }
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

                    resultNotify(result, '✔ Image', contentObject.id);
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
                let contentObjectRaw = require(path.resolve(directoryPath, file));
                let contentObject = parser(contentObjectRaw);
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
                await resultNotify(result, '✔ Object', contentObject.id);
            }
        }))
    }

    async function resultNotify(response, context, name) {
        if (response.status === 400) {
            const json = await response.json();
            console.log('Response from server\n', json);
            console.log(`${context}: ${name} existing, trying use it.`);
        } else if (response.status === 200) {
            console.log(context + ': "' + name + '" added.');
        } else {
            console.errorCode(300);
            console.error(`${context}: ${name} has not been added.\n HTTP ${response.status}: ${response.statusText}`);
            process.exit(1);
        }
    }
};
