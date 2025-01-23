"use strict";

// Loading modules
import express from "express";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import Graph from "./models/Graph.js";
import Node from "./models/Node.js";

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

function getGraph(
  graph,
  ways,
  nodeWayCounts,
  intersectionSize,
  ultraSimple = false
) {
  let idToCoo = new Map();

  let addedNodes = new Set();
  let oldToNew = new Map();
  let toReplace = new Set();

  ways.forEach((element) => {
    // toReplace.clear();

    if (element.type === "node") {
      if (nodeWayCounts.get(element.id) >= intersectionSize) {
        // if (ultraSimple && graph.countNodes() > 1) {
        //   const closestNode = graph.getClosestNode(element.lat, element.lon);
        //   const distance = graph.getHaversineDistance(-1, closestNode, {
        //     lat: element.lat,
        //     lon: element.lon,
        //   });
        //   if (distance >= 10) {
        //     graph.addNode(element.id, element.lat, element.lon);
        //   }
        // } else {
        //   graph.addNode(element.id, element.lat, element.lon);
        // }

        // if (ultraSimple) {
        //   if (graph.countNodes() > 1) {
        //     const closestNode = graph.getClosestNode(element.lat, element.lon);
        //     const distance = graph.getHaversineDistance(-1, closestNode, {
        //       lat: element.lat,
        //       lon: element.lon,
        //     });
        //     if (distance >= 10) {
        //       graph.addNode(element.id, element.lat, element.lon);
        //     }
        //   } else {
        //     graph.addNode(element.id, element.lat, element.lon);
        //   }
        // } else {
        graph.addNode(element.id, element.lat, element.lon);
        idToCoo.set(element.id, { lat: element.lat, lon: element.lon });
        // }
      }

      // element.nodes = element.nodes.filter(
      //   (nodeId) => nodeWayCounts.get(nodeId) >= intersectionSize
      // );
    }
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

      if (ultraSimple) {
        let prev = element.nodes[0];
        for (let i = 1; i < element.nodes.length; i++) {
          let curr = element.nodes[i];

          // let closestNode = graph.getClosestNodeById(curr);
          // let distToClosest = graph.getHaversineDistance(closestNode, curr);

          if (oldToNew.has(curr)) {
            curr = oldToNew.get(curr);
          }
          // else if (oldToNew.has(closestNode) && distToClosest < 10) {
          //   curr = oldToNew.get(closestNode);
          // } else if (distToClosest < 10) {
          //   curr = closestNode;
          //   oldToNew.set(curr, closestNode);
          // }

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

          if (distance >= 20) {
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
          const nodeId1 = element.nodes[i];
          const nodeId2 = element.nodes[i + 1];
          graph.addEdge(nodeId1, nodeId2, surface);
          graph.addEdge(nodeId2, nodeId1, surface);
        }
      }
    }
  });
  if (ultraSimple) {
    for (let nodeId of graph.getNodes()) {
      if (!addedNodes.has(nodeId)) {
        graph.removeNode(nodeId);
      }
    }
  }
  console.log(addedNodes.size);
}

async function processData(
  data,
  fullGraph,
  simplifiedGraph,
  ultraSimplifiedGraph
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

  console.time("Creation du graph complet");
  getGraph(fullGraph, data.elements, nodeWayCounts, 1);
  console.timeEnd("Creation du graph complet");
  console.time("Creation du graph simple");
  getGraph(simplifiedGraph, data.elements, nodeWayCounts, 2);
  console.timeEnd("Creation du graph simple");
  console.time("Creation du graph ultra simple");
  getGraph(ultraSimplifiedGraph, data.elements, nodeWayCounts, 2, true);
  // ultraSimplifiedGraph.simplifyGraph(1000);
  console.timeEnd("Creation du graph ultra simple");
  // ultraSimplifiedGraph = simplifiedGraph.clone();

  console.log(
    "full: \n\tnodes: ",
    fullGraph.countNodes(),
    "\n\tedges: ",
    fullGraph.countEdges()
  );

  console.log(
    "simplified: \n\tnodes: ",
    simplifiedGraph.countNodes(),
    "\n\tedges: ",
    simplifiedGraph.countEdges()
  );

  console.log(
    "ultra simplified: \n\tnodes: ",
    ultraSimplifiedGraph.countNodes(),
    "\n\tedges: ",
    ultraSimplifiedGraph.countEdges()
  );

  // if (fullGraph.countNodes() == 0 || simplifiedGraph.countNodes() == 0) {
  //   // TODO return error
  //   return;
  // }
}

/**
 * Envoie une requete a l'API overpass
 * @param {*} query requete pour l'api
 */
async function fetchData(
  query,
  fullGraph,
  simplifiedGraph,
  ultraSimplifiedGraph
) {
  try {
    const result = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
    });

    const data = await result.json();
    processData(data, fullGraph, simplifiedGraph, ultraSimplifiedGraph);
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
  let intersectionMode = false;

  // data
  let graph = new Graph();
  let fullGraph = new Graph();
  let simplifiedGraph = new Graph();
  let ultraSimplifiedGraph = new Graph();
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
      simplifiedGraph.clear();
      ultraSimplifiedGraph.clear();
      const query =
        "data=" +
        encodeURIComponent(`
            [out:json][timeout:10];
            way(around:${data.radius},${data.startingPoint.lat},${data.startingPoint.lng})["highway"~"^(secondary|tertiary|unclassified|residential|living_street|service|pedestrian|track|road|footway|bridleway|cycleway|path)$"];
            (._;>;);
            out body;
          `);
      await fetchData(query, fullGraph, simplifiedGraph, ultraSimplifiedGraph);
    }

    intersectionMode = data.intersectionMode;

    // socket.emit("graph", {
    //   color: "blue",
    //   coordinates: simplifiedGraph.getAllNodesCoordinates(),
    // });

    // console.log(ultraSimplifiedGraph);

    // socket.emit("graph", {
    //   color: "red",
    //   nodes: ultraSimplifiedGraph.getAllNodesCoordinates(),
    //   edges: ultraSimplifiedGraph.getAllEdgesCoordinates(),
    // });

    console.log(
      "ultra simplified: \n\tnodes: ",
      ultraSimplifiedGraph.countNodes(),
      "\n\tedges: ",
      ultraSimplifiedGraph.countEdges()
    );

    graph = intersectionMode ? simplifiedGraph.clone() : fullGraph.clone();
    // graph = ultraSimplifiedGraph.clone();

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
    // console.log(terrain);

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

    paths = paths.map((path) => ({
      path: path[1].path,
      length: path[1].length,
      endingNode: graph.getNodeCoordinates(parseInt(path[0])),
    }));
    console.timeEnd("Generation paths");

    // console.log(paths);

    socket.emit("result", {
      startingNode: graph.getNodeCoordinates(startingNodeId),
      paths: paths,
    });

    graph.clear();
  });
});
