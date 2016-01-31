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