const fetch = require("node-fetch");
const axios = require('axios');
const assert = require('node:assert/strict');
const ProgressBar = require('progress');
const logger = require("./logger");

module.exports = class FlotiqApi {
  timeout = 60000;
  batchSize = 100;
  contentTypeDefLimit = 1024;

  EXPORTED_INTERNALS = [
    '_media',
    '_webhooks',
    '_tag'
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
    };

    this.tooManyRequestsMessage = `\nReceived status 429 (Too Many Requests), retrying in 1 second...`;

    this.middleware = axios.create({
      baseURL: this.flotiqApiUrl,
      timeout: this.timeout,
      headers: this.headers,
    });
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

  async persistContentObject(type, obj, updateExisting = false) {
    const uri = `/content/${type}${updateExisting ? '?updateExisting=true' : ''}`;

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


  /**
   * End of general-purpose functions
   */

  // Used only by import-definitions
  async persistContentTypeObject(obj) {
    const uri = `${this.flotiqApiUrl}/internal/contenttype`;

    const response = await fetch(uri, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(obj),
    });

    let jsonResponse = await response.json();

    if (response.status >= 400) {
      console.log({ jsonResponse });
      console.dir({ persisted_object: obj }, { depth: 4 });
      console.log("Profiler link", response.headers.get("x-debug-token-link"));
      throw new Error(`${uri}, ${response.statusText}`);
    }

    return response.status;
  }

  // Used only by import-definitions; tread with care
  async persistObject(ctd, object) {
    const isBatch = Array.isArray(object);

    const postUri = isBatch
      ? `${this.flotiqApiUrl}/content/${ctd}/batch?updateExisting=true`
      : `${this.flotiqApiUrl}/content/${ctd}`;

    function objectReplacer(key, value) {
      if (key === "_metadata") {
        return undefined;
      }
      return value;
    }

    return fetch(postUri, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(
        isBatch
          ? object.map((o) => ({ ...o, _metadata: undefined }))
          : { ...object, _metadata: undefined },
        objectReplacer
      ),
    }).then(async (response) => {
      if (!response.ok) {
        let tokenLink = response.headers.get("x-debug-token-link");
        let jsonResponse = await response.json();
        console.dir(jsonResponse, { depth: null });
        console.dir(object, { depth: null });
        throw new Error(
          `Error persisting ${ctd}: ${response.statusText}; details: ${tokenLink} (${response?.data})`
        );
      }

      return response.json();
    });
  }

  async checkIfClear(CTDs) {
    let remoteContentTypeDefinitions = await fetch(
        `${this.flotiqApiUrl}/internal/contenttype?internal=0&limit=100000`,
        this.headers
    )
        .then(async response => await response.json())
        .then(response => response.data)

    const _webhookContentTypeDefinition = await fetch(
        `${this.flotiqApiUrl}/internal/contenttype/_webhooks?internal=1&limit=100000`,
        this.headers
    ).then(async response => await response.json())

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

  async createOrUpdate(remoteCtd, contentTypeDefinition) {
    const method = remoteCtd?.id ? 'PUT' : 'POST'

    const uri = remoteCtd?.id
        ? `${this.flotiqApiUrl}/internal/contenttype/${remoteCtd.name}`
        : `${this.flotiqApiUrl}/internal/contenttype`

    logger.info(
        `${remoteCtd ? 'Updating' : 'Persisting'} contentTypeDefinition ${contentTypeDefinition.name}`
    )
    let headers = this.headers;
    contentTypeDefinition.featuredImage = [];
    return  await fetch(uri, {
      method,
      body: JSON.stringify(contentTypeDefinition),
      headers
    })
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
        if (e.response && e.response.status === 429) {
          logger.info(this.tooManyRequestsMessage);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Retry after 1 second
          return this._sendRequest(uri, batch, method); // Retry request
        } else {
          console.dir(e.response.data.errors, { depth: undefined });
          throw new Error(e.message);
        }
      }
      if (bar) {
        bar.tick(this.batchSize);
      }

      await new Promise(resolve => setTimeout(resolve, this.interval));
    }
  }
};
