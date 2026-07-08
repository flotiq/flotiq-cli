import inquirer from "inquirer";
import { getFlotiqApi } from "@flotiq/api";
import questionsText from "../command/questions.js";
import config from "../configuration/config.js";
import purgeContentObjects from "./purifier.js";

async function confirmPurge(type) {
    let answers = '';
    if (type === 'space') {
        answers = await inquirer.prompt(questionsText.PURGE_SPACE_QUESTION);
    } else {
        answers = await inquirer.prompt(questionsText.PURGE_CTD_QUESTION);
    }
    return answers.confirmation.toUpperCase() === "Y";
}

function resolvePurgeOptions(argv) {
    const deleteSchema = Boolean(argv.deleteSchema);

    if (!argv.spaceId && !argv.ctdName) {
        throw new Error("Choose purge target with --spaceId <spaceId> or --ctdName <ctdName>");
    }

    if (argv.spaceId && argv.ctdName) {
        throw new Error("Use only one purge target at a time: --spaceId or --ctdName");
    }

    if (argv.spaceId && deleteSchema) {
        throw new Error("--deleteSchema can be used only with --ctdName");
    }

    if (argv.spaceId) {
        return {
            type: "space",
            spaceId: argv.spaceId,
            ctdName: undefined,
            deleteSchema,
        };
    }

    return {
        type: "ctd",
        spaceId: undefined,
        ctdName: argv.ctdName,
        deleteSchema,
    };
}

function resolveApiKey(argv) {
    const envApiKey = process.env.FLOTIQ_API_KEY;
    return argv.flotiqApiKey || envApiKey || null;
}

async function handler(argv) {
    const apiKey = resolveApiKey(argv);

    if (!apiKey) {
        throw new Error("Api key not found");
    }
    const purgeOptions = resolvePurgeOptions(argv);
    const confirmed = await confirmPurge(purgeOptions.type);
    if (!confirmed) {
        console.log("I'm finishing, no data has been deleted");
        process.exit(1);
    }

    await purgeContentObjects(getFlotiqApi(`${config.apiUrl}/api/v1`, apiKey), purgeOptions);
}

const purgeCommand = {
    command: "purge [flotiqApiKey]",
    describe: "Purge Flotiq space or selected CTD",
    builder: (yargs) => yargs
        .option("flotiqApiKey", {
            description: "Flotiq Read and write API KEY.",
            type: "string",
            demandOption: false,
        })
        .option("spaceId", {
            description: "Flotiq space id to purge",
            alias: ["space"],
            type: "string",
            demandOption: false,
        })
        .option("ctdName", {
            description: "API name of Content Type Definition to purge",
            alias: ["ctd"],
            type: "string",
            demandOption: false,
        })
        .option("deleteSchema", {
            description: "remove CTD schema during CTD purge",
            alias: ["deleteCtd"],
            type: "boolean",
            default: false,
            demandOption: false,
        }),
    handler,
};

export { confirmPurge, handler, resolveApiKey, resolvePurgeOptions, purgeCommand };

export default purgeCommand;