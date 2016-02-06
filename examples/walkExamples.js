angular.module("walkExamples", [], function(){

})

.controller("mainController", function($scope){

    $scope.state = 'tree';
    $scope.treeData = treeData;

    function getTreeData(){
        var map = Walk.nodeMap($scope.treeData);    
        var processedEdges = {};
        var nodes = [];
        var visNodeData = [];
        var edges = [];

        var counter = 0;
        for (key in map){
            var node = map[key];
            nodes.push(node);
            var label;
            if (node.container === 'value'){
                label = node.key
                var v = ""+node.val;
                if (v.length > 7){
                    v = v.substring(0,7);
                    v += "..."
                }
                label += ": " + v;
            } else {
                label = node.key;
            }
            visNodeData.push({
                id: counter,
                label: label
            });
            node.graphNodesIndex = counter++;
        }

        for (key in map){
            var node = map[key];
            var nodeEdges = node.edges.asTail.concat(node.edges.asHead)
            nodeEdges = nodeEdges.concat(node.edges.undirected);
            nodeEdges.forEach(function(edge){
                if (processedEdges[edge.id] !== true){
                    processedEdges[edge.id] = true;
                    var entry = {
                        to: edge.head.graphNodesIndex,
                        from: edge.tail.graphNodesIndex
                    }
                    if (edge.directed){
                        entry.arrows = 'to';
                    }
                    edges.push(entry)
                }
            });
        }
        return {
            nodes: new vis.DataSet(visNodeData),
            edges: new vis.DataSet(edges)
        }
    }

    var init = function(){        

        var container = document.getElementById('network');
        var networkData = getTreeData();
        $scope.network = new vis.Network(container, networkData, {
            layout: {
                improvedLayout:false,
                hierarchical: true
            }
            
        });
    }

    angular.element(document).ready(function(){
        init();
    });

})