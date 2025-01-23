// const Graph = require("./Graph");
import Graph from "./Graph.js";
import PriorityQueue from "./PriorityQueue.js";
// const PriorityQueue = require("./PriorityQueue");

const graph = new Graph();

const MAX_REQUEST = 10;

// Initialisation de la map centree sur Besancon
const map = L.map("map").setView([47.2378, 6.0241], 10);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
}).addTo(map);

// Layer pour afficher les routes et les nodes
var customLayers = L.layerGroup().addTo(map);

let lat = 0;
let lng = 0;

let radius = 1500;
let elevation = parseInt(document.getElementById("elevation").value); // contrainte de dénivelé
let MAX_PATHS = parseInt(document.getElementById("nbChemins").value); // nombre de chemins a generer
let precision = parseInt(document.getElementById("precision-slider").value); // delai entre l'affichage de deux routes (ms)

let delay = document.getElementById("timer-slider").value; // delai entre l'affichage de deux routes (ms)

document.getElementById("elevation").addEventListener("change", (e) => {
    elevation = parseInt(e.target.value);
});

document.getElementById("nbChemins").addEventListener("change", (e) => {
    MAX_PATHS = parseInt(e.target.value);
});

const timer_value = document.querySelector("#timer-label");
const timer_input = document.querySelector("#timer-slider");
timer_value.textContent = timer_input.value + " ms";
timer_input.addEventListener("input", (event) => {
    delay = event.target.value;
    timer_value.textContent = event.target.value + " ms";
});

const precision_value = document.querySelector("#precision-label");
const precision_input = document.querySelector("#precision-slider");
precision_value.textContent = `${precision_input.value} (Precision for A*)`;
precision_input.addEventListener("input", (event) => {
    precision = event.target.value;
    precision_value.textContent = `${event.target.value} (Precision for A*)`;
});

// Genere la requete pour recuperer tous les nodes et routes dans le cercle de recherche
map.on("click", function (e) {
    console.log();

    // Divile le rayon du cercle de recherche pas 2 si on cherche un circuit
    const use_circuit = document.getElementById("circuit").checked;
    const searchRadius = use_circuit ? radius / 2 : radius;

    lat = e.latlng.lat;
    lng = e.latlng.lng;

    // Retire la layer pour afficher
    customLayers.clearLayers();

    // Requete qui recupere toutes les routes de type "secondary|tertiary|..." dans un rayon de "radius" autour du point selectione
    const query =
        "data=" +
        encodeURIComponent(`
          [out:json][timeout:10];
          way(around:${searchRadius},${lat},${lng})["highway"~"^(secondary|tertiary|unclassified|residential|living_street|service|pedestrian|track|bus_guideway|escape|raceway|road|busway|footway|bridleway|cycleway|path)$"];
          (._;>;);
          out body;
        `);

    fetchData(query);
});

/**
 * Envoie une requete a l'API overpass
 * @param {*} query requete pour l'api
 */
async function fetchData(query) {
    try {
        const result = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: query,
        });

        const data = await result.json();
        await processData(data);
    } catch (err) {
        console.error("Error: ", err);
    }
}

/**
 * Requete a l'api (mode demo) de osrm pour recuperr le chemin le plus court entre differents points (mode pieton)
 * https://project-osrm.org/docs/v5.23.0/api/#
 *
 * @param {*} coordinates Differentes coordonees (longitude, latitude)
 * @returns Les coordonees du chemin
 */
async function fetchRoute(coordinates) {
    let url = `https://router.project-osrm.org/route/v1/foot/${coordinates
        .map((coord) => `${coord[0]},${coord[1]}`)
        .join(";")}?overview=full&geometries=geojson&steps=true`;

    try {
        const result = await fetch(url);
        if (!result.ok) {
            throw new Error("error fetching");
        }

        const data = await result.json();
        return data.routes[0];
    } catch (error) {
        console.error("Error: ", error);
    }
}

