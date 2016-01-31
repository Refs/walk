(function(window) {
    'use strict';
    function defineWalk() {
        var Walk;
        Walk = {
            __exceptions: {},
            __data: {
                reports: []
            },
            __util: {},
            __classes: {},
            __builders: {},
            __matchedCallbacks: function(node, position) {
                var runCallbacks = Walk.__runtime.config.runCallbacks;
                var matched = [];
                if (runCallbacks) {
                    var callbacks = Walk.__runtime.positionCallbacks[position];
                    if (typeof callbacks == 'undefined') {
                        return [];
                    }
                    for (var i = 0; i < callbacks.length; ++i) {
                        var callback = callbacks[i];

                        // exit if containers are defined and not in list
                        if (typeof(callback.containers) !== 'undefined' && callback.containers.indexOf(node.container) === -1) {
                            continue;
                        }

                        // exit if classNames are defined and not in list
                        if (typeof(callback.classNames) !== 'undefined' && callback.classNames.indexOf(node.className) === -1) {
                            continue;
                        }                      

                        // exit if keys are defined and not in list
                        var keysDef = typeof(callback.keys) !== 'undefined';
                        var classKeysDef = typeof(callback.classKeys) !== 'undefined';
                        // if either is defined
                        if (keysDef || classKeysDef) {
                            // return if there isnt any key on this object
                            if (typeof(node.key) === 'undefined') {
                                continue;
                            }
                            // if its a class key definition
                            if (classKeysDef) {
                                // if no parent, we're no eligible
                                var nodeParent = node.parent()
                                if (nodeParent === 'undefined'){
                                    return;
                                }
                                if (typeof nodeParent.className === 'undefined' 
                                    || typeof callback.classKeys[nodeParent.className] === 'undefined' 
                                    || callback.classKeys[nodeParent.className].indexOf(node.key) === -1) {
                                    continue;
                                }
                            } else if (callback.keys.indexOf(node.key) === -1) {
                                continue;
                            }
                        }
                        matched.push(callback);
                    }
                }
                return matched;
            },
            __execCallbacks: function(callbacks, node) {
                for (var p = 0; p < callbacks.length; ++p) {
                    callbacks[p].__walk$_has_run = false; // only in case users want this, not used internally
                }
                for (var i = 0; i < callbacks.length; ++i) {
                    if (Walk.__runtime.config.monitorPerformance) {
                        var cbStackStart = new Date();
                        callbacks[i].callback(node);
                        Walk.__data.reports[Walk.__runtime.reportId].callbackProcessingTime += new Date() - cbStackStart;
                    } else {
                        callbacks[i].callback(node);
                    }
                    callbacks[i].__walk$_has_run = true;
                    node.executedCallbacks.push(callbacks[i]);
                }
                for (var k = 0; k < callbacks.length; ++k) {
                    delete callbacks[k].__walk$_has_run;
                }
            },
            __process: function(data, mode, queue){
                var key = data.key;
                var val = data.val;
                var className = data.className;
                var path = data.path || '';
                var parent = data.parent;

                var node = Walk.__builders.nodeBuilder(key, val, className, path);
                // set this node as a child on its parent
                if (typeof parent !== 'undefined'){
                    node.addParent(parent);
                }

                // everything under here should only use node props
                var matchedPreCallbacks = Walk.__matchedCallbacks(node, 'preWalk');
                Walk.__execCallbacks(matchedPreCallbacks, node);               

                var childData;
                // add children to queue
                if (node.container === 'array'){
                    for (var i = 0; i < node.val.length; ++i) {
                        childData = {
                            key: undefined,
                            val: node.val[i],
                            className: node.className,
                            path: node.path + Walk.__runtime.config.pathFormat(i, true),
                            parent: node
                        };
                        if (mode === 'breadth') {
                            queue.push(childData);
                        } else if (mode === 'depth') {
                            Walk.__process(childData, 'depth');
                        }                        
                    } 
                } else if (node.container === 'object'){                    
                    for (var xkey in node.val) {
                        if (node.val.hasOwnProperty(xkey)) {                                
                            childData = {
                                key: xkey,
                                val: node.val[xkey],
                                className: undefined, // className
                                path: node.path + Walk.__runtime.config.pathFormat(xkey, false), // path
                                parent: node
                            };
                            if (mode === 'breadth') {
                                queue.push(childData);
                            } else if (mode === 'depth') {
                                Walk.__process(childData, 'depth');
                            }
                        }
                    }
                }
                // match and run post-traverse callbacks
                var matchedPostCallbacks = Walk.__matchedCallbacks(node, 'postWalk');
                Walk.__execCallbacks(matchedPostCallbacks, node);

            },
            // does a traversal to build the map AND runs callbacks (inline, so only parent is accessible)
            __breadthTraverse: function(inputData) {
                var queue = []; 
                var current;
                Walk.__process(inputData, 'breadth', queue);
                while( queue.length > 0 ){
                    current = queue.shift();
                    Walk.__process(current, 'breadth', queue);
                }
            },            
            // does a traversal to build the map AND runs callbacks (inline, so only parent is accessible)
            __depthTraverse: function(inputData) {
                Walk.__process(inputData, 'depth');
            },
            __validateConfig: function(config) {
                for (var key in config){
                    var allowed = false;
                    for (var xkey in Walk.configDefaults){
                        if (key === xkey){
                            allowed = true;
                            break;
                        }
                    }
                    if (!allowed){
                        Walk.__exceptions.validationError("'" + key + "' is not a valid configuration entry.");
                    }
                }
            },
            __initializeWalk: function(config) {
                Walk.__runtime = {};
                Walk.__runtime.config = {};
                Walk.__runtime.nodes = {};
                Walk.__runtime.seenObjects = [];
                Walk.__runtime.nodeObjectMap = new WeakMap();
                Object.assign(Walk.__runtime.config, Walk.configDefaults);
                Object.assign(Walk.__runtime.config, config);

                Walk.__validateConfig(Walk.__runtime.config);

                if (Walk.__runtime.config.traversalMode !== 'depth' && Walk.__runtime.config.traversalMode !== 'breadth') {
                    Walk.__exceptions.notImplemented("Traversal modes other than 'depth' and 'breadth' are");
                }

                Walk.__runtime.positionCallbacks = {};
                    // set callbacks initial properties and assign to lists
                for (var i = 0; i < Walk.__runtime.config.callbacks.length; ++i) {
                    if (typeof Walk.__runtime.config.callbacks[i].priority == 'undefined') {
                        Walk.__runtime.config.callbacks[i].priority = 0;
                    }
                    if (typeof Walk.__runtime.config.callbacks[i].positions == 'undefined' || Walk.__runtime.config.callbacks[i].positions.length < 1) {
                        Walk.__runtime.config.callbacks[i].positions = [Walk.defaultCallbackPosition];
                    }
                    for (var p = 0; p < Walk.__runtime.config.callbacks[i].positions.length; ++p) {
                        var position = Walk.__runtime.config.callbacks[i].positions[p];
                        if (typeof Walk.__runtime.positionCallbacks[position] == 'undefined') {
                            Walk.__runtime.positionCallbacks[position] = [];
                        }
                        Walk.__runtime.positionCallbacks[position].push(Walk.__runtime.config.callbacks[i]);
                    }
                }

                // sort the position lists
                for (var key in Walk.__runtime.positionCallbacks) {
                    Walk.__runtime.positionCallbacks[key] = Walk.__runtime.positionCallbacks[key].sort(Walk.__util.sortByPriority);
                }

            },
            __initializeReport: function() {
                var id = Walk.__data.reports.length;
                Walk.__data.reports.push({});
                Walk.__data.reports[id].id = id;
                Walk.__data.reports[id].startTime = new Date();
                Walk.__data.reports[id].callbackProcessingTime = 0;
                Walk.__data.reports[id].processed = {};
                Walk.__data.reports[id].processed.array = 0;
                Walk.__data.reports[id].processed.object = 0;
                Walk.__data.reports[id].processed.value = 0;
                Walk.__data.reports[id].processed.classInstances = {};
                return id;
            },
            __deconstructReport: function(id) {
                if (!Walk.__data.reports[id]) {
                    return;
                }
                Walk.__data.reports[id].endTime = new Date();
                Walk.__data.reports[id].executionTime = Walk.__data.reports[id].endTime - Walk.__data.reports[id].startTime;
            },
            __deconstructWalk: function() {
                if (Walk.__runtime.config.monitorPerformance && Walk.__data.reports[Walk.__runtime.reportId]) {
                    Walk.__deconstructReport(Walk.__runtime.reportId);
                    Walk.__runtime.config.logger.log("Finished execution. Performance report below.");
                    Walk.__runtime.config.logger.log(Walk.__data.reports[Walk.__runtime.reportId]);
                }
                delete Walk.__runtime;
            },
            __checkStructure: function(val){
                var mode = Walk.__runtime.config.dataStructure;
                var existingNode = Walk.__runtime.nodeObjectMap.get(val);
                if ( typeof existingNode !== 'undefined' ){
                    if (mode === 'finiteTree'){
                        Walk.__exceptions.structureFault();
                    } else if (mode === 'graph'){
                        return existingNode; // node
                    }                     
                }                                
                return false;
            },
            // execute traversal of object using config from above
            walk: function(obj, className, config) {
                //try {
                    Walk.__initializeWalk(config);

                    if (Walk.__runtime.config.monitorPerformance) {
                        var reportId = Walk.__initializeReport();
                        Walk.__runtime.reportId = reportId;
                    }

                    var data = {
                        key: undefined,
                        val: obj,
                        className: className,
                        path: undefined
                    };

                    if (Walk.__runtime.config.traversalMode === 'depth'){
                        Walk.__depthTraverse(data);
                    } else if (Walk.__runtime.config.traversalMode === 'breadth'){
                        Walk.__breadthTraverse(data);
                    }

               /* } catch(err) {
                    if (err !== "walk:stopProcess"){
                        if (typeof console.error !== 'undefined'){
                            console.error("Error during walk(): " + err);
                        } else {
                            console.log("Error during walk(): " + err);
                        }                        
                    }
                } finally {*/
                    Walk.__deconstructWalk();
                    return Walk.__runtime;
                //}
            }
        };
        return Walk;
    }
    if (typeof(Walk) === 'undefined') {
        window.Walk = defineWalk();
    } else {
        console.log("Error defining 'Walk': already defined.");
    }
}(this));
Walk.__data.idCounter = 0;
Walk.__data.edgeIdCounter = 0;


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
Walk.defaultCallbackPosition = 'postWalk';

