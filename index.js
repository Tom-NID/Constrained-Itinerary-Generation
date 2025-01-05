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

let radius = parseInt(document.getElementById("distance").value); // rayon du cercle de recherche
let MAX_PATHS = parseInt(document.getElementById("nbChemins").value); // nombre de chemins a generer
let precision = parseInt(document.getElementById("precision-slider").value); // delai entre l'affichage de deux routes (ms)

let delay = document.getElementById("timer-slider").value; // delai entre l'affichage de deux routes (ms)

document.getElementById("distance").addEventListener("change", (e) => {
    radius = parseInt(e.target.value);
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
    query =
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
        processData(data);
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
const nodes = new Map();
function getGraph(graph, ways, nodeWayCounts, intersection_mode) {
    ways.forEach((element) => {
        if (element.type === "way") {
            // Conserve uniquement les intersections desirees
            element.nodes = element.nodes.filter(
                (nodeId) => nodeWayCounts.get(nodeId) >= intersection_mode
            );

            for (let i = 0; i < element.nodes.length - 1; i++) {
                const node1 = element.nodes[i];
                const node2 = element.nodes[i + 1];
                if (
                    nodes.get(node1) !== undefined &&
                    nodes.get(node2) !== undefined
                ) {
                    const distance = measure(
                        nodes.get(node1)[0],
                        nodes.get(node1)[1],
                        nodes.get(node2)[0],
                        nodes.get(node2)[1]
                    );
                    if (!graph.get(node1)) graph.set(node1, {});
                    if (!graph.get(node2)) graph.set(node2, {});
                    graph.get(node1)[node2] = distance;
                    graph.get(node2)[node1] = distance;
                }
            }
        }
    });
}

/**
 * Revoie tous les points autour du perimetre d'un cercle (+-1% du rayon)
 * @param {*} graph
 * @param {*} radius Rayon du cercle
 * @returns
 */
function getGoalNodes(graph, radius) {
    let goalNodes = [];
    let inaccuracy = radius / 100;
    inaccuracy = Math.min(inaccuracy, 25); // Accuracy minimum

    while (goalNodes.length == 0) {
        for (let nodeID of Array.from(graph.keys())) {
            let node = nodes.get(nodeID);

            let distanceToCenter = measure(lat, lng, node[0], node[1]);
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
 * @param {*} graph
 * @param {*} startingNode Node de depart
 * @param {*} precision Valeure qui influe le nombre d'iterations et le nombre de chemins a prendre en compte
 * @returns Une liste de chemins, triee en fonction de leur longueur par rapport au rayon
 */
function getPathsAStar(graph, startingNode, precision, searchRadius) {
    let goals = {};
    let ratio = 0;

    for (let i = 0; i < precision * 5; ++i) {
        //   Affiche la zone de recherche
        displayCircle(
            nodes.get(startingNode),
            searchRadius,
            getRandomColor(),
            "white",
            1,
            0
        );

        let goalNodes = getGoalNodes(graph, searchRadius);
        shuffle(goalNodes); // Melange pour obtenir des nodes aleatoires

        let totalPathsLength = 0;
        let totalLength = 0;

        const nbCheckedNodes = (MAX_PATHS < 10 ? 10 : MAX_PATHS) * precision;

        for (let nodeID of goalNodes.slice(0, nbCheckedNodes)) {
            let path = aStar(graph, startingNode, nodeID, heuristic);
            if (path) {
                let length = getPathLength(graph, path);

                // Reduit le path pour ne concerver que les nodes necessaires a une distance proche du radius
                let currLength = 0;
                for (let j = 1; j < path.length - 1; ++j) {
                    currLength += graph.get(path[j - 1])[path[j]];
                    if (currLength >= radius) {
                        let index =
                            Math.abs(radius - currLength) <
                            Math.abs(
                                radius -
                                    currLength -
                                    graph.get(path[j - 1])[path[j]]
                            )
                                ? j
                                : j - 1;
                        nodeID = path[index];
                        path = path.slice(0, index + 1);
                        break;
                    }
                }
                if (!goals[nodeID]) {
                    goals[nodeID] = { path: path, length: currLength };
                }

                totalPathsLength += length;
                totalLength += radius;
            }
        }

        // Recalcul du rayon en fonction du resultat
        ratio = 1 - (totalPathsLength - totalLength) / totalLength;
        searchRadius *= ratio;
    }

    // Trie des chemins en fonction de leur longueur par rapport au rayon
    const entries = Object.entries(goals);
    const sortedEntries = entries.sort(
        (a, b) =>
            Math.abs(a[1].length - radius) - Math.abs(b[1].length - radius)
    );

    return sortedEntries.slice(0, MAX_PATHS);
}

/**
 * Trouve un circuit (chemin qui part et arrive du meme point en limitant les croisements) d'une longueur de 2 * searchRadius.
 * Le circuit est trouve utilisant A* deux fois pour aller au meme point, en modifiant le graph entre les deux utilisations de A* afin qu'il ne reutilise pas le meme chemin.
 * @param {*} graph Le graph dans lequel trouver le circuit
 * @param {*} startingNode Le point de depart et d'arrive du circuit
 * @param {*} precision Facteur pour le nombre d'iterations
 * @param {*} searchRadius Le rayon de recherhe qui correspond a la taille d'un chemin (alle ou retour) de la boucle, la boucle doit donc faire une longueur de 2 * searchRadius
 * @returns
 */
function getCircuitAStar(graph, startingNode, precision, searchRadius) {
    let goals = {};
    let ratio = 0;

    for (let i = 0; i < precision * 5; ++i) {
        //   Affiche la zone de recherche
        const circle = displayCircle(
            nodes.get(startingNode),
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
        //   nodes.get(startingNode),
        //   searchRadius + inaccuracy,
        //   "red",
        //   "white",
        //   1,
        //   0
        // );
        // circle = displayCircle(
        //   nodes.get(startingNode),
        //   searchRadius - inaccuracy,
        //   "red",
        //   "white",
        //   1,
        //   0
        // );

        let goalNodes = getGoalNodes(graph, searchRadius);
        shuffle(goalNodes); // Melange pour obtenir des nodes aleatoires

        let totalPathsLength = 0;
        let totalLength = 0;

        const nbCheckedNodes = (MAX_PATHS < 10 ? 10 : MAX_PATHS) * precision;

        for (let nodeID of goalNodes.slice(0, nbCheckedNodes)) {
            let path = aStar(graph, startingNode, nodeID, heuristic);
            if (path) {
                // Reduit le path pour ne concerver que les nodes necessaires a une distance proche du searchRadius
                let currLength = 0;
                for (let j = 1; j < path.length - 1; ++j) {
                    currLength += graph.get(path[j - 1])[path[j]];
                    if (currLength >= searchRadius) {
                        let index =
                            Math.abs(searchRadius - currLength) <
                            Math.abs(
                                searchRadius -
                                    currLength -
                                    graph.get(path[j - 1])[path[j]]
                            )
                                ? j
                                : j - 1;
                        nodeID = path[index];
                        path = path.slice(0, index + 1);
                        break;
                    }
                }

                // Augmente le cout des arretes deja utilises pour ne les utiliser qu'en dernier recourt pour la deuxieme generation de chemin
                const tempGraph = structuredClone(graph);
                for (let i = 1; i < path.length; ++i) {
                    tempGraph.get(path[i - 1])[path[i]] = Infinity;
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
        if (totalLength == 0) {
            alert("No paths found");
            return null;
        }

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
    const use_astar = document.getElementById("aStar").checked;
    const use_boucle = document.getElementById("boucle").checked;
    const use_OSRM = document.getElementById("osrm").checked;
    const use_circuit = document.getElementById("circuit").checked;
    const searchRadius = use_circuit ? radius / 2 : radius;
    const intersection_mode = document.getElementById("intersection").checked
        ? 2
        : 1;
    const nodeWayCounts = new Map();
    const graph = new Map();

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

    // Map des nodes (id => coordonees)
    console.time("Instanciation des nodes");
    data.elements.forEach((element) => {
        if (nodeWayCounts.get(element.id) >= intersection_mode)
            nodes.set(element.id, [element.lat, element.lon]);
    });
    console.timeEnd("Instanciation des nodes");

    console.time("Creation du graph");
    // Creation du graph
    getGraph(graph, data.elements, nodeWayCounts, intersection_mode);
    console.timeEnd("Creation du graph");

    if (graph.size == 0) {
        alert("No roads found");
        return;
    }

    // for (nodeID of Array.from(graph.keys())) {
    //     displayCircle(nodes.get(nodeID), 3, "blue", "blue", 0, 0.5);
    // }

    // Pour le calcul du node le plus proche du click
    let minDistance = Infinity;
    let startingNode = null;

    // Recherche du node le plus proche du click et des nodes les plus proches du perimetre du cercle
    console.time("Recherche du centre");
    for (let nodeID of Array.from(graph.keys())) {
        let node = nodes.get(nodeID);

        // Trouve le node le plus proche du click
        const latDiff = Math.abs(lat - node[0]);
        const lonDiff = Math.abs(lng - node[1]);
        if (latDiff + lonDiff < minDistance) {
            // Somme des différences
            minDistance = latDiff + lonDiff;
            startingNode = nodeID;
        }
    }
    console.timeEnd("Recherche du centre");

    // Affiche le cercle de recherche
    displayCircle(
        [nodes.get(startingNode)[0], nodes.get(startingNode)[1]],
        searchRadius,
        "blue",
        "lightblue",
        1,
        0
    );

    // Affiche le node le plus proche du click
    displayCircle(
        [nodes.get(startingNode)[0], nodes.get(startingNode)[1]],
        10,
        "blue",
        "blue",
        1,
        1
    );

    console.time("Calcul itineraires");
    /**
     *  MODE RANDOM
     */
    if (use_boucle) {
        const paths = makePaths(graph, startingNode, searchRadius, MAX_PATHS);
        for (let path of paths) {
            coordinates = path.path.map((nodeID) => nodes.get(nodeID));
            displayPath(coordinates, getRandomColor(), 1, path.length);
            await sleep(delay);
        }
    }

    /**
     * MODE CIRCUIT
     */
    if (use_circuit) {
        // const paths = getPathsAStar(graph, startingNode, precision, searchRadius);
        const paths = getCircuitAStar(
            graph,
            startingNode,
            precision,
            searchRadius
        );
        if (paths != null) {
            for (let path of paths) {
                const coordinates = path[1].path.map((nodeID) =>
                    nodes.get(nodeID)
                );
                const nodesID = path[1].path;
                const length = path[1].length;
                const goalID = parseInt(path[0]);
                const goalNode = nodes.get(goalID);
                const color = getRandomColor();

                // Affiche le point d'arrive de la route
                displayCircle(
                    [goalNode[0], goalNode[1]],
                    10,
                    color,
                    color,
                    1,
                    1
                );

                displayPath(coordinates, color, 0.7, length);
                await sleep(delay);
            }
        }
    }

    /**
     *  MODE A*
     */
    if (use_astar) {
        let paths = getPathsAStar(graph, startingNode, precision, searchRadius);
        if (paths != null) {
            for (let path of paths) {
                const coordinates = path[1].path.map((nodeID) =>
                    nodes.get(nodeID)
                );
                const length = path[1].length;
                const node = nodes.get(parseInt(path[0]));
                const color = getRandomColor();

                // Affiche le point d'arrive de la route
                displayCircle([node[0], node[1]], 10, color, color, 1, 1);

                // Affiche la route
                displayPath(coordinates, color, 0.7, length);
                for (let coordinate of coordinates) {
                    displayCircle(coordinate, 3, color, color, 1, 1);
                }
                await sleep(delay);
            }
        }
    }

    /**
     *  MODE OSRM
     */
    if (use_OSRM) {
        let goalNodes = getGoalNodes(graph, searchRadius);
        let nb_request = 0;
        for (let nodeID of goalNodes) {
            if (nb_request >= MAX_REQUEST || nb_request >= MAX_PATHS) break;

            // Coordonees du point de depart et du point d'arrive
            const coordinates = [nodes.get(startingNode), nodes.get(nodeID)];
            const formattedCoordinates = coordinates.map(([a, b]) => [b, a]);

            // Récupérer les coordonnées de la route
            const routesData = await fetchRoute(formattedCoordinates);
            const routeCoordinates = routesData.geometry.coordinates;
            const routeLength = routesData.distance;

            // Inverser les coordonnées pour Leaflet (lat, lng)
            const formattedRouteCoordinates = routeCoordinates.map((coord) => [
                coord[1],
                coord[0],
            ]);

            let color = getRandomColor();

            // Affiche le point d'arrive de la route
            displayCircle(
                [nodes.get(nodeID)[0], nodes.get(nodeID)[1]],
                10,
                color,
                color,
                1,
                1
            );

            // Affiche la route
            displayPath(formattedRouteCoordinates, color, 1, routeLength);
            await sleep(delay);

            ++nb_request;
        }
    }
    console.timeEnd("Calcul itineraires");

    graph.clear();
}

// Fonction pour estimer le cout d'un node par rapport a un autre
// Pour l'instant simple calcul de distance
function heuristic(node1, node2) {
    // return measure(nodes.get(node2)[0], nodes.get(node2)[1], nodes.get(node1)[0], nodes.get(node1)[1]);
    return Math.sqrt(
        (nodes.get(node2)[0] - nodes.get(node1)[0]) ** 2 +
            (nodes.get(node2)[1] - nodes.get(node1)[1]) ** 2
    );
}

function aStar(graph, start, goal, heuristic) {
    // Queue de priorite pour les nodes a evaluer
    let openSet = new PriorityQueue();
    openSet.enqueue(start, 0);

    // Chemin le plus court pour chaque noeud
    let cameFrom = new Map();

    // Cout pour aller du node de depart a un autre node
    let gScore = new Map();
    gScore.set(start, 0);

    // Estimated total cost from start to goal through each node
    let fScore = new Map();
    fScore.set(start, heuristic(start, goal));

    // Nodes visites
    let closedSet = new Set();

    while (!openSet.isEmpty()) {
        let current = openSet.dequeue();

        // Si le node a deja ete visite
        if (closedSet.has(current)) {
            continue;
        }
        closedSet.add(current);

        // Si le goal est atteint, on recupere le chemin
        if (current === goal) {
            return reconstructPath(cameFrom, current);
        }

        // Evalue les voisins
        for (let neighbor in graph.get(current)) {
            neighbor = parseInt(neighbor);

            if (closedSet.has(neighbor)) {
                continue;
            }

            // gScore total du depart jusque au voisin de current
            let tentativeGScore =
                gScore.get(current) + graph.get(current)[neighbor];

            if (
                !gScore.has(neighbor) ||
                tentativeGScore < gScore.get(neighbor)
            ) {
                // Si le chemin est plus court (moins cher) que le precedent vers ce point

                // Change le chemin vers neighbor
                cameFrom.set(neighbor, current);

                // Change le gScore pour neighbor
                gScore.set(neighbor, tentativeGScore);

                // Change le fScore pour neighbor
                fScore.set(
                    neighbor,
                    gScore.get(neighbor) + heuristic(neighbor, goal)
                );

                // Ajoute neighbor a la queue de priorite avec son fscore comme valeure de prio
                openSet.enqueue(neighbor, fScore.get(neighbor));
            }
        }
    }

    return null;
}

// Queue de prio
class PriorityQueue {
    constructor() {
        this.elements = [];
    }

    enqueue(item, priority) {
        if (!this.has(item)) {
            this.elements.push({ item, priority });
            this.elements.sort((a, b) => a.priority - b.priority);
        }
    }

    dequeue() {
        return this.elements.shift().item;
    }

    isEmpty() {
        return this.elements.length === 0;
    }

    has(item) {
        return this.elements.some((element) => element.item === item);
    }
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
function makePaths(graph, start, length, size) {
    let alreadyVisited = [];
    let paths = [];
    for (let i = 0; i < size; ++i) {
        let current = start;
        let len = 0;
        let currPath = [start];

        // Iteration jusqu'a que la taille du chemin soint >= a length
        while (len < length) {
            alreadyVisited.push(current);
            currPath.push(current);

            // Ajoute un nouveau voisin au chemin
            for (let neighbor in graph.get(current)) {
                neighbor = parseInt(neighbor);
                if (!alreadyVisited.includes(neighbor)) {
                    len += graph.get(current)[neighbor];
                    current = neighbor;
                    break;
                }
            }

            // Si tous les voisins on ete visites, reset
            if (alreadyVisited[alreadyVisited.length - 1] == current) {
                for (let neighbor in graph.get(current)) {
                    neighbor = parseInt(neighbor);
                    const index = alreadyVisited.indexOf(neighbor);
                    if (index > -1) {
                        alreadyVisited.splice(index, 1);
                    }
                }
                const next = parseInt(Object.keys(graph.get(current))[0]);
                len += graph.get(current)[next];
                current = next;
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
function getPathLength(graph, path) {
    let len = 0;
    for (let i = 1; i < path.length - 1; ++i) {
        len += graph.get(path[i - 1])[path[i]];
    }
    return len;
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
    while (currentIndex != 0) {
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
