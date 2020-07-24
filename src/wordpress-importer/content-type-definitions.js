const config = require('../configuration/config');
const fetch = require('node-fetch');
const notify = require('../helpers/notify');

let headers = {
    accept: 'application/json',
};

exports.importer = async (apiKey) => {
    console.log('Importing content type definitions to Flotiq');
    headers['X-AUTH-TOKEN'] = apiKey;

    let contentDefinitions = [
        require('../content-type-definitions/contentType1.json'),
        require('../content-type-definitions/contentType2.json'),
        require('../content-type-definitions/contentType3.json'),
        require('../content-type-definitions/contentType4.json'),
        require('../content-type-definitions/contentType5.json'),
    ]

    await Promise.all(contentDefinitions.map(async function (contentDefinition) {
        await importContentTypedDefinitions(contentDefinition, headers);
    }));

    async function importContentTypedDefinitions(contentDefinition, headers) {
        let result = await fetch(config.apiUrl + '/api/v1/internal/contenttype', {
            method: 'POST',
            body: JSON.stringify(contentDefinition),
            headers: {...headers, 'Content-Type': 'application/json'},
        });
        notify.resultNotify(result, 'Definition', contentDefinition.name);
        return contentDefinition.name;
    }
}
