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

function getGraph(graph, ways, nodeWayCounts, simplificationMode, queryData) {
  let addedNodes = new Set();
  let intersectionSize = 1;
  let simplificationFactor = 50;

  // way-simplification
  let oldToNew = new Map();
  let toReplace = new Set();

  // graph-simplification
  let mapSimplifier = null;
  let correspondanceMap = null;

  if (simplificationMode !== "full") {
    intersectionSize = 2;
  }

  if (simplificationMode === "graph-simplification") {
    mapSimplifier = new MapSimplifier(
      queryData.radius * 2,
      simplificationFactor,
      {
        lat: queryData.startingPoint.lat,
        lon: queryData.startingPoint.lng,
      }
    );
  }

  // let cacaCounter = 0;

  ways.forEach((element) => {
    if (element.type === "node") {
      if (nodeWayCounts.get(element.id) >= intersectionSize) {
        graph.addNode(element.id, element.lat, element.lon);

        if (simplificationMode === "graph-simplification") {
          mapSimplifier.addPoint(element.lat, element.lon, element.id);
        }
      }
    }
  });

  if (simplificationMode === "graph-simplification") {
    console.time("graph simplification");
    mapSimplifier.simplify();
    correspondanceMap = mapSimplifier.getCorrespondanceMap();
    console.timeEnd("graph simplification");
  }

  ways.forEach((element) => {
    if (element.type === "way") {
      let surface = element.tags.surface;
      let highway = element.tags.highway;
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
      // Conserve uniquement les intersections desirees
      element.nodes = element.nodes.filter(
        (nodeId) =>
          nodeWayCounts.get(nodeId) >= intersectionSize && graph.hasNode(nodeId)
      );

      if (simplificationMode === "way-simplification") {
        let prev = element.nodes[0];
        for (let i = 1; i < element.nodes.length; i++) {
          let curr = element.nodes[i];

          if (oldToNew.has(curr)) {
            curr = oldToNew.get(curr);
          }

          const distance = graph.getHaversineDistance(curr, prev);

          // dernier node de la way
          if (i == element.nodes.length - 1) {
            graph.addEdge(prev, curr, surface);
            graph.addEdge(curr, prev, surface);
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
            graph.addEdge(prev, curr, surface);
            graph.addEdge(curr, prev, surface);
            prev = curr;
          } else {
            toReplace.add(curr);
          }
        }
      } else {
        for (let i = 0; i < element.nodes.length - 1; i++) {
          let nodeId1 = element.nodes[i];
          let nodeId2 = element.nodes[i + 1];

          if (simplificationMode === "graph-simplification") {
            nodeId1 = correspondanceMap.get(nodeId1);
            nodeId2 = correspondanceMap.get(nodeId2);
          }

          graph.addEdge(nodeId1, nodeId2, surface);
          graph.addEdge(nodeId2, nodeId1, surface);
          addedNodes.add(nodeId1);
          addedNodes.add(nodeId2);
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

async function processData(
  data,
  queryData,
  fullGraph,
  intersectionGraph,
  waySimplifiedGraph,
  simplifiedGraph
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

  // console.log("simplification: ", queryData.simplificationMode);

  if (queryData.simplificationMode === "full") {
    console.time("Full graph");
    getGraph(fullGraph, data.elements, nodeWayCounts, "full", queryData);
    console.timeEnd("Full graph");
  } else if (queryData.simplificationMode === "intersection") {
    console.time("Intersection graph");
    getGraph(
      intersectionGraph,
      data.elements,
      nodeWayCounts,
      "intersection",
      queryData
    );
    console.timeEnd("Intersection graph");
  } else if (queryData.simplificationMode === "way-simplification") {
    console.time("Way-simplification graph");
    getGraph(
      waySimplifiedGraph,
      data.elements,
      nodeWayCounts,
      "way-simplification",
      queryData
    );
    console.timeEnd("Way-simplification graph");
  } else {
    console.time("Graph-simplification graph");
    getGraph(
      simplifiedGraph,
      data.elements,
      nodeWayCounts,
      "graph-simplification",
      queryData
    );
    console.timeEnd("Graph-simplification graph");
  }

  console.log(
    "full: \n\tnodes: ",
    fullGraph.countNodes(),
    "\n\tedges: ",
    fullGraph.countEdges()
  );

  console.log(
    "intersection: \n\tnodes: ",
    intersectionGraph.countNodes(),
    "\n\tedges: ",
    intersectionGraph.countEdges()
  );

  console.log(
    "way-simplification: \n\tnodes: ",
    waySimplifiedGraph.countNodes(),
    "\n\tedges: ",
    waySimplifiedGraph.countEdges()
  );

  console.log(
    "graph-simplification: \n\tnodes: ",
    simplifiedGraph.countNodes(),
    "\n\tedges: ",
    simplifiedGraph.countEdges()
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
  simplifiedGraph
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
      simplifiedGraph
    );
  } catch (err) {
    console.error("Error: ", err);
  }
}

io.on("connection", function (socket) {
  // parameters
  let searchRadius = -1;
  let maxSearchRadius = -1;
  let originLat = 0;
  let originLng = 0;
  let precision = 0;
  let maxPaths = 0;
  let method = "";
  let terrain = [];
  let simplificationMode = "";

  // data
  let graph = new Graph();
  let fullGraph = new Graph();
  let intersectionGraph = new Graph();
  let waySimplifiedGraph = new Graph();
  let simplifiedGraph = new Graph();
  let startingNodeId = -1;

  socket.on("request", async (data) => {
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
        simplifiedGraph
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
      graph.countEdges()
    );

    originLat = data.startingPoint.lat;
    originLng = data.startingPoint.lng;

    startingNodeId = graph.getClosestNode(originLat, originLng);

    method = data.method;

    searchRadius = data.radius;
    maxSearchRadius = Math.max(searchRadius, maxSearchRadius);
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
        terrain
      );
    } else if (method === "circuit") {
      paths = graph.getCircuitAStar(
        startingNodeId,
        precision,
        searchRadius / 2,
        maxPaths,
        terrain
      );
    }

    // console.log(paths);

    paths = paths.map((path) => ({
      path: path[1].path,
      pathSurface: path[1].pathSurface,
      length: path[1].length,
      endingNode: graph.getNodeCoordinates(parseInt(path[0])),
    }));
    console.timeEnd("Generation paths");

    socket.emit("result", {
      startingNode: graph.getNodeCoordinates(startingNodeId),
      paths: paths,
    });

    graph.clear();
  });
});
