#!/usr/bin/env node
import "dotenv/config";
import { readFileSync } from "fs";
import yargsFactory from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import importerCommand from "../import/command.js";
import exporterCommand from "../export/command.js";
import purgeCommand from "../purifier/command.js";
import startCommand from "../start/command.js";
import sdkCommand from "../sdk/command.js";
import statsCommand from "../stats/command.js";
import wordpressImportCommand from "../wordpress-import/command.js";
import contentfulImportCommand from "../contentful-import/command.js";
import { excelExportCommand, excelImportCommand } from "../excel/command.js";
import { checkCommand } from "./helpers.js";

const yargs = yargsFactory(hideBin(process.argv));
const cliVersion = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf8")
).version;

const argv = await yargs
    .usage("flotiq [command]")
    .version(cliVersion)
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
    .parseAsync();

checkCommand(yargs, 0, argv);
