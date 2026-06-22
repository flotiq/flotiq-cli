#!/usr/bin/env node
import "dotenv/config";
import yargsFactory from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { importerCommand } from "../../commands/importer.js";
import exporterCommand from "../../commands/exporter.js";
import purgeCommand from "../purifier/command.js";
import startCommand from "../start/command.js";
import sdkCommand from "../sdk/command.js";
import statsCommand from "../stats/command.js";
import wordpressImportCommand from "../wordpress-import/command.js";
import contentfulImportCommand from "../contentful-import/command.js";
import { excelExportCommand, excelImportCommand } from "../excel/command.js";
import { checkCommand } from "./helpers.js";

const yargs = yargsFactory(hideBin(process.argv));

const argv = yargs
    .usage("flotiq [command]")
    .help()
    .alias("help", "h")
    .command(exporterCommand)
    .command(importerCommand)
    .command(purgeCommand)
    .command(startCommand)
    .command(wordpressImportCommand)
    .command(contentfulImportCommand)
    .command(sdkCommand)
    .command(excelExportCommand)
    .command(excelImportCommand)
    .command(statsCommand)
    .help()
    .argv;

checkCommand(yargs, 0);
