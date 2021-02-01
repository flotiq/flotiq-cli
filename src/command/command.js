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
                describe: 'Flotiq Read and write API KEY.',
                type: 'string',
            })
            .positional('directory', {
                describe: 'Directory to create project in.',
                type: 'string',
            })
            .positional('url', {
                describe: 'Url to git repository with Gatbsy starter.',
                type: 'string',
            });
    }, async (argv) => {
        if (yargs.argv.help) {
            yargs.showHelp();
            process.exit(1);
        }
        if (yargs.argv._.length < 4) {
            let answers = await askQuestions(questionsText.START_QUESTIONS);
            let {flotiqApiKey, projectDirectory, url} = answers;
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
                describe: 'Flotiq Read and write API KEY.',
                type: 'string',
            })
            .positional('directory', {
                describe: 'Directory path with Flotiq sample data (directory cannot be empty, if you wish to run command in current directory, insert . (dot)).',
                type: 'string',
            });
    }, async (argv) => {

        if (yargs.argv._.length < 3) {
            const answers = await askQuestions(questionsText.IMPORT_QUESTIONS);
            let {flotiqApiKey, projectDirectory} = answers;
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
                describe: 'Url to wordpress blog project',
                type: 'string',
            });
    }, async (argv) => {
        const wordpressStart = require('flotiq-wordpress-import').start;
        if (yargs.argv._.length < 3) {
            const answers = await askQuestions(questionsText.WORDPRESS_IMPORT_QUESTIONS);
            const {flotiqApiKey, wordpressUrl} = answers;

            wordpressStart(flotiqApiKey, wordpressUrl)
        } else if (yargs.argv._.length === 3) {
            wordpressStart(argv.flotiqApiKey, argv.wordpressUrl)
        }
    })
    .help()
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

async function askQuestions(questions) {
    let answers = await inquirer.prompt(questions);
    return await checkAllParameters(answers, questions);
}

async function checkAllParameters(answer, questions) {
    let newAnswer = answer;
    for (let i = 0; i < questions.length; i++) {
        let paramName = questions[i].name;
        while (!newAnswer[paramName].length) {
            yargs.showHelp();
            const param = await inquirer.prompt(questions[i]);
            newAnswer[paramName] = param[paramName];
            console.log(newAnswer[paramName]);

        }
    }
    return newAnswer;
}

function start(flotiqApiKey, directory, url) {
    gatsbySetup.setup(directory, url).then(async () => {
        let path = getObjectDataPath(directory);
        await importer.importer(flotiqApiKey, path);
        await gatsbySetup.init(directory, flotiqApiKey);
        await gatsbySetup.develop(directory);
    });
}


