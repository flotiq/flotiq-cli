#!/usr/bin/env node

const util = require('util')
const glob = util.promisify(require('glob'))
const fs = require('fs/promises')
const path = require('path')
const traverse = require('traverse')
const logger = require('./../src/logger')
const fetch = require('node-fetch')
const FlotiqApi = require("./../src/flotiq-api");
const config = require("./../src/configuration/config");

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

async function checkIfClear(flotiqApiUrl, headers, CTDs) {
    let remoteContentTypeDefinitions = await fetch(
        `${flotiqApiUrl}/internal/contenttype?internal=0&limit=100000`,
        {
            headers
        }
    )
        .then(async response => await response.json())
        .then(response => response.data)

    const _webhookContentTypeDefinition = await fetch(
        `${flotiqApiUrl}/internal/contenttype/_webhooks?internal=1&limit=100000`,
        {
            headers
        }
    ).then(async response => await response.json())

    remoteContentTypeDefinitions.push(_webhookContentTypeDefinition)

    if (remoteContentTypeDefinitions.length > 0) {
        logger.warn('Target not clear')

        const remoteCtdNames = remoteContentTypeDefinitions.map(({name}) => name)
        const overlap = CTDs
            .filter(el => remoteCtdNames.includes(el.name))
            .filter(el => el.internal !== true);

        if (
            overlap.length > 0 &&
            overlap.length !== 1 &&
            overlap[0] !== '_webhooks'
        ) {
            logger.error(
                `There's overlap between imported CTDs and CTDs already in Flotiq: "${overlap.map(el => el.name).join(
                    '", "'
                )}"; use either --skip-definitions or --update-definitions to continue`
            )
            return false
        }
    }

    return true
}

async function importer(directory, flotiqApiUrl, flotiqApiKey, skipDefinitions, skipContent, updateDefinitions, disableWebhooks, fixDefinitions,
                        ctd,
                        skipCtd,
                        batch)
{
    if (fixDefinitions) {
        updateDefinitions = true;
        skipContent = true;
        if (ctd || skipCtd) {
            throw new Error(`Cannot use --ctd or --skip-ctd with --fix-definitions`);
        }
    }

    const BATCH_SIZE = batch || 100;

    const flotiqApi = new FlotiqApi(flotiqApiUrl, flotiqApiKey, {
        batchSize: BATCH_SIZE,
    });

    if (!directory || !flotiqApiUrl || !flotiqApiKey) {
        console.error(`Usage: ${__filename} <import_dir> <api_url> <api_key>`)
        process.exit(1)
    }

    try {
        await fs.stat(path.resolve(directory))
    } catch (e) {
        logger.error(`Cannot open import dir ${directory}`)
        process.exit(1)
    }

    const headers = {
        'Content-type': 'application/json;charset=utf-8',
        'X-Auth-Token': flotiqApiKey
    }

    const CTDFiles = await glob(`${directory}/**/ContentTypeDefinition.json`)

    let CTDs = await Promise.all(
        CTDFiles.map(fn => fs.readFile(fn, 'utf-8').then(JSON.parse))
    )

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

        CTDs = CTDs.filter(def => !flatCtdsToSkip.includes(def.name))
    }

    if (
        !(skipDefinitions || updateDefinitions) &&
        !(await checkIfClear(flotiqApiUrl, headers, CTDs))
    ) {
        process.exit(1)
    }

    if (skipDefinitions) {
        logger.info('Pass 1 – import content type definitions [skipped]')
    } else {
        logger.info('Pass 1 – import content type definitions')

        for (const contentTypeDefinition of traverse.clone(CTDs)) {
            if (contentTypeDefinition.internal) {
                logger.info(`Not importing internal CTD ${contentTypeDefinition.name}`);
                continue;
            }

            const remoteCtd = await fetch(
                `${flotiqApiUrl}/internal/contenttype/${contentTypeDefinition.name}`,
                {headers}
            )
                .then(response => response.json())
                .catch(() => {
                })

            // console.log('existing ctd', remoteCtd)
            if (remoteCtd?.id && !updateDefinitions) {
                throw new Error(`CTD exists and we are not updating`)
            }

            const method = remoteCtd?.id ? 'PUT' : 'POST'

            const uri = remoteCtd?.id
                ? `${flotiqApiUrl}/internal/contenttype/${remoteCtd.name}`
                : `${flotiqApiUrl}/internal/contenttype`

            logger.info(
                `${remoteCtd ? 'Updating' : 'Persisting'} contentTypeDefinition ${contentTypeDefinition.name}`
            )

            // console.log('new ctd', contentTypeDefinition)

            const response = await fetch(uri, {
                method,
                body: JSON.stringify(contentTypeDefinition),
                headers
            })

            if (response.ok) {
                logger.info(
                    `${remoteCtd ? 'Updated' : 'Persisted'} contentTypeDefinition ${contentTypeDefinition.name} ${(await response.json()).id}`
                )
            } else {
                console.log({response})
                let responseJson = await response.json()
                throw new Error(util.format(`${response.statusText}:`, responseJson))
            }
        }
    }

    const existingWebhooks = await flotiqApi.fetchContentObjects('_webhooks');

    if (disableWebhooks) {
        logger.info(`Pass 1a - disable webhooks`);
        await flotiqApi.patchContentObjectBatch('_webhooks', existingWebhooks.map(webhook => ({
            id: webhook.id,
            enabled: false
        })));
    }

    if (skipContent) {
        logger.info('All done')
        return
    }

    logger.info('Pass 2 – break relationships in content type definitions')

    const breakDefinitions = true;

    const remoteContentTypeDefinitions = await flotiqApi.fetchContentTypeDefs();

    const brokenConstraints = [];

    if (breakDefinitions) {
        /**
         * We need to clone this right nowe because we will be restoring them at the end.
         */
        for (const contentTypeDefinition of traverse.clone(remoteContentTypeDefinitions)) {
            if (contentTypeDefinition.internal) {
                // logger.info(`Not breaking up internal CTD ${contentTypeDefinition.name}`)
                continue;
            }

            let haveRelationshipConstraints = traverse(contentTypeDefinition)
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
                }, false)

            if (haveRelationshipConstraints) {
                logger.info(`Breaking constraints for contentType ${contentTypeDefinition.name}`);
                await flotiqApi.updateContentTypeDefinition(contentTypeDefinition.name, contentTypeDefinition);
                brokenConstraints.push(contentTypeDefinition.name)
            } else {
                logger.info(`No constraints to break for contentType ${contentTypeDefinition.name}`);
            }
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

            if (ContentObjects[contentTypeDefinition.name] === '_webhooks') {
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

            if (ContentObjects[contentTypeDefinition.name] === '_webhooks') {
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

    const restoreDefinitions = true;

    if (restoreDefinitions) {
        logger.info('Pass 5 – restore relationships in definitions')

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

    if (disableWebhooks && existingWebhooks.length > 0) {
        // We should restore our webhooks even if we're importing webhooks,
        // so any webhooks not imported are restored correctly.
        logger.info('Pass 5a - Restoring webhooks')
        await flotiqApi
            .persistContentObjectBatch(
                '_webhooks',
                existingWebhooks
            );
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
                await flotiqApi
                    .persistContentObjectBatch(
                        contentTypeDefinition.name,
                        ContentObjects[contentTypeDefinition.name]
                    );
            }
        }
    }
}
async function main(argv) {
    await importer(
        argv.directory,
        `${config.apiUrl}/api/v1`,
        argv.flotiqApiKey,
        false,
        false,
        true,
        false,
        false
    )
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
    handler: main,
    exporter: importer
}
