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

yargs
    .boolean('json-output')
    .alias('json-output', ['j'])
    .describe('json-output', ' Whether to save results as JSON')
    .command('start [flotiqApiKey] [directory] [url]', 'Start the project', (yargs) => {
        optionalParamFlotiqApiKey(yargs);
        yargs.positional('directory', {
            describe: 'Directory to create project in.',
            type: 'string',
        })
        yargs.positional('url', {
            describe: 'Url to git repository with Gatbsy starter.',
            type: 'string',
        });
    }, async (argv) => {
        console = custom.console(oldConsole, yargs.argv['json-output'], errors, stdOut, errorObject, fs);
        if (yargs.argv.help) {
            yargs.showHelp();
            process.exit(1);
        }
        if (yargs.argv._.length < 4) {
            let answers = await askQuestions(questionsText.START_QUESTIONS);
            let {flotiqApiKey, projectDirectory, url} = answers;
            if (flotiqApiKey === '' || flotiqApiKey === null) {
                flotiqApiKey = process.env.FLOTIQ_API_KEY;
            }
            start(flotiqApiKey, projectDirectory, url, yargs.argv['json-output'])

        } else if (yargs.argv._.length === 4) {
            start(argv.flotiqApiKey, argv.directory, argv.url, yargs.argv['json-output'])
        } else {
            yargs.showHelp();
            process.exit(1);
        }
    })
    .command('import [flotiqApiKey] [directory]', 'Import objects from directory to Flotiq', (yargs) => {
        optionalParamFlotiqApiKey(yargs);
        yargs.positional('directory', {
            describe: 'Directory path with Flotiq sample data (directory cannot be empty, if you wish to run command in current directory, insert . (dot)).',
            type: 'string',
        });
    }, async (argv) => {
        console = custom.console(oldConsole, yargs.argv['json-output'], errors, stdOut, errorObject, fs);
        if (yargs.argv._.length < 3) {
            const answers = await askQuestions(questionsText.IMPORT_QUESTIONS);
            let {flotiqApiKey, projectDirectory} = answers;
            if (flotiqApiKey === '' || flotiqApiKey === null) {
                flotiqApiKey = process.env.FLOTIQ_API_KEY;
            }
            let directory = getObjectDataPath(projectDirectory);
            await importer.importer(flotiqApiKey, directory, true);
        } else if (yargs.argv._.length === 3) {
            let directory = getObjectDataPath(argv.directory);
            await importer.importer(argv.flotiqApiKey, directory, true);
        }
    })
    .command('wordpress-import [flotiqApiKey] [wordpressUrl]', 'Import wordpress to Flotiq', (yargs) => {
        optionalParamFlotiqApiKey(yargs);
        yargs.positional('wordpressUrl', {
            describe: 'Url to wordpress blog project',
            type: 'string',
        });
    }, async (argv) => {

        const wordpressStart = require('flotiq-wordpress-import').start;
        // overriding the console in this case is not required, custom console is build in wordpress-importer
        if (yargs.argv._.length < 3) {
            const answers = await askQuestions(questionsText.WORDPRESS_IMPORT_QUESTIONS);
            let {flotiqApiKey, wordpressUrl} = answers;
            if (flotiqApiKey === '' || flotiqApiKey === null) {
                flotiqApiKey = process.env.FLOTIQ_API_KEY;
            }
            wordpressStart(flotiqApiKey, wordpressUrl, yargs.argv['json-output'])

        } else if (yargs.argv._.length === 3) {
            wordpressStart(argv.flotiqApiKey, argv.wordpressUrl, yargs.argv['json-output'])
        }
    })
    .command(
        'purge [flotiqApiKey] [options]',
        'Purge Flotiq account, removes all objects to which the key has access',
        (yargs) => {
            optionalParamFlotiqApiKey(yargs);
        }, async (argv) => {
            if (yargs.argv._.length < 2 && process.env.FLOTIQ_API_KEY === "") {
                console.log('Api key not found')
            } else if (yargs.argv._.length === 2) {
                const answers = await askQuestions(questionsText.PURGE_QUESTION);
                const {confirmation} = answers;
                if (argv.flotiqApiKey === "" || argv.flotiqApiKey === null) {
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
        'export [flotiqApiKey] [directory]',
        'Export objects from Flotiq to directory',
        (yargs) => {
            optionalParamFlotiqApiKey(yargs);
            yargs.positional('directory', {
                describe: 'Directory path to save data.',
                type: 'string',
            });
        }, async (argv) => {
            console = custom.console(oldConsole, yargs.argv['json-output'], errors, stdOut, errorObject, fs);
            if (yargs.argv._.length < 3) {
                const answers = await askQuestions(questionsText.EXPORT_QUESTIONS);
                let {flotiqApiKey, projectDirectory} = answers;
                if (flotiqApiKey === '' || flotiqApiKey === null) {
                    flotiqApiKey = process.env.FLOTIQ_API_KEY;
                }
                await exporter.export(flotiqApiKey, projectDirectory, true);
            } else if (yargs.argv._.length === 3) {
                await exporter.export(argv.flotiqApiKey, argv.directory, true);
            }
        })
    .help()
    .argv;

checkCommand(yargs, 0);

function optionalParamFlotiqApiKey(yargs) {
    if (process.env.FLOTIQ_API_KEY !== "") {
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
