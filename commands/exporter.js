#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");
const fetch = require("node-fetch");
const logger = require("./../src/logger");
const { camelize } = require("./../src/util");
const FlotiqApi = require('./../src/flotiq-api')
const config = require("../src/configuration/config");

exports.command = "export";
exports.description = "Export flotiq entities to JSON structure";
exports.builder = {
  target: {
    description: "Export directory",
    alias: "directory",
    type: "string",
    demand: true,
  },
  ctd: {
    description: "Coma-delimited list of CTD to export",
    type: "string",
  },
  skipContent: {
    description: "Dump only CTD"
  }
};

async function exporter(directory, flotiqApiUrl, flotiqApiKey, skipContent, ctd) {
  try {
    const files = await fs.readdir(directory);

    if (files.length > 0) {
      logger.error(`${directory} exists, but isn't empty`);
      return false;
    }
  } catch (e) {
    // Skip
  }

  await fs.mkdir(directory, { recursive: true });

  const flotiqApi = new FlotiqApi(flotiqApiUrl, flotiqApiKey);

  let ContentTypeDefinitions = await flotiqApi.fetchContentTypeDefs();

  if (ctd) {
    ctd.split(",").forEach((c) => {
      if (!ContentTypeDefinitions.map((d) => d.name).includes(c)) {
        throw new Error(`Invalid ctd "${c}"`);
      }
    });
    ContentTypeDefinitions = ContentTypeDefinitions.filter((def) =>
      ctd.split(",").includes(def.name)
    );
  }

  if (ContentTypeDefinitions.length === 0) {
    logger.info("Nothing to do");
    return true;
  }

  for (const contentTypeDefinition of ContentTypeDefinitions) {
    logger.info(`Saving CTD for ${contentTypeDefinition.label}`);

    const ctdPath = path.join(
        directory,
        `${contentTypeDefinition.internal ? 'Internal' : ''}ContentType${camelize(contentTypeDefinition.name)}`
    );

    await fs.mkdir(ctdPath, { recursive: true });

    const contentTypeDefinitionToPersist = Object.fromEntries(
      Object.entries(contentTypeDefinition).filter(([key]) => {
        return ![
          "id",
          // "internal",
          "deletedAt",
          "createdAt",
          "updatedAt",
        ].includes(key);
      })
    );

    await fs.writeFile(
      path.join(ctdPath, "ContentTypeDefinition.json"),
      JSON.stringify(contentTypeDefinitionToPersist, null, 2)
    );

    if (!skipContent) {

      const ContentObjects = await flotiqApi.fetchContentObjects(contentTypeDefinition.name);

      if (ContentObjects.length === 0) {
        logger.info(`No content to save for ${contentTypeDefinition.label}`);
        continue;
      }

      logger.info(`Saving content for ${contentTypeDefinition.label}`);

      await fs.writeFile(
        path.join(
          ctdPath,
          `contentObject${camelize(contentTypeDefinition.name)}.json`
        ),
        ContentObjects
          .map((obj) => ({ ...obj, internal: undefined }))
          .sort((a, b) => a.id < b.id ? -1 : 1)
          .map(JSON.stringify).join("\n")
      );

      if (contentTypeDefinition.name === '_media') {
        for (const mediaFile of ContentObjects) {
          const outputPath = path.join(
            ctdPath,
            `${mediaFile.id}.${mediaFile.extension}`
          );

          const url = new URL(flotiqApiUrl);

          await fetch(`${url.origin}${mediaFile.url}`)
            .then(x => x.arrayBuffer())
            .then(x => fs.writeFile(outputPath, Buffer.from(x)));
        }
      }
    }
  }
  return true;
}
async function main(argv) {

  const dirStat = await fs.lstat(argv.directory);

  if (!dirStat.isDirectory()) {
    logger.error(`${argv.directory} exists, but isn't directory`);
    return false;
  }

  await exporter(
      argv.directory,
      `${config.apiUrl}/api/v1`,
      argv.flotiqApiKey,
      false
  )
}

module.exports = {
  command: 'export [directory] [flotiqApiKey]',
  describe: 'Export objects from Flotiq to directory',
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
  },
  handler: main,
  exporter: exporter
}
