export function generateGPX(coords) {
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  gpx += `<gpx version="1.1" creator="Custom Generator">\n`;
  gpx += `  <trk>\n    <trkseg>\n`;
  coords.forEach((value) => {
    gpx += `      <trkpt lat="${value.lat}" lon="${value.lon}"></trkpt>\n`;
  });
  gpx += `    </trkseg>\n  </trk>\n`;
  gpx += `</gpx>`;
  return gpx;
}

export function generateKML(coords) {
  let kml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  kml += `<kml xmlns="http://www.opengis.net/kml/2.2">\n`;
  kml += `  <Document>\n    <name>Coordinates</name>\n    <Placemark>\n      <LineString>\n        <coordinates>\n`;
  coords.forEach((value) => {
    kml += `          ${value.lon},${value.lat},0\n`;
  });
  kml += `        </coordinates>\n      </LineString>\n    </Placemark>\n  </Document>\n</kml>`;
  return kml;
}

export function openInGoogleMaps(coords) {
  const baseUrl = "https://www.google.com/maps/dir/";
  const path = coords.map((value) => `${value.lat},${value.lon}`).join("/");
  window.open(baseUrl + path, "_blank");
}

export function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
