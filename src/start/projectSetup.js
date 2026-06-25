import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import config from "../configuration/config.js";
import logger from "@flotiq/api/logger.js";
const FRAMEWORK_NEXTJS = 'nextjs';
const FRAMEWORK_GATSBY = 'gatsby';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const setup = async (projectDirectory, starterUrl, framework) => {
    if (framework === FRAMEWORK_NEXTJS) {
        logger.info("Starting Nextjs setup");
        await execShellCommand(`git clone ${starterUrl}.git ${projectDirectory}`);
    } else if (framework === "gatsby") {
        logger.info('Starting Gatsby setup');
        await execShellCommand(`git clone ${starterUrl}.git ${projectDirectory}`);
    } else {
        logger.error("Invalid framework!");
        process.exit(1);
    }
}

const init = async (projectDirectory, apiKey, framework) => {
    if (framework === FRAMEWORK_NEXTJS) {

        let file = fs.readFileSync(projectDirectory + '/.env.dist', 'utf-8');
        file = file.replace('FLOTIQ_API_KEY=', 'FLOTIQ_API_KEY=' + apiKey);
        fs.writeFileSync(projectDirectory + '/.env.local', file);
        logger.info(`Configuration is created successfully: ${projectDirectory}/.env.local`);

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
            await fs.writeFileSync(projectDirectory + '/.env', fileContent, (err) => {
                if (err) {
                    logger.error(err);
                    throw err;
                }
            });
            await fs.writeFileSync(projectDirectory + '/.env.development', fileContent, (err) => {
                if (err) {
                    logger.error(err);
                    throw err;
                }
            });
        }
        logger.info(`Configuration is created successfully: ${projectDirectory}/.env`);

    } else {
        logger.error('Invalid framework!');
    }
}

const develop = async (projectDirectory, framework) => {
    if (framework === FRAMEWORK_NEXTJS) {
        await execShellCommand(`cd ${projectDirectory} && yarn install`);
        await execShellCommand(`cd ${projectDirectory} && yarn next dev`);
    } else if (framework === FRAMEWORK_GATSBY) {
        await execShellCommand(`cd ${projectDirectory} && yarn install`);
        await execShellCommand(`cd ${projectDirectory} && ${createGatsbyCommand('develop')}`);
    } else {
        logger.error("Invalid framework!");
    }
}

function createGatsbyCommand(action, projectDirectory = '', starterUrl = '') {
    let cmd = path.resolve(__dirname, '..', '..', config.gatsbyCli);
    return cmd + ' ' + action + ' ' + projectDirectory + ' ' + starterUrl;
}

const execShellCommand = async (cmd) => {
    return new Promise((resolve, reject) => {
        let commandProcess = exec(cmd, (error, stdout, stderr) => {
            if (error) {
                logger.error(error);
            }
            resolve(stdout || stderr);
        });
        // live output from command
        commandProcess.stderr.on('data', function (data) {
            logger.info(data);
        });

        commandProcess.stdout.on('data', function (data) {
            logger.info(data);
        });
    });
}

export { setup, init, develop };

export default {
    setup,
    init,
    develop,
};
