Walk.__exceptions.classNotFound = function(key) {
    throw "No associated class found for key: '" + key + "'.";
};

Walk.__exceptions.traversalFault = function(type) {
    throw "This function is not available when running in " + type + " mode! See the documentation for details.";
};

Walk.__exceptions.notImplemented = function(fn) {
    throw fn + " not implemented yet but will be soon!";
};

Walk.__exceptions.structureFault = function() {
    throw "The object violates the defined structure. Override 'dataStructure' in the config to allow parsing different object structures.";
};

Walk.__exceptions.stopProcess = function(){
    throw "walk:stopProcess";
};

Walk.__exceptions.validationError = function(err){
    throw err;
};