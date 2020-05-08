const exec = require('child_process').exec;
const config = require('../configuration/config');
const fs = require('fs');
const path = require('path');

exports.setup = async (projectDirectory, starterUrl) => {
    console.log('Gatsby setup');
    await runGatsbyProcess('new', projectDirectory, starterUrl);
}

exports.init = async (projectDirectory, apiKey) => {
    try {
        let configPath =  projectDirectory + '/.env';
        fs.copyFileSync(projectDirectory + '/.flotiq/.env.dist', configPath);
        let file = fs.readFileSync(configPath);
        file = file.replace('GATSBY_FLOTIQ_BASE_URL=', 'GATSBY_FLOTIQ_BASE_URL=' + config.apiUrl);
        file = file.replace('FLOTIQ_API_KEY=', 'FLOTIQ_API_KEY=' + apiKey);
        fs.writeFileSync(configPath, file);
    } catch (e) {
        let fileContent = 'GATSBY_FLOTIQ_BASE_URL=' + config.apiUrl + '\n' +
            'FLOTIQ_API_KEY=' + apiKey + '\n';
        fs.writeFile(projectDirectory + '/.env', fileContent, (err) => {
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
                console.error(error);
                process.exit(1);
            }
            resolve(stdout ? stdout : stderr);
        });
        // live output from command
        commandProcess.stdout.on('data', function (data) {
            console.log('\x1b[36m%s\x1b[0m', data);
        });
    });
}
