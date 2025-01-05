const map = L.map('map').setView([48.8566, 2.3522], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const payload = {
    lat: 48.8566,
    lon: 2.3522,
    distance: 10
};

// Log the payload
console.log("Sending payload:", payload);

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
    data.nodes.forEach(node => {
        L.circle([node.lat, node.lon], { radius: 5, color: 'blue' }).addTo(map);
    });
})
.catch(error => {
    // Log any errors during the request
    console.error('Error during fetch:', error);
});
