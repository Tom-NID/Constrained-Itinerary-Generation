// import Graph from "../server/models/Graph.js";
// import Node from "../server/models/Node.js";
// // import Node from "./models/Node.js";

document.addEventListener("DOMContentLoaded", () => {
  let sock = io.connect();

  // Update value displays for range inputs
  const rangeInputs = ["length", "paths", "delay"];
  rangeInputs.forEach((id) => {
    const input = document.getElementById(id);
    const display = document.getElementById(`${id}Value`);
    display.textContent = input.value;

    input.addEventListener("input", () => {
      display.textContent = input.value;
    });
  });

  // Method selection
  const methodBtns = document.querySelectorAll(".method-btn");
  methodBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      methodBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // Simplification mode selection
  const simplificationBtns = document.querySelectorAll(".simplification-btn");
  simplificationBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      simplificationBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // Initialisation de la map centree sur Besancon
  const map = L.map("map").setView([47.2378, 6.0241], 10);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
  }).addTo(map);

  // Ajouter une échelle
  L.control
    .scale({
      position: "bottomright",
    })
    .addTo(map);

  // Layer pour afficher les routes et les nodes
  var customLayers = L.layerGroup().addTo(map);

  // let lat = 48.8575;
  // let lng = 2.3514;
  let lat = 0;
  let lng = 0;

  // Genere la requete pour recuperer tous les nodes et routes dans le cercle de recherche
  map.on("click", function (e) {
    lat = e.latlng.lat;
    lng = e.latlng.lng;

    displayCircle([lat, lng], 25, "green", "green", 1, 0.1);

    const radius = parseInt(document.getElementById("length").value);
    const maxPaths = parseInt(document.getElementById("paths").value);
    const simplification = document.querySelector(".simplification-btn.active")
      .dataset.mode;
    const method = document.querySelector(".method-btn.active").dataset.method;
    console.log(radius, maxPaths, simplification, method);
  });

  // Generate button click handler
  document.getElementById("generate").addEventListener("click", () => {
    if (lat == 0 && lng == 0) {
      console.error("Please click on the map to select a starting oppoint");
      return;
    }

    const radius = parseInt(document.getElementById("length").value);
    const maxPaths = parseInt(document.getElementById("paths").value);
    const simplification = document.querySelector(".simplification-btn.active")
      .dataset.mode;
    const method = document.querySelector(".method-btn.active").dataset.method;
    const terrain = Array.from(
      document.querySelectorAll(".terrain-checkbox:checked")
    ).map((checkbox) => checkbox.value);
    console.log(radius, maxPaths, simplification, method);

    sock.emit("request", {
      startingPoint: { lat: lat, lng: lng },
      radius: radius,
      maxPaths: maxPaths,
      precision: 1,
      simplificationMode: simplification,
      method: method,
      terrain: terrain,
    });
  });

  sock.on("result", (res) => {
    console.log(res);
    const method = document.querySelector(".method-btn.active").dataset.method;
    const radius = parseInt(document.getElementById("length").value);

    let startingNode = res.startingNode;
    startingNode = [startingNode.lat, startingNode.lon];

    let paths = res.paths;
    let i = 0;
    for (let path of paths) {
      ++i;
      let endingNode = path.endingNode;
      endingNode = [endingNode.lat, endingNode.lon];
      let length = path.length;

      path = path.path;
      path = path.map((coo) => [coo.lat, coo.lon]);
      let color = getRandomColor();

      // displayCircle(startingNode, radius, color, color, 1, 1);
      let polyline = displayPath(path, color, 1, length);
      let endPoint = displayCircle(endingNode, 10, color, color, 1, 1);

      // console.log(path, endingNode, length);
      addItem(
        `${method}`,
        `${Math.floor(length * 100) / 100}m`,
        color,
        polyline,
        endPoint
      );
    }

    displayCircle(startingNode, 10, "blue", "blue", 0.2, 0.2);
    displayCircle(startingNode, radius, "blue", "blue", 1, 0);
  });

  sock.on("graph", (graph) => {
    // console.log(coordinates);
    // console.log(graph);
    // for (let coo of graph.nodes) {
    //   displayCircle(coo, 3, graph.color, graph.color, 1, 0.3);
    // }
    for (let coo of graph.edges) {
      displayPath(coo, graph.color, 0.3, -1);
    }
  });

  sock.on("correspondanceMap", (correspondanceMap) => {
    console.log(correspondanceMap);
  });

  /**
   * Affiche le chemin entre differentes coordonees sur la carte
   * @param {*} coordinates Les coordonees constituant le chemin
   * @param {*} color La couleur du chemin
   */
  function displayPath(coordinates, color, opacity, length) {
    const polyline = L.polyline(coordinates, {
      color: color,
      weight: 3,
      opacity: opacity,
    }).addTo(customLayers);

    if (length >= 0) {
      polyline.bindPopup(`${Math.floor(length)}m`);
      polyline.openPopup();
    }
    return polyline;
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

  // Side panel
  document.querySelector(".toggle-btn").addEventListener("click", () => {
    const panel = document.getElementById("sidePanel");
    const map = document.getElementById("map");
    panel.classList.toggle("collapsed");
    map.classList.toggle("collapsed");
  });

  document.querySelector(".clear-btn").addEventListener("click", () => {
    clearAll();
  });

  function createItemElement(title, description, color, polyline, endPoint) {
    const itemDiv = document.createElement("div");
    itemDiv.className = "panel-row";

    itemDiv.innerHTML = `
      <div class="info-section">
          <div class="color-indicator" style="background-color: ${color}"></div>
          <div>
              <div class="title">${title}</div>
              <div class="description">${description}</div>
          </div>
      </div>
      <div class="action-section">
          <button class="action-btn show-btn">Show</button>
          <button class="action-btn delete-btn">Delete</button>
      </div>
    `;

    // Attach event listeners
    const showButton = itemDiv.querySelector(".show-btn");
    const deleteButton = itemDiv.querySelector(".delete-btn");

    showButton.addEventListener("click", function () {
      showItem(itemDiv); // Pass the whole `itemDiv` or another element as needed
    });

    deleteButton.addEventListener("click", function () {
      deleteItem(itemDiv); // Pass the whole `itemDiv` or another element as needed
      customLayers.removeLayer(polyline);
      customLayers.removeLayer(endPoint);
    });

    return itemDiv;
  }

  // Add new item
  function addItem(title, description, color, polyline, endPoint) {
    const itemsList = document.getElementById("itemsList");
    const newItem = createItemElement(
      title,
      description,
      color,
      polyline,
      endPoint
    );

    newItem.addEventListener("mouseover", () => {
      polyline.openPopup();
      polyline.setStyle({
        weight: 8,
      });
      polyline.bringToFront();
    });

    newItem.addEventListener("mouseout", () => {
      // polyline.closePopup();
      polyline.setStyle({
        weight: 5,
      });
    });

    itemsList.appendChild(newItem);
  }

  // Delete item
  function deleteItem(button) {
    const row = button.closest(".panel-row");
    row.remove();
  }

  // Show item
  function showItem(button) {}

  // Clear all items
  function clearAll() {
    const itemsList = document.getElementById("itemsList");
    itemsList.innerHTML = "";
    customLayers.clearLayers();
  }
});
