const flotiqMedia = async (flotiqApi) => {
    let totalPages = 1;
    let page = 1;
    let allImages = [];
    for (page; page <= totalPages; page++) {
        const response = await flotiqApi.middleware.get(`/content/_media?limit=1000&page=${page}`);
        const imagesJson = response.data;
        totalPages = imagesJson.total_pages;
        allImages = [...allImages, ...imagesJson.data];
    }
    return allImages;
}

const cfMediaToObject = (data, trans) => {
    const assets = [];
    for (let i in data) {
        assets[i] = {
            fileName: data[i].fields.file[trans].fileName,
            url: 'http:' + data[i].fields.file[trans].url,
            mime_type: data[i].fields.file[trans].contentType,
            cf_id: data[i].sys.id
        }
    }
    return (assets);
}

module.exports = {cfMediaToObject, flotiqMedia}
