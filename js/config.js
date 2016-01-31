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