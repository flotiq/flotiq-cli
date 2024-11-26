const fetch = require("node-fetch");
const axios = require('axios');
const assert = require('node:assert/strict');
const ProgressBar = require('progress');

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

    this.headers = {
      "Content-type": "application/json;charset=utf-8",
      "X-Auth-Token": this.flotiqApiKey,
    };

    this.middleware = axios.create({
      baseURL: this.flotiqApiUrl,
      timeout: this.timeout,
      headers: this.headers,
    });
  }

  async fetchContentTypeObject(name) {
    return this.middleware
      .get(`/internal/contenttype/${name}`)
      .then(response => response.data);
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

    for (let i = 0; i < obj.length; i += this.batchSize) {
      const batch = obj.slice(i, i + this.batchSize);
      await this.middleware.post(uri, batch).catch(e =>{
        console.dir(e.response.data.errors, { depth: undefined })
        throw new Error(e.message);
      });
      bar.tick(this.batchSize)
    }
  }


  async patchContentObjectBatch(ctd, obj) {
    assert(typeof ctd, 'string');
    assert(Array.isArray(obj));

    const bar = new ProgressBar(`Updating ${ctd} [:bar] :percent ETA :etas`, { total: obj.length });
    const uri = `/content/${ctd}/batch`;

    for (let i = 0; i < obj.length; i += this.batchSize) {
      const batch = obj.slice(i, i + this.batchSize);
      await this.middleware.patch(uri, batch).catch(e =>{
        console.log(e.response.data.errors)
        throw new Error(e.message);
      });
      bar.tick(this.batchSize);
    }
  }

  async deleteContentObjectBatch(ctd, obj) {
    assert(typeof ctd, 'string');
    assert(Array.isArray(obj));

    const uri = `/content/${ctd}/batch-delete`

    for (let i = 0; i < obj.length; i += this.batchSize) {
      const batch = obj
        .slice(i, i + this.batchSize)
        .map(item => item.id);
      await this.middleware.post(uri, batch)
    }
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
};
