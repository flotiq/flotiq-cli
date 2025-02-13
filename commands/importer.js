#!/usr/bin/env node

const util = require('util')
const glob = util.promisify(require('glob'))
const fs = require('fs/promises')
const path = require('path')
const traverse = require('traverse')
const logger = require('./../src/logger')
const FlotiqApi = require("./../src/flotiq-api");
const config = require("./../src/configuration/config");
const {mediaImporter} = require("./../src/media");
const axios = require("axios");
const {shouldUpdate } = require("./../src/util");
const {readCTDs} = require("../src/util");

const WEBHOOKS_MESSAGE_403 = 'It looks like the api key does not have access to webhooks, it continues without deactivating webhooks';

exports.command = 'import'
exports.description = 'Import flotiq entities from JSON structure'
exports.builder = {
    source: {
        description: 'Import directory',
        alias: 'directory',
        type: 'string',
        demand: true
    },
    ctd: {
        description: 'Coma-delimited list of CTD to import, can be used multiple times',
        type: 'string'
    },
    'skip-ctd': {
        description: 'Coma-delimited list of CTD to skip, can be used multiple times',
        type: 'string'
    },
    'skip-definitions': {
        description: 'Import only contentObjects',
        type: 'boolean',
        default: false,
    },
    'update-definitions': {
        description: 'Reload contentTypeDefinitions',
        type: 'boolean',
        default: false,
    },
    'skip-content': {
        description: "Don't import content objects",
        type: 'boolean',
        default: false
    },
    'disable-webhooks': {
        description: "Disable webhooks during import",
        type: 'boolean',
        default: true
    },
    'fix-definitions': {
        description: "Shortcut for --update-definitions --skip-content",
    }
}

function hasRelationshipConstraints(contentTypeDefinition) {
    return traverse(contentTypeDefinition)
        .reduce(function (haveConstraints, node) {
            if (this.key === 'minItems') {
                if (node > 0) {
                    haveConstraints = true;
                    this.update(0)
                }
            }

            if (this.key === 'relationContenttype') {
                if (node !== '') {
                    this.update('');
                    haveConstraints = true;
                }
            }

            return haveConstraints;
        }, false);
}

async function restoreDefinitions(remoteContentTypeDefinitions, brokenConstraints, flotiqApi, pass = '5') {
    logger.info(`Pass ${pass} – restore relationships in definitions`)

    for (const contentTypeDefinition of traverse.clone(remoteContentTypeDefinitions)) {
        if (contentTypeDefinition.internal) {
            continue;
        }

        if (brokenConstraints.includes(contentTypeDefinition.name)) {
            logger.info(`Updating ${contentTypeDefinition.name}`)

            await flotiqApi.updateContentTypeDefinition(contentTypeDefinition.name, contentTypeDefinition);
        }
    }
}

