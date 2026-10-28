#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import config from "../configuration/config.js";
import { getFlotiqApi } from "@flotiq/api";
import logger from "@flotiq/api/logger.js";
import { camelize } from "../util.js";

const placeholderImage = Buffer.from(
  `iVBORw0KGgoAAAANSUhEUgAAAKAAAAAyCAMAAADsvyBXAAAAYFBMVEWAgIDCwsL////39/fb29udnZ2U
lJSPj4+amprIyMjq6ur6+vqLi4vy8vKQkJDFxcW+vr7l5eXs7OzNzc2ysrK0tLShoaHS0tK5ubmurq6k
pKTX19fc3NyEhISqqqri4uJOigj6AAACUElEQVRYw+2V0bKjIAyGMaioaIsWsVo9ff+3XAJixdJ6dmav
dvivYgjwkQQhJCoqKioqKioqKirqXykBFE0zY+evAQZQOLOsOK2SegvXal7hF7i6KF5dGfFWEmb5NmHb
xzp7tbsbOwMUUvZXCuoAKICX1lIchrtIockxJOmNRozYA06cD/f7wPl0AEykFA8wbmFnSzmuA7K/ccpO
AM1SjLcHwG4e6GKGaJNbzsoP8TJ44d3FfHT84gPmqzvHj2Kb7ewfm/8zQDKDv7sCOcGI1hUm6xrl8hnw
Bpn1ZlD6gJajgCEMuMDjV4CPA+DAF0Jnk8omEP4G2FTOXdEQIHnyMGDxuwwuTeftXvMBc4dVg9QLz1hd
M8YWtNUFlektakzQejRYQoAlMP2hmNGCA6rWK02mJb4CZjouS0F6gD1emhzEsQTbLR53tgZkULqQUh8r
AIin3W6xfN3otiAngEb87tevbTR2Xem0Ej574XIyYmj3PyiJRXod40MGb9otoN9mC5BKqapZyBkgxhWL
32CFO6qyPfXWd3vb9GDXOXfVBHuwa0I9qE46MLwjlulHY6sJOyvBgpiyP9lnwO2uY0cGACd0By5JCt9b
MAy4uLI+eE1qyhXaij+/ZLBe/5aXjtYBwKJBdwAwh5l8lb+jfSby0f4B8dy9zgmFVIgZWrZ7SXp2eOp0
lHlJaLZfyT4Y9wcYt9jNdrC6WH8BaNU/uWvdRj8whCX6LW77hexvrnp7ixN8ixPmrWQvq3OL3WwHWNPu
7J5ERUVFRUVFRUVFRf1P+gP9pyJRcD05MAAAAABJRU5ErkJggg==`,
  "base64"
);

async function exporter(directory, flotiqApiUrl, flotiqApiKey, skipContent, ctd, withInternal) {
  const stats = {
    exportedCtdCount: 0,
    exportedContentObjectsCount: 0,
  };

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

  const flotiqApi = getFlotiqApi(flotiqApiUrl, flotiqApiKey, { batchSizeRead: 1000 });

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
    return stats;
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
    stats.exportedCtdCount += 1;

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
          .map((obj) => ({
            ...obj,
            internal: withInternal ? {
              status: obj.internal.status,
              contentType: obj.internal.contentType,
              createdAt: obj.internal.createdAt,
              updatedAt: obj.internal.updatedAt,
              deletedAt: obj.internal.deletedAt,
            } : undefined
          }))
          .sort((a, b) => a.id < b.id ? -1 : 1)
          .map(JSON.stringify).join("\n")
      );
          stats.exportedContentObjectsCount += ContentObjects.length;

      if (contentTypeDefinition.name === '_media') {
        for (const mediaFile of ContentObjects) {
          const outputPath = path.join(
            ctdPath,
            `${mediaFile.id}.${mediaFile.extension}`
          );

          let mediaBuffer;
          try {
            mediaBuffer = await flotiqApi.fetchMediaFile(mediaFile.url);
          } catch (error) {
            const reason = error instanceof Error ? `: ${error.message}` : "";
            logger.warn(`Unable to download media ${mediaFile.id}${reason}; saving a placeholder instead`);
            mediaBuffer = placeholderImage;
          }
          await fs.writeFile(outputPath, mediaBuffer);
        }
      }
    }
  }
  return stats;
}

async function handler(argv) {

  const dirStat = await fs.lstat(argv.directory);

  if (!dirStat.isDirectory()) {
    logger.error(`${argv.directory} exists, but isn't directory`);
    return false;
  }

  return await exporter(
    argv.directory,
    `${config.apiUrl}/api/v1`,
    argv.flotiqApiKey,
    argv['only-definitions'],
    argv['ctd'],
    argv['with-internal'],
  )
}

export { handler, exporter };
