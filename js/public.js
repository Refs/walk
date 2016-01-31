// stops processing completely
Walk.break = function(){
    Walk.__exceptions.stopProcess();
};

// walk shorthand, applys callback to everything
Walk.apply = function(object, callback){
    Walk.walk(object, undefined, {
        callbacks: [
            {
                callback:callback
            }
        ]
    });
};

Walk.find = function(object, value, typeConversion){
    if (typeof typeConversion === 'undefined'){
        typeConversion = false;
    }
    var compareConvert = function(a,b){return a == b;};
    var compareNoConvert = function(a,b){return a === b;};
    var comparison =  typeConversion ? compareConvert : compareNoConvert;
    var matches = [];
    Walk.apply(object, function(node){
        if (comparison(node.val, value)){
            matches.push(node.val);
        }
    });
    return matches;
};


// TODO: modify to work with graphs, currently assumes one root
Walk.convert = function(object, className, key){                
    var root;
    Walk.walk(object, className, {
        rootObjectCallbacks: true,
        callbacks: [
            {
                positions: ['postWalk'],
                callback:function(node){
                    var nodeParent = node.parent();
                    if (nodeParent){
                        if (node.key){
                            nodeParent.val[node.key] = node;
                        } else {
                            for (var i = 0; i < nodeParent.val.length; i++) {
                                if ( nodeParent.val[i] === node.val ){
                                    nodeParent.val[i] = node;
                                }
                            }
                        }                                    
                    } else {
                        root = node;
                        object = root;
                    }
                }
            }
        ]
    });
   return root;
};

Walk.nodeMap = function(object, className){
    var map = {};
    Walk.walk(object, className, {
        rootObjectCallbacks: true,
        callbacks: [
            {
                positions: ['postWalk'],
                callback:function(node){
                    map[node.id] = node;
                }
            }
        ]
    });
    return map;
};


Walk.flatten = function(object, key, unique) {
    //return array of values that match the key
    var arr = [];
    Walk.walk(object, undefined, {
        callbacks: [{
            keys: [key],
            callback: function(node) {
                arr.push(node.val);
            }
        }]
    });
    return unique ? Walk.unique(arr) : arr;
};

Walk.updateObjectViaPathString = function(obj, val, path, delimiter) {
    var block = path.split(delimiter).slice(1);
    while (block.length > 1) {
        obj = obj[block.shift()];
    }
    obj[block.shift()] = val;
};

Walk.unique = function(arr) {
    var inarr = {};
    return arr.filter(function(x) {
        if (inarr[x]) {
            return;
        } 
        inarr[x] = true;
        return x;
    });
};

Walk.deepCopy = function(obj) {
    var newObj = {};
    var uuid = '7f:&*_a6a'; // for minimal chance of key colision
    
    Walk.walk(obj, undefined, {
        pathFormat: function(key, isArr) {
            return uuid + key;
        },
        rootObjectCallbacks: false,
        callbacks: [{
            positions: ['preWalk'],
            callback: function(node) {
                switch (node.container) {
                    case 'array':
                        Walk.updateObjectViaPathString(newObj, [], node.path, uuid);
                        break;
                    case 'object':
                        Walk.updateObjectViaPathString(newObj, {}, node.path, uuid);
                        break;
                    case 'value':
                        Walk.updateObjectViaPathString(newObj, node.val, node.path, uuid);
                        break;
                }
            }
        }]
    });
    return newObj;
};


