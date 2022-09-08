const fetch = require('node-fetch');
const config = require("../configuration/config");
const contentfulExport = require('contentful-export');
const fs = require('fs');
const { string } = require('yargs');
const path = require('path');
const FormData = require('form-data');
const cfHtmlRenderer = require('@contentful/rich-text-html-renderer/dist/rich-text-html-renderer.es5');

let headers = {
    accept: 'application/json',
};

module.exports = contentful = async (flotiq_ApiKey, cont_spaceId, cont_contentManagementApiKey, translation = "en-US") => {
    headers['X-AUTH-TOKEN'] = flotiq_ApiKey;

    const export_options = {
        spaceId: cont_spaceId,
        managementToken: cont_contentManagementApiKey,
        exportDir: 'src/temp/',
        errorLogFile: 'src/temp/',
        saveFile: false,
        useVerboseRenderer: true
    }

    let exportData;
    try {
        exportData = await contentfulExport(export_options)
    } catch(err) {
        console.error('Oh no! Some errors occurred!', err)
        return;
    }

    Promise.all([importCtd(exportData.contentTypes), importMedia(exportData.assets, translation, flotiq_ApiKey)])
        .then((result) => {
            importCo(exportData.entries, result[1], translation)
        });
}

async function importCtd(data) {
    data.forEach(async (obj) => {
        let ctdRec = {
            name: obj.sys.id,
            label: obj.name,
            schemaDefinition: {
                type: "object",
                allOf: [{
                    "$ref": "#/components/schemas/AbstractContentTypeSchemaDefinition",
                }, {
                    type: "object",
                    properties: {},
                }],
                required: [],
                additionalProperties: false, // (?) should add properties ever be aviable when importing data from CF?
            },
            metaDefinition: {
                order: [],
                propertiesConfig: {},
            },
        };

        // (todo) appropriate message for change of the ctd name, this one i wouldnt call appropriate
        if (/\d/.test(ctdRec.name)) {
            console.log("\n\n", ctdRec.name, " has a number!\n\n");   
        }

        obj.fields.forEach((field) => {

            if (field.required) {
                ctdRec.schemaDefinition.required.push(field.id);
            }
            ctdRec.metaDefinition.order.push(field.id);

            ctdRec.schemaDefinition.allOf[1].properties[field.id] = buildSchemaDefinition(field);
            ctdRec.metaDefinition.propertiesConfig[field.id] = buildMetaDefinition(field, obj.displayField);
        });
        let result = flotiqCtdUpload(ctdRec);
        // (todo) notify

        // console.log("Import: ", ctdRec.name); // DEL
        // console.log(await result.json());
        // console.log(JSON.stringify(ctdRec, null, 2)); // DEL
    });

    function buildSchemaDefinition(field) {
        
        let schemaDefinition = {
            type: findJsonType(field.type)
        };

        if (field.type === "Link" || field.type === "Array" && field.items.type === "Link" && field.items.linkType === "Entry") {
            schemaDefinition.items = {
                $ref: "#/components/schemas/DataSource",
            }
            if (field.required) {
                schemaDefinition.minItems = 1;
            }
        } else if (field.type === "Array") {
            schemaDefinition.items = buildSchemaDefinition(field.items);
            if (field.required) {
                schemaDefinition.minItems = 1;
            }
        } else if (field.type === "Object") {
            schemaDefinition.additionalProperties = false;
            // schemaDefinition.properties = { // (todo) get JSON objects imported
            //     blocks: {
            //         items: {
            //             properties: {
            //                 data: {
            //                     additionalProperties: true,
            //                     properties: {
            //                         text: {
            //                             type: "string"
            //                         }
            //                     },
            //                     type: "object"
            //                 },
            //                 id: {
            //                     type: "string"
            //                 },
            //                 type: {
            //                     type: "string"
            //                 }
            //             },
            //             type: "object"
            //         },
            //         type: "array"
            //     },
            //     time: {
            //         type: "number"
            //     },
            //     version: {
            //         type: "string"
            //     }
            // }
        } else if (field.type === "Location") {
            schemaDefinition.additionalProperties = false;
            schemaDefinition.properties = {
                lat: {
                    type: "number",
                },
                lon: {
                    type: "number",
                }
            }
        }

        return schemaDefinition;
    }
    
    function buildMetaDefinition(field, displayField) {
        let metaDefinition = {
            label: field.name,
            unique: false,
            helpText: "",
            inputType: convertFieldType(field.type),
            //CF FT: Rich text, Text, Number, Date, Location, Media, Boolean, JSON, Reference
            //Flotiq FT: Text, Textarea, Markdown, Rich text, Email, Number, Radio, Checkbox, Select, Relation, List, Geo, Media, Date, Block
        }
        if (field.id === displayField) {
            metaDefinition.isTitlePart = true;   
        }

        field.validations.forEach((validation) => {
            if (!!validation.unique) {
                metaDefinition.unique = true;
            }
        });

        if (metaDefinition.inputType === "datasource") {
            metaDefinition.validation = {};

            if (field.linkType === "Asset") {
                metaDefinition.validation.relationContenttype = "_media";
            }
            
            if (field.linkType === "Entry") {
                metaDefinition.validation.relationMultiple = true; // (?) (todo) how to determine if multiple relation should be enabled? for now it is by default
                if (!!field.validations[0]?.linkContentType[0]) {
                    metaDefinition.validation.relationContenttype = field.validations[0].linkContentType[0]
                } else {
                    metaDefinition.validation.relationContenttype = "";
                }
            }
        }
        if (field.type === "Array") {
            if (field.items.type === "Link" && field.items.linkType === "Entry") {
                metaDefinition.validation.relationMultiple = true; // (?) (todo) how to determine if multiple relation should be enabled? for now it is by default
                metaDefinition.validation.relationContenttype = "";
                // (?) does flotiq accept multiple ctd relations?

            } else {
                // THIS DOESNT WORK YET!  (TODO) find if CF can have nested fields in array/field/object
                metaDefinition.items = {};
                metaDefinition.items.order = [];
                metaDefinition.items.propertiesConfig = buildMetaDefinition(field.items);
            }
        }
        if (field.type === "Object") {
            // (TODO) json object, should look similar to array above
        }

        return metaDefinition;
    }

    async function flotiqCtdUpload(data) {
        let result = await fetch(config.apiUrl + '/api/v1/internal/contenttype', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {...headers, 'Content-Type': 'application/json'},
        })
        return result;
    }
}

