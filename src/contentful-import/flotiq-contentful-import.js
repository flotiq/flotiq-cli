const config = require("../configuration/config");
const contentfulExport = require('contentful-export');
const path = require('path');
const cfHtmlRenderer = require('@contentful/rich-text-html-renderer/dist/rich-text-html-renderer.es5');
const { resultNotify } = require('./notify');
const { flotiqMedia, cfMediaToObject} = require('./media');
const { flotiqCtdUpload, flotiqCoUploadByCtd, flotiqMediaUpload } = require('../flotiq-api/flotiq-api');

module.exports = contentful = async (contentfulSpaceId, contentfulContentManagementToken, flotiqApiKey, translation = "en-US") => {

    const export_options = {
        spaceId: contentfulSpaceId,
        managementToken: contentfulContentManagementToken,
        saveFile: false,
        useVerboseRenderer: true
    }

    console.log("Running Contentful export");

    let exportData;
    try {
        exportData = await contentfulExport(export_options)
    } catch(err) {
        console.error('Some errors occurred!', err)
        return;
    }

    let resultCtd = await importCtd(exportData.contentTypes, flotiqApiKey);
    resultNotify(resultCtd, "content_type");
    let resultMedia = await importMedia(exportData.assets, translation, flotiqApiKey);
    resultNotify(resultMedia[0], "media");
    let resultCo = await importCo(exportData.entries, resultMedia[1], translation, flotiqApiKey);
    resultNotify(resultCo, "content_object");
}

async function importCtd(data, apiKey) {
    let ctd = [];
    await Promise.all(data.map(async (obj) => {
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
                additionalProperties: false,
            },
            metaDefinition: {
                order: [],
                propertiesConfig: {},
            },
        };

        obj.fields.forEach((field) => {
            if (field.required) {
                ctdRec.schemaDefinition.required.push(field.id);
            }
            ctdRec.metaDefinition.order.push(field.id);

            ctdRec.schemaDefinition.allOf[1].properties[field.id] = buildSchemaDefinition(field);
            ctdRec.metaDefinition.propertiesConfig[field.id] = buildMetaDefinition(field, obj.displayField);
        });
        let response = await flotiqCtdUpload(ctdRec, apiKey);
        response.name = ctdRec.name;
        response.label = ctdRec.label;
        ctd.push(response);
    }));
    return ctd;

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
                metaDefinition.validation.relationMultiple = true;
                if (!!field.validations[0]?.linkContentType[0]) {
                    metaDefinition.validation.relationContenttype = field.validations[0].linkContentType[0]
                } else {
                    metaDefinition.validation.relationContenttype = "";
                }
            }
        } else if (field.type === "Array") {
            if (field.items.type === "Link" && field.items.linkType === "Entry") {
                metaDefinition.validation.relationMultiple = true;
                metaDefinition.validation.relationContenttype = "";
            }
        }

        return metaDefinition;
    }
}

function findJsonType(type) {
    if (type === "Text" || type === "Symbol" || type === "Date" || type === "RichText" || type === "Object") return "string";
    if (type === "Integer" || type === "Number") return "number";
    if (type === "Location") return "object";
    if (type === "Array" || type === "Link") return "array";
    if (type === "Boolean") return "boolean";
    
    return "Unknown field type";
}
function convertFieldType(type) {
    let objTypes = {
        RichText: "richtext",
        Text: "textMarkdown",
        Symbol: "text",
        Integer: "number",
        Number: "number",
        Date: "dateTime",
        Location: "geo",
        Array: "datasource",
        Boolean: "checkbox",
        Object: "text",
        Link: "datasource",
    }
    return objTypes[type];
}
async function importCo(data, media, trans, apiKey) {
    let co = {};
    await Promise.all(data.map(async (obj) => {
        if (!co[obj.sys.contentType.sys.id]) {
            co[obj.sys.contentType.sys.id] = [];   
        }
        let coRec = {
            id: obj.sys.contentType.sys.id + "-" + obj.sys.id,
        }

        for (const i in obj.fields) {
            let field = obj.fields[`${i}`][trans];

            if (field.hasOwnProperty("sys") === false) {
                if (field?.nodeType === "document") {
                    coRec[i] = await cfHtmlRenderer.documentToHtmlString(field);
                    coRec[i] = cfImagesToHtml(coRec[i], field.content);
                } else if (field.type === "Symbol") {
                    coRec[i] = JSON.stringify(field, null, 2); 
                } else {
                    coRec[i] = field;
                }
            } else if (field.sys.type === "Link") {
                let image = await getImageByCfId(field.sys.id)
                if (image) {
                    coRec[i] = [{
                        dataUrl: image.url,
                        type: "internal",
                    }]
                }
            }
        }
        await co[obj.sys.contentType.sys.id].push(coRec);
    }));
    return await flotiqCoUploadByCtd(co, apiKey);

    function getImageByCfId(id) {
        return media.find(element => element.id === id);
    }

    function cfImagesToHtml(html, obj) {
        obj.forEach((cont) => {
            if (cont.nodeType === "asset-hyperlink") {
                let image = getImageByCfId(cont.data.target.sys.id);
                html = html.replace("type: asset-hyperlink id: " + cont.data.target.sys.id, "<a href=\"" + config.apiUrl + image.url + path.extname(image.fileName) + `\">` + cont.content[0].value + "</a>");
                html = html.replace(`<a href=\"${config.apiUrl}/api/v1/content/_media/`, `<a href=\"${config.apiUrl}/image/0x0/`);
            } else if (cont.nodeType === "embedded-asset-block") {
                let image = getImageByCfId(cont.data.target.sys.id);
                html += "<img alt=\"\" src=\"" + config.apiUrl + image.url + path.extname(image.fileName) + `\"/>`;
                html = html.replace(`src=\"${config.apiUrl}/api/v1/content/_media/`, `src=\"${config.apiUrl}/image/0x0/`);
            } else if (cont.hasOwnProperty("content")) {
                html = cfImagesToHtml(html, cont.content);
            }
        });
        return html;
    }
}

async function importMedia(data, trans, apiKey) {
    let images = nameImages(await flotiqMedia(apiKey));
    data = cfMediaToObject(data, trans);
    let mediaRec = [];
    let uploadedFiles = []; let uploaded = 0;
    
    await Promise.all(data.map(async (file) => {
        mediaRec[file.cf_id] = await flotiqMediaUpload(apiKey, file, images);
        if (!mediaRec[file.cf_id].code) {
            uploadedFiles[uploaded] = {
                fileName: file.fileName,
                url: mediaRec[file.cf_id].url.replace("/image/0x0/", "/api/v1/content/_media/").replace("." + mediaRec[file.cf_id].extension, ""),
                id: file.cf_id
            }
            uploaded++;
        }
    }));
    return ([mediaRec, uploadedFiles]);
        
    function nameImages(images) {
        let convertedImages = {};
        images.forEach(image => {
            convertedImages[image.fileName] = image;
        })
        return convertedImages;
    }
};
