'use strict';

var schemaDictionary = {};

function expandJsonSchemas(ramlObj) {
  for (var schemaIndex in ramlObj.schemas) {
    var schema = ramlObj.schemas[schemaIndex];
    var objectKey = Object.keys(schema)[0];
    var schemaText = expandSchema(schema[objectKey]);
    schema[objectKey] = schemaText;
  }
}

function expandSchema(schemaText) {
    console.log(schemaText);
    if (schemaText.indexOf("$ref") > 0) {
        var schemaObject = JSON.parse(schemaText);
        if (schemaObject.id) {
            var regex = /\"\$ref\".*:.*\"(.*)\"/g;
            var matches = getMatches(schemaText, regex);
            console.log("References: " + schemaObject.id + "/" + JSON.stringify(matches));
        } else {
            return schemaText;
        }
    } else {
        return schemaText;
    }
}

function getMatches(string, regex, index) {
  index || (index = 1); // default to the first capturing group
  var matches = [];
  var match;
  while (match = regex.exec(string)) {
    matches.push(match[index]);
  }
  return matches;
}

module.exports.expandJsonSchemas = expandJsonSchemas;