const fetch = require('node-fetch');
const config = require('../configuration/config');
const { fetchContentTypeDefinitions, updateContentTypeDefinition } = require('../flotiq-api/flotiq-api');
const ora = require('ora');

module.exports = purgeContentObjects = async (apiKey, internal = false, force = false) => {
    
    let ctdsClearedOfRelations = 0;

    let contentTypeDefinitions = (await (await fetchContentTypeDefinitions(apiKey, 1, 100, internal))
        .json()).data;

    let i = 0;
    let ctdArrFormerLength = contentTypeDefinitions.length;
    let spinner;
    while (contentTypeDefinitions.length) {
        if (contentTypeDefinitions[i]) {
            let objectsNotPurged = await removeContentObjects(contentTypeDefinitions[i], apiKey);
            if (objectsNotPurged) {
                i++;
            } else {
                contentTypeDefinitions.splice(i, 1);
            }
        } else {
            i = 0;
            if (contentTypeDefinitions.length !== ctdArrFormerLength) {
                ctdArrFormerLength = contentTypeDefinitions.length
            } else {
                if (!force) {
                    console.log("Purge command stumbled upon relation loop in CTDs:");
                    while (i < contentTypeDefinitions.length) {
                        console.log(contentTypeDefinitions[i].name)
                        i++;
                    }
                    console.log("Use `flotiq purge [apiKey] --force` or remove conflicting relations manually");
                    return;
                } else {
                    spinner = ora(`Cleaning data of relation loops, please do not stop the command or close the terminal... Content Types cleared of looped relations: ${ctdsClearedOfRelations}\n`).start();
                    await dropRelations(contentTypeDefinitions.slice(ctdsClearedOfRelations), apiKey);
                    ctdsClearedOfRelations++;
                    spinner.stop();
                }
            }
        }
    }
}

const dropRelations = (contentTypeDefinitions, apiKey) => {
    const removeProperty = (ctd, property) => {
        delete ctd.metaDefinition.propertiesConfig[property];
        delete ctd.schemaDefinition.allOf[1].properties[property];
        ctd.metaDefinition.order.splice(ctd.metaDefinition.order.indexOf(property), 1);
        if (ctd.schemaDefinition.required.includes(property)) {
            ctd.schemaDefinition.required.splice(ctd.schemaDefinition.required.indexOf(property), 1);
        }
        return ctd;
    }

    const cloneObject = (obj) => {
        return JSON.parse(JSON.stringify(obj));
    }

    const clearContentType = async (ctd) => {
        let ctdWithDroppedRelations = cloneObject(ctd);
        for (let property in ctd.metaDefinition.propertiesConfig) {
            const isRelationField = ctd.metaDefinition.propertiesConfig[property]?.validation?.hasOwnProperty("relationContenttype");
            if (isRelationField) {
                ctdWithDroppedRelations = removeProperty(ctdWithDroppedRelations, property);
            }
        }
        await updateContentTypeDefinition(ctdWithDroppedRelations, apiKey);
        await updateContentTypeDefinition(ctd, apiKey);
    }
    
    for (let ctd in contentTypeDefinitions) {
        for (let property in contentTypeDefinitions[ctd].metaDefinition.propertiesConfig) {
            const isCtdWithRelations = contentTypeDefinitions[ctd].metaDefinition.propertiesConfig[property]?.validation?.hasOwnProperty("relationContenttype");
            if (isCtdWithRelations) {
                return clearContentType(contentTypeDefinitions[ctd]);
            }
        }
    }
}

const removeContentObjects = async (contentTypeDefinition, apiKey) => {

    let limit = 100;
    let page = 1;
    let totalPages = 0;

    while (totalPages !== page) {

        const ctdName = contentTypeDefinition.name;
        let contentObjects = await (await fetch(
            config.apiUrl + `/api/v1/content/${ctdName}?auth_token=${apiKey}&page=${page}&limit=${limit}`,
            {method: 'GET'}
        )).json();

        totalPages = contentObjects.total_pages;

        if (contentObjects.count === 0) {
            break;
        }

        let deleteQuery = [];
        contentObjects.data.map(contentObject => {
            deleteQuery.push(contentObject.id);
        });

        let response = await fetch(
            config.apiUrl + `/api/v1/content/${ctdName}/batch-delete?auth_token=${apiKey}`,
            {
                method: 'POST',
                body: JSON.stringify(deleteQuery),
                headers: {'Content-Type': 'application/json'}
            }
        );

        if (response.status === 400) {
            return contentTypeDefinition;
        }

        console.log(`${ctdName} - Page: ${page}/${totalPages}`, await response.json());
        page++;
    }
}
