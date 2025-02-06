export default class Node {
  #lat;
  #lon;
  #alt;
  #edges;

  constructor(lat = 0, lon = 0) {
    this.#lat = lat;
    this.#lon = lon;
    this.#alt = null;
    this.#edges = new Map();
  }

  getLat() {
    return this.#lat;
  }

  getLon() {
    return this.#lon;
  }

  getAlt() {
    return this.#alt;
  }

  getCoordinates() {
    return { lat: this.#lat, lon: this.#lon };
  }

  getCoordinatesList() {
    return [this.#lat, this.#lon];
  }

  setAlt(alt) {
    this.#alt = alt;
  }

  addEdge(otherId, cost) {
    this.#edges.set(otherId, cost);
  }

  removeEdge(otherId) {
    this.#edges.delete(otherId);
  }

  countEdges() {
    return this.#edges.size;
  }

  getNeighbors() {
    return this.#edges.keys();
  }

  getCost(otherId) {
    return this.#edges.get(otherId);
  }

  clone() {
    const copy = new Node(this.#lat, this.#lon);
    copy.#alt = this.#alt;

    for (let [nodeId, cost] of this.#edges) {
      copy.addEdge(nodeId, cost.clone());
    }
    return copy;
  }
}
