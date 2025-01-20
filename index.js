import Graph from "./Graph.js";
import PriorityQueue from "./PriorityQueue.js";

const graph = new Graph();
const map = L.map("map").setView([47.2378, 6.0241], 10);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
const customLayers = L.layerGroup().addTo(map);

let elevationConstraint = 200; // Limite d'altitude entre deux points (évite les falaises par exemple)
let precision = 1;
let maxPaths = 10;


const REQUEST_DELAY = 100; // Délai entre les requetes API

document.getElementById("elevation").addEventListener("change", (e) => {
    elevationConstraint = parseInt(e.target.value);
});
document.getElementById("precision-slider").addEventListener("input", (e) => {
    precision = parseInt(e.target.value);
});
document.getElementById("nbChemins").addEventListener("change", (e) => {
    maxPaths = parseInt(e.target.value);
});


map.on("click", (e) => {
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;

    const query = `
        [out:json][timeout:10];
        way(around:1000,${lat},${lon})["highway"];
        (._;>;);
        out body;
    `;
    fetchOverpassData(query).then((data) => {
        const nodes = processOverpassData(data);
        fetchAltitudesForNodes(nodes).then((nodesWithElevation) => {
            const startNode = findClosestNode(lat, lon, nodesWithElevation);
            const path = calculateBestPath(startNode, nodesWithElevation);
            if (path) {
                console.log("Chemin calculé :", path);
                visualizePath(path);
            } else {
                alert("Aucun chemin trouvé respectant le dénivelé demandé.");
            }
        });
    });
});

// Récupère les altitudes pour chaque noeud en groupes (paramètrable à l'appel de groupNodesProximity) afin de minimiser les appels à l'API
async function fetchAltitudesForNodes(nodes) {
    const groupedNodes = groupNodesByProximity(nodes, 20);
    const nodesWithElevation = [];

    for (const group of groupedNodes) {
        const latitudes = group.map(node => node[0]);
        const longitudes = group.map(node => node[1]);

        try {
            //MakeAPI pour appliquer un délai, régi par une constante au début du fichier (30-50ms idéal)
            const response = await makeApiRequest(
                `https://api.open-meteo.com/v1/elevation?latitude=${latitudes.join(",")}&longitude=${longitudes.join(",")}`
            );

            if (response.ok) {
                const data = await response.json();
                //Ajout de l'élévation
                if (data.elevation) {
                    data.elevation.forEach((altitude, index) => {
                        const [lat, lon, id] = group[index];
                        graph.addNode(id, lat, lon, altitude);
                        nodesWithElevation.push([lat, lon, id, altitude]);
                    });
                } else {
                    console.warn("Pas de données d'altitude reçues pour ce groupe de node.");
                }
            } else {
                console.error("Erreur API Open-Meteo :", response.status);
            }
        } catch (error) {
            console.error("Erreur lors de la récupération des altitudes :", error);
        }

        await delay(REQUEST_DELAY);
    }

    //Log a la fin des appels API des nodes pour débugging
    console.log("Noeuds traités :", nodesWithElevation);
    return nodesWithElevation;
}

function findClosestNode(lat, lon, nodes) {
    let closestNode = null;
    let minDistance = Infinity;

    nodes.forEach(node => {
        const distance = haversineDistance([lat, lon], [node[0], node[1]]);
        if (distance < minDistance) {
            closestNode = node;
            minDistance = distance;
        }
    });

    return closestNode;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeApiRequest(url) {
    console.log("API call");
    try {
        //Permet de gérer les 429 et erreurs d'appel aux API
        const response = await fetch(url);
        if (response.status === 429) {
            console.warn("Trop de requêtes - attente avant de réessayer.");
            await delay(REQUEST_DELAY * 2);
            return makeApiRequest(url);
        }
        return response;
    } catch (error) {
        console.error("Erreur réseau :", error);
        throw error;
    }
}

// Regroupe les noeuds géographiquement proches dans un rayon donné (minimise les appels à l'API, entre 10 et 20 mètres idéal pour radius)
function groupNodesByProximity(nodes, radius) {
    const groups = [];
    const visited = new Set();

    nodes.forEach((node, i) => {
        if (!visited.has(i)) {
            const group = [node];
            visited.add(i);

            for (let j = i + 1; j < nodes.length; j++) {
                if (!visited.has(j)) {
                    const distance = haversineDistance(node, nodes[j]);
                    if (distance <= radius) {
                        group.push(nodes[j]);
                        visited.add(j);
                    }
                }
            }

            groups.push(group);
        }
    });

    return groups;
}

//Distance entre deux nodes avec Haversine
function haversineDistance([lat1, lon1], [lat2, lon2]) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000;
}

