export default class Graph {
    constructor() {
        this.nodes = new Map();
        this.edges = new Map();
    }

    addNode(id, latitude, longitude, altitude = 0) {
        this.nodes.set(id, { id, latitude, longitude, altitude });
        this.edges.set(id, []);
    }

    addEdge(node1, node2) {
        if (!this.nodes.has(node1) || !this.nodes.has(node2)) {
            throw new Error("One or both nodes do not exist.");
        }

        const altitudeDifference = Math.abs(this.nodes.get(node1).altitude - this.nodes.get(node2).altitude);
        this.edges.get(node1).push({ node: node2, weight: altitudeDifference });
        this.edges.get(node2).push({ node: node1, weight: altitudeDifference });
    }

    getNeighbors(nodeId) {
        return this.edges.get(nodeId);
    }

    // Renvoie les coordonees d'un point a partir de son in
    getCoordinates(nodeID) {
        return this.nodes.get(nodeID);
    }

    getNodes() {
        return this.nodes.keys();
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
