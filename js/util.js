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