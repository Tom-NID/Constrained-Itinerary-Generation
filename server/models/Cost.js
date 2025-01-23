export default class Cost {
  #euclideanDistance;
  #haversineDistance;
  #surfateType;

  constructor(euclideanDistance = -1, haversineDistance = -1, surfateType = 1) {
    this.#euclideanDistance = euclideanDistance;
    this.#haversineDistance = haversineDistance;
    this.#surfateType = surfateType;
  }

  getEuclideanDistance() {
    return this.#euclideanDistance;
  }

  getHaversineDistance() {
    return this.#haversineDistance;
  }

  getSurfaceType() {
    return this.#surfateType;
  }

  setEuclideanDistance(distance) {
    this.#euclideanDistance = distance;
  }

  setHaversineDistance(distance) {
    this.#haversineDistance = distance;
  }

  clone() {
    const copy = new Cost(
      this.#euclideanDistance,
      this.#haversineDistance,
      this.#surfateType
    );
    return copy;
  }
}
