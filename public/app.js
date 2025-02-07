document.addEventListener("DOMContentLoaded", () => {
  let sock = io.connect();
  let selectedIndex;
  let lat;
  let lng;
  let timeout = null; 
  let suggestionsList;
  let allPaths = [];
  const maxLength = 50;

  const map = L.map('Map').setView([51.505, -0.09], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  L.control.zoom({ position: 'topright' }).addTo(map);
  
  window.addEventListener("resize", () => {
    updateSliderMarBel(document.querySelector(".Distance_Container"), " km", 5, 50);
    updateSliderMarBel(document.querySelector(".Nb_Paths_Container"), "", 1, 10);
    updateSliderMarBel(document.querySelector(".Precision_Container"), "", 1, 5, 1);
  });

  updatePathsViewer();
  initSlide();
  initSliderLengthInput();

  map.on("click", (e) => {
    let lat = e.latlng.lat;
    let lng = e.latlng.lng;
    
    let popupContent = `<button id="Confirm_Button">Set as start point</button>`;
    
    L.popup()
    .setLatLng([lat, lng])
    .setContent(popupContent)
    .openOn(map);
    
    setTimeout(() => {
      document.getElementById("Confirm_Button").addEventListener("click", () => {
        showMain("Generate");
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
  
  document.getElementById("List_Of_Selected_Paths_Back").addEventListener("click", () => {
    updatePathsViewer();
    updateMainContentWithArgument("Route");
    updateListOfSelectedPath(false);
  });
  
  // document.getElementById("Show_All_Selected_Paths").addEventListener("click", () => {
  //   showMain("List_Of_Selected_Paths");
  // });
  
  document.getElementById("Location_Input").addEventListener("input", (event) => {
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

  document.querySelector(".ActionButton_More_Parameters").addEventListener("click", () => {
    let simplification = document.querySelector(".Simplification_Container");
    simplification.style.display = simplification.style.display === "grid" ? "none" : "grid";
    let precision = document.querySelector(".Precision_Container");
    precision.style.display = precision.style.display === "block" ? "none" : "block";
    updateSliderMarBel(document.querySelector(".Precision_Container"), "", 1, 5, 1);
    
  });
  
  document.getElementById("Location_Input").addEventListener("keydown", (event) => {
    if (!suggestionsList) return;
    let items = document.querySelectorAll("#Suggestions li");
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
  
  document.querySelector(".ActionButton_Container").addEventListener("click", () => {
    if (!lat || !lng) {
      console.log("Error : No Latitude or Longitude");
      return; 
    }
    
    const radius = parseInt(document.querySelector(".Route_Slider .Slider_Handle").value * 1000);
    const maxPaths = parseInt(document.querySelector(".Paths_Slider .Slider_Handle").value);
    const method = document.querySelector(".Method_Container input:checked").value;
    const terrain = Array.from(document.querySelectorAll(".WayTypes_Checkbox input:checked")).map((checkbox) => checkbox.value);
    const elevationUp = parseInt(document.querySelector("#Elevation_Up").value);
    const elevationDown = document.querySelector("#One_Way").checked ? parseInt(document.querySelector("#Elevation_Down").value) : elevationUp;
    const name = document.querySelector("#Location_Input").value;
    const simplification = document.querySelector(".Simplification_Radio input:checked").value;
    
    sock.emit("request", {
      startingPoint : {lat : lat, lng : lng},
      radius : radius,
      maxPaths : maxPaths,
      method: method, 
      terrain: terrain,
      elevation: {up: elevationUp, down: elevationDown},
      precision: 1,
      simplificationMode: simplification,
      name: name,
    }); 
  });
  
  sock.on("result", (res) => {
    drawSelectedPaths(res.response); 
    allPaths.push(res);
  });

  function updateSliderMarBel(div, unit, min, max, start = -1) {
    const handle = div.querySelector(".Slider_Handle");
    const span = div.querySelector(".Route_Label span") || div.querySelector(".Paths_Label span") || div.querySelector(".Precision_Label span");
    const bar = div.querySelector(".Slider_Bar");
    const marBels = div.querySelectorAll(".Slider_Container_MarBel");
    let isDragging = false;
    
    const ratio = max / bar.offsetWidth;
    const sliderRect = bar.getBoundingClientRect();
    const minLeft = bar.offsetWidth / max * min;
    const maxLeft = bar.offsetWidth;
    const avgLeft = (start === -1) ? (maxLeft - minLeft) / 2 : start * ratio + minLeft;
    
    let left = 10;
    let step = maxLeft / 5;
    marBels.forEach((marBel, index) => {
      marBel.querySelector(".Slider_Mark").style.left = left + "px";
      let label = marBel.querySelector(".Slider_Label");
      label.style.left = left + "px";
      label.style.marginLeft = `-${Number(index * max / 5).toString().length * 4}px`;
      label.innerHTML = Number(index * max / 5);
      left += step;
    });

    handle.style.left = `${Math.floor(avgLeft)}px`;
    
    let nb = Math.ceil(ratio * avgLeft);
    handle.value = nb;
    span.innerHTML = nb + unit;
    
    handle.addEventListener("mousedown", function (event) {
      isDragging = true;
      event.preventDefault();
      div.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
    
    function onMouseMove(event) {
      if (!isDragging) return;
      let newLeft = event.clientX - sliderRect.left - Number(handle.offsetWidth) / 2;
      
      newLeft = Math.floor(Math.max(minLeft, Math.min(newLeft, maxLeft)));
      handle.style.left = newLeft + "px";
      
      let nb = Math.ceil(ratio * newLeft);
      handle.value = nb;
      span.innerHTML = nb + unit;
    }
    
    function onMouseUp() {
      isDragging = false;
      div.removeEventListener("mousemove", onMouseMove);
      div.removeEventListener("mouseup", onMouseUp);
    }
  }
  
  function initSliderLengthInput() {
    updateSliderMarBel(document.querySelector(".Distance_Container"), " km", 5, 50);
    updateSliderMarBel(document.querySelector(".Nb_Paths_Container"), "", 1, 10);
    updateSliderMarBel(document.querySelector(".Precision_Container"), "", 1, 5, 1);
  }
  
  function showMain(str) {
    let listOfItems = ["Generate", "Paths", "List_Of_Selected_Paths"];
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
    document.querySelectorAll(".Tab_Container").forEach(input => {
      input.addEventListener('click', () => {
        updateListOfSelectedPath(false);
        updateMainContentWithArgument(input.firstElementChild.id);
        if (input.firstElementChild.id == "Route") {
          updatePathsViewer();
        }
      });
    });
    updateMainContent();
  }
  
  function updateListOfSelectedPath(display) {
    document.querySelector("main").style.display = display ? "none" : "block";
    document.querySelector(".List_Of_Selected_Paths").style.display = display ? "block" : "none";
  }
  
  function updateMainContent() {
    const activeTab = document.querySelector(".Tab_Active .Tab_Title span");
    const generateDiv = document.querySelector(".Generate");
    const pathsDiv = document.querySelector(".Paths");
    
    if (activeTab && activeTab.textContent.trim() === "Goals") {
      generateDiv.style.display = "flex";
      pathsDiv.style.display = "none";
    } else {
      generateDiv.style.display = "none";
      pathsDiv.style.display = "block";
    }
  }
  
  function updateMainContentWithArgument(str) {
    let activeTab = document.querySelector(".Tab_Active");
    if (activeTab.id != str) {
      activeTab.classList.toggle("Tab_Active");
      activeTab.classList.add("Tab_Not_Active");
      
      activeTab = document.getElementById(str);
      activeTab.classList.add("Tab_Active");
      
      activeTab.classList.remove("Tab_Not_Active");
    }
    
    updateMainContent();
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
    
    let ul = document.querySelector(".Paths ul");
    if (!ul) return;
    ul.innerHTML = '';
    allPaths.forEach((pathGroup) => {
      let li = document.createElement("li");
      // <i class="fa-solid fa-trash"></i>
      li.innerHTML = `
                <div class="Paths_Measure">
                    <span class="Paths_Distance">${pathGroup.request.radius.toFixed(1)} km</span>
                    <span class="Paths_Elevation"><i class="fa-solid fa-arrow-trend-up"></i>${pathGroup.request.elevation.up}m<i class="fa-solid fa-arrow-trend-down"></i>${pathGroup.request.elevation.down}m</span>
                </div>
                <span class="Paths_Location"><i class="fa-solid fa-location-dot"></i>${formatAddress(pathGroup.request.name)}</span>
                <span class="Paths_Number">Number of paths : ${pathGroup.response.paths.length}</span>
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
    
    let ul = document.getElementById("Suggestions");
    if (!ul || !list) return;
    
    ul.innerHTML = list.map(elem => 
      `<li><a><div class="Suggestions_title">${formatAddressAsRoad(elem.display_name)}</div>
            <div class="Suggestions_address">${formatAddressAsCity(elem.display_name)}</div></a></li>`
    ).join("");
    
    [...ul.children].forEach((li, i) => li.addEventListener("click", () => drawLocation(list[i])));
    ul.firstChild?.classList.add("active");
  }
  
  function drawLocation(data) {
    if (!data) return;
    
    lat = data.lat;
    lng = data.lon;
    
    document.getElementById("Suggestions").innerHTML = '';
    clearLayers();
    
    L.marker([data.lat, data.lon]).addTo(map).openPopup();
    map.setView([data.lat, data.lon], 17);
    
    document.getElementById('Location_Input').value = data.display_name;
  }
  
  function displayPath(coordinates, color, opacity, length) {
    L.polyline(coordinates, { color, weight: 3, opacity }).addTo(map);
  }
  
  function displayCircle(coordinate, radius, color, fillColor, opacity, fillOpacity) {
    L.circle(coordinate, { radius, color, fillColor, opacity, fillOpacity }).addTo(map);
  }  
  
  function drawSelectedPaths(res) {
    updateMainContentWithArgument("Route");
    updateListOfSelectedPath(true);
    
    let ul = document.querySelector(".List_Of_Selected_Paths ul");
    if (!ul) return;
    ul.innerHTML = '';
    res.paths.forEach((path) => {
      let li = document.createElement("li");
      li.classList.add("Li_Container");
      li.innerHTML = `
                <div class="Path_Container">
                    <div class="Path_Result">
                        <div class="Distance_Elevation_Container">
                            <span class="Distance_Container">
                                <i class="fa-solid fa-arrows-left-right"></i> ${(path.length / 1000).toFixed(1)} km
                            </span>
                            <span class="Elevation_Up"><i class="fa-solid fa-arrow-trend-up"></i>TODO</span>
                            <span class="Elevation_Down"><i class="fa-solid fa-arrow-trend-down"></i>TODO</span>
                        </div> TODO WAY TYPES` + 
      // <div class="Surface_Container">
      //     <div class="WayType_Title">
      //         <img class="WayType_Icon" src="https://pass-the-baton.nyc3.digitaloceanspaces.com/assets/journey.png"> Way types
      //     </div>
      //     <div class="Surface">
      //         <div class="Surface_Element a1" style="width: 94.30%;"></div>
      //         <div class="Surface_Element a2" style="width: 5.70%;"></div>
      //     </div>
      // </div>
      
      `</div>
                    <div class="Export_Container">
                        <span><i class="fa-solid fa-share-nodes"></i> Generate share link</span>
                        <div class="Accordion_Container">
                            <button class="Accordion_Title">Export Options</button>
                            <div class="Accordion_Text">
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
  document.querySelectorAll(".Accordion_Title").forEach(element => {
    element.addEventListener("click", function(event) {
      event.stopPropagation();
      this.classList.toggle("Active");
      var accordionText = this.nextElementSibling;
      if (accordionText.style.maxHeight) {
        accordionText.style.maxHeight = null;
      } else {
        accordionText.style.maxHeight = accordionText.scrollHeight + "px";
      } 
    });
  });
}

