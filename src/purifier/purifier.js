const fetch = require('node-fetch');
const config = require('../configuration/config');

module.exports = purgeContentObjects = async (apiKey, internal = 0) => {

    let contentTypeDefinitions = (await (await fetchContentTypeDefinitions(apiKey, internal))
        .json()).data;

    let i = 0;
    while (contentTypeDefinitions.length) {
        if (contentTypeDefinitions[i]) {
            let notRemoved = await removeContentObjects(contentTypeDefinitions[i], apiKey);
            if (!notRemoved) {
                contentTypeDefinitions.splice(i, 1);
            } else {
                i++;
            }
        } else {
            i--;
        }
    }
}
const fetchContentTypeDefinitions = async (apiKey, internal = 0) => {
    return fetch(
        config.apiUrl + `/api/v1/internal/contenttype?internal=false&auth_token=${apiKey}&internal=${internal}`,
        {method: 'GET'}
    );
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

        console.log(`${ctdName} - Strona: ${page}/${totalPages}`, await response.json());
        page++;
    }
}