const notify = require('../helpers/notify');
const connect = require('../helpers/connect');
const tagContentType = require('../content-type-definitions/contentType2.json');

exports.importer = async (apiKey, wordpressUrl) => {
    console.log('Importing tags to Flotiq');
    let perPage = 25;
    let page = 1;
    let totalPages = 1;
    let totalCount = 1;
    let imported = 0;

    for(page; page <= totalPages; page++) {
        let wordpressResponse = await connect.wordpress(wordpressUrl, perPage, page, totalPages, 'tags');
        totalPages = wordpressResponse.totalPages;
        totalCount = wordpressResponse.totalCount;

        let responseJson = wordpressResponse.responseJson;
        let tagsConverted = [];
        responseJson.map(async (tag) => {
            tagsConverted.push(convert(tag));
        })
        let result = await connect.flotiq(apiKey, tagContentType.name, tagsConverted);
        notify.resultNotify(result, 'Tags from page', page);
        result = await result.json()
        imported+=result.batch_success_count;
        console.log('Tags progress: ' + imported + '/' + totalCount);

    }

    function convert(tag) {
        return {
            id: tagContentType.name + '_' + tag.id,
            slug: tag.slug,
            name: tag.name,
            description: tag.description
        }
    }
}
