import { getFlotiqApi } from "@flotiq/api";
import config from "../configuration/config.js";
import questionsText from "../command/questions.js";
import stats from "./stats.js";
import { apiKeyDefinedInDotEnv, askQuestions } from "../command/helpers.js";

let statsYargs;

async function handler(argv) {
    if (argv.flotiqApiKey) {
        await stats(getFlotiqApi(`${config.apiUrl}/api/v1`, argv.flotiqApiKey));
    } else if (apiKeyDefinedInDotEnv()) {
        await stats(getFlotiqApi(`${config.apiUrl}/api/v1`, process.env.FLOTIQ_API_KEY));
    } else if ((argv._?.length ?? 0) <= 1) {
        const answers = await askQuestions(statsYargs, questionsText.STATS);
        const { flotiqApiKey } = answers;
        await stats(getFlotiqApi(`${config.apiUrl}/api/v1`, flotiqApiKey));
    } else {
        if (statsYargs) {
            statsYargs.showHelp();
        }
        process.exit(1);
    }
}

const statsCommand = {
    command: "stats [flotiqApiKey]",
    describe: "Display Flotiq stats",
    builder: (yargs) => {
        statsYargs = yargs;
        return yargs;
    },
    handler,
};

export { handler, statsCommand };

export default statsCommand;
