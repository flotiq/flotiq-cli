const fetch = require('node-fetch');
const config = require("../configuration/config");
const { fetchContentTypeDefinitions, fetchContentObjects, fetchMedia } = require('../flotiq-api/flotiq-api');

module.exports = stats = async (apiKey) => {

    let contentTypeDefinitionsResponse = await fetchContentTypeDefinitions(apiKey, 1, 1000);
    let contentTypeDefinitions = await contentTypeDefinitionsResponse.json();
    let totalCTDS = contentTypeDefinitions.total_count;

    console.log("Content Type Definitions: " + totalCTDS);

    let index = 0;
    let totalCO = 0;
    console.log("Content objects by CTD:");

    while (index < totalCTDS) {
        let contentObjectsResponse = await fetchContentObjects(apiKey, contentTypeDefinitions.data[index].name);
        let contentObjects = await contentObjectsResponse.json();
        totalCO += contentObjects.total_count;
        console.log('\t' + contentTypeDefinitions.data[index].name, contentObjects.total_count);
        index++;
    }

    console.log("Total content objects: " + totalCO);

    let media = await fetchMedia(apiKey);
    console.log("Media: " + media.total_count);

    let webhooksResponse = await fetchContentObjects(apiKey, '_webhooks');
    let webhooks = await webhooksResponse.json();
    console.log("Webhooks: " + webhooks.total_count); 

    let limit = 10;
    index = 0;

    let latestContentObjects = await (await fetch(
        `${config.apiUrl}/api/v1/search?auth_token=${apiKey}&limit=${limit}&q=*&order_by=internal.updatedAt&order_direction=desc`,
        {method: 'GET'}
    )).json();
    
    console.log("Recently updated objects (Content type, ID, Modification date, Title):");
    while (index < limit) {
        
        let ctd = await latestContentObjects.data[index].item.internal.contentType;
        let id = await latestContentObjects.data[index].item.id;
        let date = await latestContentObjects.data[index].item.internal.updatedAt;
        let title = await latestContentObjects.data[index].item.internal.objectTitle;
        
        if (title == "" && ctd == '_media') {
            title = config.apiUrl + latestContentObjects.data[index].item.url;
        }

        index++;
        console.log('\n', ctd, '   ', id, '   ', date, '   ', title);
    }
}