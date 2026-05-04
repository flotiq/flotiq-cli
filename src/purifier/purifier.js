const ora = require('ora');

module.exports = purgeContentObjects = async (flotiqApi, internal = false, force = false) => {
    
    let ctdsClearedOfRelations = 0;

    let contentTypeDefinitions = await flotiqApi.fetchContentType(internal);

    let i = 0;
    let ctdArrFormerLength = contentTypeDefinitions.length;
    let spinner;
    while (contentTypeDefinitions.length) {
        if (contentTypeDefinitions[i]) {
            let objectsNotPurged = await removeContentObjects(contentTypeDefinitions[i], flotiqApi);
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
                    await dropRelations(contentTypeDefinitions.slice(ctdsClearedOfRelations), flotiqApi);
                    ctdsClearedOfRelations++;
                    spinner.stop();
                }
            }
        }
    }
}

const dropRelations = (contentTypeDefinitions, flotiqApi) => {
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
        await flotiqApi.updateContentTypeDefinition(ctdWithDroppedRelations.name, ctdWithDroppedRelations);
        await flotiqApi.updateContentTypeDefinition(ctd.name, ctd);
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

const removeContentObjects = async (contentTypeDefinition, flotiqApi) => {

    let limit = 100;
    let page = 1;
    let totalPages = 0;

    while (totalPages !== page) {

        const ctdName = contentTypeDefinition.name;
        let contentObjects = (await flotiqApi.middleware.get(
            `/content/${ctdName}?page=${page}&limit=${limit}`
        )).data;

        totalPages = contentObjects.total_pages;

        if (contentObjects.count === 0) {
            break;
        }

        let deleteQuery = [];
        contentObjects.data.map(contentObject => {
            deleteQuery.push(contentObject.id);
        });

        const response = await flotiqApi.middleware.post(
            `/content/${ctdName}/batch-delete`,
            deleteQuery,
            { validateStatus: (s) => s < 500 }
        );

        if (response.status === 400) {
            return contentTypeDefinition;
        }

        console.log(`${ctdName} - Page: ${page}/${totalPages}`, response.data);
        page++;
    }
}