function fetchOverpassData(query) {
    return fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query,
    }).then(response => response.json())
        .catch(error => {
            console.error("Erreur avec l'API Overpass:", error);
            return null;
        });
}

function processOverpassData(data) {
    return data.elements.filter(e => e.type === "node").map(e => [e.lat, e.lon, e.id]);
}

// Calcule un chemin, du point de départ vers un point du cercle dans lequel on recupère les nodes, s'arrete lorsque la contrainte est atteinte
function calculateBestPath(startNode, nodes) {
    console.log("Noeuds disponibles avec altitudes :", nodes.map(node => ({ id: node[2], lat: node[0], lon: node[1], elevation: node[3] })));
    const start = startNode;
    const goal = nodes[nodes.length - 1];

    if (!start || !goal) {
        console.error("Points de départ ou d'arrivée introuvables.");
        return null;
    }

    console.log("Départ :", start, "Arrivée :", goal);

    const path = aStarWithElevation(start, goal, elevationConstraint);
    if (path) {
        console.log("Points du chemin :", path.map(nodeId => {
            const coords = graph.getCoordinates(nodeId);
            return coords ? { id: nodeId, lat: coords[0], lon: coords[1], elevation: coords[2] } : null;
        }));
    }

    return path;
}

//Permet de visualiser le chemin sur la carte
function visualizePath(path) {
    const coordinates = path.map(nodeId => graph.getCoordinates(nodeId));
    const elevationGain = getElevationGain(path);

    L.polyline(coordinates, {
        color: "blue",
        weight: 4,
    })
        .bindPopup(`Dénivelé total : ${elevationGain.toFixed(2)}m`)
        .addTo(customLayers);
}

// A* avec contrainte d'altitude
function aStarWithElevation(start, goal, elevationConstraint) {
    const openSet = new PriorityQueue();
    openSet.enqueue(start[2], 0);

    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    gScore.set(start[2], 0);
    fScore.set(start[2], heuristic(start, goal));

    while (!openSet.isEmpty()) {
        const currentNodeId = openSet.dequeue();
        const currentCoords = graph.getCoordinates(currentNodeId);

        if (currentNodeId === goal[2]) {
            return reconstructPath(cameFrom, currentNodeId);
        }

        const neighbors = graph.getNeighbors(currentNodeId) || [];
        if (neighbors.length === 0) {
            console.log(`Pas de voisins trouvés pour le noeud : ${currentNodeId}`);
            continue;
        }

        neighbors.forEach(neighborId => {
            const neighborCoords = graph.getCoordinates(neighborId);

            const tentativeGScore =
                gScore.get(currentNodeId) +
                graph.getCost(currentNodeId, neighborId);

            const elevationDiff = Math.abs(
                currentCoords[2] - neighborCoords[2]
            );

            if (elevationDiff <= elevationConstraint) {
                if (
                    !gScore.has(neighborId) ||
                    tentativeGScore < gScore.get(neighborId)
                ) {
                    cameFrom.set(neighborId, currentNodeId);
                    gScore.set(neighborId, tentativeGScore);
                    fScore.set(
                        neighborId,
                        tentativeGScore + heuristic(neighborCoords, goal)
                    );

                    if (!openSet.has(neighborId)) {
                        openSet.enqueue(neighborId, fScore.get(neighborId));
                    }
                }
            }
        });
    }

    return null;
}

function heuristic(a, b) {
    return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
}

// Reconstruit le chemin final à partir des noeuds visités en suivant la carte des précédents
function reconstructPath(cameFrom, currentNodeId) {
    const totalPath = [currentNodeId];
    while (cameFrom.has(currentNodeId)) {
        currentNodeId = cameFrom.get(currentNodeId);
        totalPath.unshift(currentNodeId);
    }
    return totalPath;
}

//Calcule la différence d'altitude entre deux nodes
function getElevationGain(path) {
    let totalGain = 0;

    for (let i = 1; i < path.length; i++) {
        const elevation1 = graph.getCoordinates(path[i - 1])[2];
        const elevation2 = graph.getCoordinates(path[i])[2];

        if (elevation2 > elevation1) {
            totalGain += elevation2 - elevation1;
        }
    }

    return totalGain;
}