// Affiche toutes les routes dans data
function getGraph(ways, nodeWayCounts, intersection_mode) {
    ways.forEach((element) => {
        if (element.type === "way") {
            // Conserve uniquement les intersections desirees
            element.nodes = element.nodes.filter(
                (nodeId) => nodeWayCounts.get(nodeId) >= intersection_mode
            );

            for (let i = 0; i < element.nodes.length - 1; i++) {
                const nodeId1 = element.nodes[i];
                const nodeId2 = element.nodes[i + 1];
                if (
                    graph.getCoordinates(nodeId1) !== undefined &&
                    graph.getCoordinates(nodeId2) !== undefined
                ) {
                    const distance = measure(
                        graph.getCoordinates(nodeId1)[0],
                        graph.getCoordinates(nodeId1)[1],
                        graph.getCoordinates(nodeId2)[0],
                        graph.getCoordinates(nodeId2)[1]
                    );
                    graph.addEdge(nodeId1, nodeId2, distance);
                }
            }
        }
    });
}

/**
 * Revoie tous les points autour du perimetre d'un cercle (+-1% du rayon)
 * @param {*} radius Rayon du cercle
 * @returns
 */
function getGoalNodes(radius) {
    let goalNodes = [];
    let inaccuracy = radius / 100; // 1% d'imprecision
    inaccuracy = Math.max(inaccuracy, 25); // Accuracy minimum

    while (goalNodes.length == 0) {
        for (let nodeID of graph.getNodes()) {
            let nodeCoo = graph.getCoordinates(nodeID);
            // let node = graph.getCoordinates(nodeID);

            let distanceToCenter = measure(lat, lng, nodeCoo[0], nodeCoo[1]);
            if (
                distanceToCenter <= radius + inaccuracy &&
                distanceToCenter >= radius - inaccuracy
            ) {
                goalNodes.push(nodeID);
            }
        }
        inaccuracy *= 2;
    }
    return goalNodes;
}

/**
 * Cherche des chemins avec une longueur le plus proche possible du rayon en fonction d'une valeur de precision
 * @param {*} startingNode Node de depart
 * @param {*} precision Valeure qui influe le nombre d'iterations et le nombre de chemins a prendre en compte
 * @returns Une liste de chemins, triee en fonction de leur longueur par rapport au rayon
 */
function getPathsAStar(startingNode, precision, elevationConstraint) {
    const goals = {};

    for (let i = 0; i < precision * 5; i++) {
        const goalNodes = Array.from(graph.getNodes());
        shuffle(goalNodes);

        for (let nodeID of goalNodes.slice(0, MAX_PATHS * precision)) {
            const path = aStar(graph, startingNode, nodeID, heuristic);
            if (path) {
                const elevationGain = getPathElevationGain(graph, path);
                if (Math.abs(elevationGain - elevationConstraint) < elevationConstraint * 0.1) {
                    goals[nodeID] = { path, length: elevationGain };
                }
            }
        }
    }

    return Object.entries(goals).sort(
        (a, b) => Math.abs(a[1].length - elevationConstraint) - Math.abs(b[1].length - elevationConstraint)
    ).slice(0, MAX_PATHS);
}

/**
 * Trouve un circuit (chemin qui part et arrive du meme point en limitant les croisements) d'une longueur de 2 * searchRadius.
 * Le circuit est trouve utilisant A* deux fois pour aller au meme point, en modifiant le graph entre les deux utilisations de A* afin qu'il ne reutilise pas le meme chemin.
 * @param {*} startingNode Le point de depart et d'arrive du circuit
 * @param {*} precision Facteur pour le nombre d'iterations
 * @param {*} searchRadius Le rayon de recherhe qui correspond a la taille d'un chemin (alle ou retour) de la boucle, la boucle doit donc faire une longueur de 2 * searchRadius
 * @returns
 */
