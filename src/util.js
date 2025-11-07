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

function rateLimitInterceptor(axios, logger, defaultDelay = 1000) {
  axios.interceptors.response.use(
    response => response,
    async function interceptRateLimit(error) {
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        const waitTime = retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : defaultDelay;
        error.config._retryCount = (error.config._retryCount || 0) + 1;
        logger.warn(`${error.config._retryCount} Received status 429 (Too Many Requests). Retrying after ${waitTime / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));

        return axios.request(error.config); // Retry request
      }

      throw error;
    });
}

function throttleInterceptor(axios, delay) {
  let lastRequestTime = 0;

  axios.interceptors.request.use(async function (config) {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < delay) {
      const waitTime = delay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    lastRequestTime = Date.now();
    return config;
  });
}

module.exports = {
  ucFirst,
  camelize,
  readCTDs,
  shouldUpdate,
  rateLimitInterceptor,
  throttleInterceptor
}
