#!/usr/bin/env node

const importer = require('../importer/importer');
const gatsbySetup = require('../gatsby/gatsbySetup');
const inquirer = require("inquirer");
const yargs = require('yargs');

yargs
    .command('start [apiKey] [directory] [url]', 'Start the project', (yargs) => {
        yargs
            .positional('apiKey', {
                describe: 'Flotiq RO api key',
                type: 'string',
            })
            .positional('directory', {
                describe: 'Directory to create project',
                type: 'string',
            })
            .positional('url', {
                describe: 'Url to git repository with Gatbsy starter',
                type: 'string',
            });
        checkCommands(yargs, 4)
    }, (argv) => {
        start(argv.apiKey, argv.directory, argv.url);
    })
    .command('import [apiKey] [directory]', 'Import objects from directory to Flotiq', (yargs) => {
        yargs
            .positional('apiKey', {
                describe: 'Flotiq RO api key',
                type: 'string',
            })
            .positional('directory', {
                describe: 'Directory to create project',
                type: 'string',
            });
        checkCommands(yargs, 3)
    }, async (argv) => {

        let examplesPath = getObjectDataPath(argv.directory);
        await importer.importer(argv.apiKey, examplesPath);
    })
    .help('$0 start|import [apiKey] [directory] [url]')
    .argv;

checkCommands(yargs, 1);

function getObjectDataPath(projectDirectory) {
    return projectDirectory + '/.flotiq';
}

async function checkCommands(yargs, numRequired) {
    if (yargs.argv._.length < numRequired && yargs.argv._.length > 1) {
        yargs.showHelp();
        process.exit(1);
    } else if(yargs.argv._.length === 0) {

        const answers = await askQuestions();
        const { apiKey, projectDirectory, url } = answers;

        start(apiKey, projectDirectory, url)

    } else if(yargs.argv._.length === 4 || yargs.argv._.length === 3) {
        // ok
    } else {
        yargs.showHelp();
        process.exit(1);
    }
}

async function askQuestions() {
    const questions = [
        {
            name: "apiKey",
            type: "input",
            message: "Flotiq api key:"
        },
        {
            name: "projectDirectory",
            type: "input",
            message: "Project directory path:"
        },
        {
            name: "url",
            type: "input",
            message: "Gatsby starter repository url:"
        },

    ];
    return inquirer.prompt(questions);
}

function start(apiKey, directory, url) {
    gatsbySetup.setup(directory, url).then(async () => {
        let path = getObjectDataPath(directory);
        await importer.importer(apiKey, path);
        await gatsbySetup.init(directory, apiKey);
        await gatsbySetup.develop(directory);
    });
}
