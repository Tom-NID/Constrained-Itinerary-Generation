import Node from "./Node.js";
import Cost from "./Cost.js";
import PriorityQueue from "../utils/PriorityQueue.js";

export default class Graph {
  #nodes;

  constructor() {
    this.#nodes = new Map();
  }

  // Ajoute un nouveau node dans le graph
  addNode(nodeId, lat, lon) {
    if (!this.#nodes.has(nodeId)) {
      this.#nodes.set(nodeId, new Node(lat, lon));
    }
  }

  removeNode(nodeId) {
    this.#nodes.delete(nodeId);
  }

  hasNode(nodeId) {
    return this.#nodes.has(nodeId);
  }

  getNodeCoordinates(nodeId) {
    return this.#nodes.get(nodeId).getCoordinates();
  }

  getAllNodesCoordinates() {
    let coordinates = [];
    for (const node of this.#nodes.values()) {
      coordinates.push(node.getCoordinatesList());
    }
    return coordinates;
  }

  getAllEdgesCoordinates() {
    let coordinates = [];
    for (const node of this.#nodes.values()) {
      for (const neighborId of node.getNeighbors()) {
        coordinates.push([
          node.getCoordinatesList(),
          this.#nodes.get(neighborId).getCoordinatesList(),
        ]);
      }
    }
    return coordinates;
  }

  getNodes() {
    return this.#nodes.keys();
  }

  countNodes() {
    return this.#nodes.size;
  }

  addEdge(nodeId1, nodeId2, surfaceType = "hard") {
    if (this.hasNode(nodeId1) && this.hasNode(nodeId2)) {
      let euclideanDistance = this.getEuclideanDistance(nodeId1, nodeId2);
      let haversineDistance = this.getHaversineDistance(nodeId1, nodeId2);
      let cost = new Cost(euclideanDistance, haversineDistance, surfaceType);
      this.#nodes.get(nodeId1).addEdge(nodeId2, cost);
    }
  }

  getEuclideanCost(nodeId1, nodeId2) {
    const node1 = this.#nodes.get(nodeId1);
    return node1.getCost(nodeId2).getEuclideanDistance();
  }

  getHaversineCost(nodeId1, nodeId2) {
    const node1 = this.#nodes.get(nodeId1);
    return node1.getCost(nodeId2).getHaversineDistance();
  }

  getSurfaceType(nodeId1, nodeId2) {
    const node1 = this.#nodes.get(nodeId1);
    return node1.getCost(nodeId2).getSurfaceType();
  }

  setEuclideanCost(nodeId1, nodeId2, euclideanCost) {
    const node1 = this.#nodes.get(nodeId1);
    const cost = node1.getCost(nodeId2);
    cost.setEuclideanDistance(euclideanCost);
  }

  setHaversineCost(nodeId1, nodeId2, haversineCost) {
    const node1 = this.#nodes.get(nodeId1);
    const cost = node1.getCost(nodeId2);
    cost.setHaversineDistance(haversineCost);
  }

  countEdges() {
    let nb = 0;
    for (const node of this.#nodes.values()) {
      nb += node.countEdges();
    }
    return nb;
  }

  clear() {
    this.#nodes.clear();
  }

  clone() {
    const copy = new Graph();
    for (let [nodeId, node] of this.#nodes) {
      copy.#nodes.set(nodeId, node.clone());
    }
    return copy;
  }
  //   getCoordinates(nodeId) {
  //     if (this.hasNode(nodeId)) {
  //       const node = this.#nodes.get(nodeId);
  //       return [node.getLat(), node.getLon()];
  //     }
  //     return null;
  //   }

  getClosestNode(lat, lon) {
    let minDistance = Infinity;
    let closestNode = -1;

    // Recherche du node le plus proche du click et des nodes les plus proches du perimetre du cercle
    for (const [nodeId, node] of this.#nodes) {
      const nodeCoo = node.getCoordinates();
      const latDiff = Math.abs(lat - nodeCoo.lat);
      const lonDiff = Math.abs(lon - nodeCoo.lon);
      if (latDiff + lonDiff < minDistance) {
        minDistance = latDiff + lonDiff;
        closestNode = nodeId;
      }
    }
    return closestNode;
  }