function getCircuitAStar(startingNode, precision, searchRadius) {
    let goals = {};
    let ratio = 0;

    for (let i = 0; i < precision * 5; ++i) {
        //   Affiche la zone de recherche
        const circle = displayCircle(
            graph.getCoordinates(startingNode),
            searchRadius,
            getRandomColor(),
            "white",
            1,
            0
        );
        // circle.bindPopup(`${i}`);
        // circle.openPopup();

        let inaccuracy = radius / 100;
        inaccuracy = inaccuracy < 25 ? 25 : inaccuracy;
        // circle = displayCircle(
        //   graph.getCoordinates(startingNode),
        //   searchRadius + inaccuracy,
        //   "red",
        //   "white",
        //   1,
        //   0
        // );
        // circle = displayCircle(
        //   graph.getCoordinates(startingNode),
        //   searchRadius - inaccuracy,
        //   "red",
        //   "white",
        //   1,
        //   0
        // );

        let goalNodes = getGoalNodes(searchRadius);
        shuffle(goalNodes); // Melange pour obtenir des nodes aleatoires

        let totalPathsLength = 0;
        let totalLength = 0;

        // const nbCheckedNodes = (MAX_PATHS < 10 ? 10 : MAX_PATHS) * precision;
        const nbCheckedNodes = Math.max(MAX_PATHS, 10) * precision;

        for (let nodeID of goalNodes.slice(0, nbCheckedNodes)) {
            let path = aStar(graph, startingNode, nodeID, heuristic);
            if (path) {
                // Reduit le path pour ne concerver que les nodes necessaires a une distance proche du searchRadius
                let currLength = 0;
                for (let j = 1; j < path.length - 1; ++j) {
                    currLength += graph.getCost(path[j - 1], path[j]);
                    if (currLength >= searchRadius) {
                        let index =
                            Math.abs(searchRadius - currLength) <
                            Math.abs(
                                searchRadius -
                                currLength -
                                graph.getCost(path[j - 1], path[j])
                            )
                                ? j
                                : j - 1; // Minimise la difference entre currLength et radius
                        nodeID = path[index];
                        path = path.slice(0, index + 1);
                        break;
                    }
                }

                // Augmente le cout des arretes deja utilises pour ne les utiliser qu'en dernier recourt pour la deuxieme generation de chemin
                const tempGraph = graph.clone();
                for (let i = 1; i < path.length; ++i) {
                    tempGraph.setCost(path[i - 1], path[i], Infinity);
                }

                // Chemin du retour
                const returnPath = aStar(
                    tempGraph,
                    startingNode,
                    nodeID,
                    heuristic
                );
                returnPath.reverse();
                for (let id of returnPath.slice(1)) {
                    path.push(id); // Ajoute les points au chemin
                }

                // Taille totale du chemin
                let length = getPathLength(graph, path);

                if (!goals[nodeID]) {
                    goals[nodeID] = {
                        path: path,
                        length: getPathLength(graph, path),
                    };
                }

                totalPathsLength += length;
                totalLength += radius;
            }
        }

        // Recalcul du rayon en fonction du resultat
        ratio = 1 - (totalPathsLength - totalLength) / totalLength;
        searchRadius *= ratio;
        console.log(
            "totalLength:",
            totalLength,
            "totalPathsLength:",
            totalPathsLength,
            "ratio:",
            ratio
        );
    }

    // Trie des chemins en fonction de leur longueur par rapport au rayon
    const entries = Object.entries(goals);
    const sortedEntries = entries.sort(
        (a, b) =>
            Math.abs(a[1].length - radius) - Math.abs(b[1].length - radius)
    );

    return sortedEntries.slice(0, MAX_PATHS);
}

