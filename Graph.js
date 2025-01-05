export default class Graph {
    constructor() {
        this.nodes = new Map();
        this.edges = new Map();
    }

    // Ajoute un nouveau node dans le graph
    addNode(nodeId, lat, lon) {
        if (!this.nodes.has(nodeId)) {
            this.nodes.set(nodeId, [lat, lon]);
        }
    }

    // Ajoute un edge au graph (deux directions)
    addEdge(nodeId1, nodeId2, cost) {
        // if (!this.nodes.has(nodeId1)) this.addNode(nodeId1);
        // if (!this.nodes.has(nodeId2)) this.addNode(nodeId2);

        if (!this.edges.get(nodeId1)) this.edges.set(nodeId1, {});
        if (!this.edges.get(nodeId2)) this.edges.set(nodeId2, {});

        this.edges.get(nodeId1)[nodeId2] = cost;
        this.edges.get(nodeId2)[nodeId1] = cost;
    }

    // Renvoie les coordonees d'un point a partir de son in
    getCoordinates(nodeID) {
        return this.nodes.get(nodeID);
    }

    getNodes() {
        return this.nodes.keys();
    }

    // Renvoie une liste des voisins d'un node
    getNeighbors(nodeId) {
        return Object.keys(this.edges.get(nodeId)) || [];
    }

    // Renvoie le cout entre deux nodes
    getCost(nodeId1, nodeId2) {
        return this.edges.get(nodeId1)?.[nodeId2] ?? Infinity;
    }

    // Renvoie le nombre de nodes
    getSize() {
        return this.nodes.size;
    }

    // Change le cout pour un edge (une seule direction)
    setCost(nodeId1, nodeId2, cost) {
        this.edges.get(nodeId1)[nodeId2] = cost;
    }

    // Vide le graph
    clear() {
        this.nodes.clear();
        this.edges.clear();
    }

    // Renvoie une copie du graph
    clone() {
        const newGraph = new Graph();
        this.nodes.forEach((value, key) => {
            newGraph.nodes.set(key, [...value]);
        });
        this.edges.forEach((value, key) => {
            newGraph.edges.set(key, { ...value });
        });
        return newGraph;
    }
}