  getClosestNodeById(otherId) {
    let minDistance = Infinity;
    let closestNode = -1;
    let coordinates = this.getNodeCoordinates(otherId);
    let lat = coordinates.lat;
    let lon = coordinates.lon;

    // Recherche du node le plus proche du click et des nodes les plus proches du perimetre du cercle
    for (const [nodeId, node] of this.#nodes) {
      if (nodeId != otherId) {
        const nodeCoo = node.getCoordinates();
        const latDiff = Math.abs(lat - nodeCoo.lat);
        const lonDiff = Math.abs(lon - nodeCoo.lon);
        if (latDiff + lonDiff < minDistance) {
          minDistance = latDiff + lonDiff;
          closestNode = nodeId;
        }
      }
    }
    return closestNode;
  }

  getNeighbors(nodeId) {
    return this.#nodes.get(nodeId).getNeighbors();
  }

  getEuclideanDistance(nodeId1, nodeId2) {
    const coordNode1 = this.#nodes.get(nodeId1).getCoordinates();
    const coordNode2 = this.#nodes.get(nodeId2).getCoordinates();

    return Math.sqrt(
      Math.pow(coordNode1.lat - coordNode2.lat, 2) +
        Math.pow(coordNode1.lon - coordNode2.lon, 2)
    );
  }

