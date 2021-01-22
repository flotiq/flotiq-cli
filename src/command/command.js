#!/usr/bin/env node
const questionsText = require('./questions');
const importer = require('../importer/importer');
const gatsbySetup = require('../gatsby/gatsbySetup');
const inquirer = require("inquirer");
const yargs = require('yargs');

yargs
    .command('start [flotiqApiKey] [directory] [url]', 'Start the project', (yargs) => {
        yargs
            .positional('flotiqApiKey', {
                describe: 'Flotiq Read and write API KEY',
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
        if (yargs.argv.help) {
            yargs.showHelp();
            process.exit(1);
        }
        if (yargs.argv._.length < 4) {
            const answers = await askStartQuestions();
            let {flotiqApiKey, projectDirectory, url} = answers;
            while (!projectDirectory.length) {
                yargs.showHelp();
                const answers = await askImportQuestions();
                projectDirectory = answers.projectDirectory;
            }

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
                describe: 'Flotiq Read and write API KEY',
                type: 'string',
            })
            .positional('directory', {
                describe: 'Directory to create project (directory cannot be empty, if you wish to run command in current directory, insert . (dot))',
                type: 'string',
            });
    }, async (argv) => {

        if (yargs.argv._.length < 3) {
            const answers = await askImportQuestions();
            let {flotiqApiKey, projectDirectory} = answers;
            while (!projectDirectory.length) {
                yargs.showHelp();
                const answer = await inquirer.prompt(questionsText.PROJECT_DIRECTORY);
                projectDirectory = answer.projectDirectory;
            }
            let directory = getObjectDataPath(projectDirectory);
            await importer.importer(flotiqApiKey, directory);
        } else if (yargs.argv._.length === 3) {
            let directory = getObjectDataPath(argv.directory);
            await importer.importer(argv.flotiqApiKey, directory);
        }
    })
    .command('wordpress-import [flotiqApiKey] [wordpressUrl]', 'Import wordpress to Flotiq', (yargs) => {
        yargs
            .positional('flotiqApiKey', {
                describe: 'Flotiq Read and write API KEY',
                type: 'string',
            })
            .positional('wordpressUrl', {
                describe: 'Url to wordpress project',
                type: 'string',
            });
    }, async (argv) => {
        const wordpressStart = require('flotiq-wordpress-import').start;
        if (yargs.argv._.length < 3) {
            const answers = await askWordPressImportQuestions();
            const {flotiqApiKey, wordpressUrl} = answers;

            wordpressStart(flotiqApiKey, wordpressUrl)
        } else if (yargs.argv._.length === 3) {
            wordpressStart(argv.flotiqApiKey, argv.wordpressUrl)
        }
    })
    .help().usage('$0 start|import [flotiqApiKey] [directory] [url]')
    .argv;

//checkCommand(yargs, 1);

function getObjectDataPath(projectDirectory) {
    return projectDirectory + '/.flotiq';
}

// function checkCommand(yargs, numRequired) {
//     if (yargs.argv._.length <= numRequired) {
//         yargs.showHelp();
//         process.exit(1);
//     }
// }

async function askStartQuestions() {
    const questions = [
        questionsText.FLOTIQ_RW_API_KEY,
        questionsText.PROJECT_DIRECTORY,
        questionsText.GATSBY_STARTER_URL,
    ];
    return inquirer.prompt(questions);
}

async function askImportQuestions() {
    const questions = [
        questionsText.FLOTIQ_RW_API_KEY,
        questionsText.PROJECT_DIRECTORY,

    ];
    return inquirer.prompt(questions);
}

async function askWordPressImportQuestions() {
    const questions = [
        questionsText.FLOTIQ_RW_API_KEY,
        questionsText.WORDPRESS_PAGE_URL,

    ];
    return inquirer.prompt(questions);
}

function start(flotiqApiKey, directory, url) {
    gatsbySetup.setup(directory, url).then(async () => {
        let path = getObjectDataPath(directory);
        await importer.importer(flotiqApiKey, path);
        await gatsbySetup.init(directory, flotiqApiKey);
        await gatsbySetup.develop(directory);
    });
}