async function processData(data) {
    console.time("Process Data");

    const use_astar = document.getElementById("aStar").checked;
    const use_dfs = document.getElementById("dfs").checked;
    const searchRadius = radius;
    const intersection_mode = document.getElementById("intersection").checked ? 2 : 1;
    const nodeWayCounts = new Map();

    console.time("Node Counting");
    data.elements.forEach((element) => {
        if (element.type === "way") {
            element.nodes.forEach((nodeId) => {
                const currentCount = nodeWayCounts.get(nodeId) || 0;
                nodeWayCounts.set(nodeId, currentCount + 1);
            });
        }
    });
    console.timeEnd("Node Counting");

    console.time("Graph Nodes Addition");
    data.elements.forEach((element) => {
        if (nodeWayCounts.get(element.id) >= intersection_mode)
            graph.addNode(element.id, element.lat, element.lon);
    });
    console.timeEnd("Graph Nodes Addition");

    console.time("Fetch Altitudes");
    const allNodes = Array.from(graph.nodes.values());
    const nodesWithElevation = await fetchAltitudesForNodes(
        allNodes.map((node) => [node.latitude, node.longitude, node.id])
    );
    console.timeEnd("Fetch Altitudes");

    console.time("Assign Elevations");
    nodesWithElevation.forEach(([lat, lon, id, altitude]) => {
        const node = graph.nodes.get(id);
        if (node) {
            node.altitude = altitude;
        }
    });
    console.timeEnd("Assign Elevations");

    console.time("Add Edges to Graph");
    data.elements.forEach((element) => {
        if (element.type === "way") {
            const nodes = element.nodes.filter(
                (nodeId) => graph.nodes.get(nodeId)?.altitude !== undefined
            );

            for (let i = 0; i < nodes.length - 1; i++) {
                graph.addEdge(nodes[i], nodes[i + 1]);
            }
        }
    });
    console.timeEnd("Add Edges to Graph");

    if (graph.getSize() === 0) {
        console.error("No roads found in graph.");
        alert("No roads found");
        console.timeEnd("Process Data");
        return;
    }

    console.time("Find Starting Node");
    let minDistance = Infinity;
    let startingNode = null;

    for (let nodeID of Array.from(graph.getNodes())) {
        const node = graph.getCoordinates(nodeID);
        const latDiff = Math.abs(lat - node.latitude);
        const lonDiff = Math.abs(lng - node.longitude);
        if (latDiff + lonDiff < minDistance) {
            minDistance = latDiff + lonDiff;
            startingNode = nodeID;
        }
    }
    console.timeEnd("Find Starting Node");

    const elevationConstraint = parseInt(document.getElementById("elevation").value);

    if (use_dfs) {
        console.log("Starting DFS Exploration");
        console.time("DFS Exploration");
        const paths = dfsExplore(graph, startingNode, elevationConstraint, MAX_PATHS);

        for (let path of paths) {
            const coordinates = path.path.map((nodeID) => {
                const node = graph.getCoordinates(nodeID);
                return [node.latitude, node.longitude];
            });

            displayPath(coordinates, getRandomColor(), 0.7, path.elevation);
            console.log(`DFS Path displayed with elevation: ${path.elevation}`);
            await sleep(delay);
        }
        console.timeEnd("DFS Exploration");
    }

    console.timeEnd("Process Data");
}

// Fonction pour estimer le cout d'un node par rapport a un autre
// Pour l'instant simple calcul de distance
function heuristic(node1, node2) {
    return Math.abs(
        graph.getCoordinates(node1).altitude - graph.getCoordinates(node2).altitude
    );
}

function getElevationGain(graph, path) {
    let elevationGain = 0;
    for (let i = 1; i < path.length; i++) {
        const elevationDiff =
            Math.abs(
                graph.getCoordinates(path[i]).altitude - graph.getCoordinates(path[i - 1]).altitude
            );
        elevationGain += elevationDiff;
    }
    return elevationGain;
}

function aStar(graph, start, goal, heuristic) {
    const openSet = new PriorityQueue();
    openSet.enqueue(start, 0);

    const cameFrom = new Map();
    const gScore = new Map();
    gScore.set(start, 0);

    const fScore = new Map();
    fScore.set(start, heuristic(start, goal));

    const closedSet = new Set();

    while (!openSet.isEmpty()) {
        const currentId = openSet.dequeue();

        if (closedSet.has(currentId)) {
            continue;
        }
        closedSet.add(currentId);

        if (currentId === goal) {
            return reconstructPath(cameFrom, currentId);
        }

        for (let { node: neighborId, weight } of graph.getNeighbors(currentId)) {
            if (closedSet.has(neighborId)) {
                continue;
            }

            const tentativeGScore = gScore.get(currentId) + weight;

            if (!gScore.has(neighborId) || tentativeGScore < gScore.get(neighborId)) {
                cameFrom.set(neighborId, currentId);
                gScore.set(neighborId, tentativeGScore);
                fScore.set(neighborId, gScore.get(neighborId) + heuristic(neighborId, goal));
                openSet.enqueue(neighborId, fScore.get(neighborId));
            }
        }
    }

    return null;
}

