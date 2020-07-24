const notify = require('../helpers/notify');
const connect = require('../helpers/connect');
const authorContentType = require('../content-type-definitions/contentType1.json');

exports.importer = async (apiKey, wordpressUrl) => {
    console.log('Importing authors to Flotiq');
    let perPage = 25;
    let page = 1;
    let totalPages = 1;
    let totalCount = 1;
    let imported = 0;

    for(page; page <= totalPages; page++) {
        let wordpressResponse = await connect.wordpress(wordpressUrl, perPage, page, totalPages, 'users');
        totalPages = wordpressResponse.totalPages;
        totalCount = wordpressResponse.totalCount;

        let responseJson = wordpressResponse.responseJson;
        let authorsConverted = [];
        responseJson.map(async (author) => {
            authorsConverted.push(convert(author));
        })
        let result = await connect.flotiq(apiKey, authorContentType.name, authorsConverted);
        notify.resultNotify(result, 'Authors from page', page);
        result = await result.json()
        imported+=result.batch_success_count;
        console.log('Authors progress: ' + imported + '/' + totalCount);

    }

    function convert(author) {
        return {
            id: authorContentType.name + '_' + author.id,
            slug: author.slug,
            name: author.name,
            description: author.description
        }
    }
}
