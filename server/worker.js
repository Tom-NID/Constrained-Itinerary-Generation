import { parentPort, workerData } from "worker_threads";
import Graph from "./models/Graph.js";
import MapSimplifier from "./utils/MapSimplifier.js";

let graph = new Graph();
let fullGraph = new Graph();
let intersectionGraph = new Graph();
let simplifiedGraph = new Graph();
let graphs = {
  full: fullGraph,
  intersection: intersectionGraph,
  simplified: simplifiedGraph,
};

function getSurface(surface, highway) {
  if (surface) {
    switch (surface) {
      case "asphalt":
      case "concrete":
      case "concrete:lanes ":
      case "concrete:plates ":
      case "paved":
      case "stepping_stones":
      case "metal":
      case "metal_grid":
        surface = "hard";
        break;
      case "bricks":
      case "pebblestone":
      case "paving_stones":
      case "paving_stones:lanes ":
      case "unhewn_cobblestone":
      case "sett":
      case "grass_paver":
      case "cobblestone":
      case "wood":
        surface = "semi-hard";
        break;
      case "unpaved":
      case "compacted":
      case "gravel":
      case "rock":
      case "fine_gravel":
        surface = "semi-soft";
        break;
      case "woodchips":
      case "ground":
      case "dirt":
      case "earth":
      case "grass":
      case "chipseal":
      case "rubber":
      case "shells":
      case "sand":
        surface = "soft";
        break;
      case "mud":
      case "snow":
      case "ice":
      case "salt":
        surface = "extreme";
        break;
    }
  } else {
    switch (highway) {
      case "motorway":
      case "trunk":
      case "primary":
      case "secondary":
      case "tertiary":
      case "unclassified":
      case "residential":
      case "motorway_link":
      case "trunk_link":
      case "primary_link":
      case "secondary_link":
      case "tertiary_link":
      case "living_street":
      case "service":
      case "pedestrian":
      case "bus_guideway":
      case "road":
      case "footway":
      case "cycleway":
        surface = "hard";
        break;
      case "track":
      case "bridleway":
      case "path":
        surface = "soft";
        break;
      default:
        surface = "hard";
        break;
    }
  }
  return surface;
}

function getFullGraph(graph, ways) {
  ways.forEach((element) => {
    if (element.type === "node") {
      graph.addNode(element.id, element.lat, element.lon);
    }
  });

  ways.forEach((element) => {
    if (element.type === "way") {
      let surface = getSurface(element.tags.surface, element.tags.highway);
      for (let i = 0; i < element.nodes.length - 1; i++) {
        let nodeId1 = element.nodes[i];
        let nodeId2 = element.nodes[i + 1];

        graph.addEdge(nodeId1, nodeId2, surface);
        graph.addEdge(nodeId2, nodeId1, surface);
      }
    }
  });
}

function getIntersectionGraph(graph, ways, nodeWayCounts, fullGraph) {
  ways.forEach((element) => {
    if (element.type === "node") {
      if (nodeWayCounts.get(element.id) >= 2) {
        graph.addNode(element.id, element.lat, element.lon);
      }
    }
  });

  ways.forEach((element) => {
    if (element.type === "way") {
      let surface = getSurface(element.tags.surface, element.tags.highway);

      // Conserve uniquement les intersections desirees
      element.nodes = element.nodes.filter(
        (nodeId) => nodeWayCounts.get(nodeId) >= 2 && graph.hasNode(nodeId),
      );

      for (let i = 0; i < element.nodes.length - 1; i++) {
        let nodeId1 = element.nodes[i];
        let nodeId2 = element.nodes[i + 1];

        if (!nodeId1 || !nodeId2) {
          console.log(nodeId1, nodeId2);
          continue;
        }
        let path = fullGraph.aStar(nodeId1, nodeId2, []);
        if (!path) {
          continue;
        }

        let distances = {
          euclidean: fullGraph.getPathLengthEuclidean(path),
          haversine: fullGraph.getPathLength(path),
        };
        graph.addEdge(nodeId1, nodeId2, surface, distances);
        graph.addEdge(nodeId2, nodeId1, surface, distances);
      }
    }
  });
}