Walk.configDefaults = {
    classMap: {},
    logger: console,
    traversalMode: 'depth',
    strictClasses: false,
    rootObjectCallbacks: true,
    runCallbacks: true,
    monitorPerformance: false,
    dataStructure: 'finiteTree', //TODO: tree, directedAcyclicGraph, directedGraph, graph
    pathFormat: function(key, isArr) {
        return isArr ? '[' + key + ']' : '["' + key + '"]';
    },
    callbacks: []
};
Walk.__util.sortByPriority = function(a, b) {
    var x = a.priority;
    var y = b.priority;
    return ((x < y) ? 1 : ((x > y) ? -1 : 0));
};

Walk.__util.log = function(args, type) {
    if (Walk.__runtime.config.log !== true) {
        return;
    }
    if (typeof(type) === 'undefined') {
        type = 1;
    }
    if (type === 1) {
        Walk.__runtime.config.logger.log.apply(console, args);
    } else if (type === 2) {
        if (typeof(console.group) !== 'undefined') {
            Walk.__runtime.config.logger.group.apply(console, args);
        }
    } else if (type === 3) {
        if (typeof(console.groupEnd) !== 'undefined') {
            Walk.__runtime.config.logger.groupEnd.apply(console, args);
        }
    }
};
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



Walk.__classes.edge = function(tailNode, headNode, isDirected){
    this.head = headNode;
    this.tail = tailNode;
    this.directed = isDirected;
    this.id = Walk.__data.edgeIdCounter++;

    // now set counts on the two nodes
    if (this.isDirected){
        this.head.edges.asHead.push(this);
        this.tail.edges.asTail.push(this);        
    } else {
        this.head.edges.undirected.push(this);
        this.tail.edges.undirected.push(this);
    }
}
Walk.__classes.node = function(id, key, val, type, className, path, container){
    this.edges = {
        asTail: [], //all edges where this node is the parent
        asHead: [], //all edges where this node is the tail
        undirected: [], //all undirected edges
    };
    this.id = id;
    this.key = key;
    this.val = val;
    this.type = type;
    this.className = className;
    this.path = path;
    this.container = container;
    this.executedCallbacks = [];
    this.encountered = 1;
}

