#!/usr/bin/env node

const importer = require('../importer/importer');
const gatsbySetup = require('../gatsby/gatsbySetup');
const inquirer = require("inquirer");
const yargs = require('yargs');

yargs
    .command('start [flotiqApiKey] [directory] [url]', 'Start the project', (yargs) => {
        yargs
            .positional('flotiqApiKey', {
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
            const { flotiqApiKey, projectDirectory, url } = answers;
            start(flotiqApiKey, projectDirectory, url)
        } else if (yargs.argv._.length === 4) {
            start(argv.flotiqApiKey, argv.directory, argv.url)
        } else {
            yargs.showHelp();
            process.exit(1);
        }
    })
    .command('import [flotiqApiKey] [directory]', 'Import objects from directory to Flotiq', (yargs) => {
        yargs
            .positional('flotiqApiKey', {
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
            const { flotiqApiKey, projectDirectory } = answers;

            let directory = getObjectDataPath(projectDirectory);
            await importer.importer(flotiqApiKey, directory);
        } else if (yargs.argv._.length === 3) {
            let directory = getObjectDataPath(argv.directory);
            await importer.importer(argv.flotiqApiKey, directory);
        } else {
            yargs.showHelp();
            process.exit(1);
        }
    })
    .command('wordpress-import [flotiqApiKey] [wordpressUrl]', 'Import wordpress to Flotiq', (yargs) => {
        yargs
            .positional('flotiqApiKey', {
                describe: 'Flotiq RW API key',
                type: 'string',
            })
            .positional('wordpressUrl', {
                describe: 'Url to wordpress project',
                type: 'string',
            });
    }, async (argv) => {
        if (yargs.argv._.length < 3) {
            const answers = await askWordPressImportQuestions();
            const { flotiqApiKey, wordpressUrl } = answers;
            wordpressStart(flotiqApiKey, wordpressUrl)
        } else if (yargs.argv._.length === 3) {
            wordpressStart(argv.flotiqApiKey, argv.wordpressUrl)
        } else {
            yargs.showHelp();
            process.exit(1);
        }
    })
    .help('$0 start|import [flotiqApiKey] [directory] [url]')

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
            name: "flotiqApiKey",
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
            name: "flotiqApiKey",
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

async function askWordPressImportQuestions() {
    const questions = [
        {
            name: "flotiqApiKey",
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

function wordpressStart(flotiqApiKey, wordpressUrl) {
    if (wordpressUrl.charAt(wordpressUrl.length - 1) !== '/') {
        wordpressUrl += '/';
    }

const exec = require("child_process").exec;
const wordpressImport = 
exec(`flotiq-wordpress-import import ${flotiqApiKey} ${wordpressUrl}`, (error) => {
    if (error) {
        console.log(`error: ${error.message}`);
        return;
    }
});
    wordpressImport.stdout.pipe(process.stdout);

}

function start(flotiqApiKey, directory, url) {
    gatsbySetup.setup(directory, url).then(async () => {
        let path = getObjectDataPath(directory);
        await importer.importer(flotiqApiKey, path);
        await gatsbySetup.init(directory, flotiqApiKey);
        await gatsbySetup.develop(directory);
    });
}
