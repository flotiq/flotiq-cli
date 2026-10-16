import { exec } from "child_process";
import fs from "fs";
import logger from "@flotiq/api/logger.js";
const FRAMEWORK_NEXTJS = 'nextjs';

const setup = async (projectDirectory, starterUrl, framework) => {
    if (framework === FRAMEWORK_NEXTJS) {
        logger.info("Starting Nextjs setup");
        try {
            await execShellCommand(`git clone ${starterUrl}.git ${projectDirectory}`);
        } catch (error) {
            logger.error(error);
            process.exit(1);
        }
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

    } else {
        logger.error('Invalid framework!');
    }
}

const develop = async (projectDirectory, framework) => {
    if (framework === FRAMEWORK_NEXTJS) {
        await execShellCommand(`cd ${projectDirectory} && yarn install`);
        await execShellCommand(`cd ${projectDirectory} && yarn next dev`);
    } else {
        logger.error("Invalid framework!");
    }
}

const execShellCommand = async (cmd) => {
    return new Promise((resolve, reject) => {
        let commandProcess = exec(cmd, (error, stdout, stderr) => {
            if (error) {
                logger.error(error);
                reject(error);
                return;
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
