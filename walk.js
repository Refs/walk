var Walk = (function(window) {
    'use strict';    

    var classNotFound = function(key) {
        throw "No associated class found for key: '" + key + "'.";
    };

    var traversalFault = function(type) {
        throw "This function is not available when running in " + type + " mode! See the documentation for details.";
    };

    var notImplemented = function(fn) {
        throw fn + " not implemented yet but will be soon!";
    };

    var structureFault = function() {
        throw "The object violates the loop tolerance. Override 'loopTolerance' in the config to allow parsing different object structures.";
    };

    var stopProcess = function(){
        throw "walk:stopProcess";
    };

    var validationError = function(err){
        throw err;
    };

    var Node = function(id, key, val, type, className, path, container){
        this.rel = {
            children: [],
            parents: [],
            neighbors: []
        };
        this.id = id;
        this.key = key;
        this.val = val;
        this.type = type;
        this.className = className;
        this.path = path;
        this.container = container;
        this.executedCallbacks = [];
    };

    Node.prototype.encountered = 1;

    Node.prototype.isRoot = function(){
        return this.rel.parents.length <= 0;
    };

    // ------------
    // EDGE GETTERS
    // ------------

    Node.prototype.filterEdges = function(type, config){
        var edgeList;
        var matched = [];
        if (type === 'children'){
            edgeList = this.rel.children;
        } else if (type === 'parents') {
            edgeList = this.rel.parents;
        } else if (type === 'neighbors'){
            edgeList = this.rel.neighbors;
        }
        if (typeof config !== 'undefined'){
            
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
        } else {
            return edgeList;
        } 
        return matched;
    };

    Node.prototype.parents = function(config){
        return this.filterEdges('parents', config);    
    };  

    // only return if exactly one exists
    Node.prototype.parent = function(){    
        if (this.rel.parents.length === 1){
            return this.rel.parents[0];        
        }
    };

    Node.prototype.children = function(config){            
        return this.filterEdges('children', config);    
    };  


    Node.prototype.neighbors = function(config){            
        return this.filterEdges('neighbors', config);    
    };  

    Node.prototype.ancestors = function(){
        var ancestors = [];
        var parents = this.parents();
        while(parents.length > 0){
            var parent = parents.pop();
            if (ancestors.indexOf(parent) !== -1){
                continue;
            }
            ancestors.push(parent);
            var grandParents = parent.parents();
            if (grandParents.length > 0){
                parents = parents.concat(grandParents);
            }        
        }
        return ancestors;
    };

    // all connected roots
    Node.prototype.roots = function(){
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
            }
        }
        return roots;
    };

    // all parents' children
    Node.prototype.siblings = function(){
        var parents = this.parents();
        var siblings = [];
        for (var i = 0; i < parents.length; ++i) {
            var children = parents[i].children();
            for (var p = 0; p < children.length; ++p) {
                if (children[p] !== this){
                    siblings.push(children[p]);
                }
            }
        }
        return siblings;          
    };

    // ------------
    // EDGE ADDERS
    // ------------

    Node.prototype.createEdge = function(adjacentNode, direction){
        if (direction === -1){
            // this node is the child
            this.rel.parents.push(adjacentNode);
        } else if (direction === 1){
            // this node is the parent
            this.rel.children.push(adjacentNode);
        } else {
            // no directionality
            this.rel.neighbors.push(adjacentNode);
        }
    };

    Node.prototype.addParent = function(parent){
        this.createEdge(parent, -1);
    };

    Node.prototype.addChild = function(child){
        this.createEdge(child, 1);
    };

    Node.prototype.addNeighbor = function(neighbor){
        this.createEdge(neighbor, 0);
    };

    var Walk = {
        defaultCallbackPosition: 'postWalk',
        configDefaults: {
            classMap: {},
            logger: console,
            traversalMode: 'depth',
            strictClasses: false,
            rootObjectCallbacks: true,
            runCallbacks: true,
            monitorPerformance: false,
            nodeVisitCount: 1,
            structure: "tree",
            loopTolerance: 0, // 0 = tree, 1 = directed acyclic, 2 = graph
            pathFormat: function(key, isArr) {
                return isArr ? '[' + key + ']' : '["' + key + '"]';
            },
            callbacks: []
        },
        __data: {
            reports: [],
            edgeIdCounter: 0,
            idCounter: 0
        }            
    };

    // ------------
    // NODE FACTORY
    // ------------

    Walk.__NodeBuilder = function(key, val, className, path){

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
                classNotFound(key);
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
        var n = new Node(
            id, 
            key, 
            val, 
            type, 
            className,
            path, 
            container);

        if (container === 'array' || container ==='object'){
            Walk.__runtime.nodeObjectMap.set(val, n);
        }
        return n;
    };

    // util
    Walk.__sortByPriority = function(a, b) {
        var x = a.priority;
        var y = b.priority;
        return ((x < y) ? 1 : ((x > y) ? -1 : 0));
    };

    Walk.__log = function(args, type) {
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

    Walk.__matchedCallbacks = function(node, position) {
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
                        var nodeParent = node.parent();
                        if (nodeParent === 'undefined'){
                            return;
                        }
                        if (typeof nodeParent.className === 'undefined' || 
                            typeof callback.classKeys[nodeParent.className] === 'undefined' || 
                            callback.classKeys[nodeParent.className].indexOf(node.key) === -1) {
                            
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
    };

    Walk.__execCallbacks = function(callbacks, node) {
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
    };

    Walk.__process = function(data, mode, queue){
        var key = data.key;
        var val = data.val;
        var className = data.className;
        var path = data.path || '';
        var parent = data.parent;

        var node = Walk.__NodeBuilder(key, val, className, path);
        // set this node as a child on its parent
        if (typeof parent !== 'undefined'){
            if (Walk.__runtime.config.structure === "tree"){
                node.addParent(parent);
            } else if (Walk.__runtime.config.structure === "graph"){
                node.addNeighbor(parent);
            }
        }

        if ( node.encountered > Walk.__runtime.config.nodeVisitCount ){
            return;
        }

        // everything under here should only use node props
        var matchedPreCallbacks = Walk.__matchedCallbacks(node, 'preWalk');
        if (matchedPreCallbacks){
            Walk.__execCallbacks(matchedPreCallbacks, node);
        }

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
        if (matchedPostCallbacks){
            Walk.__execCallbacks(matchedPostCallbacks, node);
        }  
    };

    // does a traversal to build the map AND runs callbacks (inline, so only parent is accessible)
    Walk.__breadthTraverse = function(inputData) {
        var queue = []; 
        var current;
        __process(inputData, 'breadth', queue);
        while( queue.length > 0 ){
            current = queue.shift();
            Walk.__process(current, 'breadth', queue);
        }
    };

    // does a traversal to build the map AND runs callbacks (inline, so only parent is accessible)
    Walk.__depthTraverse = function(inputData) {
        Walk.__process(inputData, 'depth');
    };

    Walk.__initializeWalk = function(config) {
        Walk.__runtime = {};
        Walk.__runtime.config = {};
        Walk.__runtime.nodes = {};
        Walk.__runtime.seenObjects = [];
        Walk.__runtime.nodeObjectMap = new WeakMap();
        Object.assign(Walk.__runtime.config, Walk.configDefaults);
        Object.assign(Walk.__runtime.config, config);

        // validate
        for (var key in Walk.__runtime.config){
            var allowed = false;
            for (var xkey in Walk.configDefaults){
                if (key === xkey){
                    allowed = true;
                    break;
                }
            }
            if (!allowed){
                validationError("'" + key + "' is not a valid configuration entry.");
            }
        }

        if (Walk.__runtime.config.traversalMode !== 'depth' && Walk.__runtime.config.traversalMode !== 'breadth') {
            notImplemented("Traversal modes other than 'depth' and 'breadth' are");
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
        for (var xkey in Walk.__runtime.positionCallbacks) {
            Walk.__runtime.positionCallbacks[xkey] = Walk.__runtime.positionCallbacks[xkey].sort(Walk.__sortByPriority);
        }
    };

    Walk.__initializeReport = function() {
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
    };

    Walk.__deconstructReport = function(id) {
        if (!Walk.__data.reports[id]) {
            return;
        }
        Walk.__data.reports[id].endTime = new Date();
        Walk.__data.reports[id].executionTime = Walk.__data.reports[id].endTime - Walk.__data.reports[id].startTime;
    };

    Walk.__deconstructWalk = function() {
        if (Walk.__runtime.config.monitorPerformance && Walk.__data.reports[Walk.__runtime.reportId]) {
            Walk.__deconstructReport(Walk.__runtime.reportId);
            Walk.__runtime.config.logger.log("Finished execution. Performance report below.");
            Walk.__runtime.config.logger.log(Walk.__data.reports[Walk.__runtime.reportId]);
        }
        delete Walk.__runtime;
    };

    Walk.__checkStructure = function(val){
        var existingNode = Walk.__runtime.nodeObjectMap.get(val);
        if ( typeof existingNode !== 'undefined' ){
            if (Walk.__runtime.config.loopTolerance === 0){
                structureFault();
            } else if (Walk.__runtime.config.loopTolerance === 1 &&
                       existingNode.ancestors().indexOf(existingNode) !== -1){
                // has an ancestor of itself                        
                structureFault();
            } else {
                return existingNode; // node
            }                     
        }                                
        return false;
    };
    

    Walk.walk = function(obj, className, config) {
        try {
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

        } catch(err) {
            if (err !== "walk:stopProcess"){
                if (typeof console.error !== 'undefined'){
                    console.error("Error during walk(): " + err);
                } else {
                    console.log("Error during walk(): " + err);
                }                        
            }
        } finally {
            Walk.__deconstructWalk();
            return;
        }
    };

    // stops processing completely
    Walk.break = function(){
        stopProcess();
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

    return Walk;
}(Walk));