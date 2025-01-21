import Graph from "./Graph.js";
import PriorityQueue from "./PriorityQueue.js";

// Initialisation du graphe pour stocker les nœuds et les arêtes
const graph = new Graph();
// Création de la carte centrée sur des coordonnées initiales
const map = L.map("map").setView([47.2378, 6.0241], 10);
// Ajout d'une couche de tuiles OpenStreetMap à la carte
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
const customLayers = L.layerGroup().addTo(map);

// Contrainte d'altitude maximale entre deux points
let elevationConstraint = 200;
let precision = 1;
let maxPaths = 10;

let delayed = document.getElementById("timer-slider").value; // delai entre l'affichage de deux routes (ms)

const REQUEST_DELAY = 30;

// Mise à jour de la contrainte d'altitude lorsqu'elle est modifiée dans l'interface utilisateur
document.getElementById("elevation").addEventListener("change", (e) => {
    elevationConstraint = parseInt(e.target.value);
});
document.getElementById("precision-slider").addEventListener("input", (e) => {
    precision = parseInt(e.target.value);
});
document.getElementById("nbChemins").addEventListener("change", (e) => {
    maxPaths = parseInt(e.target.value);
});

const timer_value = document.querySelector("#timer-label");
const timer_input = document.querySelector("#timer-slider");
timer_value.textContent = timer_input.value + " ms";
timer_input.addEventListener("input", (event) => {
    delayed = event.target.value;
    timer_value.textContent = event.target.value + " ms";
});

const precision_value = document.querySelector("#precision-label");
const precision_input = document.querySelector("#precision-slider");
precision_value.textContent = `${precision_input.value} (Precision for A*)`;
precision_input.addEventListener("input", (event) => {
    precision = event.target.value;
    precision_value.textContent = `${event.target.value} (Precision for A*)`;
});


// Gestion des clics sur la carte pour définir le point de départ et lancer la recherche de chemin
map.on("click", (e) => {
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;

    const query = `
        [out:json][timeout:10];
        way(around:500,${lat},${lon})["highway"];
        (._;>;);
        out body;
    `;
    fetchOverpassData(query).then((data) => {
        const nodes = processOverpassData(data);
        console.log(nodes);
        fetchAltitudesForNodes(nodes).then((nodesWithElevation) => {
            // Ajouter les arêtes pour connecter les nœuds entre eux
            for (let i = 0; i < nodesWithElevation.length - 1; i++) {
                const [lat1, lon1, id1] = nodesWithElevation[i];
                const [lat2, lon2, id2] = nodesWithElevation[i + 1];

                const elevationDiff = Math.abs(graph.getCoordinates(id1)[2] - graph.getCoordinates(id2)[2]);
                graph.addEdge(id1, id2, elevationDiff);
            }

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

// Récupère les altitudes pour chaque noeud en groupes afin de minimiser les appels à l'API
// Récupère les altitudes en demandant plusieurs points à la fois (50 par défaut pour limiter les appels)
async function fetchAltitudesForNodes(nodes) {
    const nodesWithElevation = [];

    // Divise les nœuds en lots de 50
    for (let i = 0; i < nodes.length; i += 50) {
        const batch = nodes.slice(i, i + 50);

        // Prépare les latitudes et longitudes pour l'appel groupé
        const latitudes = batch.map(node => node[0]);
        const longitudes = batch.map(node => node[1]);

        try {
            const response = await makeApiRequest(
                `https://api.open-meteo.com/v1/elevation?latitude=${latitudes.join(",")}&longitude=${longitudes.join(",")}`
            );

            if (response.ok) {
                const data = await response.json();
                if (data.elevation) {
                    data.elevation.forEach((altitude, index) => {
                        if (index < batch.length) { // Vérifie que l'index est valide pour le lot
                            const [lat, lon, id] = batch[index];
                            graph.addNode(id, lat, lon, altitude);
                            nodesWithElevation.push([lat, lon, id, altitude]);
                        } else {
                            console.warn(`Index ${index} dépasse la taille du lot`);
                        }
                    });
                } else {
                    console.warn("Pas de données d'altitude reçues pour ce lot.");
                }
            } else {
                console.error("Erreur API Open-Meteo :", response.status);
            }
        } catch (error) {
            console.error("Erreur lors de la récupération des altitudes :", error);
        }

        // Pause pour respecter les limitations d'API
        await delay(REQUEST_DELAY);
    }

    console.log("Nœuds traités :", nodesWithElevation);
    return nodesWithElevation;
}


// Trouve le nœud le plus proche d'un point donné (lat, lon)
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

// Regroupe les nœuds géographiquement proches dans un rayon donné
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

function haversineDistance([lat1, lon1], [lat2, lon2]) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lat2 - lon1) * Math.PI) / 180;
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

// Calcule le meilleur chemin entre un point de départ et une destination, en respectant la contrainte d'altitude
function calculateBestPath(startNode, nodes) {
    console.log("Noeuds disponibles avec altitudes :", nodes.map(node => ({ id: node[2], lat: node[0], lon: node[1], elevation: node[3] })));
    const start = startNode;
    const goal = nodes[nodes.length - 1];
    console.log(goal);

    if (!start) {
        console.error("Points de départ introuvable.");
        return null;
    }

    console.log("Départ :", start, "Goal :", goal);

    const path = aStarWithElevation(start, goal, elevationConstraint);
    console.log("Path:"+ path);
    if (path) {
        console.log("Points du chemin :", path.map(nodeId => {
            const coords = graph.getCoordinates(nodeId);
            return coords ? { id: nodeId, lat: coords[0], lon: coords[1], elevation: coords[2] } : null;
        }));
    }

    return path;
}

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

// Implémente l'algorithme A* en tenant compte des différences d'altitude
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
            console.warn(`Pas de voisins trouvés pour le nœud : ${currentNodeId}`);
            continue;
        }

        neighbors.forEach(neighborId => {
            const neighborCoords = graph.getCoordinates(neighborId);
            if (!neighborCoords) {
                console.warn(`Coordonnées introuvables pour le voisin : ${neighborId}`);
                return;
            }

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
    return Math.abs(a[2] - b[2]); // Heuristique basée uniquement sur la différence d'altitude
}

// Reconstruit le chemin final à partir des nœuds visités en suivant la carte des précédents
function reconstructPath(cameFrom, currentNodeId) {
    const totalPath = [currentNodeId];
    while (cameFrom.has(currentNodeId)) {
        currentNodeId = cameFrom.get(currentNodeId);
        totalPath.unshift(currentNodeId);
    }
    return totalPath;
}

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
