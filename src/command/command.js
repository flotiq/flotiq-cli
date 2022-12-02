#!/usr/bin/env node
require('dotenv').config();
const questionsText = require('./questions');
const importer = require('../importer/importer');
const exporter = require('../exporter/exporter');
const projectSetup = require('../start/projectSetup');
const custom = require('../console/console');
const inquirer = require("inquirer");
const yargs = require('yargs');
const fs = require('fs');
const errors = [];
const stdOut = [];
let errorObject = {errorCode: 0};
const oldConsole = console;
const purgeContentObjects = require('../purifier/purifier')
const sdk = require('../sdk/sdk');
const stats = require('../stats/stats');
const xlsxMigrator = require('flotiq-excel-migrator');

yargs
    .boolean('json-output')
    .alias('json-output', ['j'])
    .describe('json-output', ' Whether to save results as JSON')
    .string('framework')
    .alias('framework', ['fw'])
    .describe('framework', ' Determines which framework should be used (gatsby, nextjs)')
    .command('start [directory] [url] [flotiqApiKey] [framework]', 'Start the project', (yargs) => {
        yargs.positional('directory', {
            describe: 'Directory to create project in.',
            type: 'string',
        })
        yargs.positional('url', {
            describe: 'Url to git repository with starter.',
            type: 'string',
        });
        optionalParamFlotiqApiKey(yargs);
        yargs.positional('framework', {
            describe: 'Framework determining if the starter is nextjs or gatsby.',
            type: 'string',
        });
    }, async (argv) => {
        console = custom.console(oldConsole, yargs.argv['json-output'], errors, stdOut, errorObject, fs);
        let isJson = !!yargs.argv['json-output']
        if (yargs.argv.help) {
            yargs.showHelp();
            process.exit(1);
        }
        if (yargs.argv._.length < 3) {
            let answers = await askQuestions(questionsText.START_QUESTIONS);
            let { flotiqApiKey, projectDirectory, url } = answers;
            start(flotiqApiKey, projectDirectory, url, isJson);
        } else if (yargs.argv._.length === 3 && apiKeyDefinedInDotEnv()) {
            start(process.env.FLOTIQ_API_KEY, argv.directory, argv.url, isJson, yargs.argv['framework']);
        } else if (yargs.argv._.length === 4 && argv.flotiqApiKey) {
            start(argv.flotiqApiKey, argv.directory, argv.url, isJson, yargs.argv['framework']);
        } else if (yargs.argv._.length === 4 && apiKeyDefinedInDotEnv()) {
            start(process.env.FLOTIQ_API_KEY, argv.directory, argv.url, isJson, yargs.argv['framework']);
        } else if (yargs.argv._.length === 5) {
            start(argv.flotiqApiKey, argv.directory, argv.url, isJson, yargs.argv['framework']);
        } else {
            yargs.showHelp();
            process.exit(1);
        }
    })
    .command('import [directory] [flotiqApiKey]', 'Import objects from directory to Flotiq', (yargs) => {
        yargs.positional('directory', {
            describe: 'Directory path with Flotiq sample data (directory cannot be empty, if you wish to run command in current directory, insert . (dot)).',
            type: 'string',
        });
        optionalParamFlotiqApiKey(yargs);
    }, async (argv) => {
        console = custom.console(oldConsole, yargs.argv['json-output'], errors, stdOut, errorObject, fs);
        if (yargs.argv._.length < 2) {
            const answers = await askQuestions(questionsText.IMPORT_QUESTIONS);
            let { flotiqApiKey, projectDirectory } = answers;
            let directory = getObjectDataPath(projectDirectory);
            await importer.importer(flotiqApiKey, directory, true);
        } else if (yargs.argv._.length === 2 && apiKeyDefinedInDotEnv()) {
            let directory = getObjectDataPath(argv.directory);
            await importer.importer(process.env.FLOTIQ_API_KEY, directory, true);
        } else if (yargs.argv._.length === 3) {
            let directory = getObjectDataPath(argv.directory);
            await importer.importer(argv.flotiqApiKey, directory, true);
        }
    })
    .command('wordpress-import [wordpressUrl] [flotiqApiKey]', 'Import wordpress to Flotiq', (yargs) => {
        yargs.positional('wordpressUrl', {
            describe: 'Url to wordpress blog project',
            type: 'string',
        });
        optionalParamFlotiqApiKey(yargs);
    }, async (argv) => {

        const wordpressStart = require('flotiq-wordpress-import');
        // overriding the console in this case is not required, custom console is build in wordpress-importer
        if (yargs.argv._.length < 2) {
            const answers = await askQuestions(questionsText.WORDPRESS_IMPORT_QUESTIONS);
            let { flotiqApiKey, wordpressUrl } = answers;
            await wordpressStart(flotiqApiKey, wordpressUrl, yargs.argv['json-output'])
        } else if (yargs.argv._.length === 2 && apiKeyDefinedInDotEnv()) {
            await wordpressStart.run(process.env.FLOTIQ_API_KEY, argv.wordpressUrl, yargs.argv['json-input']);
        } else if (yargs.argv._.length === 3) {
            await wordpressStart.run(argv.flotiqApiKey, argv.wordpressUrl, yargs.argv['json-output']);
        }
    })
    .command('contentful-import [contentfulSpaceId] [contentfulContentManagementToken] [flotiqApiKey] [translation]', 'Import Contentful to Flotiq', (yargs) => {
    }, async (argv) => {
        const contentful = require('../contentful-import/flotiq-contentful-import.js');
        if (yargs.argv._.length < 3 || yargs.argv._.length === 3 && !apiKeyDefinedInDotEnv()) {
            const answers = await askQuestions(questionsText.CONTENTFUL_IMPORT);
            let { contentfulSpaceId, contentfulApiKey, flotiqApiKey } = answers;
            await contentful(contentfulSpaceId, contentfulApiKey, flotiqApiKey);
        } else if (yargs.argv._.length === 3 && apiKeyDefinedInDotEnv()) {
            await contentful(argv.contentfulSpaceId, argv.contentfulContentManagementToken, process.env.FLOTIQ_API_KEY);
        } else if (yargs.argv._.length === 4) {
            await contentful(argv.contentfulSpaceId, argv.contentfulContentManagementToken, argv.flotiqApiKey);
        } else if (yargs.argv._.length === 5) {
            await contentful(argv.contentfulSpaceId, argv.contentfulContentManagementToken, argv.flotiqApiKey, argv.translation);
        } else {
            yargs.showHelp();
            process.exit(1);
        }
    })
    .command(
        'purge [flotiqApiKey] [options]',
        'Purge Flotiq account, removes all objects to which the key has access',
        (yargs) => {
            optionalParamFlotiqApiKey(yargs);
        }, async (argv) => {
            if (yargs.argv._.length < 2 && !apiKeyDefinedInDotEnv()) {
                console.log('Api key not found')
            } else if (yargs.argv._.length === 1 && apiKeyDefinedInDotEnv()) {
                await purgeContentObjects(argv.flotiqApiKey, argv.withInternal);
            } else if (yargs.argv._.length === 2) {
                const answers = await askQuestions(questionsText.PURGE_QUESTION);
                const { confirmation } = answers;
                if (!argv.flotiqApiKey && apiKeyDefinedInDotEnv()) {
                    argv.flotiqApiKey = process.env.FLOTIQ_API_KEY;
                }
                if (confirmation.toUpperCase() === 'Y') {
                    await purgeContentObjects(argv.flotiqApiKey, argv.withInternal);
                } else {
                    console.log('I\'m finishing, no data has been deleted');
                    process.exit(1);
                }
            }
        })
    .command(
        'export [directory] [flotiqApiKey]',
        'Export objects from Flotiq to directory',
        (yargs) => {
            yargs.positional('directory', {
                describe: 'Directory path to save data.',
                type: 'string',
            });
            yargs.boolean('only-definitions')
                .describe('only-definitions', 'Export only content type definitions, ignore content objects')
            optionalParamFlotiqApiKey(yargs);
        }, async (argv) => {
            let onlyDefinitions = yargs.argv['only-definitions'];
            console = custom.console(oldConsole, yargs.argv['json-output'], errors, stdOut, errorObject, fs);
            if (yargs.argv._.length < 2) {
                const answers = await askQuestions(questionsText.EXPORT_QUESTIONS);
                let { flotiqApiKey, projectDirectory } = answers;
                await exporter.export(flotiqApiKey, projectDirectory, onlyDefinitions);
            } else if (yargs.argv._.length === 2 && apiKeyDefinedInDotEnv()) {
                await exporter.export(process.env.FLOTIQ_API_KEY, argv.directory, onlyDefinitions);
            } else if (yargs.argv._.length === 3) {
                await exporter.export(argv.flotiqApiKey, argv.directory, onlyDefinitions);
            }
        })
    .command('sdk install [language] [directory] [flotiqApiKey]', 'Install Flotiq SDK', (yargs) => {
        yargs.positional('language', {
            describe: 'SDK language, choices: csharp, go, java, javascript, php, python, typescript',
            type: 'string',
            choices: ['csharp', 'go', 'java', 'javascript', 'php', 'python', 'typescript']
        })
        yargs.positional('directory', {
            describe: 'Directory where to install SDK',
            type: 'string',
        });
        optionalParamFlotiqApiKey(yargs);
    }, async (argv) => {
        if (yargs.argv.help) {
            yargs.showHelp();
            process.exit(1);
        }
        if (yargs.argv._.length < 3) {
            let answers = await askQuestions(questionsText.INSTALL_SDK);
            let { language, projectDirectory, apiKey } = answers;
            await sdk(language, projectDirectory, apiKey);
        } else if (yargs.argv._.length === 4 && apiKeyDefinedInDotEnv()) {
            await sdk(argv.language, argv.directory, process.env.FLOTIQ_API_KEY);
        } else if (yargs.argv._.length === 5) {
            await sdk(argv.language, argv.directory, argv.flotiqApiKey);
        } else {
            yargs.showHelp();
            process.exit(1);
        }
    })
    .command('excel-export [ctdName] [filePath] [flotiqApiKey]',
        `Export Content Objects from Flotiq account to the excel file`,
        (yargs) => {
            optionalParamFlotiqApiKey(yargs);
            yargs
                .positional('ctdName', {
                    describe: 'API name of Content Type Definition you wish to export',
                    type: 'string'
                })
                .positional('filePath', {
                    describe: 'the directory to which the xlsx file is to be saved, type in "." if you want to save the file inside the current directory',
                    type: 'string'
                })
                .boolean('hideResults')
                .alias('hideResults', ['hr'])
                .describe('hideResults', 'information about export process will not appear in the console')
                .number('limit')
                .alias('limit', ['l'])
                .describe('number of Content Objects to export counting from the top row, default: 10.000')
        }, async (argv) => {
            if (yargs.argv._.length < 3 || (yargs.argv._.length === 3 && !apiKeyDefinedInDotEnv())) {
                const answers = await askQuestions(questionsText.EXCEL_MIGRATION);
                let { flotiqApiKey, ctdName, filePath } = answers;
                await xlsxMigrator.exportXlsx({
                    apiKey: flotiqApiKey,
                    ctdName: ctdName,
                    filePath: filePath,
                    limit: yargs.argv['limit'],
                    logResults: !yargs.argv['hideResults']
                });
            } else if (yargs.argv._.length <= 4) {
                if (!argv.flotiqApiKey && apiKeyDefinedInDotEnv()) {
                    argv.flotiqApiKey = process.env.FLOTIQ_API_KEY;
                }
                await xlsxMigrator.exportXlsx({
                    apiKey: argv.flotiqApiKey,
                    ctdName: argv.ctdName,
                    filePath: argv.filePath,
                    limit: yargs.argv['limit'],
                    logResults: !yargs.argv['hideResults']
                });
            } else {
                yargs.showHelp();
                process.exit(1);
            }
        })
    .command('excel-import [ctdName] [filePath] [flotiqApiKey]',
        `Import Content Objects from excel file to Flotiq account`,
        (yargs) => {
            optionalParamFlotiqApiKey(yargs);
            yargs
                .positional('ctdName', {
                    describe: 'API name of Content Type Definition you wish to import data to',
                    type: 'string'
                })
                .positional('filePath', {
                    describe: 'the directory to the xlsx file you wish to import data from',
                    type: 'string'
                })
                .boolean('hideResults')
                .alias('hideResults', ['hr'])
                .describe('hideResults', 'information about export process will not appear in the console')
                .number('limit')
                .alias('limit', ['l'])
                .describe('number of Content Objects imported counting from the top row, default: 10 000')
        }, async (argv) => {
            if (yargs.argv._.length < 3 || (yargs.argv._.length === 3 && !apiKeyDefinedInDotEnv())) {
                const answers = await askQuestions(questionsText.EXCEL_MIGRATION);
                let { flotiqApiKey, ctdName, filePath } = answers;
                await xlsxMigrator.importXlsx({
                    apiKey: flotiqApiKey,
                    ctdName: ctdName,
                    filePath: filePath,
                    limit: yargs.argv['limit'],
                    logResults: !yargs.argv['hideResults']
                });
            } else if (yargs.argv._.length <= 4) {
                if (!argv.flotiqApiKey && apiKeyDefinedInDotEnv()) {
                    argv.flotiqApiKey = process.env.FLOTIQ_API_KEY;
                }
                await xlsxMigrator.importXlsx({
                    apiKey: argv.flotiqApiKey,
                    ctdName: argv.ctdName,
                    filePath: argv.filePath,
                    limit: yargs.argv['limit'],
                    logResults: !yargs.argv['hideResults']
                });
            } else {
                yargs.showHelp();
                process.exit(1);
            }
        })
    .command('stats [flotiqApiKey]', 'Display Flotiq stats', (yargs) => {
    }, async (argv) => {

        if (yargs.argv._.length === 1 && !apiKeyDefinedInDotEnv()) {
            let answers = await askQuestions(questionsText.STATS);
            let {flotiqApiKey} = answers;
            await stats(flotiqApiKey);
        } else if(yargs.argv._.length < 2 && apiKeyDefinedInDotEnv()) {
            await stats(process.env.FLOTIQ_API_KEY);
        } else if (yargs.argv._.length === 2) {
            await stats(argv.flotiqApiKey);
        } else {
            yargs.showHelp();
            process.exit(1);
        }
    })
    .help()
    .argv;

