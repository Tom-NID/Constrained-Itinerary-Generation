export default class Node {
  //   #id;
  #lat;
  #lon;
  #alt;
  #edges;

  constructor(lat = 0, lon = 0) {
    // this.#id = nodeId;
    this.#lat = lat;
    this.#lon = lon;
    this.#alt = null;
    this.#edges = new Map();
  }

  //   getId() {
  //     return this.#id;
  //   }

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

  getEdges() {
    return this.#edges;
  }

  countEdges() {
    return this.#edges.size;
  }

  getNeighbors() {
    return this.#edges.keys();
  }

  //   getEuclideanDistance(other) {
  //     return Math.sqrt(
  //       Math.pow(this.#lat - other.getLat, 2) +
  //         Math.pow(this.#lon - other.getLon(), 2)
  //     );
  //   }

  //   getHaversineDistance(other) {
  //     var R = 6378.137; // Radius of earth in KM
  //     var dLat = (other.getLat() * Math.PI) / 180 - (this.#lat * Math.PI) / 180;
  //     var dLon = (other.getLon() * Math.PI) / 180 - (this.#lon * Math.PI) / 180;
  //     var a =
  //       Math.sin(dLat / 2) * Math.sin(dLat / 2) +
  //       Math.cos((this.#lat * Math.PI) / 180) *
  //         Math.cos((other.getLat() * Math.PI) / 180) *
  //         Math.sin(dLon / 2) *
  //         Math.sin(dLon / 2);
  //     var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  //     var d = R * c;
  //     return d * 1000; // meters
  //   }

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