  getHaversineDistance(nodeId1, nodeId2, coord = {}) {
    const coordNode1 =
      nodeId1 == -1 ? coord : this.#nodes.get(nodeId1).getCoordinates();
    const coordNode2 = this.#nodes.get(nodeId2).getCoordinates();
    const R = 6378.137; // Radius of earth in KM
    var dLat =
      (coordNode2.lat * Math.PI) / 180 - (coordNode1.lat * Math.PI) / 180;
    var dLon =
      (coordNode2.lon * Math.PI) / 180 - (coordNode1.lon * Math.PI) / 180;
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((coordNode1.lat * Math.PI) / 180) *
        Math.cos((coordNode2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d * 1000; // meters
  }

  // simplifyGraph(distanceLimit) {
  //   let nodesToMerge = new Map();
  //   for (const [nodeId, node] of this.#nodes) {
  //     let closestNodeId = this.getClosestNodeById(nodeId);
  //     const distance = this.getHaversineDistance(nodeId, closestNodeId);
  //     if (distance < distanceLimit && !nodesToMerge.has(nodeId)) {
  //       nodesToMerge.set(nodeId, closestNodeId);
  //     }
  //   }
  //   for (const [toRemove, closest] of nodesToMerge) {
  //     let neighbors = this.getNeighbors(toRemove);
  //     for (const neighborId of neighbors) {
  //       if (!nodesToMerge.has(neighborId)) {
  //         let cost = new Cost(
  //           this.getEuclideanCost(toRemove, closest) +
  //             this.getEuclideanCost(toRemove, neighborId),
  //           this.getHaversineCost(toRemove, closest) +
  //             this.getHaversineCost(toRemove, neighborId),
  //           "hard"
  //         );

  //         this.addEdge(closest, neighborId, cost);
  //       }
  //     }
  //     for (const [nodeId, node] of this.#nodes) {
  //       node.removeEdge(toRemove);
  //     }
  //     this.removeNode(toRemove);
  //   }
  // }

  simplifyGraph(distanceLimit) {
    let nodesToRemove = [];
    let nodesToMerge = [];
    for (const [nodeId, node] of this.#nodes) {
      let closestNodeId = this.getClosestNodeById(nodeId);
      const distance = this.getHaversineDistance(nodeId, closestNodeId);
      if (distance < distanceLimit && !nodesToRemove.includes(closestNodeId)) {
        nodesToMerge.push([nodeId, closestNodeId]);
        nodesToRemove.push(nodeId);
      }
    }
    for (const nodeIds of nodesToMerge) {
      let toRemove = nodeIds[0];
      let closest = nodeIds[1];
      let neighbors = this.getNeighbors(toRemove);
      for (const neighborId of neighbors) {
        if (!nodesToRemove.includes(neighborId)) {
          this.addEdge(closest, neighborId);
          this.addEdge(neighborId, closest);
        }
      }
      for (const [nodeId, node] of this.#nodes) {
        node.removeEdge(toRemove);
      }
      this.removeNode(toRemove);
    }
  }

  // simplifyGraph(distanceLimit) {
  //   let nodesToMerge = new Map();
  //   for (const [nodeId, node] of this.#nodes) {
  //     let closestNodeId = this.getClosestNodeById(nodeId);
  //     const distance = this.getHaversineDistance(nodeId, closestNodeId);
  //     if (distance < distanceLimit && !nodesToMerge.values().includes(nodeId)) {
  //       nodesToMerge.set(nodeId, closestNodeId);
  //     }
  //   }

  //   for (const [toRemove, closest] of nodesToMerge) {
  //     let neighbors = this.getNeighbors(toRemove);
  //     for (const neighborId of neighbors) {
  //       if (!nodesToMerge.has(neighborId)) {
  //         let cost = new Cost(
  //           this.getEuclideanCost(toRemove, closest) +
  //             this.getEuclideanCost(toRemove, neighborId),
  //           this.getHaversineCost(toRemove, closest) +
  //             this.getHaversineCost(closest, neighborId), // Corrected line
  //           "hard"
  //         );

  //         this.addEdge(closest, neighborId, cost);
  //       }
  //     }

  //     // Remove the node and then its edges
  //     this.removeNode(toRemove);
  //     for (const [nodeId, node] of this.#nodes) {
  //       node.removeEdge(toRemove);
  //     }
  //   }
  // }

  /**
   * Revoie tous les points autour du perimetre d'un cercle (+-1% du rayon)
   * @param {*} radius Rayon du cercle
   * @returns
   */
  getGoalNodes(startingNodeId, radius) {
    let goalNodes = [];
    let inaccuracy = radius / 100; // 1% d'imprecision
    inaccuracy = Math.max(inaccuracy, 25); // Accuracy minimum

    while (goalNodes.length == 0) {
      for (const [nodeId, node] of this.#nodes) {
        let distanceToCenter = this.getHaversineDistance(
          startingNodeId,
          nodeId
        );

        if (
          distanceToCenter <= radius + inaccuracy &&
          distanceToCenter >= radius - inaccuracy
        ) {
          goalNodes.push(nodeId);
        }
      }
      inaccuracy *= 2;
    }
    return goalNodes;
  }

  reconstructPath(cameFrom, current) {
    let totalPath = [current];
    while (cameFrom.has(current)) {
      current = cameFrom.get(current);
      totalPath.unshift(current);
    }
    return totalPath;
  }

  aStar(start, goal, terrain) {
    // Queue de priorite pour les nodes a evaluer
    let openSet = new PriorityQueue();
    openSet.enqueue(start, 0);

    // Chemin le plus court pour chaque noeud
    let cameFrom = new Map();

    // Cout pour aller du node de depart a un autre node
    let gScore = new Map();
    gScore.set(start, 0);

    // Cout total du entre deux nodes
    let fScore = new Map();
    fScore.set(start, this.getHaversineDistance(start, goal));

    // Nodes visites
    let closedSet = new Set();

    while (!openSet.isEmpty()) {
      let currentId = openSet.dequeue();

      // Si le node a deja ete visite
      if (closedSet.has(currentId)) {
        continue;
      }
      closedSet.add(currentId);

      // Si le goal est atteint, on recupere le chemin
      if (currentId === goal) {
        return this.reconstructPath(cameFrom, currentId);
      }

      // Evalue les voisins
      for (let neighborId of this.getNeighbors(currentId)) {
        neighborId = parseInt(neighborId);

        if (closedSet.has(neighborId)) {
          continue;
        }

        // gScore total du depart jusque au voisin de currentId
        // let surfacePenalty =
        //   terrain.length > 0 &&
        //   terrain.includes(this.getSurfaceType(currentId, neighborId))
        //     ? 1
        //     : 1000;
        let surfacePenalty = 1;
        let tentativeGScore =
          gScore.get(currentId) +
          this.getHaversineCost(currentId, neighborId) * surfacePenalty;

        if (
          !gScore.has(neighborId) ||
          tentativeGScore < gScore.get(neighborId)
        ) {
          // Si le chemin est plus court (moins cher) que le precedent vers ce point

          // Change le chemin vers le voisin
          cameFrom.set(neighborId, currentId);

          // Change le gScore pour le voisin
          gScore.set(neighborId, tentativeGScore);

          // Change le fScore pour le voisin
          fScore.set(
            neighborId,
            gScore.get(neighborId) + this.getHaversineDistance(neighborId, goal)
          );

          // Ajoute le voisin a la queue de priorite avec son fscore comme valeure de prio
          openSet.enqueue(neighborId, fScore.get(neighborId));
        }
      }
    }
    return null;
  }

  /**
   *
   * @param {*} path Chemin dont la longueur est evaluee (list d'id de nodes)
   * @returns La longueur du chemin
   */
  getPathLength(path) {
    let len = 0;
    for (let i = 1; i < path.length; ++i) {
      len += this.getHaversineCost(path[i - 1], path[i]);
    }
    return len;
  }

  /**
   * Cherche des chemins avec une longueur le plus proche possible du rayon en fonction d'une valeur de precision
   * @param {*} startingNode Node de depart
   * @param {*} precision Valeure qui influe le nombre d'iterations et le nombre de chemins a prendre en compte
   * @returns Une liste de chemins, triee en fonction de leur longueur par rapport au rayon
   */
  getPathsAStar(startingNodeId, precision, searchRadius, maxPaths, terrain) {
    let radius = searchRadius;
    let paths = {};
    let ratio = 0;

    for (let i = 0; i < precision * 5; ++i) {
      console.log(i + 1, "/", precision * 5);
      let goalNodes = this.getGoalNodes(startingNodeId, searchRadius);
      // shuffle(goalNodes); // Melange pour obtenir des nodes aleatoires

      let totalPathsLength = 0;
      let totalLength = 0;

      const nbCheckedNodes = Math.max(maxPaths, 10) * precision;

      for (let nodeId of goalNodes.slice(0, nbCheckedNodes)) {
        let path = this.aStar(startingNodeId, nodeId, terrain);
        if (path) {
          let length = this.getPathLength(path);

          // Reduit le path pour ne concerver que les nodes necessaires a une distance proche du radius
          let currLength = 0;
          for (let j = 1; j < path.length - 1; ++j) {
            let sectionDistance = this.getHaversineCost(path[j - 1], path[j]);
            currLength += sectionDistance;
            if (currLength >= radius) {
              let index =
                Math.abs(radius - currLength) <
                Math.abs(radius - currLength - sectionDistance)
                  ? j
                  : j - 1; // Minimise la difference entre currLength et radius
              nodeId = path[index];
              path = path.slice(0, index + 1);
              break;
            }
          }
          if (!paths[nodeId]) {
            // let pathSurface = [];
            // for (let k = 1; k < path.length; ++k) {
            //   pathSurface.push(this.getSurfaceType(path[k - 1], path[k]));
            // }
            // path = path.map((nodeId) =>
            //   this.#nodes.get(nodeId).getCoordinates()
            // );
            paths[nodeId] = {
              path: path,
              // pathSurface: pathSurface,
              length: currLength,
            };
          }

          totalPathsLength += length;
          totalLength += radius;
        }
      }

      // Recalcul du rayon en fonction du resultat
      if (totalLength !== 0) {
        ratio = 1 + (totalPathsLength - totalLength) / totalLength;
        searchRadius /= ratio;
      }
    }

    // Trie des chemins en fonction de leur longueur par rapport au rayon
    const entries = Object.entries(paths);
    const sortedEntries = entries.sort(
      (a, b) => Math.abs(a[1].length - radius) - Math.abs(b[1].length - radius)
    );

    return sortedEntries.slice(0, maxPaths);
  }

  /**
   * Trouve un circuit (chemin qui part et arrive du meme point en limitant les croisements) d'une longueur de 2 * searchRadius.
   * Le circuit est trouve utilisant A* deux fois pour aller au meme point, en modifiant le graph entre les deux utilisations de A* afin qu'il ne reutilise pas le meme chemin.
   * @param {*} startingNode Le point de depart et d'arrive du circuit
   * @param {*} precision Facteur pour le nombre d'iterations
   * @param {*} searchRadius Le rayon de recherhe qui correspond a la taille d'un chemin (alle ou retour) de la boucle, la boucle doit donc faire une longueur de 2 * searchRadius
   * @returns
   */
  getCircuitAStar(startingNodeId, precision, searchRadius, maxPaths, terrain) {
    let radius = searchRadius * 2;
    let paths = {};
    let ratio = 0;

    for (let i = 0; i < precision * 5; ++i) {
      console.log(i + 1, "/", precision * 5);
      let inaccuracy = searchRadius / 100;
      inaccuracy = inaccuracy < 25 ? 25 : inaccuracy;

      let goalNodes = this.getGoalNodes(startingNodeId, searchRadius);
      // shuffle(goalNodes); // Melange pour obtenir des nodes aleatoires

      let totalPathsLength = 0;
      let totalLength = 0;

      const nbCheckedNodes = Math.max(maxPaths, 10) * precision;

      for (let nodeId of goalNodes.slice(0, nbCheckedNodes)) {
        let path = this.aStar(startingNodeId, nodeId, terrain);

        if (path) {
          // Reduit le path pour ne concerver que les nodes necessaires a une distance proche du searchRadius
          let currLength = 0;
          for (let j = 1; j < path.length - 1; ++j) {
            let sectionDistance = this.getHaversineCost(path[j - 1], path[j]);
            currLength += sectionDistance;
            if (currLength >= searchRadius) {
              let index =
                Math.abs(searchRadius - currLength) <
                Math.abs(searchRadius - currLength - sectionDistance)
                  ? j
                  : j - 1; // Minimise la difference entre currLength et radius
              nodeId = path[index];
              path = path.slice(0, index + 1);
              break;
            }
          }

          // Augmente le cout des arretes deja utilises pour ne les utiliser qu'en dernier recourt pour la deuxieme generation de chemin
          // const tempGraph = this.clone();
          for (let i = 1; i < path.length; ++i) {
            this.setHaversineCost(
              path[i - 1],
              path[i],
              this.getHaversineCost(path[i - 1], path[i]) * 10
            );
          }

          // Chemin du retour
          const returnPath = this.aStar(startingNodeId, nodeId, terrain);

          for (let i = 1; i < path.length; ++i) {
            this.setHaversineCost(
              path[i - 1],
              path[i],
              this.getHaversineDistance(path[i - 1], path[i])
            );
          }

          returnPath.reverse();
          for (let id of returnPath.slice(1)) {
            path.push(id); // Ajoute les points au chemin
          }

          // Taille totale du chemin
          let length = this.getPathLength(path);

          if (!paths[nodeId]) {
            // let pathSurface = [];
            // for (let k = 1; k < path.length; ++k) {
            //   pathSurface.push(this.getSurfaceType(path[k - 1], path[k]));
            // }
            // path = path.map((nodeId) =>
            //   this.#nodes.get(nodeId).getCoordinates()
            // );
            paths[nodeId] = {
              path: path,
              // pathSurface: pathSurface,
              length: currLength,
            };
          }

          totalPathsLength += length;
          totalLength += radius;
        }
      }

      // Recalcul du rayon en fonction du resultat
      ratio = 1 + (totalPathsLength - totalLength) / totalLength;
      searchRadius /= ratio;
    }

    // Trie des chemins en fonction de leur longueur par rapport au rayon
    const entries = Object.entries(paths);
    const sortedEntries = entries.sort(
      (a, b) => Math.abs(a[1].length - radius) - Math.abs(b[1].length - radius)
    );

    return sortedEntries.slice(0, maxPaths);
  }
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
