const fetch = require('node-fetch');
const config = require("../configuration/config");
const contentfulExport = require('contentful-export')
const fs = require('fs');
const { string } = require('yargs');
const { parse } = require('path');
const FormData = require('form-data');

let headers = {
    accept: 'application/json',
};

module.exports = contentful = async (flotiq_ApiKey, cont_spaceId, cont_contentManagementApiKey, translation = "en-US") => {

    headers['X-AUTH-TOKEN'] = flotiq_ApiKey;

        // directory
    // let directories = [];
    // try {
    //     directories = fs.readdirSync(directoryPath);
    // } catch (e) {
    //     if (exit) {
    //         console.error('\x1b[36m%s\x1b[0m', 'Incorrect import directory, cannot find .flotiq directory inside!');
    //         process.exit(1);
    //     } else {
    //         return
    //     }
    // }

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

    resultMedia = await importMedia(exportData.assets, translation, flotiq_ApiKey, cont_spaceId); 

    await importCtd(exportData.contentTypes);

    importCo(exportData.entries, resultMedia, translation);
}

async function importCtd(data) {

    data.forEach(async (obj) => {
        let ctdRec = {
            name: obj.sys.id,
            label: obj.name,
            schemaDefinition: {
                type: "object",
                allOf: [{
                    "$ref": "#/components/schemas/AbstractContentTypeSchemaDefinition", // (?) idk what is it for
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

        obj.fields.forEach((field) => {
            
            //console.log('test ctd field: ', field); // DEL
            if (field.required === true) {
                ctdRec.schemaDefinition.required.push(field.id);
            }
            ctdRec.metaDefinition.order.push(field.id);

            ctdRec.schemaDefinition.allOf[1].properties[field.id] = {
                type: findJsonType(field.type), // (?) idk how else should I do this. CF doesn't enlist param type in JSON. Not even sure if it is what i think it is
                minLength: 1,
            };

            if (ctdRec.schemaDefinition.allOf[1].properties[field.id].type === "array") {
                ctdRec.schemaDefinition.allOf[1].properties[field.id].items = {
                    $ref: "#/components/schemas/DataSource",
                    type: "test" //convertFieldType(field.type, field.linkType),
                }
            }

            ctdRec.metaDefinition.propertiesConfig[field.id] = {
                label: field.name,
                unique: false,
                helpText: "", // (?) haven't found any kind of helptext prop in CF fields
                inputType: convertFieldType(field.type, field.linkType), // (todo) make CF field types match Flotiq field types
                //CF FT: Rich text, Text, Number, Date, Location, Media, Boolean, JSON, Reference
                //Flotiq FT: Text, Textarea, Markdown, Rich text, Email, Number, Radio, Checkbox, Select, Relation, List, Geo, Media, Date, Block
                
                // (todo) other properties like :isTitlePart
            };
            field.validations.forEach((validation) => {
                if (!!validation.unique) {
                    ctdRec.metaDefinition.propertiesConfig[field.id].unique = true;
                }
            });

            if (ctdRec.metaDefinition.propertiesConfig[field.id].inputType === "datasource") {
                ctdRec.metaDefinition.propertiesConfig[field.id].validation = {};
                let count = 0;
                
                // for (prop in field.validations) { // (todo) (?) count validations in flotiq ctdRec instead of cf's ctd. idk if i get relationMultiple right
                //     if (field.validations.hasOwnProperty(prop)) {
                //         count++;
                //     }
                // }

                // if (count > 0) {
                //     ctdRec.metaDefinition.propertiesConfig[field.id].validation.relationMultiple = true; // (TODO) needs testing
                // }

                if (field.linkType === "Asset") {
                    ctdRec.metaDefinition.propertiesConfig[field.id].validation.relationContenttype = "_media";
                }
                
                if (field.linkType === "Entry") { // (?) not sure if link to ctd should be only for `Entry` linkType
                    field.validations.forEach((prop) => {
                        if (prop.hasOwnProperty("linkContentType")) {
                            ctdRec.metaDefinition.propertiesConfig[field.id].validation.relationContenttype = prop.linkContentType[0]; // (TODO) (?) how to make relation to multiple ctds in flotiq api?
                            if (prop.linkContentType.length > 1) {
                                ctdRec.metaDefinition.propertiesConfig[field.id].validation.relationMultiple = true; // (TODO) take care of todo above, then fix this
                            }
                        }
                    });
                }

                ctdRec.schemaDefinition.allOf[1].properties[field.id].items = {
                    $ref: "#/components/schemas/DataSource",
                }
                
                if (field.type === "Array") {
                    ctdRec.schemaDefinition.allOf[1].properties[field.id].items.type = findJsonType(field.items.type);
                    ctdRec.schemaDefinition.allOf[1].properties[field.id].items.validation = field.items.validations[0];
                }
            }

        });

            //  IMPORT
        let result = await fetch(config.apiUrl + '/api/v1/internal/contenttype', {
            method: 'POST',
            body: JSON.stringify(ctdRec), // (?) error code 500 Internal server error
            headers: {...headers, 'Content-Type': 'application/json'},
        })
        console.log(await result.json());
        console.log('test import json: ', JSON.stringify(ctdRec, null, 2)); // DEL
    })
}

function findJsonType(type) {
    // 
    if (type === "Text" || type === "Symbol" || type === "Date") return ("string");
    if (type === "Integer" || type === "Number") return ("number");
    if (type === "Location" || type === "Object") return ("object");
    if (type === "Array" || type === "Link") return ("array");
    if (type === "Boolean") return ("boolean");
    
    return ("Unknown field type");
    // (todo) change to object and return its proper value like in convertFieldType below
}

function convertFieldType(type, linkType) {
    // if (type === "Link") {
    //     if (linkType === "Asset") return ("datasource");
    //     if (linkType === "Entry") return ("datasource"); // (?) TBU idk what field type should it be
    //     console.error("Unknown link type!");
    // }
    // if (type === "Array") {
    //     return ("datasource");
    // } //DEL?
    objTypes = {
        RichText: "richtext",
        Text: "text",
        Symbol: "text",
        Integer: "number",
        Number: "number",
        Date: "dateTime",
        Location: "geo",
        Array: "datasource", // (?) TBU
        Boolean: "checkbox", // (?)
        Object: "object",
        Link: "datasource", // (?)
    }
    return objTypes[type];
}

async function importCo(data, media, trans) {
    
    data.forEach(async (obj) => {
        let coRec = {}
        
        for (const i in obj.fields) {

            let field = obj.fields[`${i}`][trans];

            if (field.hasOwnProperty("sys") == false) {
                coRec[i] = field;
            } else if (field.sys.type === "Link") {

                media.forEach((asset) => {
                    if (field.sys.id === asset.id) {
                        coRec[i] = [{
                            dataUrl: asset.url,
                            type: "internal" // (?) should it be internal?
                        }]
                    }
                });

            } else console.error(field.sys.type, ': unknown field type!');

        }
        console.log('test import co: ', JSON.stringify(coRec, null, 2), '\n\n'); //DEL
        
            //IMPORT
        let response = await fetch(
            'https://api.flotiq.com/api/v1/content/' + obj.sys.contentType.sys.id, {
            method: 'post',
            body: JSON.stringify(coRec),
            headers: {...headers, 'Content-Type': 'application/json' }
        });
        console.log('response: ', response);
    });
}

// (todo) mssg for exceeding file quota
async function importMedia(data, trans, apiKey) {
    let images = await flotiqMedia(apiKey);
    images = convertImages(images);
    data = await convertCfMedia(data, trans);
    let uploadedFiles = []; let uploaded = 0;
    
    await data.forEach(async (file) => {
        let result = await flotiqMediaUpload(apiKey, file, images);
        // console.log("Result for uploading: ", file.fileName, " : ", result); // DEL

        if (!result.code) {
            uploadedFiles[uploaded] = {
                fileName: file.fileName,
                url: result.url.replace("/image/0x0/", "/api/v1/content/_media/").replace("." + result.extension, ""), // (?) is there more cleaver way to remove extension and replace config url?
                id: file.cf_id
            }
            uploaded++;
        } else {
            // notifyErrorsMedia // (TODO)
        }
        // resultNotify(result, file.fileName);

        // console.log("data test: ", file); //DEL
        // console.log("\n###\n");
    });
    // console.log(uploadedFiles);
    return (uploadedFiles);

    function convertImages(images) {
        let convertedImages = {};
        images.forEach(image => {
            convertedImages[image.fileName] = image;
        })
        return convertedImages;
    }
};

const flotiqMedia = async (apiKey) => {
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

const flotiqMediaUpload = async (apiKey, contentObject, images) => { // (?) leave argument contentTypeName or make const `media`?
    let headers = {
        accept: 'application/json',
    };
    headers['X-AUTH-TOKEN'] = apiKey;

    //console.log("Test image matching filename: ", images);
    // console.log("Does file exist in flotiq media library already?: ", (!!images[contentObject.fileName])); // DEL
    // console.log("Content object: ", contentObject); // DEL

    
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
