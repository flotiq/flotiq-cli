const axios = require('axios');
const fs = require('fs/promises')
const path = require('path')
const traverse = require('traverse')
const logger = require('./logger')
const FlotiqApi = require("./flotiq-api");
const { Blob } = require('buffer');

async function mediaImporter (directory, flotiqApiUrl, flotiqApiKey, batchSize = 100, checkIfMediaUsed = true) {
    logger.info(`Start import media files!!!!!!!!!!!!`)
    const flotiqApi = new FlotiqApi(flotiqApiUrl, flotiqApiKey, {
        batchSize: batchSize,
    });

    const mediaApi = axios.create({
        baseURL: `${(new URL(flotiqApiUrl)).origin}/api/media`,
        timeout: flotiqApi.timeout,
        headers: flotiqApi.headers,
    });

    const flotiqDefinitions = await flotiqApi.fetchContentTypeDefs()

    const mediaRelationships = flotiqDefinitions.filter(definition => {
        return traverse(definition).reduce((acc, node) => {
            if(node?.inputType === "datasource" && node.validation.relationContenttype === '_media'
            ) {
                return true;
            }
            return acc;
        }, false)
    }).map(def => def.name)

    const mediaRelationshipContentObjects = (await Promise.all(mediaRelationships.map(r => flotiqApi.fetchContentObjects(r)))).flat()

    const contentObjects = await fs
        .readFile(`${directory}/InternalContentTypeMedia/contentObjectMedia.json`, 'utf-8')
        .then(f => f.split('\n'))
        .then(f => f.filter(el => el !== ''))
        .then(f => f.map(JSON.parse))
        .then(f => f.flat())

    const missingFiles = []

    for (const mediaFile of contentObjects) {
        const mediaFileUrl = `${(new URL(flotiqApiUrl)).origin}${mediaFile.url}`
        const response = await fetch(mediaFileUrl)

        if (response.status === 404) {
            missingFiles.push(mediaFile)
        }
    }

    const replacements = [];

    logger.info(`Will import ${missingFiles.length} missing media file(s)`)

    for (const file of missingFiles) {
        let isUsed = false;

        for (const relatedContentObject of mediaRelationshipContentObjects) {
            isUsed = isUsed || traverse(relatedContentObject).reduce(function (acc, node) {
                if(this.key === 'dataUrl') {
                    const [,,,, ctd, id ] = node.split('/')
                    if (ctd === '_media' && id === file.id) {
                        return true;
                    }
                }
                return acc;
            }, false)
        }

        if (checkIfMediaUsed) {
            if (!isUsed) {
                continue;
            }
        }

        const buffer = await fs.readFile(`${directory}/InternalContentTypeMedia/${file.id}.${file.extension}`)

        const form = new FormData();

        const blob = new Blob([buffer], {
            type: file.mimeType
        });

        form.append('type', 'file');
        form.append('save', 1);
        form.append('file', blob, file.fileName);

        const mediaEntity = await mediaApi
            .post('', form, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })
            .then(res => res.data)

        replacements.push([file, mediaEntity])
    }

    logger.info('Will replace media in content objects')

    for (const relatedContentObject of mediaRelationshipContentObjects) {

        const shouldUpdate = traverse(relatedContentObject).reduce(function (acc, node) {
            if(this.key === 'dataUrl') {
                const [,,,, ctd, id ] = node.split('/')
                if (ctd === '_media') {
                    let haveReplacement = false;
                    for (const [ originalFile, replacementFile ] of replacements) {
                        if (id === originalFile.id) {
                            this.update(`/api/v1/content/${ctd}/${replacementFile.id}`)
                            haveReplacement = true;
                        }
                    }
                    return acc || haveReplacement;
                }
            }
            return acc;
        }, false)

        if (shouldUpdate) {
            logger.info(`Replacing ${relatedContentObject.id}`)
            const response = await flotiqApi.middleware.put(
                `/content/${relatedContentObject.internal.contentType}/${relatedContentObject.id}`, relatedContentObject)
            if (response.status === 200) {
                logger.info(`Updated content object ${relatedContentObject.internal.contentType}/${relatedContentObject.id}`)
            }
        }
    }


    logger.info(`Will delete ${missingFiles.length} broken media file(s)`)

    for (const file of missingFiles) {
        await flotiqApi.middleware.delete(`/content/_media/${file.id}`).catch(() => {})
    }
}

module.exports = {mediaImporter}
