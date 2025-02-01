document.addEventListener("DOMContentLoaded", () => {
  let sock = io.connect();
  let selectedIndex;
  let lat;
  let lng;
  let timeout = null; 
  let suggestionsList;
  let currSlide = document.querySelector(`.${document.querySelector("input[type='radio']:checked").value}`);
  let allPaths = [];
  
  const map = L.map('map').setView([51.505, -0.09], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  L.control.zoom({ position: 'topright' }).addTo(map);
  
  updatePathsViewer();
  initSlide();
  
  map.on("click", (e) => {
    let lat = e.latlng.lat;
    let lng = e.latlng.lng;
    
    let popupContent = `<button id="confirmBtn">Set as start point</button>`;
    
    L.popup()
    .setLatLng([lat, lng])
    .setContent(popupContent)
    .openOn(map);
    
    setTimeout(() => {
      document.getElementById("confirmBtn").addEventListener("click", () => {
        showMain("generate");
        map.closePopup(); 
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
        .then(res => res.json())
        .then(res => {
          drawLocation(res);
        })
        .catch(error => console.error("Error fetching locations:", error));
      });
    }, 100);
  });

  document.getElementById("listOfSelectedPathsBack").addEventListener("click", () => {
    showMain("paths");
    updatePathsViewer();
  });

  document.getElementById("showAllSelectedPaths").addEventListener("click", () => {
    showMain("listOfSelectedPaths");

  });
  
  document.getElementById("locationInput").addEventListener("input", (event) => {
    clearTimeout(timeout);
    let query = event.target.value.trim();
    
    if (query.length < 3) return;
    
    timeout = setTimeout(() => {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => {
        suggestionsList = data;
        
        listAllLocationPossibilities(data);
        selectedIndex = 0;
      })
      .catch(error => console.error("Error fetching locations:", error));
    }, 500);
  });
  
  document.getElementById("locationInput").addEventListener("keydown", (event) => {
    if (!suggestionsList) return;
    let items = document.querySelectorAll("#suggestions li");
    if (!items.length) return;

    const actions = {
      ArrowDown: () => {selectedIndex = (selectedIndex + 1) % items.length},
      ArrowUp: () => {selectedIndex = (selectedIndex - 1 + items.length) % items.length},
      Enter: () => {selectedIndex >= 0 && items[selectedIndex] && drawLocation(suggestionsList[selectedIndex])},
    };

    if (actions[event.key]) {
      event.preventDefault();
      actions[event.key]();
      updateSelection(items);
    }
  });
  
  document.getElementById("generatePaths").addEventListener("click", () => {
    if (!lat || !lng) {
      console.log("Error : No Latitude or Longitude");
      return; 
    }
    const radius = parseInt(document.getElementById("distance").value * 1000);
    const maxPaths = parseInt(document.getElementById("nbPaths").value / 10);
    const method = document.querySelector(".methodContainer input:checked").value;
    const terrain = ["hard", "semi-hard"];
    sock.emit("request", {
      startingPoint : {lat : lat, lng : lng},
      radius : radius,
      maxPaths : maxPaths,
      method: method, 
      terrain: terrain,
      precision: 1,
      simplification: "intersection",
    }); 
  });
  
  sock.on("result", (res) => {
    drawSelectedPaths(res); 
    let pathsGroup = { //TODO
      request: {
        lenght: 20,
        elevationUp: 500,
        elevationDown: 500,
        wayType: {
          "hard": 50,
          "semi-hard": 25,
          "semi-soft": 10,
          "soft": 15,
        },
        name: "Radd, Laupin, Vielank, Dömitz-Malliß, Ludwigslust-Parchim, Mecklenburg-Vorpommern, 19303, Germany",
      },
      response : res,
    }
    allPaths.push(pathsGroup);
  });
  
  function showMain(str) {
    let listOfItems = ["generate", "paths", "listOfSelectedPaths"];
    if (!str || !listOfItems.includes(str)) return;
    listOfItems.forEach(item => {
      document.querySelector(`.${item}`).style.display = (str === item) ? "block" : "none";
    });
  }
  
  function clearLayers() {
    map.eachLayer(function(layer) {
      if (!layer.hasOwnProperty('_url')) {
        map.removeLayer(layer);
      }
    });
  }
  
  function initSlide() {
    document.querySelectorAll("input[type='radio']").forEach(input => {
      input.addEventListener('change', () => {
        showMain("generate");
        currSlide.style.display = 'none';
        currSlide = document.querySelector(`.${document.querySelector("input[type='radio']:checked").value}`);
        if (currSlide.classList.contains("paths")) updatePathsViewer;
        currSlide.style.display = 'block';
      });
      input.style.display = 'none';
    });
    currSlide.style.display = 'block';
  }
  
  function updateSelection(items) {
    if (!items || items.lenght == 0) return;
    items.forEach((elem) => {
      elem.classList.remove("active");
    });
    items[selectedIndex]?.classList.toggle("active");
  }
  
  function updatePathsViewer() {
    let formatAddress = (displayName) => {
      let partsAsRoad = displayName.split(", ");
      let partsAsCity = displayName.split(", ");
      return partsAsRoad.slice(-2).join(", ") + "," + partsAsCity.length > 1 ? partsAsCity.slice(0, 2).join(" ") : displayName;
    }
    
    let ul = document.querySelector(".paths ul");
    if (!ul) return;
    ul.innerHTML = '';
    allPaths.forEach((pathGroup,) => {
      let li = document.createElement("li");
      li.innerHTML = `
                <i class="fa-solid fa-trash"></i>
                <div class="pathsMeasure">
                    <span class="pathsDistance">${pathGroup.request.lenght.toFixed(1)} km</span>
                    <span class="pathsElevation"><i class="fa-solid fa-arrow-trend-up"></i>${pathGroup.request.elevationUp}m<i class="fa-solid fa-arrow-trend-down"></i>${pathGroup.request.elevationDown}m</span>
                </div>
                <span class="pathsLocation"><i class="fa-solid fa-location-dot"></i>${formatAddress(pathGroup.request.name)}</span>
                <span class="pathsNumber">Number of paths : ${pathGroup.response.paths.length}</span>
            `;
      
      ul.appendChild(li);
      li.addEventListener("click", () => drawSelectedPaths(pathGroup.response));
    });
  }
  
  function listAllLocationPossibilities(list) {
    let formatAddressAsRoad = (displayName) => {
      let parts = displayName.split(", ");
      return parts.length > 1 ? parts.slice(0, 2).join(" ") : displayName;
    }
    let formatAddressAsCity = (displayName) => {
      let parts = displayName.split(", ");
      return parts.slice(-2).join(", ");
    }
    
    let ul = document.getElementById("suggestions");
    if (!ul || !list) return;
    
    ul.innerHTML = list.map(elem => 
      `<li><a><div class="suggestions-title">${formatAddressAsRoad(elem.display_name)}</div>
            <div class="suggestions-address">${formatAddressAsCity(elem.display_name)}</div></a></li>`
    ).join("");
    
    [...ul.children].forEach((li, i) => li.addEventListener("click", () => drawLocation(list[i])));
    ul.firstChild?.classList.add("active");
  }
  
  function drawLocation(data) {
    if (!data) return;
    
    lat = data.lat;
    lng = data.lon;
    
    document.getElementById("suggestions").innerHTML = '';
    clearLayers();
    
    L.marker([data.lat, data.lon]).addTo(map).openPopup();
    map.setView([data.lat, data.lon], 17);
    
    document.getElementById('locationInput').value = data.display_name;
  }
  
  function displayPath(coordinates, color, opacity, length) {
    L.polyline(coordinates, { color, weight: 3, opacity }).addTo(map);
  }
  
  function displayCircle(coordinate, radius, color, fillColor, opacity, fillOpacity) {
    L.circle(coordinate, { radius, color, fillColor, opacity, fillOpacity }).addTo(map);
  }  
  
  function drawSelectedPaths(res) {
    document.getElementById("rad2").click();
    showMain("listOfSelectedPaths");
    let ul = document.querySelector(".listOfSelectedPaths ul");
    if (!ul) return;
    ul.innerHTML = '';
    res.paths.forEach((path) => {
      let li = document.createElement("li");
      li.classList.add("liContainer");
      li.innerHTML = `
                <div class="pathContainer">
                    <div class="pathResult">
                        <div class="distance-elevationContainer">
                            <span class="distanceContainer">
                                <i class="fa-solid fa-arrows-left-right"></i> ${(path.length / 1000).toFixed(1)} km
                            </span>
                            <span class="elevationUp"><i class="fa-solid fa-arrow-trend-up"></i>TODO</span>
                            <span class="elevationDown"><i class="fa-solid fa-arrow-trend-down"></i>TODO</span>
                        </div> TODO WAY TYPES` + 
      // <div class="surfaceContainer">
      //     <div class="wayTypeTitle">
      //         <img class="wayTypeIcon" src="https://pass-the-baton.nyc3.digitaloceanspaces.com/assets/journey.png"> Way types
      //     </div>
      //     <div class="surface">
      //         <div class="surfaceElement a1" style="width: 94.30%;"></div>
      //         <div class="surfaceElement a2" style="width: 5.70%;"></div>
      //     </div>
      // </div>
      
      `</div>
                    <div class="exportContainer">
                        <span><i class="fa-solid fa-share-nodes"></i> Generate share link</span>
                        <div class="accordionContainer">
                            <button class="accordionTitle">Export Options</button>
                            <div class="accordionText">
                                <ul>
                                    <li><span>Open in Google Maps</span></li>
                                    <li><span>Open in Komoot</span></li>
                                    <li><span>Here WeGo</span></li>
                                    <li><span>Download GPX</span></li>
                                    <li><span>Download KML</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>`;
      
      li.addEventListener("click", () => li.classList.toggle("active"));
      li.addEventListener("mouseenter", () => {
        clearLayers();
        let endingNode = path.endingNode;
        let tempEndingNode = [endingNode.lat, endingNode.lon];
        let length = path.length;
        
        let tempPath = path.path;
        let tempTempPath = tempPath.map((coo) => [coo.lat, coo.lon]);
        let color = "black"
        
        displayPath(tempTempPath, color, 1, length);
        displayCircle(tempEndingNode, 10, color, color, 1, 1);
        
      })
      ul.appendChild(li);
    });
    accordion(); 
  }
});

function accordion() {
  document.querySelectorAll(".accordionTitle").forEach(element => {
    element.addEventListener("click", function(event) {
      event.stopPropagation();
      this.classList.toggle("active");
      var accordionText = this.nextElementSibling;
      if (accordionText.style.maxHeight) {
        accordionText.style.maxHeight = null;
      } else {
        accordionText.style.maxHeight = accordionText.scrollHeight + "px";
      } 
    });
  });
}

