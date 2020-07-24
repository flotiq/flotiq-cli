const config = require('../configuration/config');

exports.convertContent = (content, mediaArray) => {
    let convertedMediaArray = exports.convertMediaArray(mediaArray);
    Object.keys(convertedMediaArray).forEach((media) => {
        Object.keys(convertedMediaArray[media].sizes).forEach(size => {
            const regex = new RegExp(convertedMediaArray[media].sizes[size].source_url.replace(/\\/g, "\\\\").replace(/\./g, "\\\."), 'g');
            content = content.replace(regex, config.apiUrl + '/image/0x0/' + convertedMediaArray[media].id + '.' + convertedMediaArray[media].extension);
        })
    })
    return content;
}

exports.convertMediaArray = (mediaArray) => {
    let convertedMediaArray = {}
    Object.keys(mediaArray).forEach((media) => {
        convertedMediaArray[mediaArray[media].fileName] = mediaArray[media];
    })
    return convertedMediaArray;
}
