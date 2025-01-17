const map = L.map('map').setView([47.2378, 6.0241], 17);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

var color = ["red", "yellow", "purple", ""]

var customLayers = L.layerGroup().addTo(map);

map.on("click", function (e) {
    console.log();

    lat = e.latlng.lat;
    lon = e.latlng.lng;
    const payload = {
        lat : lat,
        lon : lon,
        distance : 1000,
        precision : 1
    }

    console.log(payload);
    customLayers.clearLayers();

    fetchData(payload);
});

function getRandomColor() {
    var letters = "0123456789ABCDEF";
    var color = "#";
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

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

function displayPath(coordinates, color, opacity, length) {
    const polyline = L.polyline(coordinates, {
        color: color,
        weight: 5,
        opacity: opacity,
    }).addTo(customLayers);

    polyline.bindPopup(`${Math.floor(length)}m`);
    polyline.openPopup();
}

function fetchData(payload) {
    // Send the POST request
    fetch('http://0.0.0.0:8080/route', {
        method: 'POST',
        body: JSON.stringify(payload) // Convert to JSON string
    })
    .then(response => {
        console.log("Response status:", response.status); // Log the HTTP status
        console.log("Response headers:", response.headers); // Log headers if needed
        return response.json();
    })
    .then(data => {
        // Log the data received from the server
        console.log("Received response data:", data);

        // Add markers to the map based on received data
        if (data?.closest) {
            L.circle([data.closest.lat, data.closest.lon], { radius: 10, color: 'black' }).addTo(map);
        }

        if (data?.paths) {
            data.paths.forEach((path,index) => {
                displayPath(path, getRandomColor(), 1, Number(data.length[index]));
            })
        }
        
        if (data?.nodes) {
            data.nodes.forEach(node => {
                L.circle([node.lat, node.lon], { radius: 5, color: 'blue' }).addTo(map);
            });
        }
    })
    .catch(error => {
        // Log any errors during the request
        console.error('Error during fetch:', error);
    });
}