function findJsonType(type) {
    // 
    if (type === "Text" || type === "Symbol" || type === "Date" || type === "RichText") return ("string");
    if (type === "Integer" || type === "Number") return ("number");
    if (type === "Location" || type === "Object") return ("object");
    if (type === "Array" || type === "Link") return ("array");
    if (type === "Boolean") return ("boolean");
    
    return ("Unknown field type");
    // (todo) change to object and return its proper value like in convertFieldType below
}

function convertFieldType(type) {
    objTypes = {
        RichText: "richtext",
        Text: "text",
        Symbol: "text",
        Integer: "number",
        Number: "number",
        Date: "dateTime",
        Location: "geo",
        Array: "datasource",
        Boolean: "checkbox",
        Object: "block", // (todo) flotiq block is not the same as CF's JSON object
        Link: "datasource",
    }
    return objTypes[type];
}

async function importCo(data, media, trans) {
    // console.log(JSON.stringify(data, null, 2)); //DEL
    // return; //DEL
    let co = {};
    await Promise.all(data.map(async (obj) => {
        co[obj.sys.contentType.sys.id] = [];
        let coRec = {}
        for (const i in obj.fields) {

            let field = obj.fields[`${i}`][trans];

            if (field.hasOwnProperty("sys") === false) {
                if (field?.nodeType === "document") {
                    coRec[i] = await cfHtmlRenderer.documentToHtmlString(field);
                    coRec[i] = selectImages(coRec[i], field.content);
                } else if (field.hasOwnProperty("type")) { // (!) (todo) this one is for JSON object, WIP
                //     coRec[i] = {
                //         type: convertFieldType(field.type),
                //     }
                } else {
                    coRec[i] = field;
                }
            } else if (field.sys.type === "Link") {
                let image = await getImage(field.sys.id)
                if (image) {
                    coRec[i] = [{
                        dataUrl: image.url,
                        type: "internal", // (?) should it be internal?
                    }]
                }
            } else console.error(field.sys.type, ': unknown field type!');

        }
        // let result = flotiqCoUpload(coRec, obj.sys.contentType.sys.id);
        await co[obj.sys.contentType.sys.id].push(coRec);
        // console.log("please work", JSON.stringify(co[obj.sys.contentType.sys.id],null,2)); //DEL
        // console.log("Test import CoRec to push: \n", JSON.stringify(coRec, null, 2), "\n"); //DEL
        // console.log(result); //DEL
    }));
    // console.log("test co\n", JSON.stringify(co, null, 2)); //DEL
    flotiqCoUpload(co);

    function getImage(id) {
        let image = media.find(element => element.id === id);
        if (image) {
            return image;
        } else return; //(todo) error notify
    }

    function selectImages(html, obj) { // (todo) bind entries
        obj.forEach((cont) => {
            if (cont.nodeType === "asset-hyperlink") {
                let image = getImage(cont.data.target.sys.id);
                html = html.replace("type: asset-hyperlink id: " + cont.data.target.sys.id, "<a href=\"" + config.apiUrl + image.url + path.extname(image.fileName) + `\">` + cont.content[0].value + "</a>"); //(todo) extension
                html = html.replace(`<a href=\"https://api.flotiq.com/api/v1/content/_media/`, `<a href=\"https://api.flotiq.com/image/0x0/`);
            } else if (cont.nodeType === "embedded-asset-block") {
                let image = getImage(cont.data.target.sys.id);
                html += "<img alt=\"\" src=\"" + config.apiUrl + image.url + path.extname(image.fileName) + `\"/>`;
                html = html.replace(`src=\"https://api.flotiq.com/api/v1/content/_media/`, `src=\"https://api.flotiq.com/image/0x0/`);
            } else if (cont.hasOwnProperty("content")) {
                html = selectImages(html, cont.content);
            }
        });
        return html;
    }

    async function flotiqCoUpload(data) {
        let result = [];
        const limit = 100;
        // console.log("data test:", JSON.stringify(data,null,2));//DEL
        for (i in data) {
            // console.log("\n\nTEST data[i]: ", i, ":\n", JSON.stringify(data[i], null, 2)); //DEL
            for (let j = 0; j < data[i].length; j += limit) {
                let page = data[i].slice(j, j + limit);
                result[i] = await fetch(
                    'https://api.flotiq.com/api/v1/content/' + i + '/batch', {
                    method: 'post',
                    body: JSON.stringify(page),
                    headers: { ...headers, 'Content-Type': 'application/json' }
                });
            }
        }
        return result;
    }
}

