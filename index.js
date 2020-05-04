#!/usr/bin/env node

const exec = require('child_process').exec;
const importer = require('./src/importer/importer');

let API_KEY = '';
let PROJECT_DIRECTORY = '';
let STARTER_URL = '';
let API_URL = 'http://localhost:8069';

require('yargs')
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
                describe: 'Url to Gatbsy starter',
                type: 'string',
            })
    }, (argv) => {
        setupVariables(argv);
        runGatsbyProcess().then(async () => {
            let examplesPath = __dirname + '/' + PROJECT_DIRECTORY + '/example';
            await importer.importer(API_URL, API_KEY, examplesPath)
        });

    })
    .command('import [apiKey] [directory]', 'Import objects from directory to flotiq', (yargs) => {
        yargs.positional('apiKey', {
            describe: 'Flotiq RO api key',
            type: 'string',
        })
            .positional('directory', {
                describe: 'Directory to create project',
                type: 'string',
            })
    }, async (argv) => {
        let examplesPath = __dirname + '/' + PROJECT_DIRECTORY + '/example';
        await importer.importer(API_URL, API_KEY, examplesPath)
    })
    .help('$0 start|import [apiKey] [directory] [url]')
    .demandCommand(3, 3)
    .argv

function setupVariables(argv) {
    API_KEY = argv.apiKey;
    PROJECT_DIRECTORY = argv.directory;
    STARTER_URL = argv.url;
}

function runGatsbyProcess() {
    let cmd = './node_modules/.bin/gatsby new ' + PROJECT_DIRECTORY + ' ' + STARTER_URL;
    return execShellCommand(cmd);
}

function execShellCommand(cmd) {
    return new Promise((resolve, reject) => {
        let process = exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.warn(error);
            }
            resolve(stdout ? stdout : stderr);
        });

        process.stdout.on('data', function (data) {
            console.log('\x1b[36m%s\x1b[0m', data);
        });
    });
}
