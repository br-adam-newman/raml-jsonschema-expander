'use strict';

var urllibSync = require('urllib-sync');

var schemaCache = {};

function expandJsonSchemas(ramlObj) {
    for (var schemaIndex in ramlObj.schemas) {
        var schema = ramlObj.schemas[schemaIndex];
        var objectKey = Object.keys(schema)[0];
        var schemaText = expandSchema(schema[objectKey]);
        schema[objectKey] = schemaText;
    }
}

function expandSchema(schemaText) {
    console.log("Expanding:" + schemaText);
    if (schemaText.indexOf("$ref") > 0) {
        var schemaObject = JSON.parse(schemaText);
        if (schemaObject.id) {
            var basePath = getBasePath(schemaObject.id);
            return JSON.stringify(walkTree(basePath, schemaObject), null, 2);
        } else {
            return schemaText;
        }
    } else {
        return schemaText;
    }
}

/**
 * Walk the tree hierarchy until a ref is found. Download the ref and expand it as well in its place.
 * Return the modified node with the expanded reference.
 */
function walkTree(basePath, node) {
    var keys = Object.keys(node);
    for (var keyIndex in keys) {
        var key = keys[keyIndex];
        var value = node[key];
        if (key === "$ref") {
            node[key] = expandRef(basePath, value);
        } else if (isObject(value)) {
            walkTree(basePath, value);
        } else if (isArray(value)) {
            walkArray(basePath, value);
        }
    }    
    return node;
}

function expandRef(basePath, value) {
    var refUri = basePath + value;
    var refText = fetchRef(refUri);
    console.log("Downloaded ref: " + refText);
    return {"$ref": value};
}

function fetchRef(refUri) {
    if (refUri in schemaCache) {
        return schemaCache[refUri];
    } else {
        var request = urllibSync.request;
        var response = request(refUri, { timeout: 30000 });            
        if (response.status == 200) {
            schemaCache[refUri] = response.data;
        }
        return response.data;
    }
}

function walkArray(basePath, value) {
    for (var i in value) {
        var element = value[i];
        if (isObject(element)) {
            walkTree(basePath, value);
        }
    }
}

function isObject(value) {
    return Object.prototype.toString.call(value) === "[object Object]";
}

function isArray(value) {
    return Object.prototype.toString.call(value) === "[object Array]";
}

function getBasePath(path) {
    var identityPath = path.split('/');
    identityPath.pop();
    return identityPath.join('/');
}

module.exports.expandJsonSchemas = expandJsonSchemas;