// (todo) mssg for exceeding file quota
// (todo) batch
async function importMedia(data, trans, apiKey) {
    let images = await flotiqMedia(apiKey);
    images = nameImages(images);
    data = await convertCfMedia(data, trans);
    let uploadedFiles = []; let uploaded = 0;
    
    await data.forEach(async (file) => {
        let result = await flotiqMediaUpload(apiKey, file, images);

        if (!result.code) {
            uploadedFiles[uploaded] = {
                fileName: file.fileName,
                url: result.url.replace("/image/0x0/", "/api/v1/content/_media/").replace("." + result.extension, ""),
                id: file.cf_id
            }
            uploaded++;
        } else {
            // notifyErrorsMedia // (TODO)
        }
        // resultNotify(result, file.fileName);
    });
    return (uploadedFiles);

    function nameImages(images) {
        let convertedImages = {};
        images.forEach(image => {
            convertedImages[image.fileName] = image;
        })
        return convertedImages;
    }
    async function flotiqMedia(apiKey) {
        let totalPages = 1;
        let totalCount = 0;
        let page = 1;
        let allImages = [];
        let headers = {
            accept: 'application/json',
        };
        headers['X-AUTH-TOKEN'] = apiKey;
        for (page; page <= totalPages; page++) {
            console.log('Fetching ' + config.apiUrl + '/api/v1/content/_media?limit=1000&page=' + page);
            let images = await fetch(config.apiUrl + '/api/v1/content/_media?limit=1000&page=' + page, {headers: headers})
            let imagesJson = await images.json();
            totalCount = imagesJson.total_count;
            totalPages = imagesJson.total_pages;
            allImages = [...allImages, ...imagesJson.data];
        }
        return allImages;
    }
    
    async function convertCfMedia(data, trans) {
        const assets = [];
        for (i in data) {
            assets[i] = {
                fileName: data[i].fields.file[trans].fileName,
                url: 'http:' + data[i].fields.file[trans].url,
                mime_type: data[i].fields.file[trans].contentType,
                cf_id: data[i].sys.id
            }
        }
        return (assets);
    }
    
    async function flotiqMediaUpload(apiKey, contentObject, images) {
        let headers = {
            accept: 'application/json',
        };
        headers['X-AUTH-TOKEN'] = apiKey;
        
        if (!images[contentObject.fileName]) {
            let file = await fetch(encodeURI(contentObject.url));
            if (file.status === 200) {
                file = await file.buffer();
                const form = new FormData();
                form.append('file', file, contentObject.fileName);
                if (imageMimeType(contentObject.mime_type)) {
                    form.append('type', 'image');
                } else {
                    form.append('type', 'file');
                }
                form.append('save', '1');
                return await fetch(config.apiUrl + '/api/media', {
                    method: 'POST',
                    body: form,
                    headers: headers,
                }).then(async res => {
                    if (res.status < 200 || res.status >= 300) {
                        // console.errorCode(101);
                        console.error(res.statusText + '(' + res.status + ')')
                    }
                    return res.json()
                });
            }
        } else {
            return images[contentObject.fileName];
        }
    
        function imageMimeType(mime_type) {
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
            ].indexOf(mime_type) > -1
        }
    }
};

resultNotify = (response, name) => { // (todo) result notify should be made anew and for whole migrator
    
    if (response && response.id) {
        console.log("result notify test for media and WITH response && response.id"); // DEL
        console.log('media: ' + name + ' added/existing');
    } else {
        //console.errorCode(301);
        console.log("result notify test for media and no response && response.id"); // DEL
        console.error('media: ' + name + ' has not been added');
    }
}
