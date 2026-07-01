import questionsText from "../command/questions.js";
import sdk from "./sdk.js";
import { apiKeyDefinedInDotEnv, askQuestions, optionalParamFlotiqApiKey } from "../command/helpers.js";

let sdkYargs;

async function handler(argv) {
    if (argv.help && sdkYargs) {
        sdkYargs.showHelp();
        process.exit(1);
    }

    if (!argv.language || !argv.directory) {
        const answers = await askQuestions(sdkYargs, questionsText.INSTALL_SDK);
        const { language, projectDirectory, flotiqApiKey } = answers;
        await sdk(language, projectDirectory, flotiqApiKey);
        return;
    }

    const apiKey = argv.flotiqApiKey || (apiKeyDefinedInDotEnv() ? process.env.FLOTIQ_API_KEY : null);
    if (!apiKey) {
        if (sdkYargs) {
            sdkYargs.showHelp();
        }
        process.exit(1);
        return;
    }
    await sdk(argv.language, argv.directory, apiKey);
}

const sdkCommand = {
    command: "sdk install [language] [directory] [flotiqApiKey]",
    describe: "Install Flotiq SDK",
    builder: (yargs) => {
        sdkYargs = yargs;
        yargs.positional("language", {
            describe: "SDK language, choices: csharp, go, java, javascript, php, python, typescript",
            type: "string",
            choices: ["csharp", "go", "java", "javascript", "php", "python", "typescript"],
        });
        yargs.positional("directory", {
            describe: "Directory where to install SDK",
            type: "string",
        });
        optionalParamFlotiqApiKey(yargs);
        return yargs;
    },
    handler,
};

export { handler, sdkCommand };

export default sdkCommand;
