#!/usr/bin/env node

const importer = require('../importer/importer');
const gatsbySetup = require('../gatsby/gatsbySetup');
const inquirer = require("inquirer");
const yargs = require('yargs');
const content_type_definitions = require('../wordpress-importer/content-type-definitions');
const author = require('../wordpress-importer/author');
const category = require('../wordpress-importer/category');
const tag = require('../wordpress-importer/tag');
const post = require('../wordpress-importer/post');
const page = require('../wordpress-importer/page');
const media = require('../wordpress-importer/media');

yargs
    .command('start [apiKey] [directory] [url]', 'Start the project', (yargs) => {
        yargs
            .positional('apiKey', {
                describe: 'Flotiq Read only api key',
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
                describe: 'Flotiq Full access api key',
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
    .command('wordpress-import [apiKey] [wordpressUrl]', 'Import wordpress to Flotiq', (yargs) => {
        yargs
            .positional('apiKey', {
                describe: 'Flotiq Full access API key',
                type: 'string',
            })
            .positional('wordpressUrl', {
                describe: 'Url to wordpress project',
                type: 'string',
            });
    }, async (argv) => {
        if (yargs.argv._.length < 3) {
            const answers = await askWordpressImportQuestions();
            const {apiKey, wordpressUrl} = answers;
            wordpressStart(apiKey, wordpressUrl)
        } else if (yargs.argv._.length === 3) {
            wordpressStart(argv.apiKey, argv.wordpressUrl)
        } else {
            yargs.showHelp();
            process.exit(1);
        }
    })
    .help('start|import [apiKey] [directory] [url]')
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

async function askWordpressImportQuestions() {
    const questions = [
        {
            name: "apiKey",
            type: "input",
            message: "Flotiq api key:"
        },
        {
            name: "wordpressUrl",
            type: "input",
            message: "Url to wordpress project:"
        },

    ];
    return inquirer.prompt(questions);
}


function wordpressStart(apiKey, wordpressUrl) {
    if(wordpressUrl.charAt(wordpressUrl.length-1) !== '/') {
        wordpressUrl+='/';
    }
    content_type_definitions.importer(apiKey).then(async () => {
        author.importer(apiKey, wordpressUrl).then(async () => {
            tag.importer(apiKey, wordpressUrl).then(async () => {
                category.importer(apiKey, wordpressUrl).then(async () => {
                    media.importer(apiKey, wordpressUrl).then(async (mediaArray) => {
                        await post.importer(apiKey, wordpressUrl, mediaArray);
                        await page.importer(apiKey, wordpressUrl, mediaArray);
                        console.log('Finished importing data from Wordpress to Flotiq');
                    })
                })
            })
        })
    });
}

function start(apiKey, directory, url) {
    gatsbySetup.setup(directory, url).then(async () => {
        let path = getObjectDataPath(directory);
        console.log('Importing example Content Objects')
        await importer.importer(apiKey, path);
        console.log('Initializing flotiq project')
        await gatsbySetup.init(directory, apiKey);
        console.log('Developing Gatsby-Flotiq project')
        await gatsbySetup.develop(directory);

    });
}
