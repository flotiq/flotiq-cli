#!/usr/bin/env node
require('dotenv').config();
const questionsText = require('./questions');
const importer = require('../importer/importer');
const exporter = require('../exporter/exporter');
const gatsbySetup = require('../gatsby/gatsbySetup');
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

yargs
    .boolean('json-output')
    .alias('json-output', ['j'])
    .describe('json-output', ' Whether to save results as JSON')
    .command('start [directory] [url] [flotiqApiKey]', 'Start the project', (yargs) => {
        yargs.positional('directory', {
            describe: 'Directory to create project in.',
            type: 'string',
        })
        yargs.positional('url', {
            describe: 'Url to git repository with Gatbsy starter.',
            type: 'string',
        });
        optionalParamFlotiqApiKey(yargs);
    }, async (argv) => {
        console = custom.console(oldConsole, yargs.argv['json-output'], errors, stdOut, errorObject, fs);
        if (yargs.argv.help) {
            yargs.showHelp();
            process.exit(1);
        }
        if (yargs.argv._.length < 3) {
            let answers = await askQuestions(questionsText.START_QUESTIONS);
            let {flotiqApiKey, projectDirectory, url} = answers;
            start(flotiqApiKey, projectDirectory, url, yargs.argv['json-output']);
        } else if (yargs.argv._.length === 3 && apiKeyDefinedInDotEnv()) {
            start(process.env.FLOTIQ_API_KEY, argv.directory, argv.url, yargs.argv['json-output']);
        } else if (yargs.argv._.length === 4) {
            start(argv.flotiqApiKey, argv.directory, argv.url, yargs.argv['json-output']);
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
            let {flotiqApiKey, projectDirectory} = answers;
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
            let {flotiqApiKey, wordpressUrl} = answers;
            await wordpressStart(flotiqApiKey, wordpressUrl, yargs.argv['json-output'])
        } else if (yargs.argv._.length === 2 && apiKeyDefinedInDotEnv()) {
            await wordpressStart.run(process.env.FLOTIQ_API_KEY, argv.wordpressUrl, yargs.argv['json-input']);
        } else if (yargs.argv._.length === 3) {
            await wordpressStart.run(argv.flotiqApiKey, argv.wordpressUrl, yargs.argv['json-output']);
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
            } else if(yargs.argv._.length === 1 && apiKeyDefinedInDotEnv()) {
                await purgeContentObjects(argv.flotiqApiKey, argv.withInternal);
            } else if (yargs.argv._.length === 2) {
                const answers = await askQuestions(questionsText.PURGE_QUESTION);
                const {confirmation} = answers;
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
            optionalParamFlotiqApiKey(yargs);
        }, async (argv) => {
            console = custom.console(oldConsole, yargs.argv['json-output'], errors, stdOut, errorObject, fs);
            if (yargs.argv._.length < 2) {
                const answers = await askQuestions(questionsText.EXPORT_QUESTIONS);
                let {flotiqApiKey, projectDirectory} = answers;
                await exporter.export(flotiqApiKey, projectDirectory, true);
            } else if (yargs.argv._.length === 2 && apiKeyDefinedInDotEnv()) {
                await exporter.export(process.env.FLOTIQ_API_KEY, argv.directory, true);
            } else if (yargs.argv._.length === 3) {
                await exporter.export(argv.flotiqApiKey, argv.directory, true);
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
            let {language, directory, apiKey} = answers;
            await sdk(language, directory, apiKey);
        } else if (yargs.argv._.length === 4 && apiKeyDefinedInDotEnv()) {
            await sdk(argv.language, argv.directory, process.env.FLOTIQ_API_KEY);
        } else if (yargs.argv._.length === 5) {
            await sdk(argv.language, argv.directory, argv.flotiqApiKey);
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

function start(flotiqApiKey, directory, url, isJson) {
    gatsbySetup.setup(directory, url, isJson).then(async () => {
        let path = getObjectDataPath(directory);
        await importer.importer(flotiqApiKey, path, false);
        await gatsbySetup.init(directory, flotiqApiKey);
        await gatsbySetup.develop(directory);
    });
}
