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