const exec = require('child_process').exec;
const config = require('../configuration/config');
const fs = require('fs');
const path = require('path');

const ERROR_COLOR  ='\x1b[31m%s\x1b[0m';

exports.setup = async (projectDirectory, starterUrl) => {
    console.log('Starting Gatsby setup');
    await runGatsbyProcess('new', projectDirectory, starterUrl);
}

exports.init = async (projectDirectory, apiKey) => {
    try {
        let configPath =  projectDirectory + '/.env';
        fs.copyFileSync(projectDirectory + '/.flotiq/.env.dist', configPath);
        let file = fs.readFileSync(configPath);
        file = file.replace('GATSBY_FLOTIQ_API_KEY=', 'GATSBY_FLOTIQ_API_KEY=' + apiKey);
        fs.writeFileSync(configPath, file);
    } catch (e) {
        let fileContent = 'GATSBY_FLOTIQ_API_KEY=' + apiKey + '\n';
        fs.writeFile(projectDirectory + '/.env', fileContent, (err) => {
            console.errorCode(100);
            console.error(err);
            if (err) throw err;

        });
    }
    console.log('Configuration is created successfully: ' + projectDirectory + '/.env');
}

exports.develop = async (projectDirectory) => {
    await execShellCommand('cd ' + projectDirectory + ' && ' + createGatsbyCommand('develop'));
}

function runGatsbyProcess(action, projectDirectory = '', starterUrl = '') {
    let cmd = createGatsbyCommand(action, projectDirectory, starterUrl);
    return execShellCommand(cmd);
}

function createGatsbyCommand(action, projectDirectory = '', starterUrl = '') {
    let cmd = path.resolve(__dirname, '..', '..', config.gatsbyCli);

    return cmd + ' ' + action + ' ' + projectDirectory + ' ' + starterUrl;
}

function execShellCommand(cmd) {
    return new Promise((resolve, reject) => {
        let commandProcess = exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.errorCode(200);
                process.exit(1);
            }
            console.log(stdout);
            console.error(stderr);
            resolve(stdout || stderr);
        });
        // live output from command
        commandProcess.stderr.on('data', function (data) {
            console.error(ERROR_COLOR, data);
        });

        commandProcess.stdout.on('data', function (data) {
            console.log(ERROR_COLOR, data);
        });


    });
}
