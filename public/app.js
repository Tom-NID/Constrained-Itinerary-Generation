import { addSparkline } from './script/sparkline-wrapper.js' 
import { openInGoogleMaps, downloadFile, generateGPX, generateKML } from './script/exportConverter.js';
import { wayTypeIcon, elevationIcon, exportIcon, elevationUpIcon, elevationDownIcon, markerIcon, distanceIcon, warningIcon, trashIcon} from './script/svg.js';

document.addEventListener("DOMContentLoaded", () => {
  let sock = io.connect();
  let selectedIndex;
  let lat;
  let lng;
  let timeout = null; 
  let suggestionsList;
  let allPaths = [];
  let generate = false;
  let colorList = ["#525445", "#34796a", "#276460", "#25484f", "#28333c", "#1f2731", "#010102"]
  const wayTypes = ["hard", "semi-hard", "semi-soft", "soft"];
  const wayTypesColor = ['#18FFFF', '#0288D1', '#BF360C', '#F4511E'];
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
  initLocation();
  initAllPaths();
  
  sock.on("error", (str)=> {
    alert(str);
  });

  sock.on("message", (str) => {
    document.querySelector(".Generation_Info").innerHTML = "";
    alert(str);
  });
  
  sock.on("generationInfo", (str) => {
    document.querySelector(".Generation_Info").innerHTML = str;
  });
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
        .catch(() => {
          alert("No node found"); 
          initLocation();
          console.error("Error fetching locations:", error);
        });
      });
    }, 100);
  });
  
  document.getElementById("List_Of_Selected_Paths_Back").addEventListener("click", () => {
    updatePathsViewer();
    updateMainContentWithArgument("Route");
    updateListOfSelectedPath(false);
  });
  
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
      .catch(() => {
        alert("No node found"); 
        initLocation();
        console.error("Error fetching locations:", error);
      });
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

  //Ces deux listeners sont utilisés pour qu'au moins une des contraintes soient sélectionnés
  document.querySelector("#Use_Distance").addEventListener("change", (e) => {
    if (!e.target.checked) {
      // Si l'utilisateur décoche la distance, on recoche l'élévation
      document.querySelector("#Use_Elevation").checked = true;
      document.querySelector(".Distance_Container").classList.add("disabled");
    } else {
      document.querySelector(".Distance_Container").classList.remove("disabled");
    }
  });

  document.querySelector("#Use_Elevation").addEventListener("change", (e) => {
    if (!e.target.checked) {
      // Si l'utilisateur décoche l'élévation, on recoche la distance
      document.querySelector("#Use_Distance").checked = true;
      document.querySelector(".Elevation_Container").classList.add("disabled");
    } else {
      document.getElementById("One_Way").checked = true;
      document.getElementById("Circuit").checked = false;
      document.querySelector(".Elevation_Container").classList.remove("disabled");
    }
  });
  
  document.querySelector(".ActionButton_Container").addEventListener("click", () => {
    if (generate) {
      sock.emit("stopGeneration");
      document.querySelector(".Bicycle_Loaders").style.display = "none";
      document.querySelectorAll(".ActionButton").forEach((value) => {
        value.style.display = "block";
      });
      generate = false;
      return;
    }
    if (!lat || !lng) {
      console.log("Error : No Latitude or Longitude");
      return; 
    }

    const maxPaths = parseInt(document.querySelector(".Paths_Slider .Slider_Handle").value);
    let method = document.querySelector(".Method_Container input:checked").value;
    const terrain = Array.from(document.querySelectorAll(".WayTypes_Checkbox input:checked")).map((checkbox) => checkbox.value);
    const distanceCheckbox = document.querySelector("#Use_Distance");
    const elevationCheckbox = document.querySelector("#Use_Elevation");
    const useDistance = distanceCheckbox.checked;
    const useElevation = elevationCheckbox.checked;
    const radius = useDistance
        ? parseInt(document.querySelector(".Route_Slider .Slider_Handle").value * 1000)
        : (parseInt(document.querySelector("#Elevation_Up").value) * 50);
    const elevationUp = parseInt(document.querySelector("#Elevation_Up").value);
    const elevationDown = document.querySelector("#One_Way").checked ? parseInt(document.querySelector("#Elevation_Down").value) : elevationUp;
    const name = document.querySelector("#Location_Input").value;
    const simplification = document.querySelector(".Simplification_Radio input:checked").value;
    const negativeElevation = document.querySelector("#Allow_Negative_Elevation").checked;

    if (useElevation) {
      method = "elevation";
      document.getElementById("One_Way").checked = true;
    }

    sock.emit("request", {
      startingPoint : {lat : lat, lng : lng},
      radius : radius,
      maxPaths : maxPaths,
      method: method,
      terrain: terrain,
      elevation: {up: elevationUp, down: elevationDown, use: useElevation},
      useDistance: useDistance,
      precision: 1,
      simplificationMode: simplification,
      name: name,
      negativeElevation: negativeElevation,
    });
    localStorage.setItem('lastLocation', JSON.stringify({display_name : name, lat: lat, lon: lng}));
    document.querySelector(".Bicycle_Loaders").style.display = "block";
    document.querySelectorAll(".ActionButton").forEach((value) => {
      value.style.display = "none";
    });
    generate = true;
  });
  
  sock.on("result", (res) => {
    generate = false;
    document.querySelector(".Generation_Info").innerHTML = "";
    document.querySelector(".Bicycle_Loaders").style.display = "none";
    document.querySelectorAll(".ActionButton").forEach((value) => {
      value.style.display = "block";
    });
    console.log(res);
    
    drawSelectedPaths(res); 
    allPaths.push(res);
    updatePathsLocalStorage();
  });
  
  function updatePathsLocalStorage() {
    localStorage.setItem('allPaths', JSON.stringify(allPaths));
  }
  
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
    if (!items || items.length == 0) return;
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
    allPaths.forEach((pathGroup, index) => {
      let li = document.createElement("li");
      // <i class="fa-solid fa-trash"></i>
      li.innerHTML = `
                <div class="Paths_Measure">
                    <span class="Paths_Distance">${distanceIcon("Path_Distance_Icon")}${(pathGroup.request.radius / 1000).toFixed(1)} km</span>
                    <span class="Paths_Elevation">${elevationUpIcon("Paths_Elevation_Up")}${pathGroup.request.elevation.up}m ${elevationDownIcon("Paths_Elevation_Down")}${pathGroup.request.elevation.down}m</span>
                    <span class="Paths_Trash"> ${trashIcon("Path_Trash")}</span>
                </div>
                <span class="Paths_Location"><i class="fa-solid fa-location-dot"></i>${formatAddress(pathGroup.request.name)}</span>
                <span class="Paths_Number">Number of paths : ${pathGroup.response.paths.length}</span>
            `;
      
      ul.appendChild(li);
      li.querySelector(".Paths_Trash").addEventListener("click", (event) => {
        event.stopPropagation();
        allPaths.splice(index, 1);
        updatePathsLocalStorage();
        updatePathsViewer();
      })
      li.addEventListener("click", () => drawSelectedPaths(pathGroup));
      li.addEventListener("mouseover", () => {
        clearLayers();
        let l;
        pathGroup.response.paths.forEach((path, index) => {
          let tempPath = path.path;
          let tempTempPath = tempPath.map((coo) => [coo.lat, coo.lon]);
          let color = colorList[index % colorList.length];
          
          l = displayPath(tempTempPath, color, 1);
        });
        map.fitBounds(l.getBounds());
      });
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
  
  document.querySelector('#Location_Icon i').addEventListener("click", () => {
    let lat = prompt("Enter Latitude:");
    let lng = prompt("Enter Longitude:");
    
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      alert("Invalid input! Please enter valid numbers.");
      return;
    }
    
    setTimeout(() => {
      showMain("Generate");
      map.closePopup(); 
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
      .then(res => res.json())
      .then(res => {
        console.log(res);
        if (res.error) {
          alert(`Invalid input! Nothing found.`);
          return;
        }
        drawLocation(res);
        localStorage.setItem('lastLocation', JSON.stringify({display_name : res.display_name, lat: lat, lon: lng}));
      })
      .catch(error => console.error("Error fetching locations:", error));
    }, 100);
  })
  
  function displayPath(coordinates, color, opacity, weight = 3, layer = map) {
    return L.polyline(coordinates, { color, weight: weight, opacity }).addTo(layer);
  }
  
  function drawSelectedPaths(all) {
    
    let res = all.response;
    let req = all.request;
    updateMainContentWithArgument("Route");
    updateListOfSelectedPath(true);
    let ul = document.querySelector(".List_Of_Selected_Paths ul");
    let info = document.querySelector(".List_Of_Selected_Paths .Info");
    info.innerHTML = `${distanceIcon("Info_Icon")}${req.radius / 1000}km ${elevationUpIcon("Info_Icon")}${req.elevation.up}m ${elevationDownIcon("Info_Icon")}${req.elevation.down}m ${markerIcon("Info_Icon")}${req.name}`;
    if (!ul) return;
    ul.innerHTML = '';
    
    res.paths.forEach((path, index) => {
      let li = document.createElement("li");
      li.classList.add("Li_Container");
      let Path_Container = document.createElement("div"); Path_Container.classList.add("Path_Container"); Path_Container.classList.add("Accordion_Container");
      li.appendChild(Path_Container);
      Path_Container.innerHTML = `
          <div class="Accordion_Title">
          ${(path.notSatisfied) ? `<span class="Warning_Not_Satisfied" title="Generation problem with these constraints : ${path.notSatisfied.join(", ")}">${warningIcon("Accordion_Title_Icon")}<span>
            ` : ""}
            <span class="Distance_Container">
              ${distanceIcon("Accordion_Title_Icon")} ${(path.length / 1000).toFixed(1)} km
            </span>
            <span class="Elevation_Up">${elevationUpIcon("Accordion_Title_Icon")} ${Math.abs(path.elevation?.pos)} m</span>
            <span class="Elevation_Down">${elevationDownIcon("Accordion_Title_Icon")} ${Math.abs(path.elevation?.neg)} m</span>
            <span class="Accordion_Trash">${trashIcon("Accordion_Title_Icon")}</span>
          </div>`
      
      let Accordion_Text = document.createElement("div"); Accordion_Text.classList.add("Accordion_Text");
      Path_Container.appendChild(Accordion_Text);
      Accordion_Text.innerHTML = `
          <div class="Analysis_Group">
            <div class="Analysis_Title" id="elevationCase">
              <div class="Elevation_Text">
                ${elevationIcon("Analysis_Icon")}
                <p>Elevation</p>
              </div>
              <div class="Elevation_Description">
                <div class="Up_Totals">
                  ${elevationUpIcon("upIcon")}
                  <span id="elevation${index}Up">${Math.abs(path.elevation?.pos)} m</span>
                </div>
                <div class="Down_Totals">
                  ${elevationDownIcon("downIcon")}
                  <span id="elevation${index}Down">${Math.abs(path.elevation?.neg)} m</span>
                </div>
              </div>
            </div>
            <div class="Analysis_Content" id="elevation${index}Chart">
              <svg id="elevation${index}" class="graphSVG aGraph" stroke-width="3"></svg>
              <span id="elevation${index}Tooltip" class="tooltip hide"></span>
              <div id="elevation${index}Axis" class="chartAxis">
                <div class="borderline"></div>
                <div class="ticks"></div>
                <div class="tickLabels"></div>
              </div>
            </div>
          </div>`
      
      let Analysis_Group_WayType = document.createElement("div"); Analysis_Group_WayType.classList.add("Analysis_Group");
      Accordion_Text.appendChild(Analysis_Group_WayType);
      Analysis_Group_WayType.innerHTML = `
          <div class="Analysis_Title">
            ${wayTypeIcon("Analysis_Icon")}
            Way types
          </div>`
      
      let Analysis_Content_WayType = document.createElement("div"); Analysis_Content_WayType.classList.add("Analysis_Content");
      Analysis_Group_WayType.appendChild(Analysis_Content_WayType);
      Analysis_Content_WayType.appendChild(wayTypeDisplay(path));
      
      let Analysis_Group_Export = document.createElement("div"); Analysis_Group_Export.classList.add("Analysis_Group");
      Accordion_Text.appendChild(Analysis_Group_Export);
      Analysis_Group_Export.innerHTML = `
          <div class="Analysis_Title">
            ${exportIcon("Analysis_Icon")}
            Export
          </div>`
      
      let Analysis_Content_Export = document.createElement("div"); Analysis_Content_Export.classList.add("Analysis_Content");
      Analysis_Group_Export.appendChild(Analysis_Content_Export);
      Analysis_Content_Export.appendChild(exportDisplay(path.path));
      
      
      li.addEventListener("mouseenter", () => {
        clearLayers();
        
        let tempPath = path.path;
        let tempTempPath = tempPath.map((coo) => [coo.lat, coo.lon]);
        let color = "black"
        
        let l = displayPath(tempTempPath, color, 1);
        map.fitBounds(l.getBounds());
      })
      ul.appendChild(li);
      let layerSparkline = L.layerGroup().addTo(map);
      
      addSparkline("elevation" + index, path, false, "km", path.length / 1000, map);
    });
    accordion(); 
  }
  
  function exportDisplay(path) {
    let exportItems = {"Google Maps": openInGoogleMaps, "Download GPX": (coords) => downloadFile("coordinates.gpx", generateGPX(coords)), "Download KML": (coords) => downloadFile("coordinates.kml", generateKML(coords))};
    let div = document.createElement("div");
    div.classList.add("Export_Container");
    
    for (const [key, value] of Object.entries(exportItems)) {
      
      let item = document.createElement("div");
      item.classList.add("Export_Element");
      item.addEventListener("click", event => {
        value(path);
      });
      
      let circle = document.createElement("div");
      circle.classList.add("surfaceCircle");
      circle.classList.add("a4");
      item.appendChild(circle);
      
      let itemContent = document.createElement("div");
      itemContent.classList.add("surfaceName");
      itemContent.innerHTML = `<span class="surfaceName">${key[0].toUpperCase() + key.slice(1)}</span>`;
      item.appendChild(itemContent);
      
      div.appendChild(item);
    }
    return div;
  }
  
  function wayTypeDisplay(path) {
    let layer;
    const lenghts = wayTypes.map(type => wayTypeCalcul(type, path));
    let div = document.createElement("div");
    
    let pie = document.createElement("div");
    pie.id = "wayPieChart";
    pie.classList.add("wayPieChart");
    let legend = document.createElement("div");
    legend.id = "wayLegend";
    legend.classList.add("Analysis_Legend");
    
    let total = 0;
    lenghts.forEach(value => {
      total += value;
    });
    
    lenghts.forEach((value, index) => {
      if (value <= 100) return; //Under 100m not display
      let pieElement = document.createElement("div");
      pieElement.classList.add("wayPieChartElement");
      pieElement.classList.add(`a${index}`);
      pieElement.addEventListener("mouseout", mouseout);
      pieElement.addEventListener("mouseover", mouseover);
      pieElement.style.width = `${value / total * 100}%`;
      pie.appendChild(pieElement);
      
      let legendElement = document.createElement("div");
      legendElement.classList.add("surface");
      legendElement.addEventListener("mouseout", mouseout);
      legendElement.addEventListener("mouseover", mouseover);
      legendElement.innerHTML = `<div class="surfaceCircle a${index}"></div><div class="surfaceLine"><span class="surfaceName">${wayTypes[index][0].toUpperCase() + wayTypes[index].slice(1)} :</span>${(value / 1000).toFixed(2)} km</div></div>`
      legend.appendChild(legendElement);
      
      function mouseout() {
        layer.clearLayers();
      }
      
      function mouseover() {
        layer = L.layerGroup().addTo(map);
        path.pathSurface.forEach((value, pathSurfaceIndex) => {
          if (wayTypes[index] == value) {
            displayPath([path.path[pathSurfaceIndex], path.path[pathSurfaceIndex + 1]], wayTypesColor[index], 1, 10, layer);
          }
        });
      }
    });
    
    div.appendChild(pie);
    div.appendChild(legend);
    return div;
  }
  
  function wayTypeCalcul(type, path) {
    let length = 0;
    path.pathSurface.forEach((value, index) => {      
      if (value === type) {
        length += getHaversineDistance(path.path[index], path.path[index + 1]);
      }
    });
    return length;
  }
  
  function getHaversineDistance(coordNode1, coordNode2) {
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
  
  function initLocation() {
    if (localStorage.getItem('lastLocation')) {
      drawLocation(JSON.parse(localStorage.getItem('lastLocation')));
    }
  }
  
  function initAllPaths() {
    if (localStorage.getItem('allPaths')) {
      allPaths = JSON.parse(localStorage.getItem('allPaths'));
      updatePathsViewer();
    }
  }
});
function accordion() {
  document.querySelectorAll(".Accordion_Title").forEach(element => {
    element.addEventListener("click", function(event) {
      event.stopPropagation();
      let clickedHimSelf = false;
      document.querySelectorAll(".Accordion_Title.Active").forEach(elementActive => {
        if (elementActive == element) {
          clickedHimSelf = true;
        }
        elementActive.classList.remove("Active");
        var accordionText = elementActive.nextElementSibling;
        accordionText.style.maxHeight = null;
      })
      if (!clickedHimSelf) {
        this.classList.toggle("Active");
        let accordionText = this.nextElementSibling;
        if (accordionText.style.maxHeight) {
          accordionText.style.maxHeight = null;
        } else {
          accordionText.style.maxHeight = accordionText.scrollHeight + "px";
        } 
      }
    });
  });
}
