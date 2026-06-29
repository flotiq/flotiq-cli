import { handler, importer } from "./importer.js";

const importerCommand = {
	command: "import [directory] [flotiqApiKey]",
	describe: "Import objects from directory to Flotiq",
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
			.option("publish", {
				description: "Publish objects with public status in internal",
				alias: "",
				type: "boolean",
				default: false,
				demandOption: false,
			});
	},
	handler,
	importer,
};

export { importerCommand };

export default importerCommand;
