const MAX_REQUEST = 10;

// Initialisation de la map centree sur Besancon
const map = L.map("map").setView([47.2378, 6.0241], 17);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
}).addTo(map);

// Layer pour afficher les routes et les nodes
var customLayers = L.layerGroup().addTo(map);

let lat = 0;
let lng = 0;

let radius = document.getElementById("distance").value; // rayon du cercle de recherche
let MAX_PATHS = document.getElementById("nbChemins").value; // nombre de chemins a generer
let delay = document.getElementById("timer-slider").value; // delai entre l'affichage de deux routes (ms)

document.getElementById("distance").addEventListener("change", (e) => {
  radius = e.target.value;
});

document.getElementById("nbChemins").addEventListener("change", (e) => {
  MAX_PATHS = e.target.value;
});

const value = document.querySelector("#timer-label");
const input = document.querySelector("#timer-slider");
value.textContent = input.value + " ms";
input.addEventListener("input", (event) => {
  delay = event.target.value;
  value.textContent = event.target.value + " ms";
});

// Genere la requete pour recuperer tous les nodes et routes dans le cercle de recherche
map.on("click", function (e) {
  lat = e.latlng.lat;
  lng = e.latlng.lng;

  // Retire la layer pour afficher
  customLayers.clearLayers();

  // Requete qui recupere toutes les routes de type "secondary|tertiary|..." dans un rayon de "radius" autour du point selectione
  query =
    "data=" +
    encodeURIComponent(`
          [out:json][timeout:10];
          way(around:${radius},${lat},${lng})["highway"~"^(secondary|tertiary|unclassified|residential|living_street|service|pedestrian|track|bus_guideway|escape|raceway|road|busway|footway|bridleway|cycleway|path)$"];
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
        if (nodes.get(node1) !== undefined && nodes.get(node2) !== undefined) {
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

async function processData(data) {
  let use_astar = document.getElementById("aStar").checked;
  let use_boucle = document.getElementById("boucle").checked;
  let use_OSRM = document.getElementById("osrm").checked;
  let intersection_mode = document.getElementById("intersection").checked
    ? 2
    : 1;
  const nodeWayCounts = new Map();
  const graph = new Map();

  let goalNodes = [];

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

  // Pour le calcul du node le plus proche du click
  let minDistance = Infinity;
  let startingNode = null;

  // Recherche du node le plus proche du click et des nodes les plus proches du perimetre du cercle
  console.time("Recherche de nodes");
  for (let nodeID of Array.from(graph.keys())) {
    let node = nodes.get(nodeID);

    // Place tous les nodes proche du perimetre (-25m) dans une liste
    let distanceToCenter = measure(lat, lng, node[0], node[1]);
    let jsp = 25;

    if (distanceToCenter <= radius && distanceToCenter >= radius - jsp) {
      goalNodes.push(nodeID);
    }

    // Trouve le node le plus proche du click
    const latDiff = Math.abs(lat - node[0]);
    const lonDiff = Math.abs(lng - node[1]);
    if (latDiff + lonDiff < minDistance) {
      // Somme des différences
      minDistance = latDiff + lonDiff;
      startingNode = nodeID;
    }
  }
  shuffle(goalNodes);
  console.timeEnd("Recherche de nodes");

  // Affiche le cercle de recherche
  displayCircle(
    [nodes.get(startingNode)[0], nodes.get(startingNode)[1]],
    radius,
    "blue",
    "lightblue",
    1,
    0.2
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
    const paths = makePaths(graph, startingNode, radius, MAX_PATHS);
    for (let path of paths) {
      coordinates = path.path.map((nodeID) => nodes.get(nodeID));
      displayPath(coordinates, getRandomColor(), path.length);
      await sleep(delay);
    }
  }

  /**
   *  MODE A*
   */
  if (use_astar) {
    // Fonction pour estimer le cout d'un node par rapport a un autre
    // Pour l'instant simple calcul de distance
    function heuristic(node1, node2) {
      return Math.sqrt(
        (nodes.get(node2)[0] - nodes.get(node1)[0]) ** 2 +
          (nodes.get(node2)[1] - nodes.get(node1)[1]) ** 2
      );
    }

    let nb_chemins = 0;
    for (let nodeID of goalNodes) {
      if (nb_chemins >= MAX_PATHS) break;

      let node = nodes.get(nodeID);

      if (nb_chemins > MAX_PATHS) break;

      let path = aStar(graph, startingNode, nodeID, heuristic);

      if (path) {
        let coordinates = path.map((id) => nodes.get(id));
        let color = getRandomColor();

        // Affiche le point d'arrive de la route
        displayCircle([node[0], node[1]], 10, color, color, 1, 1);

        // Affiche la route
        displayPath(coordinates, color, getPathLength(graph, path));
        await sleep(delay);

        ++nb_chemins;
      }
    }
  }

  /**
   *  MODE OSRM
   */
  if (use_OSRM) {
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
      displayPath(formattedRouteCoordinates, color, routeLength);
      await sleep(delay);

      ++nb_request;
    }
  }
  console.timeEnd("Calcul itineraires");

  graph.clear();
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
      let tentativeGScore = gScore.get(current) + graph.get(current)[neighbor];

      if (!gScore.has(neighbor) || tentativeGScore < gScore.get(neighbor)) {
        // Si le chemin est plus court (moins cher) que le precedent vers ce point

        // Change le chemin vers neighbor
        cameFrom.set(neighbor, current);

        // Change le gScore pour neighbor
        gScore.set(neighbor, tentativeGScore);

        // Change le fScore pour neighbor
        fScore.set(neighbor, gScore.get(neighbor) + heuristic(neighbor, goal));

        // Ajoute neighbor a la queue de priorite avec son fscore comme valeure de prio
        openSet.enqueue(neighbor, fScore.get(neighbor));
      }
    }
  }

  return null;
}

// Improved Priority Queue implementation
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
function displayPath(coordinates, color, length) {
  const polyline = L.polyline(coordinates, {
    color: color,
    weight: 5,
    opacity: 1,
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
  L.circle(coordinate, {
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
// TODO contrainte de direction
