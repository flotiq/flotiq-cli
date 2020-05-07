#!/usr/bin/env node

const importer = require('../importer/importer');
const gatsbySetup = require('../gatsby/gatsbySetup');
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

        gatsbySetup.setup(argv.directory, argv.url).then(async () => {
            let examplesPath = getObjectDataPath(argv.directory);
            await importer.importer(argv.apiKey, examplesPath);
            await gatsbySetup.init(argv.directory, argv.apiKey);
        });

    })
    .command('import [apiKey] [directory]', 'Import objects from directory to flotiq', (yargs) => {
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
        await gatsbySetup.init(argv.directory, argv.apiKey);
        await gatsbySetup.develop(argv.directory);
    })
    .help('$0 start|import [apiKey] [directory] [url]')
    .argv

checkCommands(yargs, 1);

function getObjectDataPath(projectDirectory) {
    return projectDirectory + '/.flotiq';
}

function checkCommands(yargs, numRequired) {
    if (yargs.argv._.length < numRequired) {
        yargs.showHelp();
        process.exit(1);
    } else {
        // check for unknown command
    }
}
