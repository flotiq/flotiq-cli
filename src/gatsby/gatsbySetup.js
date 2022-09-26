const exec = require('child_process').exec;
const config = require('../configuration/config');
const fs = require('fs');
const path = require('path');

const ERROR_COLOR  ='\x1b[36m%s\x1b[0m';

exports.setup = async (projectDirectory, starterUrl) => {
    console.log('Starting Gatsby setup');
    await runGatsbyProcess('new', projectDirectory, starterUrl);
}

exports.init = async (projectDirectory, apiKey) => {
    try {
        let configPath =  projectDirectory + '/.env';
        let configPathDev =  projectDirectory + '/.env.development';
        fs.copyFileSync(projectDirectory + '/.flotiq/.env.dist', configPath);
        fs.copyFileSync(projectDirectory + '/.flotiq/.env.dist', configPathDev);
        let file = fs.readFileSync(configPath, 'utf-8');
        file = file.replace('GATSBY_FLOTIQ_API_KEY=', 'GATSBY_FLOTIQ_API_KEY=' + apiKey);
        fs.writeFileSync(configPath, file);
        fs.writeFileSync(configPathDev, file);
    } catch (e) {
        let fileContent = 'GATSBY_FLOTIQ_API_KEY=' + apiKey + '\n';
        fs.writeFile(projectDirectory + '/.env', fileContent, (err) => {

            if (err) {
                console.errorCode(100);
                throw err;
            }

        });
        fs.writeFile(projectDirectory + '/.env.development', fileContent, (err) => {

            if (err) {
                console.errorCode(100);
                throw err;
            }

        });
    }
    console.log('Configuration is created successfully: ' + projectDirectory + '/.env');
}

exports.develop = async (projectDirectory) => {
    await execShellCommand('cd ' + projectDirectory + ' && ' + createGatsbyCommand('develop'));
}

exports.nextjsDev = async (projectDirectory) => {
    await execShellCommand('cd ' + projectDirectory + ' && ' + 'yarn install');
    await execShellCommand('cd ' + projectDirectory + ' && ' + 'yarn dev');
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
            resolve(stdout || stderr);
        });
        // live output from command
        commandProcess.stderr.on('data', function (data) {
            console.error(ERROR_COLOR, data);
        });

        commandProcess.stdout.on('data', function (data) {
            console.log(data);
        });


    });
}
