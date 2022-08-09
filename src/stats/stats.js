const fetch = require('node-fetch');
const config = require("../configuration/config");
const {
    fetchContentTypeDefinitions,
    fetchContentObjects,
    fetchMedia
} = require('../flotiq-api/flotiq-api');

module.exports = stats = async (apiKey) => {
    console.log('Fetching statistics ...');
    let contentTypeDefinitionsResponse = await fetchContentTypeDefinitions(apiKey, 1, 1000);
    let contentTypeDefinitions = await contentTypeDefinitionsResponse.json();
    let totalCTDS = contentTypeDefinitions.total_count;

    const countedObjects = {};

    function CountObjects(numberOfObj) {
        this['Number of Objects'] = numberOfObj;
    }

    function pushObj(str, num) {
        countedObjects[str] = new CountObjects(num);
    }

    pushObj("Content Type Definitions", totalCTDS);

    let index = 0;
    let totalCO = 0;

    while (index < totalCTDS) {
        let contentObjectsResponse = await fetchContentObjects(apiKey, contentTypeDefinitions.data[index].name);
        let contentObjects = await contentObjectsResponse.json();
        totalCO += contentObjects.total_count;
        pushObj(contentTypeDefinitions.data[index].name, contentObjects.total_count)
        index++;
    }

    pushObj("Total content objects", totalCO);

    let media = await fetchMedia(apiKey);
    pushObj("Media", media.total_count);

    let webhooksResponse = await fetchContentObjects(apiKey, '_webhooks');
    let webhooks = await webhooksResponse.json();
    pushObj("Webhooks", webhooks.total_count);

    let limit = 10;
    index = 0;

    let latestContentObjects = await (await fetch(
        `${config.apiUrl}/api/v1/search?auth_token=${apiKey}&limit=${limit}&q=*&order_by=internal.updatedAt&order_direction=desc`,
        {method: 'GET'})).json();

    console.table(countedObjects);

    const idIndex = {};

    function LatestObject(title, ctd, time) {
        this.Title = title;
        this.CTD = ctd;
        this.Date = time;
    }

    function padTo2Digits(num) {
        return num.toString().padStart(2, '0');
    }

    function formatDate(date) {
        return (
            [
                padTo2Digits(date.getMonth() + 1),
                padTo2Digits(date.getDate()),
                date.getFullYear(),
            ].join('/') +
            ' ' +
            [
                padTo2Digits(date.getHours()),
                padTo2Digits(date.getMinutes()),
                padTo2Digits(date.getSeconds()),
            ].join(':')
        );
    }

    console.log('\n10 recently modified objects:');
    while (index < limit) {

        let ctd = latestContentObjects.data[index].item.internal.contentType;
        let id = latestContentObjects.data[index].item.id;
        let time = latestContentObjects.data[index].item.internal.updatedAt;
        let title = latestContentObjects.data[index].item.internal.objectTitle;

        if (title === "" && ctd === '_media') {
            title = config.apiUrl + latestContentObjects.data[index].item.url;
        }

        idIndex[id] = new LatestObject(title, ctd, formatDate(new Date(time)));

        index++;
    }
    console.table(idIndex);
}
