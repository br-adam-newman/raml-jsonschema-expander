RAML JSON Schema Expander
============

### Purpose
This library will expand JSON Schema draft 4 schema references in a ramlObject created by raml2obj. It was primarily created for use in raml2html so that schemas which reference other schemas will be expanded instead of leaving "$ref": "foo.json#". 

### Usage
Currently you will need to use my fork of raml2html. In the future it may be included with raml2html. 

    git clone git@github.com:br-adam-newman/raml2html.git
    npm install
    raml2html/bin/raml2html -o Output.html Input.raml

### JSONSchema Requirements
Your JSON Schema files can be hosted on a web server or file system accessible by the machine that is running raml2html. Your JSON Schema objects must also have an id attribute with the canonical URI for that file. The library will use canonical dereferencing http://json-schema.org/latest/json-schema-core.html#anchor30 to pull the referenced file and replace the reference with the contents of that file. 

This will happen recursively for all referenced files. There is no cycle checking, it may run until it causes a stack overflow if there is a cycle. It will only fetch the file from the Internet/file system once per run to prevent repetitive IO traffic so that stack overflow should come quickly at least.

Example file events.json is a collection of event objects which must be hosted in a path relative from "$ref" to the URL described in "id" excluding the events.json part:

    {
      "$schema": "http://json-schema.org/draft-04/schema#",
      "id": "http://yourserver.example.com/path/to/schemas/events.json#",
      "type": "object",
      "description": "Collection of events",
      "properties": {
        "events": {
          "type": "array",
          "items": {
            "$ref": "event.json#"
          }
        },
        "deletions": {
          "type": "array",
          "items": {
            "type": "string",
            "format": "guid"
          },
          "description": "array of guids for items that were deleted since last sync."
        }
      }
    }
    
Example file event.json:
    
    {
        "$schema": "http://json-schema.org/draft-04/schema#",
        "id": "http://yourserver.example.com/path/to/schemas/event.json#",
        "type": "object",
        "description": "An event record",
        "properties": {              
          "guid": { "type": "string", "format": "guid" },      
          "lastModified": { "type": "string", "format": "iso8601" },
          "eventStartDate": { "type": "string", "format": "iso8601" },
          "eventEndDate": { "type": "string", "format": "iso8601" }
        }
    }
    
### File System IDs
With version 1.1.0 support has been added for the id attribute to be a relative or absolute file path. 

        "id": "file://relative/path/to/resource.json#"
        //or
        "id": "file:///absolute/path/to/resource.json#"
        //or
        "id": "/path/without/file/scheme/to/resource.json#"
        //or
        "id": "../relative/path/without/file/scheme/to/resource.json"

The file:// scheme out front makes it a URI. It will work without it, but it feels wrong. 
    
### Changelog
*   1.1.1 - Handle String type mismatch. 
*   1.1.0 - Added support for file:// URI with a relative or absolute path for id attribute.
*   1.0.2 - Fixed recursive expansion bug
*   1.0.1 - Initial release
