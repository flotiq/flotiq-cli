import questionsText from "../command/questions.js";
import { apiKeyDefinedInDotEnv, askQuestions } from "../command/helpers.js";

let contentfulYargs;

async function handler(argv) {
    const contentfulModule = await import("./flotiq-contentful-import.js");
    const contentful = contentfulModule.default;

    if (!argv.contentfulSpaceId || !argv.contentfulContentManagementToken) {
        const answers = await askQuestions(contentfulYargs, questionsText.CONTENTFUL_IMPORT);
        const { contentfulSpaceId, contentfulApiKey, flotiqApiKey } = answers;
        await contentful(contentfulSpaceId, contentfulApiKey, flotiqApiKey);
        return;
    }

    let flotiqApiKey = argv.flotiqApiKey || (apiKeyDefinedInDotEnv() ? process.env.FLOTIQ_API_KEY : null);
    if (!flotiqApiKey) {
        const answer = await askQuestions(contentfulYargs, [questionsText.FLOTIQ_RW_API_KEY]);
        flotiqApiKey = answer.flotiqApiKey;
    }

    await contentful(
        argv.contentfulSpaceId,
        argv.contentfulContentManagementToken,
        flotiqApiKey,
        argv.translation
    );
}

const contentfulImportCommand = {
    command: "contentful-import [contentfulSpaceId] [contentfulContentManagementToken] [flotiqApiKey] [translation]",
    describe: "Import Contentful to Flotiq",
    builder: (yargs) => {
        contentfulYargs = yargs;
        return yargs;
    },
    handler,
};

export { handler, contentfulImportCommand };

export default contentfulImportCommand;