Walk.__classes.node.prototype.isRoot = function(){
    return this.edges.asTail.length === 0;
}

// ------------
// EDGE GETTERS
// ------------

Walk.__classes.node.prototype.filterEdges = function(type, config){
    var edgeList;
    if (type === 'children'){
        edgeList = this.edges.asTail;
    } else if (type === 'parents') {
        edgeList = this.edges.asHead;
    } else if (type === 'neighbors'){
        edgeList = this.edges.undirected;
    }

    if (typeof config !== 'undefined'){
        var matched = [];
        for (var i = 0; i < edgeList.length; ++i){
            var matchedKey = true;
            for (var key in config){
                if (edgeList[i][key] !== config[key]){
                    matchedKey = false;
                    break;
                }
            }
            if (matchedKey){
                matched.push(edgeList[i]);
            }
        }
        return matched;
    } else {
        return edgeList;
    } 
}

Walk.__classes.node.prototype.parents = function(config){            
    return this.filterEdges('parents', config);    
};  

// only return if exactly one exists
Walk.__classes.node.prototype.parent = function(){    
    if (this.edges.asHead.length === 1){
        return this.edges.asHead[0].tail;        
    }
}

Walk.__classes.node.prototype.children = function(config){            
    return this.filterEdges('children', config);    
};  


