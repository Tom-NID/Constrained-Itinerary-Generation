export default class MapSimplifier {
  #origin;
  #length;
  #segmentSize;
  #grid;
  #correspondanceMap;

  constructor(length, segmentSize, center) {
    length += 100;
    this.#origin = this.getTopRightCorner(
      parseFloat(center.lat),
      parseFloat(center.lon),
      length / 2,
    );
    this.#length = length;
    this.#segmentSize = segmentSize;
    this.#grid = [];
    for (let i = 0; i < Math.pow(length / segmentSize, 2); i++) {
      this.#grid.push([]);
    }
    this.#correspondanceMap = new Map();
  }

  addPoint(lat, lon, id) {
    const segmentsPerRow = this.#length / this.#segmentSize;
    const segmentsPerCol = this.#length / this.#segmentSize;

    const leftLat = this.#origin.lat;
    const leftLon = this.#origin.lon;

    const metersPerLatDegree = 111320;
    const metersPerLonDegree =
      Math.cos((leftLat * Math.PI) / 180) * metersPerLatDegree;

    // Convert the offset to meters
    const latOffset = Math.abs(lat - leftLat) * metersPerLatDegree;
    const lonOffset = Math.abs(lon - leftLon) * metersPerLonDegree;

    // Get the row and col index based on the offset
    const rowIndex = Math.floor(latOffset / this.#segmentSize);
    const colIndex = Math.floor(lonOffset / this.#segmentSize);

    const gridIndex = rowIndex * segmentsPerRow + colIndex;

    if (gridIndex >= 0 && gridIndex < this.#grid.length) {
      this.#grid[gridIndex].push({ lat, lon, id });
      this.#grid[gridIndex].sort((a, b) => a.lat + a.lon - (b.lat + b.lon));
      return true;
    } else {
      return false;
    }
  }
  removeEmptyCells() {
    this.#grid = this.#grid.filter((cell) => cell.length > 0);
  }

  simplify() {
    this.removeEmptyCells();
    for (let cell of this.#grid) {
      let centerId = cell[Math.floor(cell.length / 2)].id;
      for (let point of cell) {
        let id = point.id;
        this.#correspondanceMap.set(id, centerId);
      }
    }
    this.#grid = [];
  }

  getCorrespondanceMap() {
    return this.#correspondanceMap;
  }

  getTopRightCorner(lat, lon, distance) {
    const R = 6371000; // Radius of the Earth in meters

    // Convert latitude and longitude from degrees to radians
    const latRad = (lat * Math.PI) / 180;

    // Change in latitude in radians
    const deltaLat = distance / R;

    // Change in longitude in radians
    const deltaLon = distance / (R * Math.cos(latRad));

    // Add the changes to the original latitude and longitude
    const newLat = lat + (deltaLat * 180) / Math.PI;
    const newLon = lon + (deltaLon * 180) / (Math.PI * Math.cos(latRad));

    return { lat: newLat, lon: newLon };
  }
}
