import { getFlotiqApi } from "@flotiq/api";
import { handler as importerHandler } from "../import/importer.js";
import questionsText from "../command/questions.js";
import { apiKeyDefinedInDotEnv, askQuestions, optionalParamFlotiqApiKey } from "../command/helpers.js";
import config from "../configuration/config.js";
import projectSetup from "./projectSetup.js";

let startYargs;

function start(flotiqApiKey, directory, url, framework = null, importData = true) {
    let resolvedFramework = framework;

    if (resolvedFramework) {
        resolvedFramework = resolvedFramework.toLowerCase();
    } else if (url.includes("nextjs")) {
        resolvedFramework = "nextjs";
    } else {
        resolvedFramework = "gatsby";
    }

    projectSetup.setup(directory, url, resolvedFramework).then(async () => {
        if (importData) {
            getFlotiqApi(`${config.apiUrl}/api/v1`, flotiqApiKey);
            const args = {
                directory: directory + "/.flotiq",
                flotiqApiKey,
            };
            await importerHandler(args);
        }
        await projectSetup.init(directory, flotiqApiKey, resolvedFramework);
        await projectSetup.develop(directory, resolvedFramework);
    });
}

async function handler(argv) {
    if (argv.help && startYargs) {
        startYargs.showHelp();
        process.exit(1);
    }

    if (!argv.directory || !argv.url) {
        const answers = await askQuestions(startYargs, questionsText.START_QUESTIONS);
        const { flotiqApiKey, projectDirectory, url } = answers;
        await start(flotiqApiKey, projectDirectory, url);
    } else {
        const apiKey = argv.flotiqApiKey || (apiKeyDefinedInDotEnv() ? process.env.FLOTIQ_API_KEY : null);
        if (!apiKey) {
            if (startYargs) {
                startYargs.showHelp();
            }
            process.exit(1);
            return;
        }
        await start(apiKey, argv.directory, argv.url, argv.framework, argv.import);
    }
}

const startCommand = {
    command: "start [directory] [url] [flotiqApiKey] [framework]",
    describe: "Start the project",
    builder: (yargs) => {
        startYargs = yargs;
        yargs.positional("directory", {
            describe: "Directory to create project in.",
            type: "string",
        });
        yargs.positional("url", {
            describe: "Url to git repository with starter.",
            type: "string",
        });
        optionalParamFlotiqApiKey(yargs);
        yargs.positional("framework", {
            describe: "Framework determining if the starter is nextjs or gatsby.",
            type: "string",
        });
        yargs.string("framework");
        yargs.alias("framework", ["fw"]);
        yargs.describe("framework", " Determines which framework should be used (gatsby, nextjs)");
        yargs.boolean("no-import");
        yargs.alias("no-import", ["n"]);
        yargs.describe("no-import", "skip importing example objects");
        return yargs;
    },
    handler,
};

export { handler, start, startCommand };

export default startCommand;