import questionsText from "../command/questions.js";
import { apiKeyDefinedInDotEnv, askQuestions, optionalParamFlotiqApiKey } from "../command/helpers.js";

let wordpressYargs;

async function handler(argv) {
    const wordpressStartModule = await import("flotiq-wordpress-import");
    const wordpressStart = wordpressStartModule.default ?? wordpressStartModule;

    if (!argv.wordpressUrl) {
        const answers = await askQuestions(wordpressYargs, questionsText.WORDPRESS_IMPORT_QUESTIONS);
        const { flotiqApiKey, wordpressUrl } = answers;
        await wordpressStart(flotiqApiKey, wordpressUrl);
        return;
    }

    let apiKey = argv.flotiqApiKey || (apiKeyDefinedInDotEnv() ? process.env.FLOTIQ_API_KEY : null);
    if (!apiKey) {
        const answer = await askQuestions(wordpressYargs, [questionsText.FLOTIQ_RW_API_KEY]);
        apiKey = answer.flotiqApiKey;
    }

    await wordpressStart.run(apiKey, argv.wordpressUrl);
}

const wordpressImportCommand = {
    command: "wordpress-import [wordpressUrl] [flotiqApiKey]",
    describe: "Import wordpress to Flotiq",
    builder: (yargs) => {
        wordpressYargs = yargs;
        yargs.positional("wordpressUrl", {
            describe: "Url to wordpress blog project",
            type: "string",
        });
        optionalParamFlotiqApiKey(yargs);
        return yargs;
    },
    handler,
};

export { handler, wordpressImportCommand };

export default wordpressImportCommand;
