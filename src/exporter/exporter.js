const {
    fetchContentTypeDefinitions,
    fetchContentObjects,
    fetchMedia
} = require('../flotiq-api/flotiq-api');
const fs = require('fs');
const config = require("../configuration/config");
const fetch = require('node-fetch');

exports.export = async (apiKey, directoryPath, onlyDefinitions = false) => {

    let contentTypedDefinitionsResponse = await getContentTypeDefinitionsData(apiKey);
    let directoryNumber = 1;
    let totalObjects = 0;
    let totalPages = contentTypedDefinitionsResponse.total_pages;

    let page = 1;
    while (page <= totalPages) {
        console.log(`CTD Page: ${page}/${totalPages}`);
        for (let i = 0; i < contentTypedDefinitionsResponse.data.length; i++) {
            let ctd = await clearCtd(contentTypedDefinitionsResponse.data[i]);
            const directoryName = `${directoryNumber}_${ctd.name}`;
            await saveSchema(ctd, directoryPath, directoryName);
            if(!onlyDefinitions) {
                let countSavedObjects = await saveObjects(
                    apiKey,
                    contentTypedDefinitionsResponse.data[i].name,
                    directoryPath,
                    directoryName
                );
                totalObjects = totalObjects + countSavedObjects;
            }
            directoryNumber++;
        }
        page++;
        if (page <= totalPages) {
            contentTypedDefinitionsResponse = await getContentTypeDefinitionsData(apiKey, page);
        }
    }

    let totalTypesDefinition = directoryNumber - 1;
    let mediaSummary = {totalObjects: 0};

    if(!onlyDefinitions) {
        let media = await fetchMedia(apiKey);
        mediaSummary = await saveMedia(media, apiKey, directoryPath);
    }

    console.log('\x1b[32mSummary:');
    console.log(`\x1b[32mTotal content types definitions: ${totalTypesDefinition}`);
    console.log(`\x1b[32mTotal content objects: ${totalObjects}\u001b[0m`);
    console.log(`\x1b[32mTotal media: ${mediaSummary.totalObjects}\u001b[0m`);

    return {
        totalTypesDefinition: totalTypesDefinition,
        totalObjects: totalObjects,
        totalMedia: mediaSummary.totalObjects
    };
}

const saveMedia = async (response, apiKey, directoryPath) => {
    let totalObjects = 0;
    let totalPages = response.total_pages;

    let page = 1;
    let imagesPath = `${directoryPath}/images`;
    if (!fs.existsSync(imagesPath)) {
        fs.mkdirSync(imagesPath, {recursive: true});
    }

    while (page <= totalPages) {
        console.log(`Media page: ${page}/${totalPages}`);
        for (let i = 0; i < response.data.length; i++) {
            await saveImage(response.data[i], imagesPath);
            totalObjects = totalObjects + 1;
        }
        page++;
        if (page <= totalPages) {
            response = await fetchMedia(apiKey, page);
        }
    }

    return {totalObjects: totalObjects};
}

const saveImage = async (data, imagesPath) => {
    let imageUrl = `${config.apiUrl}/image/0x0/${data.id}.${data.extension}`;
    let filePath = `${imagesPath}/${data.id}.${data.extension}`;
    fetch(imageUrl)
        .then(response => {
            response.body.pipe(
                fs.createWriteStream(filePath)
            );
        });
}

const saveObjects = async (apiKey, ctdName, directoryPath, directoryNumber) => {
    let contentObjectsResponse = await fetchContentObjects(apiKey, ctdName)
    let contentObjectsResponseJson = await contentObjectsResponse.json();
    let totalPages = contentObjectsResponseJson.total_pages;
    let coDirectoryNumber = 1;
    let countSavedObjects = 0;
    console.log(`Total objects: ${contentObjectsResponseJson.total_count}`)

    let pageCo = 1;
    while (pageCo <= totalPages) {
        console.log(`CO: ${ctdName} Page: ${pageCo}/${totalPages}`);
        for (let i = 0; i < contentObjectsResponseJson.data.length; i++) {
            await saveObject(ctdName, contentObjectsResponseJson.data[i], directoryPath, directoryNumber, coDirectoryNumber);
            coDirectoryNumber++;
            countSavedObjects++;
        }
        pageCo++;
        if (pageCo <= totalPages) {
            contentObjectsResponse = await fetchContentObjects(apiKey, ctdName, pageCo);
            contentObjectsResponseJson = await contentObjectsResponse.json();
        }
    }
    return countSavedObjects;
}

const clearCtd = async (object) => {
    delete object.internal;
    delete object.id;
    delete object.deletedAt;
    delete object.createdAt
    delete object.updatedAt

    return object;
}

const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

const getContentTypeDefinitionsData = async (apiKey, page = 1) => {
    let contentTypedDefinitionsResponse = await fetchContentTypeDefinitions(apiKey, page);
    return await contentTypedDefinitionsResponse.json();
}

const saveSchema = async (contentTypedDefinition, directoryPath, directoryNumber) => {
    let ctdPath = `${directoryPath}/ContentType${directoryNumber}`;

    if (!fs.existsSync(ctdPath)) {
        fs.mkdirSync(ctdPath, {recursive: true});
    }

    try {
        fs.writeFileSync(`${ctdPath}/ContentTypeDefinition.json`, JSON.stringify(contentTypedDefinition));
        console.log(`${ctdPath}/ContentTypeDefinition.json: ${contentTypedDefinition.name}`)
    } catch (e) {
        throw e;
    }
}

const saveObject = async (ctdName, data, directoryPath, directoryNumber, index) => {
    ctdName = capitalizeFirstLetter(ctdName);
    let ctdPath = `${directoryPath}/ContentType${directoryNumber}`;
    ctdPath = `${ctdPath}/contentObject${ctdName}${index}.json`;

    try {
        fs.writeFileSync(ctdPath, JSON.stringify(data));
    } catch (e) {
        throw e;
    }
}
