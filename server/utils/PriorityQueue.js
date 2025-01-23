export default class PriorityQueue {
    constructor() {
        this.elements = [];
    }

    // Ajoute un node et trie la liste des nodes en fonction de leur priorite
    enqueue(nodeID, priority) {
        if (!this.has(nodeID)) {
            this.elements.push({ nodeID, priority });
            this.elements.sort((a, b) => a.priority - b.priority);
        }
    }

    dequeue() {
        return this.elements.shift().nodeID;
    }

    isEmpty() {
        return this.elements.length === 0;
    }

    has(id) {
        return this.elements.some((element) => element.nodeID === id);
    }
}