function getSimplifiedGraph(
  graph,
  ways,
  nodeWayCounts,
  simplificationFactor,
  queryData,
  fullGraph,
) {
  let addedNodes = new Set();

  let mapSimplifier = new MapSimplifier(
    queryData.radius * 2,
    simplificationFactor,
    { lat: queryData.startingPoint.lat, lon: queryData.startingPoint.lng },
  );

  ways.forEach((element) => {
    if (element.type === "node") {
      if (nodeWayCounts.get(element.id) >= 2) {
        graph.addNode(element.id, element.lat, element.lon);

        mapSimplifier.addPoint(element.lat, element.lon, element.id);
      }
    }
  });

  mapSimplifier.simplify();
  let correspondanceMap = mapSimplifier.getCorrespondanceMap();

  ways.forEach((element) => {
    if (element.type === "way") {
      let surface = getSurface(element.tags.surface, element.tags.highway);

      // Conserve uniquement les intersections desirees
      element.nodes = element.nodes.filter(
        (nodeId) => nodeWayCounts.get(nodeId) >= 2 && graph.hasNode(nodeId),
      );

      for (let i = 0; i < element.nodes.length - 1; i++) {
        let nodeId1 = correspondanceMap.get(element.nodes[i]);
        let nodeId2 = correspondanceMap.get(element.nodes[i + 1]);
        if (!nodeId1 || !nodeId2) {
          console.log(nodeId1, nodeId2);
          continue;
        }
        let path = fullGraph.aStar(nodeId1, nodeId2, [], 25);
        if (!path) {
          continue;
        }

        let distances = {
          euclidean: fullGraph.getPathLengthEuclidean(path),
          haversine: fullGraph.getPathLength(path),
        };
        graph.addEdge(nodeId1, nodeId2, surface, distances);
        graph.addEdge(nodeId2, nodeId1, surface, distances);
        addedNodes.add(nodeId1);
        addedNodes.add(nodeId2);
      }
    }
  });

  for (let nodeId of graph.getNodes()) {
    if (!addedNodes.has(nodeId)) {
      graph.removeNode(nodeId);
    }
  }
}

async function processData(data, queryData, graphs) {
  const nodeWayCounts = new Map();

  // Fait une map de node vers le nombre de nodes lies a lui (pour gerer les intersections)
  console.time("Comptage relations nodes");
  data.elements.forEach((element) => {
    if (element.type === "way") {
      element.nodes.forEach((nodeId) => {
        const currentCount = nodeWayCounts.get(nodeId) || 0;
        nodeWayCounts.set(nodeId, currentCount + 1);
      });
    }
  });
  console.timeEnd("Comptage relations nodes");

  console.time("Full graph");
  getFullGraph(graphs.full, data.elements);
  console.timeEnd("Full graph");

  if (queryData.simplificationMode === "intersection") {
    console.time("Intersection graph");
    getIntersectionGraph(
      graphs.intersection,
      data.elements,
      nodeWayCounts,
      graphs.full,
    );
    console.timeEnd("Intersection graph");
  } else {
    console.time("Graph-simplification graph");
    getSimplifiedGraph(
      graphs.simplified,
      data.elements,
      nodeWayCounts,
      25,
      queryData,
      graphs.full,
    );
    console.timeEnd("Graph-simplification graph");
  }

  console.log(
    "full: \n\tnodes: ",
    fullGraph.countNodes(),
    "\n\tedges: ",
    fullGraph.countEdges(),
  );

  console.log(
    "intersection: \n\tnodes: ",
    intersectionGraph.countNodes(),
    "\n\tedges: ",
    intersectionGraph.countEdges(),
  );

  console.log(
    "graph-simplification: \n\tnodes: ",
    simplifiedGraph.countNodes(),
    "\n\tedges: ",
    simplifiedGraph.countEdges(),
  );
}

/**
 * Envoie une requete a l'API overpass
 * @param {*} query requete pour l'api
 */
async function fetchData(query, queryData, graphs) {
  try {
    const result = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
    });

    const data = await result.json();
    processData(data, queryData, graphs);
  } catch (err) {
    console.error("Error: ", err);
  }
}

function reconstructPath(simplifiedPath) {
  let completePath = [];
  for (let i = 1; i < simplifiedPath.length; ++i) {
    completePath.push(
      ...fullGraph
        .aStar(simplifiedPath[i - 1], simplifiedPath[i], terrain)
        .slice(1),
    );
  }
  return completePath;
}

