const exec = require('child_process').exec;
const config = require('../configuration/config');
const fs = require('fs');
const path = require('path');

const ERROR_COLOR  ='\x1b[36m%s\x1b[0m';
const FRAMEWORK_NEXTJS = 'nextjs';
const FRAMEWORK_GATSBY = 'gatsby';

exports.setup = async (projectDirectory, starterUrl, framework) => {
    if (framework === FRAMEWORK_NEXTJS) {
        console.log("Starting Nextjs setup");
        await execShellCommand(`git clone ${starterUrl}.git ${projectDirectory}`);
    } else if (framework === "gatsby") {
        console.log('Starting Gatsby setup');
        await execShellCommand(`git clone ${starterUrl}.git ${projectDirectory}`);
    } else {
        console.error(ERROR_COLOR, "Invalid framework!");
        process.exit(1);
    }
}

exports.init = async (projectDirectory, apiKey, framework) => {
    if (framework === FRAMEWORK_NEXTJS) {

        let file = fs.readFileSync(projectDirectory + '/.env.dist', 'utf-8');
        file = file.replace('FLOTIQ_API_KEY=', 'FLOTIQ_API_KEY=' + apiKey);
        fs.writeFileSync(projectDirectory + '/.env.local', file);
        console.log('Configuration is created successfully: ' + projectDirectory + '/.env');

    } else if (framework === FRAMEWORK_GATSBY) {

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
        console.log(`Configuration is created successfully: ${projectDirectory} /.env`);

    } else {
        console.error(ERROR_COLOR, 'Invalid framework!');
    }
}

exports.develop = async (projectDirectory, framework) => {
    if (framework === FRAMEWORK_NEXTJS) {
        await execShellCommand(`cd ${projectDirectory} && yarn install`);
        await execShellCommand(`cd ${projectDirectory} && yarn next dev`);
    } else if (framework === FRAMEWORK_GATSBY) {
        await execShellCommand(`cd ${projectDirectory} && yarn install`);
        await execShellCommand(`cd ${projectDirectory} && ${createGatsbyCommand('develop')}`);
    } else {
        console.error(ERROR_COLOR, "Invalid framework!");
    }
}

function createGatsbyCommand(action, projectDirectory = '', starterUrl = '') {
    let cmd = path.resolve(__dirname, '..', '..', config.gatsbyCli);
    return cmd + ' ' + action + ' ' + projectDirectory + ' ' + starterUrl;
}

execShellCommand = async (cmd) => {
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
