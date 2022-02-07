const {fetchContentTypeDefinitions, fetchContentObjects} = require('../flotiq-api/flotiq-api');
const fs = require('fs');

exports.export = async (apiKey, directoryPath) => {

    let contentTypedDefinitionsResponse = await getContentTypeDefinitionsData(apiKey)
    let directoryNumber = 1;
    let totalObjects = 0;
    let totalPages = contentTypedDefinitionsResponse.total_pages;

    let page = 1;
    while (page <= totalPages) {
        console.log(`CTD Page: ${page}/${totalPages}`);
        for (let i = 0; i < contentTypedDefinitionsResponse.data.length; i++) {
            let ctd = await clearCtd(contentTypedDefinitionsResponse.data[i]);
            await saveSchema(ctd, directoryPath, directoryNumber);
            let countSavedObjects = await saveObjects(apiKey, contentTypedDefinitionsResponse.data[i].name, directoryPath, directoryNumber);
            totalObjects = totalObjects + countSavedObjects;
            directoryNumber++;
        }
        page++;
        if (page <= totalPages) {
            contentTypedDefinitionsResponse = await getContentTypeDefinitionsData(apiKey, page);
        }
    }

    let totalTypesDefinition = directoryNumber - 1
    console.log('\x1b[32mSummary:');
    console.log(`\x1b[32mTotal content types definitions: ${totalTypesDefinition}`);
    console.log(`\x1b[32mTotal content objects: ${totalObjects}`);

    return {totalTypesDefinition: totalTypesDefinition, totalObjects: totalObjects};
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
    ctdPath = `${ctdPath}/ContentObject${ctdName}${index}.json`;

    try {
        fs.writeFileSync(ctdPath, JSON.stringify(data));
    } catch (e) {
        throw e;
    }
}
