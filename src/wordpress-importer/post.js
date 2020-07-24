const notify = require('../helpers/notify');
const connect = require('../helpers/connect');
const convertHelper = require('../helpers/convert');
const postContentType = require('../content-type-definitions/contentType4.json');
const tagContentType = require('../content-type-definitions/contentType2.json');
const categoryContentType = require('../content-type-definitions/contentType3.json');
const authorContentType = require('../content-type-definitions/contentType1.json');

exports.importer = async (apiKey, wordpressUrl, mediaArray) => {
    console.log('Importing posts to Flotiq');
    let perPage = 25;
    let page = 1;
    let totalPages = 1;
    let totalCount = 1;
    let imported = 0;

    for(page; page <= totalPages; page++) {
        let wordpressResponse = await connect.wordpress(wordpressUrl, perPage, page, totalPages, 'posts');
        totalPages = wordpressResponse.totalPages;
        totalCount = wordpressResponse.totalCount;

        let responseJson = wordpressResponse.responseJson;
        let postsConverted = [];
        responseJson.map(async (post) => {
            postsConverted.push(convert(post, mediaArray));
        })
        let result = await connect.flotiq(apiKey, postContentType.name, postsConverted);
        notify.resultNotify(result, 'Posts from page', page);
        result = await result.json()
        imported+=result.batch_success_count;
        console.log('Posts progress: ' + imported + '/' + totalCount);

    }

    function convert(post, mediaArray) {
        let tags = post.tags.length ? post.tags.map((tag) => {
            return {
                type: 'internal',
                dataUrl: '/api/v1/content/' + tagContentType.name + '/' + tagContentType.name + '_' + tag
            };
        }) : [];
        let categories = post.categories.length ? post.categories.map((category) => {
            return {
                type: 'internal',
                dataUrl: '/api/v1/content/' + categoryContentType.name + '/' + categoryContentType.name + '_' + category
            };
        }) : [];
        return {
            id: postContentType.name + '_' + post.id,
            slug: post.slug,
            title: post.title.rendered,
            status: post.status,
            type: post.type,
            created: post.date,
            modified: post.modified,
            content: convertHelper.convertContent(post.content.rendered, mediaArray),
            excerpt: post.excerpt.rendered,
            author: [{
                type: 'internal',
                dataUrl: '/api/v1/content/' + authorContentType.name + '/' + authorContentType.name + '_' + post.author
            }],
            featuredMedia: post.featured_media && mediaArray[post.featured_media] ? [{
                type: 'internal',
                dataUrl: '/api/v1/content/_media/' + mediaArray[post.featured_media].id
            }] : [],
            tags: tags,
            categories: categories

        }
    }
}
