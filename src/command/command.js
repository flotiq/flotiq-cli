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
    }, async (argv) => {
        if (yargs.argv._.length < 4) {
            const answers = await askStartQuestions();
            const {apiKey, projectDirectory, url} = answers;
            start(apiKey, projectDirectory, url)
        } else if (yargs.argv._.length === 4) {
            start(argv.apiKey, argv.directory, argv.url)
        } else {
            yargs.showHelp();
            process.exit(1);
        }
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
    }, async (argv) => {

        if (yargs.argv._.length < 3) {
            const answers = await askImportQuestions();
            const {apiKey, projectDirectory} = answers;

            let directory = getObjectDataPath(projectDirectory);
            await importer.importer(apiKey, directory);
        } else if (yargs.argv._.length === 3) {
            let directory = getObjectDataPath(argv.directory);
            await importer.importer(argv.apiKey, directory);
        } else {
            yargs.showHelp();
            process.exit(1);
        }
    })
    .help('$0 start|import [apiKey] [directory] [url]')
    .argv;

checkCommand(yargs, 0);

function getObjectDataPath(projectDirectory) {
    return projectDirectory + '/.flotiq';
}

function checkCommand(yargs, numRequired) {
    if (yargs.argv._.length <= numRequired) {
        yargs.showHelp();
        process.exit(1);
    }
}

async function askStartQuestions() {
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

async function askImportQuestions() {
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