function reconstructPath(cameFrom, current) {
    let totalPath = [current];
    while (cameFrom.has(current)) {
        current = cameFrom.get(current);
        totalPath.unshift(current);
    }
    return totalPath;
}

/**
 * Cree un des chemins
 * @param {*} graph Graph dans lequel les chemins sont cree
 * @param {*} start Point de depart des chemins
 * @param {*} length Longueur d'un chemin
 * @param {*} size Nombre de chemins
 * @returns
 */
function makePaths(graph, startId, length, size) {
    let alreadyVisited = [];
    let paths = [];
    for (let i = 0; i < size; ++i) {
        let currentId = startId;
        let len = 0;
        let currPath = [startId];

        // Iteration jusqu'a que la taille du chemin soint >= a length
        while (len < length) {
            alreadyVisited.push(currentId);
            currPath.push(currentId);

            // Ajoute un nouveau voisin au chemin

            for (let neighborId of graph.getNeighbors(currentId)) {
                neighborId = parseInt(neighborId);
                if (!alreadyVisited.includes(neighborId)) {
                    len += graph.getCost(currentId, neighborId);
                    currentId = neighborId;
                    break;
                }
            }

            // Si tous les voisins on ete visites, reset
            if (alreadyVisited[alreadyVisited.length - 1] === currentId) {
                for (let neighborId of graph.getNeighbors(currentId)) {
                    neighborId = parseInt(neighborId);
                    const index = alreadyVisited.indexOf(neighborId);
                    if (index > -1) {
                        alreadyVisited.splice(index, 1);
                    }
                }
                const nextId = parseInt(graph.getNeighbors(currentId)[0]);
                len += graph.getCost(currentId, nextId);
                currentId = nextId;
            }
        }
        paths.push({ path: currPath, length: len });
    }
    return paths;
}

/**
 *
 * @param {*} graph
 * @param {*} path Chemin dont la longueur est evaluee (list d'id de nodes)
 * @returns La longueur du chemin
 */
function getPathElevationGain(graph, path) {
    let elevationGain = 0;
    for (let i = 1; i < path.length; i++) {
        const elevationDiff =
            graph.getCoordinates(path[i]).altitude -
            graph.getCoordinates(path[i - 1]).altitude;
        if (elevationDiff > 0) {
            elevationGain += elevationDiff;
        }
    }
    return elevationGain;
}