Walk.__classes.node.prototype.neighbors = function(config){            
    return this.filterEdges('neighbors', config);    
};  

Walk.__classes.node.prototype.ancestors = function(){
    var ancestors = [];
    var parents = this.parents();
    while(parents){
        var parent = parents.pop();
        ancestors.push(parent);
        var grandParents = parent.parents();
        if (grandParents.length > 0){
            parents = parents.concat(grandParents);
        }        
    }
    return ancestors;
};

// all connected roots
Walk.__classes.node.prototype.roots = function(){
    var seen = [];
    var roots = [];
    var edges = this.parents().concat(this.neighbors());
    while(edges){ 
        edge = edges.pop();
        seen.push(edge);
        if (edge.isRoot()){
            roots.push(edge);
        }
        edgeEdges = edge.parents().concat(edge.neighbors());
        for (var i = 0; i < edgeEdges.length; i++) {
            if (seen.indexOf(edgeEdges[i]) === -1){
                edges.push(edgeEdges[i]);
            }            
        };
    }
    return roots;
};

// all parents' children
Walk.__classes.node.prototype.siblings = function(){
    var parents = this.parents();
    var siblings = [];
    for (var i = 0; i < parents.length; ++i) {
        var children = parents[i].children();
        for (var p = 0; p < children.length; ++p) {
            if (children[p] !== this){
                siblings.push(children[p]);
            }
        };
    };
    return siblings;          
};

// ------------
// EDGE ADDERS
// ------------

Walk.__classes.node.prototype.createEdge = function(adjacentNode, direction){
    var edge;
    if (direction === -1){
        // this node is the child
        edge = new Walk.__classes.edge(adjacentNode, this, true);
        this.edges.asHead.push(edge);
    } else if (direction === 1){
        // this node is the parent
        edge = new Walk.__classes.edge(this, adjacentNode, true);
        this.edges.asTail.push(edge);
    } else {
        // no directionality
        edge = new Walk.__classes.edge(this, adjacentNode, false);
        this.edges.undirected.push(edge);
    }
    return edge;
}

Walk.__classes.node.prototype.addParent = function(parent){
    this.createEdge(parent, -1);
}

Walk.__classes.node.prototype.addChild = function(child){
    this.createEdge(child, 1);
}

Walk.__classes.node.prototype.addNeighbor = function(neighbor){
    this.createEdge(neighbor, 0);
}

// ------------
// NODE FACTORY
// ------------

Walk.__builders.nodeBuilder = function(key, val, className, path){

    var type = typeof(val);

    // ------------------
    // get container type
    // ------------------
    var container;
    var canCheckConstructor = !(typeof(val) === 'undefined' || val === null);
    if (canCheckConstructor && val.constructor == Array) {
        container = 'array';
    } else if (canCheckConstructor && val.constructor == Object) {
        container = 'object';
    } else {
        // TODO: better type evaluation (dates, etc)
        container = 'value';
    }    

    // ------------------
    // check if the container is a reference, if so, check if we've encountered the ref'd obj before
    // ------------------
    if (container === 'object' || container === 'array'){
        var existingNode = Walk.__checkStructure(val);
        if (existingNode){
            existingNode.encountered++;
            return existingNode;
        }
    }

    // ------------------
    // get class name
    // ------------------
    if (typeof(className) === 'undefined') {
        var classMap = Walk.__runtime.config.classMap;
        var noClassDefinition = !classMap || !Walk.__runtime.config.classMap[key];
        if (Walk.__runtime.config.strictClasses && noClassDefinition && container == 'object') {
            // throw exception if necessary definitions aren't set
            Walk.__exceptions.classNotFound(key);
        } else if (!noClassDefinition) {
            //class definition exists, so set class
            className = Walk.__runtime.config.classMap[key];
        }
    } else {
        // class pre-set, so inheret (this should only happen for items in arrays)
    }

    // for reports, process class names now
    if (Walk.__runtime.config.monitorPerformance) {
        Walk.__data.reports[Walk.__runtime.reportId].processed[container] += 1;
        if (typeof(className) !== 'undefined' && container != 'array') {
            if (typeof(Walk.__data.reports[Walk.__runtime.reportId].processed.classInstances[className]) === 'undefined') {
                Walk.__data.reports[Walk.__runtime.reportId].processed.classInstances[className] = 1;
            } else {
                Walk.__data.reports[Walk.__runtime.reportId].processed.classInstances[className] += 1;
            }
        }
    }

    // ------------------
    // build node
    // ------------------

    var id = ++Walk.__data.idCounter;
    var node = new Walk.__classes.node(
        id, 
        key, 
        val, 
        type, 
        className,
        path, 
        container);

    if (container === 'array' || container ==='object'){
        Walk.__runtime.nodeObjectMap.set(val, node);
    }
    return node;
}