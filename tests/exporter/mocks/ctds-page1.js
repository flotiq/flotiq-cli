module.exports.ctds = {
    "total_pages": 2,
    "data": [
        {
            "id": "Type-1-id",
            "name": "Type-1-name",
            "label": "Type-1-label",
            "internal": false,
            "schemaDefinition": {
                "type": "object",
                "allOf": [
                    {"$ref": "#/components/schemas/AbstractContentTypeSchemaDefinition"},
                    {
                        "type": "object",
                        "properties": {
                            "data": {
                                "type": "string",
                                "minLength": 1
                            },
                            "name": {
                                "type": "string",
                                "minLength": 1
                            }
                        }
                    }
                ],
                "required": [
                    "name",
                    "data"
                ],
                "additionalProperties": false
            },
            "metaDefinition": {
                "order": [
                    "name",
                    "data"
                ],
                "propertiesConfig": {
                    "data": {
                        "label": "Data",
                        "unique": true,
                        "helpText": "",
                        "inputType": "text"
                    },
                    "name": {
                        "label": "Name",
                        "unique": false,
                        "helpText": "",
                        "inputType": "text"
                    }
                }
            }
        }
    ]
}