async function importer(directory, flotiqApi, skipDefinitions, skipContent, updateDefinitions, disableWebhooks, fixDefinitions, ctd, skipCtd)
{
    if (fixDefinitions) {
        updateDefinitions = true;
        skipContent = true;
        if (ctd || skipCtd) {
            throw new Error(`Cannot use --ctd or --skip-ctd with --fix-definitions`);
        }
    }

    let existingWebhooks = [];
    if (disableWebhooks) {
        try {
            let existingWebhooks = await flotiqApi.fetchContentObjects('_webhooks');
            logger.info(`Pass 1a - disable webhooks`);
            await flotiqApi.patchContentObjectBatch('_webhooks', existingWebhooks.map(webhook => ({
                id: webhook.id,
                enabled: false
            })));
        } catch (e) {
            logger.warn(WEBHOOKS_MESSAGE_403);
        }
    }

    let CTDs = await readCTDs(directory);

    if (ctd) {
        const flatCtds = (Array.isArray(ctd) ? ctd : [ctd])
            .map(a => a.split(','))
            .flat()
            .filter(c => !!c);

        CTDs = flatCtds
            .map(ctdName => {
                const ctd = CTDs.filter(c => c.name === ctdName).pop();
                if (ctd === undefined) {
                    throw new Error(`Invalid ctd "${ctd}"`)
                }
                return ctd;
            });
    }

    if (skipCtd) {
        const flatCtdsToSkip = (Array.isArray(skipCtd) ? skipCtd : [skipCtd])
            .map(c => c.split(','))
            .flat()
            .filter(c => !!c);

        flatCtdsToSkip.forEach(ctd => {
            if (!CTDs.map(d => d.name).includes(ctd)) {
                throw new Error(`Invalid ctd "${ctd}"`)
            }
        });

        CTDs = CTDs.filter(def => !flatCtdsToSkip.includes(def.name));
    }

    if (
        !(skipDefinitions || updateDefinitions) &&
        !(await flotiqApi.checkIfClear(CTDs))
    ) {
        process.exit(1);
    }
    let featuredImages = [];

    const brokenConstraints = [];
    if (skipDefinitions) {
        logger.info('Pass 1 – import content type definitions [skipped]')
    } else {
        logger.info('Pass 1 – import content type definitions')

        for (const contentTypeDefinition of traverse.clone(CTDs)) {
            if (contentTypeDefinition.internal) {
                logger.info(`Not importing internal CTD ${contentTypeDefinition.name}`);
                continue;
            }
            const remoteCtd = await flotiqApi.fetchContentTypeDefinition(contentTypeDefinition.name)
            if (remoteCtd?.id && !updateDefinitions) {
                throw new Error(`CTD exists and we are not updating`)
            }

            logger.info(
                `${remoteCtd ? 'Updating' : 'Persisting'} contentTypeDefinition ${contentTypeDefinition.name}`
            );

            featuredImages.push(
                {
                    "ctdName": contentTypeDefinition.name,
                    "featuredImage": contentTypeDefinition.featuredImage
                }
            );
            contentTypeDefinition.featuredImage = [];
            let haveRelationshipConstraints = hasRelationshipConstraints(contentTypeDefinition);
            if (haveRelationshipConstraints) {
                brokenConstraints.push(contentTypeDefinition.name);
            }
            const response = await flotiqApi.createOrUpdate(remoteCtd, contentTypeDefinition);

            if (response.ok) {
                logger.info(
                    `${remoteCtd ? 'Updated' : 'Persisted'} contentTypeDefinition ${contentTypeDefinition.name} ${(await response.json()).id}`
                );
            } else {
                let responseJson = await response.json();
                throw new Error(util.format(`${response.statusText}:`, responseJson));
            }
        }
    }
    let remoteContentTypeDefinitions;

    if (skipContent) {
        if(brokenConstraints.length) {
            remoteContentTypeDefinitions = await flotiqApi.fetchContentTypeDefs();
            await restoreDefinitions(remoteContentTypeDefinitions, brokenConstraints, flotiqApi, '2');
        }
        logger.info('All done')
        return
    }

    logger.info('Pass 2 – break relationships in content type definitions');

    if(!remoteContentTypeDefinitions) {
        remoteContentTypeDefinitions = await flotiqApi.fetchContentTypeDefs();
    }

    /**
     * We need to clone this right now because we will be restoring them at the end.
     */
    for (const contentTypeDefinition of traverse.clone(remoteContentTypeDefinitions)) {
        if (contentTypeDefinition.internal) {
            continue;
        }

        let haveRelationshipConstraints = hasRelationshipConstraints(contentTypeDefinition);

        if (haveRelationshipConstraints) {
            logger.info(`Breaking constraints for contentType ${contentTypeDefinition.name}`);
            await flotiqApi.updateContentTypeDefinition(contentTypeDefinition.name, contentTypeDefinition);
            brokenConstraints.push(contentTypeDefinition.name);
        } else {
            logger.info(`No constraints to break for contentType ${contentTypeDefinition.name}`);
        }
    }


    const ContentObjectFiles = await glob(
        `${directory}/**/contentObject*.json`
    )

    const ContentObjects = await (
        await Promise.all(
            ContentObjectFiles.map(async fn => {
                const contentObjects = await fs
                    .readFile(fn, 'utf-8')
                    .then(f => f.split('\n'))
                    .then(f => f.filter(el => el !== ''))
                    .then(f => f.map(JSON.parse))
                    .then(f => f.flat())
                    .catch(e => {
                        console.log(`Error processing ${fn}`);
                        throw e;
                    })

                const contentTypeDefinition = JSON.parse(
                    await fs.readFile(
                        path.join(path.dirname(fn), 'ContentTypeDefinition.json'),
                        'utf-8'
                    )
                )
                return {fn, contentObjects, contentTypeDefinition}
            })
        )
    ).reduce((acc, curr) => {
        acc[curr.contentTypeDefinition.name] = [
            ...(acc[curr.contentTypeDefinition.name] || []),
            ...curr.contentObjects
        ]
        return acc
    }, {});

    if (skipContent) {
        logger.info('Pass 3 – import content objects without relationship data [skipped]')
    } else {
        logger.info('Pass 3 – import content objects without relationship data')

        for (const contentTypeDefinition of CTDs) {
            if (ContentObjects[contentTypeDefinition.name] === undefined) {
                continue;
            }

            if (contentTypeDefinition.name === '_webhooks') {
                continue;
            }

            const objectsToPersist = traverse(traverse.clone(ContentObjects[contentTypeDefinition.name]))
                .forEach(function (node) {
                    if (node && Array.isArray(node)) {
                        this.update(node.filter(val => !(val && val.type === 'internal')))
                    }
                });

            logger.info(`Persisting ${contentTypeDefinition.name} without relationships (${ContentObjects[contentTypeDefinition.name].length} items)`);

            await flotiqApi
                .persistContentObjectBatch(
                    contentTypeDefinition.name,
                    objectsToPersist
                );
        }

        logger.info('Pass 4 – import content objects with relationship data')

        for (const contentTypeDefinition of traverse.clone(CTDs)) {
            if (ContentObjects[contentTypeDefinition.name] === undefined) {
                continue;
            }

            if (contentTypeDefinition.name === '_webhooks') {
                continue;
            }

            logger.info(`Persisting ${contentTypeDefinition.name} with relationships (${ContentObjects[contentTypeDefinition.name].length} items)`);
            await flotiqApi
                .persistContentObjectBatch(
                    contentTypeDefinition.name,
                    ContentObjects[contentTypeDefinition.name]
                );
        }

        logger.info('Pass 4a – import internals')

        for (const contentTypeDefinition of traverse.clone(CTDs)) {
            if (!contentTypeDefinition.internal) {
                continue;
            }

            if (ContentObjects[contentTypeDefinition.name] === undefined) {
                continue;
            }

            switch (contentTypeDefinition.name) {
                case '_media':
                    logger.info(`Persisting ${
                        contentTypeDefinition.name
                    } (${
                        ContentObjects[contentTypeDefinition.name].length
                    } items)`);

                    await flotiqApi
                        .persistContentObjectBatch(
                            contentTypeDefinition.name,
                            ContentObjects[contentTypeDefinition.name]
                        );

                    logger.warn(`Media content objects were uploaded into the database, but files were not.`)
                    logger.warn(`Remember to ensure that media files are present at the target location.`)
                    break;
                default:
                    logger.info(`Skipping ${contentTypeDefinition.name} (${ContentObjects[contentTypeDefinition.name].length} items)`);
                    break;
            }
        }
    }

    await restoreDefinitions(remoteContentTypeDefinitions, brokenConstraints, flotiqApi);

    if (disableWebhooks && existingWebhooks.length > 0) {
        // We should restore our webhooks even if we're importing webhooks,
        // so any webhooks not imported are restored correctly.
        logger.info('Pass 5a - Restoring webhooks');
        try {
            await flotiqApi
                .persistContentObjectBatch(
                    '_webhooks',
                    existingWebhooks
                );
        } catch (e) {
            logger.warn(WEBHOOKS_MESSAGE_403);
        }
    }

    if (CTDs.map(c => c.name).includes('_webhooks')) {
        logger.info('Pass 5a - Importing webhooks')
        for (const contentTypeDefinition of traverse.clone(CTDs)) {
            if (!contentTypeDefinition.internal) {
                continue;
            }

            if (ContentObjects[contentTypeDefinition.name] === undefined) {
                continue;
            }

            if (contentTypeDefinition.name === '_webhooks') {
                logger.info(`Persisting ${contentTypeDefinition.name} (${ContentObjects[contentTypeDefinition.name].length} items)`);
                if (disableWebhooks) {
                    ContentObjects[contentTypeDefinition.name].map(webhook => {
                        webhook.enabled = false;
                    });
                }
                await flotiqApi
                    .persistContentObjectBatch(
                        contentTypeDefinition.name,
                        ContentObjects[contentTypeDefinition.name]
                    );
            }
        }
    }

    return [featuredImages, CTDs];
}

