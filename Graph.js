export default class Graph {
    constructor() {
        this.nodes = new Map();
        this.edges = new Map();
    }

    // Ajoute un nouveau node dans le graph
    addNode(nodeId, lat, lon, altitude) {
        if (!this.nodes.has(nodeId)) {
            this.nodes.set(nodeId, [lat, lon, altitude]);
        }
    }

    // Ajoute un edge au graph (deux directions)
    addEdge(nodeId1, nodeId2, cost, weightElevation = 1) {
        const elevationDiff = this.getElevationDifference(nodeId1, nodeId2);
        const realCost = cost + weightElevation * elevationDiff;

        this.edges.get(nodeId1)[nodeId2] = realCost;
        this.edges.get(nodeId2)[nodeId1] = realCost;
    }

    // Renvoie les coordonees d'un point a partir de son in
    getCoordinates(nodeID) {
        return this.nodes.get(nodeID);
    }

    getElevationDifference(nodeId1, nodeId2) {
        const elevation1 = this.nodes.get(nodeId1)[2]; // Altitude
        const elevation2 = this.nodes.get(nodeId2)[2];
        return Math.abs(elevation1 - elevation2);
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
