const notify = require('../helpers/notify');
const connect = require('../helpers/connect');
const categoryContentType = require('../content-type-definitions/contentType3.json');

exports.importer = async (apiKey, wordpressUrl) => {
    console.log('Importing categories to Flotiq');
    let perPage = 25;
    let page = 1;
    let totalPages = 1;
    let totalCount = 1;
    let imported = 0;
    let categoriesWithParent = [];

    for(page; page <= totalPages; page++) {
        let wordpressResponse = await connect.wordpress(wordpressUrl, perPage, page, totalPages, 'categories');
        totalPages = wordpressResponse.totalPages;
        totalCount = wordpressResponse.totalCount;

        let responseJson = wordpressResponse.responseJson;
        let categoriesConverted = [];
        responseJson.map(async (category) => {
            categoriesConverted.push(convert(category));
            if(category.parent) {
                categoriesWithParent.push(convert2(category));
            }
        })
        let result = await connect.flotiq(apiKey, categoryContentType.name, categoriesConverted);
        notify.resultNotify(result, 'Categories from page', page);
        result = await result.json()
        imported+=result.batch_success_count;
        console.log('Categories progress: ' + imported + '/' + totalCount);

    }
    if(categoriesWithParent.length) {
        page = 0;
        imported = 0;
        totalPages = Math.ceil(categoriesWithParent.length/25);
        for(page; page < totalPages; page++) {
            let result = await connect.flotiq(apiKey, categoryContentType.name, categoriesWithParent.slice(page*25,(page+1)*25));
            notify.resultNotify(result, 'Categories with parents from page', page);
            imported++;
            console.log('Updating categories parents progress: ' + imported + '/' + categoriesWithParent.length);
        }
    }

    function convert(category) {
        return {
            id: categoryContentType.name + '_' + category.id,
            slug: category.slug,
            name: category.name,
            description: category.description
        }
    }

    function convert2(category) {
        return {
            ...convert(category),
            parentCategory: category.parent ? [{
                type: "internal",
                dataUrl: '/api/v1/content/' + categoryContentType.name + '/' + categoryContentType.name + '_' + category.parent
            }] : []
        }
    }
}