async function fetchAltitudesForNodes(nodes) {
    const nodesWithElevation = [];

    // Diviser les nodes en lots de 100 (max autorisé par l'API)
    const batchSize = 100;
    const batches = [];
    for (let i = 0; i < nodes.length; i += batchSize) {
        batches.push(nodes.slice(i, i + batchSize));
    }

    console.log("Start fetch altitude");

    try {
        for (const batch of batches) {
            const latitudes = batch.map(node => node[0]);
            const longitudes = batch.map(node => node[1]);

            let response;
            let success = false;
            let attempt = 0;
            let delay = 500; // delay de 20ms initialement

            // Backoff pour les 429, augmentation exponentielle du delay
            while (!success && attempt < 5) {
                try {
                    response = await fetch(
                        `https://api.open-meteo.com/v1/elevation?latitude=${latitudes.join(",")}&longitude=${longitudes.join(",")}`
                    );

                    if (response.ok) {
                        const data = await response.json();
                        if (data.elevation) {
                            data.elevation.forEach((altitude, index) => {
                                const [lat, lon, id] = batch[index];
                                nodesWithElevation.push([lat, lon, id, altitude]);
                            });
                        }
                        success = true;
                    } else if (response.status === 429) {
                        console.log(`429 Too Many Requests: Retrying in ${delay}ms...`);
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
                console.error("Failed to fetch elevation data after multiple attempts.");
            }

        }
    } catch (error) {
        console.error("Error fetching altitudes:", error);
    }

    console.log(`Total nodes with elevation fetched: ${nodesWithElevation.length}`);
    return nodesWithElevation;
}

function dfsExplore(graph, startNode, elevationConstraint, maxPaths) {
    let paths = [];
    let stack = [[startNode, [startNode], 0]]; // [currentNode, pathSoFar, currentElevationGain]

    while (stack.length > 0 && paths.length < maxPaths) {
        let [currentNode, pathSoFar, currentElevationGain] = stack.pop();

        // Vérifier si le chemin respecte la contrainte d'élévation
        if (currentElevationGain >= elevationConstraint) {
            if (
                Math.abs(currentElevationGain - elevationConstraint) <= elevationConstraint * 0.1 // Tolérance de 10%
            ) {
                paths.push({ path: pathSoFar, elevation: currentElevationGain });
            }
            continue; // Ne pas continuer l'exploration après avoir atteint la contrainte
        }

        // Explorer les voisins
        for (let { node: neighbor, weight } of graph.getNeighbors(currentNode)) {
            if (!pathSoFar.includes(neighbor)) { // Éviter les cycles
                const elevationGain =
                    Math.abs(
                        graph.getCoordinates(neighbor).altitude - graph.getCoordinates(currentNode).altitude
                    );
                stack.push([
                    neighbor,
                    [...pathSoFar, neighbor],
                    currentElevationGain + elevationGain,
                ]);
            }
        }
    }

    // Trier les chemins par leur longueur pour une cohérence visuelle
    return paths.sort((a, b) => a.elevation - b.elevation);
}

// Distance entre deux points en metres
// https://stackoverflow.com/questions/639695/how-to-convert-latitude-or-longitude-to-meters
// https://en.wikipedia.org/wiki/Haversine_formula
function measure(lat1, lon1, lat2, lon2) {
    var R = 6378.137; // Radius of earth in KM
    var dLat = (lat2 * Math.PI) / 180 - (lat1 * Math.PI) / 180;
    var dLon = (lon2 * Math.PI) / 180 - (lon1 * Math.PI) / 180;
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d * 1000; // meters
}

/**
 * Affiche le chemin entre differentes coordonees sur la carte
 * @param {*} coordinates Les coordonees constituant le chemin
 * @param {*} color La couleur du chemin
 */
function displayPath(coordinates, color, opacity, length) {
    const polyline = L.polyline(coordinates, {
        color: color,
        weight: 5,
        opacity: opacity,
    }).addTo(customLayers);

    polyline.bindPopup(`${Math.floor(length)}m`);
    polyline.openPopup();
}

/**
 * Affiche un cercle sur la carte
 * @param {*} coordinate Coordonees centre du cercle
 * @param {*} radius Rayon du cercle
 * @param {*} color Couleur du contour du cercle
 * @param {*} fillColor Couleur de l'interieur du cercle
 * @param {*} opacity Opacite du contour du cercle
 * @param {*} fillOpacity Opacite de l'interieur du cercle
 */
function displayCircle(
    coordinate,
    radius,
    color,
    fillColor,
    opacity,
    fillOpacity
) {
    return L.circle(coordinate, {
        radius: radius,
        color: color,
        fillColor: fillColor,
        opacity: opacity,
        fillOpacity: fillOpacity,
    }).addTo(customLayers);
}

// https://stackoverflow.com/questions/951021/what-is-the-javascript-version-of-sleep
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// https://stackoverflow.com/questions/1484506/random-color-generator
function getRandomColor() {
    var letters = "0123456789ABCDEF";
    var color = "#";
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array) {
    let currentIndex = array.length;

    // While there remain elements to shuffle...
    while (currentIndex !== 0) {
        // Pick a remaining element...
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex],
            array[currentIndex],
        ];
    }
}