checkCommand(yargs, 0);

function apiKeyDefinedInDotEnv() {
    return (process.env.FLOTIQ_API_KEY !== undefined && process.env.FLOTIQ_API_KEY !== "")
}

function optionalParamFlotiqApiKey(yargs) {
    if (apiKeyDefinedInDotEnv()) {
        yargs.positional('flotiqApiKey', {
            describe: 'Flotiq Read and write API KEY.',
            type: 'string',
        });
    }
}

function getObjectDataPath(projectDirectory) {
    return projectDirectory + '/.flotiq';
}

function checkCommand(yargs, numRequired) {
    if (yargs.argv._.length <= numRequired) {
        yargs.showHelp();
        process.exit(1);
    }
}

async function askQuestions(questions) {
    let answers = await inquirer.prompt(questions);
    return await checkAllParameters(answers, questions);
}

async function checkAllParameters(answer, questions) {
    let newAnswer = answer;
    for (let i = 0; i < questions.length; i++) {
        let paramName = questions[i].name;
        while (!newAnswer[paramName].length) {
            if (!questions[i].defaultAnswer) {
                yargs.showHelp();
                const param = await inquirer.prompt(questions[i]);
                newAnswer[paramName] = param[paramName];
                console.log(newAnswer[paramName]);
            } else {
                newAnswer[paramName] = questions[i].defaultAnswer;
                console.log(newAnswer[paramName]);
            }
        }
    }
    return newAnswer;
}

function start(flotiqApiKey, directory, url, isJson, framework = null) {
    if (framework) {
        framework = framework.toLowerCase();
    } else {
        if (url.includes('nextjs')) {
            framework = 'nextjs';
        } else {
            framework = 'gatsby';
        }
    }

    function startSetup(type) {
        projectSetup.setup(directory, url, type).then(async () => {
            let path = getObjectDataPath(directory);
            await importer.importer(flotiqApiKey, path, false);
            await projectSetup.init(directory, flotiqApiKey, type);
            await projectSetup.develop(directory, type);
        });
    }

    startSetup(framework);
}
