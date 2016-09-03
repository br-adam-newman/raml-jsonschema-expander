'use strict';

var urllibSync = require('urllib-sync');
var fs = require('fs');

var schemaHttpCache = {};
var expandedSchemaCache = {};

var httpUriRegex = /^https?:\/\/.*/;
var fileUriRegex = /^file:\/\/([^#]*)#?/;

function expandJsonSchemas(ramlObj) {
    for (var schemaIndex in ramlObj.schemas) {
        var schema = ramlObj.schemas[schemaIndex];
        var objectKey = Object.keys(schema)[0];
        var schemaText = expandSchema(schema[objectKey]);
        schema[objectKey] = schemaText;
    }
    
    for (var resourceIndex in ramlObj.resources) {
        var resource = ramlObj.resources[resourceIndex];
        ramlObj.resources[resourceIndex] = fixSchemaNodes(resource);
    }
    
    return ramlObj;
}

/**
 *  Walk through the hierarchy provided and replace schema nodes with expanded schema.
 */
function fixSchemaNodes(node) {
    var keys = Object.keys(node);
    for (var keyIndex in keys) {
        var key = keys[keyIndex];
        var value = node[key];
        if (key === "schema" && isJsonSchema(value)) {
            var schemaObj = JSON.parse(value);
            if (schemaObj.id && schemaObj.id in expandedSchemaCache) {
                node[key] = JSON.stringify(expandedSchemaCache[schemaObj.id], null, 2);
            }
        } else if (isObject(value)) {
            node[key] = fixSchemaNodes(value);
        } else if (isArray(value)) {
            node[key] = fixSchemaNodesInArray(value);
        }
    }
    return node;
}

function fixSchemaNodesInArray(value) {
    for (var i in value) {
        var element = value[i];
        if (isObject(element)) {
            value[i] = fixSchemaNodes(element);
        }
    }
    return value;
}

function expandSchema(schemaText) {
    // if we don't start with a string, we have to make it a string
    // so {}.indexOf() doesn't make things blow up.
    if (typeof schemaText === 'object') {
	schemaText = JSON.stringify(schemaText);
    }
    if (schemaText.indexOf("$ref") > 0 && isJsonSchema(schemaText)) {
        var schemaObject = JSON.parse(schemaText);
        if (schemaObject.id) {
            var basePath = getBasePath(schemaObject.id);
            var expandedSchema = walkTree(basePath, schemaObject);
            expandedSchemaCache[schemaObject.id] = expandedSchema;
            return JSON.stringify(expandedSchema, null, 2);
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
    var expandedRef;
    for (var keyIndex in keys) {
        var key = keys[keyIndex];
        var value = node[key];
        if (key === "$ref") {
            if (value === "#") {
                //Avoid recursively expanding
                return node;
            } else {
                //Node has a ref, create expanded ref in its place.
                expandedRef = expandRef(basePath, value);
                delete node["$ref"];
            }
        } else if (isObject(value)) {
            node[key] = walkTree(basePath, value);
        } else if (isArray(value)) {
            node[key] = walkArray(basePath, value);
        }
    }    
    
    //Merge an expanded ref into the node
    if (expandedRef != null) {
        mergeObjects(node, expandedRef);
    }
    
    return node;
}

function mergeObjects(destination, source) {
    for (var attrname in source) { destination[attrname] = source[attrname]; }
}

function expandRef(basePath, value) {
    var refUri = basePath + "/" + value;
    var refText = fetchRef(refUri);
    var refObject = JSON.parse(refText);
    var newBasePath;
    if (refObject.id) {
        newBasePath = getBasePath(refObject.id);
    } else {
        newBasePath = basePath;
    }
    return walkTree(newBasePath, refObject);
}

function fetchRef(refUri) {
    var result = null;
    if (refUri in schemaHttpCache) {
        result = schemaHttpCache[refUri];
    } else {
        if (httpUriRegex.test(refUri)) {
            //Read from HTTP connection
            var request = urllibSync.request;
            var response = request(refUri, { timeout: 30000 });            
            if (response.status == 200) {
                result = response.data;
            }
        } else {
            //Assume raw file path
            var filePath = refUri;
            
            //Check for file:// formatted URI
            var fileRegexGroups = fileUriRegex.exec(refUri);
            if (fileRegexGroups != null && fileRegexGroups.length == 2) {
                filePath = fileUriRegex.exec(refUri)[1];
            }
            
            //Read file from normalized path
            result = fs.readFileSync(filePath).toString();
        }
        
        if (result != null) {
            schemaHttpCache[refUri] = result;
        }
    }
    
    if (result == null) {
        throw "fetchRef failed for URI:" + refUri;
    }
    
    return result;
}

function walkArray(basePath, value) {
    for (var i in value) {
        var element = value[i];
        if (isObject(element)) {
            value[i] = walkTree(basePath, element);
        }
    }
    return value;
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

function isJsonSchema(schemaText) {
    return (schemaText.indexOf("http://json-schema.org/draft-04/schema") > 0);
}

module.exports.expandJsonSchemas = expandJsonSchemas;