function removeDeadEnds(path, endingNode) {
  let noDeadEnds = false;
  while (!noDeadEnds) {
    noDeadEnds = true;
    for (let i = 1; i < path.length - 1; i++) {
      let prev = path[i - 1];
      let curr = path[i];
      let next = path[i + 1];
      if (prev == next && curr != endingNode) {
        noDeadEnds = false;
        path.splice(i, 2);
        break;
      }
      if (curr == prev) {
        noDeadEnds = false;
        path.splice(i);
      }
    }
  }
  return path;
}

/**
 * Set the nodes altitude using the open-meteo api
 **/
async function fetchPathAltitudes(path) {
  // Api request is limited to 100 nodes at a time
  const batchSize = 100;
  try {
    for (let i = 0; i < path.length; i += batchSize) {
      console.info(`Fetching nodes ${i} to ${i + batchSize}`);
      let batch = path.slice(i, i + batchSize);
      let latitudes = batch.map((node) => node.lat);
      let longitudes = batch.map((node) => node.lon);

      let response;
      let success = false;
      let attempt = 0;
      let delay = 500; // delay in ms between each query

      while (!success && attempt < 5) {
        try {
          response = await fetch(
            `https://api.open-meteo.com/v1/elevation?latitude=${latitudes.join(",")}&longitude=${longitudes.join(",")}`,
          );

          if (response.ok) {
            const data = await response.json();
            if (data.elevation) {
              data.elevation.forEach((altitude, index) => {
                // path[Object.key
                path[index + i].alt = altitude;
                // this.setAltitude(batch[index][2], altitude);
              });
            }
            success = true;
          } else if (response.status === 429) {
            console.warn(`429 Too Many Requests: Retrying in ${delay}ms...`);
            await sleep(delay);
            delay *= 2; // backoff
            attempt++;
          } else {
            console.error("API Error:", response.status);
            break;
          }
        } catch (err) {
          console.error("Network error during fetch:", err);
          break;
        }
      }
      if (!success) {
        console.error(
          "Failed to fetch elevation data after multiple attempts.",
        );
      }
    }
  } catch (error) {
    console.error("Error fetching altitudes:", error);
  }
  console.log("Elevation fetched");
}

/****************************/
/********  MAIN  ************/
/****************************/

let data = workerData.request;

parentPort.postMessage({
  type: "generationInfo",
  message: "Fetching geographical data from Open Street Map.",
});

if (workerData.clear) {
  fullGraph.clear();
  intersectionGraph.clear();
  simplifiedGraph.clear();
  const query =
    "data=" +
    encodeURIComponent(`
            [out:json][timeout:10];
            way(around:${data.radius},${data.startingPoint.lat},${data.startingPoint.lng})["highway"~"^(secondary|tertiary|unclassified|residential|living_street|service|pedestrian|track|road|footway|bridleway|cycleway|path)$"];
            (._;>;);
            out body;
          `);

  let queryData = {
    radius: data.radius,
    startingPoint: data.startingPoint,
    simplificationMode: data.simplificationMode,
  };

  await fetchData(query, queryData, graphs);
}

let simplificationMode = data.simplificationMode;

if (simplificationMode === "full") {
  graph = graphs.full.clone();
} else if (simplificationMode === "intersection") {
  graph = graphs.intersection.clone();
} else {
  graph = graphs.simplified.clone();
}

if (graph.countNodes() === 0 || graph.countEdges() === 0) {
  parentPort.postMessage({ error: true, message: "Error, empty graph" });
  process.exit(1);
}

parentPort.postMessage({
  type: "generationInfo",
  message: "Fetching altitude data from Open Meteo.",
});

await graph.setAltitudes();

let originLat = data.startingPoint.lat;
let originLng = data.startingPoint.lng;

let startingNodeId = graph.getClosestNode(originLat, originLng);
if (startingNodeId === -1) {
  parentPort.postMessage({ error: true, message: "error" });
  process.exit(1);
}

let method = data.method;

let searchRadius = data.radius;
let elevation = data.elevation;
let maxPaths = data.maxPaths;
let precision = data.precision;
// TODO verif valeurs;

