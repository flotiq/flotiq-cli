const fs = require("fs/promises");
const util = require("util");
const traverse = require("traverse");
const glob = util.promisify(require('glob'));

function ucFirst(str) {
  return str[0].toUpperCase() + str.substring(1)
}

function camelize(str) {
  return str
    .replace(/(^|[_]+)([a-z])/g, (match, underscore, letter) => letter.toUpperCase());
}

async function readCTDs(directory) {
  const CTDFiles = await glob(`${directory}/**/ContentTypeDefinition.json`)

  return await Promise.all(
      CTDFiles.map(fn => fs.readFile(fn, 'utf-8').then(JSON.parse))
  )
}

async function shouldUpdate (relatedContentObject, replacements) {
  return traverse(relatedContentObject).reduce(function (acc, node) {
    if(this.key === 'dataUrl') {
      const [,,,, ctd, id ] = node.split('/')
      if (ctd === '_media') {
        let haveReplacement = false;
        for (const [ originalFile, replacementFile ] of replacements) {
          if (id === originalFile.id) {
            this.update(`/api/v1/content/${ctd}/${replacementFile.id}`)
            haveReplacement = true;
          }
        }
        return acc || haveReplacement;
      }
    }
    return acc;
  }, false)
}
module.exports = {
  ucFirst,
  camelize,
  readCTDs,
  shouldUpdate
}
