const fs = require('fs/promises')
const traverse = require('traverse')
const logger = require('./logger')
const { Blob } = require('buffer');
const {readCTDs, shouldUpdate } = require("./util");

async function mediaImporter (directory, flotiqApi, mediaApi) {
    const checkIfMediaUsed = true;

    const flotiqDefinitions = await flotiqApi.fetchContentTypeDefs();
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

    try {
        const contentObjects = await fs
          .readFile(`${directory}/InternalContentTypeMedia/contentObjectMedia.json`, 'utf-8')
          .then(f => f.split('\n'))
          .then(f => f.filter(el => el !== ''))
          .then(f => f.map(JSON.parse))
          .then(f => f.flat())

        const missingFiles = []

        for (const mediaFile of contentObjects) {
            const mediaFileUrl = `${(new URL(flotiqApi.flotiqApiUrl)).origin}${mediaFile.url}`
            const response = await fetch(mediaFileUrl)

            if (response.status === 404) {
                missingFiles.push(mediaFile)
            }
        }

        const replacements = [];

        logger.info(`Will import ${missingFiles.length} missing media file(s)`)

        for (const file of missingFiles) {
            let isUsed = checkIsUsedIn(file.id, mediaRelationshipContentObjects);

            const CTDs = await readCTDs(directory);
            let isUsedInCtd = checkIsUsedIn(file.id, CTDs);

            if (checkIfMediaUsed) {
                if (!isUsed && !isUsedInCtd) {
                    continue;
                }
            }
            const buffer = await fs.readFile(`${directory}/InternalContentTypeMedia/${file.id}.${file.extension}`)

            const form = new FormData();

            const blob = new Blob([buffer], {
                type: file.mimeType
            });

            form.append('type', file.type);
            form.append('file', blob, file.fileName);

            const mediaEntity = await postMedia(form, mediaApi);

            replacements.push([file, mediaEntity]);
        }

        logger.info('Will replace media in content objects')

        for (const relatedContentObject of mediaRelationshipContentObjects) {

            const shouldUpdateBeUpdated = shouldUpdate(relatedContentObject, replacements)

            if (shouldUpdateBeUpdated) {
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
            await flotiqApi.middleware.delete(`/content/_media/${file.id}`).catch(() => {
                logger.error('File deletion error: ', file.id)
            })
        }

        return replacements;
    } catch (e) {
        if(/ENOENT: no such file or directory, open '.*\/InternalContentTypeMedia\/contentObjectMedia.json'/.test(e)) {
            logger.info('No media to import');
        } else {
            logger.error(e);
        }
    }
}

const postMedia = async (form, mediaApi) => {
    const response = await mediaApi.post('', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    return response.data;
}

async function checkIsUsedIn(fileId, objects) {
    let isUsed = false;
    for (const relatedContentObject of objects) {
        isUsed = isUsed || traverse(relatedContentObject).reduce(function (acc, node) {
            if(this.key === 'dataUrl') {
                const [,,,, ctd, id ] = node.split('/')
                if (ctd === '_media' && id === fileId) {
                    return true;
                }
            }
            return acc;
        }, false)
    }
}

module.exports = {mediaImporter}
