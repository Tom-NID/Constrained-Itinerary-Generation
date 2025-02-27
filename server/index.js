"use strict";

// Loading modules
import express from "express";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import Graph from "./models/Graph.js";
import Node from "./models/Node.js";
import MapSimplifier from "./utils/MapSimplifier.js";

// Get the current directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = app.listen(8080, function () {
  console.log("Server listening on port http://localhost:8080/");
});

// Listen on the websocket
const io = new Server(server);

app.use(express.static("public"));

// Set up to serve default file
app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "public", "../../public/app.html"));
});

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

function getWaySimplificationGraph(
  graph,
  ways,
  nodeWayCounts,
  simplificationFactor,
  fullGraph,
) {
  let addedNodes = new Set();
  let oldToNew = new Map();
  let toReplace = new Set();

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

      // Conserve uniquement les intersection desirees
      element.nodes = element.nodes.filter(
        (nodeId) => nodeWayCounts.get(nodeId) >= 2 && graph.hasNode(nodeId),
      );

      let prev = element.nodes[0];
      for (let i = 1; i < element.nodes.length; i++) {
        let curr = element.nodes[i];

        if (oldToNew.get(curr)) {
          curr = oldToNew.get(curr);
        }

        const distance = graph.getHaversineDistance(curr, prev);

        // dernier node de la way
        if (i == element.nodes.length - 1) {
          graph.addEdge(prev, curr, surface, fullGraph);
          graph.addEdge(curr, prev, surface, fullGraph);
          addedNodes.add(prev);
          addedNodes.add(curr);

          for (let nodeId of toReplace) {
            oldToNew.set(nodeId, prev);
          }
          toReplace.clear();
          break;
        }

        if (distance >= simplificationFactor) {
          for (let nodeId of toReplace) {
            oldToNew.set(nodeId, prev);
          }
          toReplace.clear();
          addedNodes.add(prev);
          addedNodes.add(curr);
          graph.addEdge(prev, curr, surface, fullGraph);
          graph.addEdge(curr, prev, surface, fullGraph);
          prev = curr;
        } else {
          toReplace.add(curr);
        }
      }
    }
  });

  for (let nodeId of graph.getNodes()) {
    if (!addedNodes.has(nodeId)) {
      graph.removeNode(nodeId);
    }
  }
}

