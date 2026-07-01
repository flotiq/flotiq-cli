import {handler, exporter} from "./exporter.js";

const exporterCommand = {
    command: "export [directory] [flotiqApiKey]",
    describe: "Export objects from Flotiq to directory",
    builder: (yargs) => {
        return yargs
            .option("directory", {
                description: "Directory path to import data.",
                alias: "",
                type: "string",
                default: "",
                demandOption: false,
            })
            .option("flotiqApiKey", {
                description: "Flotiq Read and write API KEY.",
                alias: "",
                type: "string",
                default: false,
                demandOption: false,
            })
            .option("only-definitions", {
                description: "Export only content type definitions, ignore content objects",
                alias: "",
                type: "boolean",
                default: false,
                demandOption: false,
            })
            .option("with-internal", {
                description: "Export internal to ensure publication status",
                alias: "",
                type: "boolean",
                default: false,
                demandOption: false,
            })
            .option("ctd", {
                description: "Coma-delimited list of CTD to export",
                alias: "",
                type: "string",
                default: "",
                demandOption: false,
            });
    },
    handler,
    exporter,
};

export {exporterCommand};

export default exporterCommand;
