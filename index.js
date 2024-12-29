// Initialisation de la map centree sur Besancon
const map = L.map('map').setView([47.2378, 6.0241], 17);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
}).addTo(map);

// Layer pour afficher les routes et les noeuds
var customLayers = L.layerGroup().addTo(map);

let lat = 0;
let lng = 0;

// Affiche toutes les routes dans un carre autour du click
map.on('click', function (e) {
    lat = e.latlng.lat;
    lng = e.latlng.lng;

    // Rayon du cercle dans lequel on recupere toutes les routes
    const widthKm = document.getElementById('distance').value;

    // Retire la layer pour afficher
    customLayers.clearLayers();

    // Requete qui recupere toutes les routes de type "secondary|tertiary|..." dans un rayon de "widthKm" autour du point selectione
    'data=' +
        encodeURIComponent(`
          [out:json][timeout:1];
          way(around:${widthKm},${lat},${lng})["highway"~"^(secondary|tertiary|unclassified|residential|living_street|service|pedestrian|track|bus_guideway|escape|raceway|road|busway|footway|bridleway|cycleway|path)$"];
          (._;>;);
          out body;
        `);

    fetchData(query);
});

async function fetchData(query) {
    try {
        const result = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: query,
        });

        const data = await result.json();
        processData(data);
    } catch (err) {
        console.error('Error: ', err);
    }
}

// Affiche toutes les routes dans data
function processData(data) {
    const nodes = new Map();
    const nodeWayCounts = new Map();

    // Bool pour afficher ou non certains elements
    const displayWays = document.getElementById('chemins').checked;
    const displayInter = document.getElementById('intersections').checked;
    const displayNode = document.getElementById('noeuds').checked;

    // Pour le calcul du noeud le plus proche du click
    let minLat = null;
    let minLon = null;
    let minDistance = Infinity;

    data.elements.forEach((element) => {
        if (element.type === 'node') {
            // Trouve le noeud le plus proche du click
            const latDiff = Math.abs(lat - element.lat);
            const lonDiff = Math.abs(lng - element.lon);
            if (latDiff + lonDiff < minDistance) {
                // Somme des différences
                minDistance = latDiff + lonDiff;
                minLat = element.lat;
                minLon = element.lon;
            }

            // Ajoute le noeud dans la map de noeuds
            nodes.set(element.id, [element.lat, element.lon]);
            nodeWayCounts.set(element.id, 0);
        }
    });

    // Affiche le noeud le plus proche du click
    L.circleMarker([minLat, minLon], {
        radius: 10,
        fillColor: 'blue',
        color: 'blue',
        weight: 1,
        opacity: 1,
        fillOpacity: 1,
    }).addTo(customLayers);

    // Fait une map de noeud vers le nombre de noeuds lies a lui (pour afficher les intersections)
    data.elements.forEach((element) => {
        if (element.type === 'way') {
            element.nodes.forEach((nodeId) => {
                const currentCount = nodeWayCounts.get(nodeId) || 0;
                nodeWayCounts.set(nodeId, currentCount + 1);
            });
        }
    });

    console.log(nodes);

    // Affiche les routes
    if (displayWays) {
        data.elements.forEach((element) => {
            if (element.type === 'way') {
                // Coordonees de tous les noeuds de la route
                const coordinates = element.nodes
                    .map((nodeId) => nodes.get(nodeId))
                    .filter((coord) => coord !== undefined);

                // Affiche une ligne par route
                if (coordinates.length > 0) {
                    L.polyline(coordinates, {
                        color: 'red',
                        weight: 5,
                        opacity: 0.5,
                    }).addTo(customLayers);
                }
            }
        });
    }

    // Affiche les noeuds
    nodeWayCounts.forEach((count, nodeId) => {
        const node = nodes.get(nodeId);

        // Intersections (3 ou plus connections)
        if (count >= 3) {
            if (node && displayInter) {
                L.circleMarker([node[0], node[1]], {
                    radius: 5,
                    fillColor: 'blue',
                    color: 'blue',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 1,
                }).addTo(customLayers);
            }
        } else if (displayNode) {
            L.circleMarker([node[0], node[1]], {
                radius: 3,
                fillColor: 'blue',
                color: 'blue',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.2,
            }).addTo(customLayers);
        }
    });
}