function getGraphSimplificationGraph(
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

function getGraph(
  graph,
  ways,
  nodeWayCounts,
  simplificationMode,
  queryData,
  fullGraph,
) {
  console.log("simplificationMode:", simplificationMode);
  switch (simplificationMode) {
    case "full":
      getFullGraph(graph, ways);
      break;
    case "intersection":
      getIntersectionGraph(graph, ways, nodeWayCounts, fullGraph);
      break;
    case "way-simplification":
      getWaySimplificationGraph(graph, ways, nodeWayCounts, 25, fullGraph);
      break;
    case "graph-simplification":
      getGraphSimplificationGraph(
        graph,
        ways,
        nodeWayCounts,
        25,
        queryData,
        fullGraph,
      );
      break;
  }
}

async function processData(
  data,
  queryData,
  fullGraph,
  intersectionGraph,
  waySimplifiedGraph,
  simplifiedGraph,
) {
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
  getGraph(
    fullGraph,
    data.elements,
    nodeWayCounts,
    "full",
    queryData,
    fullGraph,
  );
  console.timeEnd("Full graph");

  if (queryData.simplificationMode === "intersection") {
    console.time("Intersection graph");
    getGraph(
      intersectionGraph,
      data.elements,
      nodeWayCounts,
      "intersection",
      queryData,
      fullGraph,
    );
    console.timeEnd("Intersection graph");
  } else {
    console.time("Graph-simplification graph");
    getGraph(
      simplifiedGraph,
      data.elements,
      nodeWayCounts,
      "graph-simplification",
      queryData,
      fullGraph,
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
    "way-simplification: \n\tnodes: ",
    waySimplifiedGraph.countNodes(),
    "\n\tedges: ",
    waySimplifiedGraph.countEdges(),
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
async function fetchData(
  query,
  queryData,
  fullGraph,
  intersectionGraph,
  waySimplifiedGraph,
  simplifiedGraph,
) {
  try {
    const result = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
    });

    const data = await result.json();
    processData(
      data,
      queryData,
      fullGraph,
      intersectionGraph,
      waySimplifiedGraph,
      simplifiedGraph,
    );
  } catch (err) {
    console.error("Error: ", err);
  }
}

io.on("connection", function (socket) {
  // parameters
  let searchRadius = -1;
  let maxSearchRadius = -1;
  let elevation = {};
  let originLat = 0;
  let originLng = 0;
  let precision = 0;
  let maxPaths = 0;
  let method = "";
  let terrain = [];
  let simplificationMode = "";
  let request = {};

  // data
  let graph = new Graph();
  let fullGraph = new Graph();
  let intersectionGraph = new Graph();
  let waySimplifiedGraph = new Graph();
  let simplifiedGraph = new Graph();
  let startingNodeId = -1;

  socket.on("request", async (data) => {
    request = data;
    console.log(data);
    terrain = data.terrain;

    if (
      data.radius > maxSearchRadius ||
      data.startingPoint.lat != originLat ||
      data.startingPoint.lng != originLng
    ) {
      fullGraph.clear();
      intersectionGraph.clear();
      waySimplifiedGraph.clear();
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

      await fetchData(
        query,
        queryData,
        fullGraph,
        intersectionGraph,
        waySimplifiedGraph,
        simplifiedGraph,
      );
    }

    simplificationMode = data.simplificationMode;

    // socket.emit("graph", {
    //   color: "blue",
    //   coordinates: intersectionGraph.getAllNodesCoordinates(),
    // });

    if (simplificationMode === "full") {
      graph = fullGraph.clone();
    } else if (simplificationMode === "intersection") {
      graph = intersectionGraph.clone();
    } else if (simplificationMode === "way-simplification") {
      graph = waySimplifiedGraph.clone();
    } else {
      graph = simplifiedGraph.clone();
    }
    await graph.setAltitudes();

    // socket.emit("graph", {
    //   color: "red",
    //   nodes: graph.getAllNodesCoordinates(),
    //   edges: graph.getAllEdgesCoordinates(),
    // });

    // graph = simplificationMode ? intersectionGraph.clone() : fullGraph.clone();
    // graph = waySimplifiedGraph.clone();

    console.log(
      "graph: \n\tnodes: ",
      graph.countNodes(),
      "\n\tedges: ",
      graph.countEdges(),
    );

    originLat = data.startingPoint.lat;
    originLng = data.startingPoint.lng;

    startingNodeId = graph.getClosestNode(originLat, originLng);

    method = data.method;

    searchRadius = data.radius;
    maxSearchRadius = Math.max(searchRadius, maxSearchRadius);
    elevation = data.elevation;
    maxPaths = data.maxPaths;
    precision = data.precision;

    let paths = {};

    console.time("Generation paths");
    if (method === "path") {
      paths = graph.getPathsAStar(
        startingNodeId,
        precision,
        searchRadius,
        maxPaths,
        terrain,
      );
    } else if (method === "circuit") {
      paths = graph.getCircuitAStar(
        startingNodeId,
        precision,
        searchRadius / 2,
        maxPaths,
        terrain,
      );
    } else if (method === "elevation") {
      // await graph.setAltitudes();

      const nbfois = 5;
      for (let i = 0; i < nbfois; i++) {
        console.time("BFS Exploration");
        console.log("Elevation:", elevation);
        paths = graph.bfsExplore(startingNodeId, elevation.up, maxPaths);
        console.timeEnd("BFS Exploration");
      }
    }

    // console.log(paths);

    paths = paths.map((path) => ({
      path: path[1].path,
      // pathSurface: path[1].pathSurface,
      length: path[1].length,
      endingNode: graph.getNodeCoordinates(parseInt(path[0])),
    }));

    // paths.forEach((path) => {
    //  let pathSurface = [];
    //   for (let i = 1; i < path.path.length; ++i) {
    //     pathSurface.push(graph.getSurfaceType(path.path[i - 1], path.path[i]));
    //   }
    //   path.pathSurface = pathSurface;
    //   path.path = path.path.map((nodeId) => graph.getNodeCoordinates(nodeId));
    //   let posElevation = 0;
    //   let negElevation = 0;
    //   for (let i = 1; i < path.path.length; ++i) {
    //     let elev = path.path[i].alt - path.path[i - 1].alt;
    //     if (elev > 0) {
    //       posElevation += elev;
    //     } else {
    //       negElevation += elev;
    //     }
    //   }
    //   path.elevation = { pos: posElevation, neg: negElevation };
    // });

    // Reconstruct the paths based on the full graph
    // if (simplificationMode !== "full") {
    paths.forEach((path) => {
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
        console.log("currLength: ", currLength);
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
      console.log("pathlength: ", pathLength);

      // Replace the node Ids by coordinates
      partialPath = partialPath.map((nodeId) =>
        graph.getNodeCoordinates(nodeId),
      );
      completePath = completePath.map((nodeId) =>
        fullGraph.getNodeCoordinates(nodeId),
      );

      let posElevation = 0;
      let negElevation = 0;
      for (let i = 1; i < partialPath.length; ++i) {
        let elev = partialPath[i].alt - partialPath[i - 1].alt;
        console.log(elev);
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
    });
    // }

    console.timeEnd("Generation paths");

    socket.emit("result", {
      request: request,
      response: {
        startingNode: graph.getNodeCoordinates(startingNodeId),
        paths: paths,
      },
    });

    graph.clear();
  });

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
});
