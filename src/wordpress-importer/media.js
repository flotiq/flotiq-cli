const notify = require('../helpers/notify');
const connect = require('../helpers/connect');

exports.importer = async (apiKey, wordpressUrl) => {
    console.log('Importing media to Flotiq');
    let perPage = 100;
    let page = 1;
    let totalPages = 1;
    let totalCount = 1;
    let imported = 0;
    let mediaArray = {};
    let images = await connect.flotiqMedia(apiKey);
    images = convertImages(images);

    for(page; page <= totalPages; page++) {
        let wordpressResponse = await connect.wordpress(wordpressUrl, perPage, page, totalPages, 'media');
        totalPages = wordpressResponse.totalPages;
        totalCount = wordpressResponse.totalCount;
        let responseJson = wordpressResponse.responseJson;
        await Promise.all(responseJson.map(async (media) => {
            let mediaConverted = convert(media);
            let result = await connect.flotiqMediaUpload(apiKey, 'media', mediaConverted, images);
            notify.resultNotify(result, 'Media', mediaConverted.fileName);
            imported++;
            if(result) {
                mediaArray[media.id] = result.data ? result.data[0] : result;
                mediaArray[media.id].sizes = media.media_details && media.media_details.sizes ? media.media_details.sizes : {size: {source_url: media.guid.rendered}};
            }
        }))
        console.log('Media progress: ' + imported + '/' + totalCount);
    }

    function convert(media) {
        if(media.media_details && media.media_details.sizes && media.media_details.sizes.full) {
            return {
                fileName: media.media_details.sizes.full.file,
                url: media.media_details.sizes.full.source_url,
                mime_type: media.mime_type
            }
        } else {
            let guid = media.guid.rendered.split('/');
            return {
                fileName: guid[guid.length - 1],
                url: media.guid.rendered,
                mime_type: media.mime_type
            }
        }
    }

    function convertImages(images) {
        let convertedImages = {};
        images.forEach(image => {
            convertedImages[image.fileName] = image;
        })
        return convertedImages;
    }

    return mediaArray;
}