let terrain = data.terrain;
let paths = {};

// Generation des paths
console.time("Generation paths");
if (method === "path") {
  parentPort.postMessage({
    type: "generationInfo",
    message: `Generating up to ${maxPaths} paths.`,
  });
  paths = graph.getPathsAStar(
    startingNodeId,
    precision,
    searchRadius,
    maxPaths,
    terrain,
  );
} else if (method === "circuit") {
  console.log("circuit");
  parentPort.postMessage({
    type: "generationInfo",
    message: `Generating up to ${maxPaths} circuits.`,
  });
  paths = graph.getCircuitAStar(
    startingNodeId,
    precision,
    searchRadius / 2,
    maxPaths,
    terrain,
  );
} else if (method === "elevation") {
  parentPort.postMessage({
    type: "generationInfo",
    message: `Generating up to ${maxPaths} paths.`
  });
  // Pour le calcul avec BFS, on passe le rayon (distanceConstraint), l'objet elevation et la liste terrain
  paths = graph.bfsExplore(
      startingNodeId,
      searchRadius,
      elevation,
      maxPaths,
      terrain,
      data.useDistance,
      data.negativeElevation,
      (msg) => {
        parentPort.postMessage({
          type: "log",
          message: msg
        });
      }
  );
}

// Transformation finale des résultats
if (method === "elevation") {
  // Pour BFS, chaque résultat est un objet { end, path, length, elevation }
  paths = paths.map(item => ({
    path: item.path,
    length: item.length,
    endingNode: graph.getNodeCoordinates(item.end),
    elevation: item.elevation
  }));
} else {
  // Pour les autres méthodes (A*), on conserve l'ancien format
  paths = paths.map((path) => ({
    path: path[1].path,
    length: path[1].length,
    endingNode: graph.getNodeCoordinates(parseInt(path[0])),
  }));
}

parentPort.postMessage({
  type: "generationInfo",
  message: "Refining the circuit for the best efficiency.",
});

for (const path of paths) {
  let completePath = [];
  let length = path.length;
  let partialPath = path.path;

  // Reconstruct the path based on the full graph by using aStar between each nodes of the simplified path
  completePath = reconstructPath(partialPath);

  // Remove the dead ends of the reconstructed path
  completePath = removeDeadEnds(completePath, path.endingNode);

  // Remove nodes from the path if it is too long
  if (method === "path") {
    let currLength = 0;
    for (let j = 1; j < completePath.length; ++j) {
      let sectionDistance = fullGraph.getHaversineCost(
        completePath[j - 1],
        completePath[j],
      );
      currLength += sectionDistance;
      if (currLength >= length) {
        let index =
          Math.abs(length - currLength) <
          Math.abs(length - (currLength - sectionDistance))
            ? j
            : j - 1; // Minimise la difference entre currLength et radius
        completePath = completePath.slice(0, index + 1);
        path.endingNode = fullGraph.getNodeCoordinates(
          completePath[completePath.length - 1],
        );
        break;
      }
    }
  }

  // Get the different surfaces of the path
  let pathSurface = [];
  for (let i = 1; i < completePath.length; ++i) {
    pathSurface.push(
      fullGraph.getSurfaceType(completePath[i - 1], completePath[i]),
    );
  }

  // The new length of the path
  let pathLength = fullGraph.getPathLength(completePath);

  // Replace the node Ids by coordinates
  partialPath = partialPath.map((nodeId) => graph.getNodeCoordinates(nodeId));
  completePath = completePath.map((nodeId) =>
    fullGraph.getNodeCoordinates(nodeId),
  );
  await fetchPathAltitudes(completePath);

  let posElevation = 0;
  let negElevation = 0;
  for (let i = 1; i < partialPath.length; ++i) {
    let elev = partialPath[i].alt - partialPath[i - 1].alt;
    if (elev > 0) {
      posElevation += elev;
    } else {
      negElevation += elev;
    }
  }
  path.elevation = { pos: posElevation, neg: negElevation };

  path.path = completePath;
  path.pathSurface = pathSurface;
  path.length = pathLength;
}

parentPort.postMessage({
  type: "result",
  startingNode: graph.getNodeCoordinates(startingNodeId),
  paths: paths,
});
