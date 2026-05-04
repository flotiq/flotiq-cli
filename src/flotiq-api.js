const axios = require('axios');
const assert = require('node:assert/strict');
const ProgressBar = require('progress');
const FormData = require('form-data');
const logger = require("./logger");
const {rateLimitInterceptor, throttleInterceptor} = require("./util");

module.exports = class FlotiqApi {
  timeout = 60000;
  batchSize = 100;
  contentTypeDefLimit = 1000;

  EXPORTED_INTERNALS = [
    '_media',
    '_webhooks',
    '_tag',
    '_plugin_settings'
  ];

  constructor(flotiqApiUrl, flotiqApiKey, options = {}) {
    this.flotiqApiUrl = flotiqApiUrl;
    this.flotiqApiKey = flotiqApiKey;
    this.batchSizeRead = options.batchSizeRead || options.batchSize || 1000;
    this.batchSize = options.batchSize || 100;
    this.interval = 1000 / (options.writePerSecondLimit || 10);

    this.headers = {
      "Content-type": "application/json;charset=utf-8",
      "X-Auth-Token": this.flotiqApiKey,
      "x-mode": "preview"
    };

    this.tooManyRequestsMessage = `\nReceived status 429 (Too Many Requests), retrying in 1 second...`;

    this.middleware = axios.create({
      baseURL: this.flotiqApiUrl,
      timeout: this.timeout,
      headers: this.headers,
    });
    
    rateLimitInterceptor(this.middleware, logger, this.interval);
    throttleInterceptor(this.middleware, this.interval);
  }

  async fetchContentTypeDefinition(name) {
    return this.middleware
      .get(`/internal/contenttype/${name}`)
      .then(response => response.data)
      .catch(() => {});
  }

  async fetchContentType(internal) {
    return this.middleware
      .get(`/internal/contenttype?internal=${internal ? 1 : 0}&limit=${this.contentTypeDefLimit}`)
      .then(response => response.data.data);
  }

  async fetchContentTypeDefs() {
    const contentTypeDefs = await this.fetchContentType();
    const internalContentTypeDefs = await this.fetchContentType(true)
      .then(response => response.filter((ctd) => this.EXPORTED_INTERNALS.includes(ctd.name)));

    return [
      ...contentTypeDefs,
      ...internalContentTypeDefs
    ];
  }

  async updateContentTypeDefinition(name, definition) {
    const uri = `internal/contenttype/${name}`;

    return this.middleware
      .put(uri, definition);
  }

  async deleteContentTypeDefinition(name, definition) {
    const uri = `internal/contenttype/${name}`;

    return this.middleware
      .delete(uri, definition);
  }

  async fetchContentObject(contentType, id, hydrate = 0) {
    return this.middleware
      .get(`/content/${contentType}/${id}` + (hydrate > 0 ? `?hydrate=${hydrate}` : ''))
      .then(response => response.data);
  }

  async fetchContentObjects(contentType, hydrate = 0, limit = 10000000, order = {
    field: 'internal.createdAt',
    direction: 'asc',
  }, filters) {
      let batch;
      let result = [];
      let page = 1;

      do {
        const queryParams = [
          `page=${page}`,
          `limit=${Math.min(this.batchSizeRead, limit)}`,
          ...(hydrate > 0 ? [ `hydrate=${hydrate}`] : []),
          ...( filters ? [`filters=${encodeURIComponent(JSON.stringify(filters))}`] : []),
          `order_by=${order.field}`,
          `order_direction=${order.direction}`,
        ];
          const batchUri = `/content/${contentType}?${queryParams.join('&')}`;
          batch = await this.middleware.get(batchUri)
            .then(response => response.data.data)

          page += 1;

          result = [...result, ...batch];
      } while (batch.length > 0 && result.length < limit);

      return result.slice(0, limit);
  }

  async fetchMediaFile(mediaUrl) {
    const apiOrigin = new URL(this.flotiqApiUrl).origin;
    const response = await this.middleware.get(`${apiOrigin}${mediaUrl}`, {
      responseType: 'arraybuffer',
    });

    return Buffer.from(response.data);
  }

  async uploadMedia(form) {
    const apiOrigin = new URL(this.flotiqApiUrl).origin;
    const response = await this.middleware.post(`${apiOrigin}/api/media`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    return response.data;
  }

  async uploadMediaFromUrl(contentObject, existingImages = {}) {
    if (existingImages[contentObject.fileName]) {
      return existingImages[contentObject.fileName];
    }

    const fileResponse = await axios.get(encodeURI(contentObject.url), { responseType: 'arraybuffer' });
    if (fileResponse.status !== 200) {
      return { code: fileResponse.status, reason: 'Download failed', message: contentObject.url };
    }

    const file = Buffer.from(fileResponse.data);
    const form = new FormData();
    form.append('file', file, contentObject.fileName);
    form.append('type', this._isImageMimeType(contentObject.mime_type) ? 'image' : 'file');
    form.append('save', '1');

    return await this.uploadMedia(form);
  }

  _isImageMimeType(mimeType) {
    return [
      "image/jpeg",
      "image/png",
      "image/apng",
      "image/bmp",
      "image/gif",
      "image/x-icon",
      "image/svg+xml",
      "image/tiff",
      "image/webp"
    ].includes(mimeType);
  }

  async publishContentObject(type, obj) {
    const uri = `/content/${type}/${obj.id}/publish`;

    return this.middleware.post(uri, obj);
  }

  async persistContentObjectBatch(ctd, obj) {
    assert(typeof ctd, 'string');
    assert(Array.isArray(obj));

    const bar = new ProgressBar(`Persisting ${ctd} [:bar] :percent ETA :etas`, { total: obj.length });
    const uri = `/content/${ctd}/batch?updateExisting=true`;

    await this._sendRequest(uri, obj, 'POST', bar);
  }


  async patchContentObjectBatch(ctd, obj) {
    assert(typeof ctd === 'string');
    assert(Array.isArray(obj));
  
    const bar = new ProgressBar(`Updating ${ctd} [:bar] :percent ETA :etas`, { total: obj.length });
    const uri = `/content/${ctd}/batch`;

    await this._sendRequest(uri, obj, 'PATCH', bar);
  }

  async deleteContentObjectBatch(ctd, obj) {
    assert(typeof ctd === 'string');
    assert(Array.isArray(obj));
  
    const uri = `/content/${ctd}/batch-delete`;

    await this._sendRequest(uri, obj, 'DELETE');
  }

  async checkIfClear(CTDs) {
    let remoteContentTypeDefinitions = await this.middleware
        .get(`/internal/contenttype?internal=0&limit=1000`)
        .then(response => response.data.data);

    const _webhookContentTypeDefinition = await this.middleware
        .get(`/internal/contenttype/_webhooks?internal=1&limit=1000`)
        .then(response => response.data);

    remoteContentTypeDefinitions.push(_webhookContentTypeDefinition)

    if (remoteContentTypeDefinitions.length > 0) {
      logger.warn('Target not clear')

      const remoteCtdNames = remoteContentTypeDefinitions.map(({name}) => name)
      const overlap = CTDs
          .filter(el => remoteCtdNames.includes(el.name))
          .filter(el => el.internal !== true);

      if (
          overlap.length > 0 &&
          overlap.length !== 1 &&
          overlap[0] !== '_webhooks'
      ) {
        logger.error(
            `There's overlap between imported CTDs and CTDs already in Flotiq: "${overlap.map(el => el.name).join(
                '", "'
            )}"; use either --skip-definitions or --update-definitions to continue`
        )
        return false
      }
    }

    return true
  }

  async createOrUpdate(remoteCtd, contentTypeDefinition, ret = 0) {
    const method = remoteCtd?.id ? 'put' : 'post';

    const uri = remoteCtd?.id
        ? `/internal/contenttype/${remoteCtd.name}`
        : `/internal/contenttype`;

    logger.info(
        `${remoteCtd ? 'Updating' : 'Persisting'} contentTypeDefinition ${contentTypeDefinition.name}`
    )
    contentTypeDefinition.featuredImage = [];
    try {
      const response = await this.middleware.request({
        url: uri,
        method,
        data: contentTypeDefinition,
        validateStatus: () => true,
      });

      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.statusText,
        json: async () => response.data,
      };
    } catch (e) {
      if(ret < 10) {
        logger.error(`Error ${e}, retrying ${ret + 1} time`);
        return await this.createOrUpdate(remoteCtd, contentTypeDefinition, ++ret);
      } else {
        logger.error(`Error ${e}, retried ${ret} times`);
      }
    }
  }

  async _sendRequest(uri, obj, method, bar) {
    for (let i = 0; i < obj.length; i += this.batchSize) {
      const batch = obj.slice(i, i + this.batchSize);
      const actions = {
        POST: async () => await this.middleware.post(uri, batch),
        PATCH: async () => await this.middleware.patch(uri, batch),
        DELETE: async () => await this.middleware.post(uri, batch),
      };

      try {
        await actions[method]();
      } catch (e) {
        console.dir(e.response?.data?.errors, { depth: undefined });
        throw new Error(e.message);
      }
      if (bar) {
        bar.tick(this.batchSize);
      }
    }
  }
};

const apiCache = new Map();

function getFlotiqApi(apiUrl, apiKey, options = {}) {
    const cacheKey = `${apiUrl}:${apiKey}:${JSON.stringify(options)}`;
    if (!apiCache.has(cacheKey)) {
        apiCache.set(cacheKey, new (module.exports)(apiUrl, apiKey, options));
    }
    return apiCache.get(cacheKey);
}

module.exports.getFlotiqApi = getFlotiqApi;

