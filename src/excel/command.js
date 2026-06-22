import { importXlsx, exportXlsx } from "flotiq-excel-migrator";
import questionsText from "../command/questions.js";
import { apiKeyDefinedInDotEnv, askQuestions, optionalParamFlotiqApiKey } from "../command/helpers.js";

let excelExportYargs;
let excelImportYargs;

async function exportHandler(argv) {
    if (!argv.ctdName || !argv.filePath) {
        const answers = await askQuestions(excelExportYargs, questionsText.EXCEL_MIGRATION);
        const { flotiqApiKey, ctdName, filePath } = answers;
        await exportXlsx({
            apiKey: flotiqApiKey,
            ctdName,
            filePath,
            limit: argv.limit,
            logResults: !argv.hideResults,
        });
        return;
    }

    let apiKey = argv.flotiqApiKey || (apiKeyDefinedInDotEnv() ? process.env.FLOTIQ_API_KEY : null);
    if (!apiKey) {
        const answer = await askQuestions(excelExportYargs, [questionsText.FLOTIQ_API_KEY]);
        apiKey = answer.flotiqApiKey;
    }

    await exportXlsx({
        apiKey,
        ctdName: argv.ctdName,
        filePath: argv.filePath,
        limit: argv.limit,
        logResults: !argv.hideResults,
    });
}

async function importHandler(argv) {
    if (!argv.ctdName || !argv.filePath) {
        const answers = await askQuestions(excelImportYargs, questionsText.EXCEL_MIGRATION);
        const { flotiqApiKey, ctdName, filePath } = answers;
        await importXlsx({
            apiKey: flotiqApiKey,
            ctdName,
            filePath,
            limit: argv.limit,
            logResults: !argv.hideResults,
            batchLimit: argv.batchLimit,
            updateExisting: argv.updateExisting,
        });
        return;
    }

    let apiKey = argv.flotiqApiKey || (apiKeyDefinedInDotEnv() ? process.env.FLOTIQ_API_KEY : null);
    if (!apiKey) {
        const answer = await askQuestions(excelImportYargs, [questionsText.FLOTIQ_API_KEY]);
        apiKey = answer.flotiqApiKey;
    }

    await importXlsx({
        apiKey,
        ctdName: argv.ctdName,
        filePath: argv.filePath,
        limit: argv.limit,
        logResults: !argv.hideResults,
        batchLimit: argv.batchLimit,
        updateExisting: argv.updateExisting,
    });
}

const excelExportCommand = {
    command: "excel-export [ctdName] [filePath] [flotiqApiKey]",
    describe: "Export Content Objects from Flotiq account to the excel file",
    builder: (yargs) => {
        excelExportYargs = yargs;
        optionalParamFlotiqApiKey(yargs);
        yargs
            .positional("ctdName", {
                describe: "API name of Content Type Definition you wish to export",
                type: "string",
            })
            .positional("filePath", {
                describe: "the directory to which the xlsx file is to be saved, type in \".\" if you want to save the file inside the current directory",
                type: "string",
            })
            .boolean("hideResults")
            .alias("hideResults", ["hr"])
            .describe("hideResults", "information about export process will not appear in the console")
            .number("limit")
            .alias("limit", ["l"])
            .describe("number of Content Objects to export counting from the top row, default: 10.000");

        return yargs;
    },
    handler: exportHandler,
};

const excelImportCommand = {
    command: "excel-import [ctdName] [filePath] [flotiqApiKey]",
    describe: "Import Content Objects from excel file to Flotiq account",
    builder: (yargs) => {
        excelImportYargs = yargs;
        optionalParamFlotiqApiKey(yargs);
        yargs
            .positional("ctdName", {
                describe: "API name of Content Type Definition you wish to import data to",
                type: "string",
            })
            .positional("filePath", {
                describe: "the directory to the xlsx file you wish to import data from",
                type: "string",
            })
            .boolean("hideResults")
            .alias("hideResults", ["hr"])
            .describe("hideResults", "information about import process will not appear in the console")
            .number("limit")
            .alias("limit", ["l"])
            .describe("number of Content Objects imported counting from the top row, default: 10.000")
            .number("batchLimit")
            .alias("batchLimit", ["bl"])
            .describe("batchLimit", "number of Content Objects imported per batch call, default: 100")
            .boolean("updateExisting")
            .alias("updateExisting", ["ue"])
            .describe("If content objects with a given id already exist in the Flotiq account, they will be updated");

        return yargs;
    },
    handler: importHandler,
};

export { exportHandler, importHandler, excelExportCommand, excelImportCommand };
