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