async function featuredImagesImport(flotiqApi, contentTypeDefinitions, featuredImages, replacements ) {
    for (let contentTypeDefinition of contentTypeDefinitions) {
        for (const featuredImage of featuredImages) {
            if (contentTypeDefinition.name === featuredImage.ctdName) {
                contentTypeDefinition.featuredImage = featuredImage.featuredImage;
                if (replacements.length) {
                    await shouldUpdate(contentTypeDefinition, replacements)
                }
                let response = await flotiqApi.updateContentTypeDefinition(contentTypeDefinition.name, contentTypeDefinition)
                    .catch((e)=>{return e.response});
                if (response.status === 200) {
                    logger.info(`Feature image for CTD ${contentTypeDefinition.name} - updated`);
                } else {
                    logger.error(`Feature image for CTD ${contentTypeDefinition.name} - not updated`);
                }
            }
        }
    }
}

async function handler(argv) {
    let directory = argv.directory;
    if (!directory || !argv.flotiqApiKey) {
        console.error(`Usage: ${__filename} <import_dir> <api_key>`)
        return false;
    }

    try {
        await fs.stat(path.resolve(directory))
    } catch (e) {
        logger.error(`Cannot open import dir ${directory}`)
        return false;
    }

    const flotiqApi = new FlotiqApi(`${config.apiUrl}/api/v1`,  argv.flotiqApiKey, {
        batchSize: 100,
        writePerSecondLimit: 10
    });

    let [featuredImages, CTDs] = await importer(
        directory,
        flotiqApi,
        false,
        false,
        true,
        true,
        false
    );
    const mediaApi = axios.create({
        baseURL: `${(new URL(`${config.apiUrl}/api/v1`)).origin}/api/media`,
        timeout: flotiqApi.timeout,
        headers: flotiqApi.headers,
    });

    let replacements = await mediaImporter(
        directory,
        flotiqApi,
        mediaApi,
        writePerSecondLimit = 10
    );

    await featuredImagesImport(
        flotiqApi,
        CTDs,
        featuredImages,
        replacements
    );

}

module.exports = {
    command: 'import [directory] [flotiqApiKey]',
    describe: 'Import objects from directory to Flotiq',
    builder: (yargs) => {
        return yargs
            .option("directory", {
                description: "Directory path to import data.",
                alias: "",
                type: "string",
                default: "",
                demandOption: false,
            })
            .option("flotiqApiKey", {
                description: "Flotiq Read and write API KEY.",
                alias: "",
                type: "string",
                default: false,
                demandOption: false,
            })
    },
    handler,
    importer
}
