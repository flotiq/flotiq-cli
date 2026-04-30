let countedObjects = {};

module.exports = stats = async (flotiqApi) => {
    let loading = (function() {
        let h = ['|', '/', '-', '\\'];
        let i = 0;

        return setInterval(() => {
            i = (i > 3) ? 0 : i;
            console.clear();
            console.log('Fetching statistics... ' + h[i]);
            i++;
        }, 300);
    })();

    let contentTypeDefinitions = await flotiqApi.fetchContentType();
    let totalCTDS = contentTypeDefinitions.length;

    pushObj("Content Type Definitions", totalCTDS);

    let index = 0;
    let totalCO = 0;

    while (index < totalCTDS) {
        const ctdName = contentTypeDefinitions[index].name;
        const contentObjectsData = (await flotiqApi.middleware.get(`/content/${ctdName}?page=1&limit=1`)).data;
        totalCO += contentObjectsData.total_count;
        pushObj(ctdName, contentObjectsData.total_count);
        index++;
    }

    pushObj("Total content objects", totalCO);

    const mediaData = (await flotiqApi.middleware.get('/content/_media?page=1&limit=1')).data;
    pushObj("Media", mediaData.total_count);

    const webhooksData = (await flotiqApi.middleware.get('/content/_webhooks?page=1&limit=1')).data;
    pushObj("Webhooks", webhooksData.total_count);

    const limit = 10;

    let latestContentObjects = (await flotiqApi.middleware.get(
        `/search?limit=${limit}&q=*&order_by=internal.updatedAt&order_direction=desc`
    )).data;

    console.table(countedObjects);

    const idIndex = {};
    const apiOrigin = new URL(flotiqApi.flotiqApiUrl).origin;

    console.log('\n10 recently modified objects:');
    const latestItems = (Array.isArray(latestContentObjects.data) ? latestContentObjects.data : []).slice(0, limit);

    for (const entry of latestItems) {
        if (!entry?.item?.internal || !entry.item.id) {
            continue;
        }

        let ctd = entry.item.internal.contentType;
        let id = entry.item.id;
        let time = entry.item.internal.updatedAt;
        let title = entry.item.internal.objectTitle;

        if (title === "" && ctd === '_media') {
            title = apiOrigin + entry.item.url;
        }

        idIndex[id] = new LatestObject(title, ctd, formatDate(new Date(time)));
    }
    clearInterval(loading);
    console.table(idIndex);
}

function LatestObject(title, ctd, time) {
    this.Title = title;
    this.CTD = ctd;
    this.Date = time;
}

function CountObjects(numberOfObj) {
    this['Number of Objects'] = numberOfObj;
}

function pushObj(str, num) {
    countedObjects[str] = new CountObjects(num);
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

function padTo2Digits(num) {
    return num.toString().padStart(2, '0');
}
