// js/routing.js
import { map, API_KEY, BASE_URL, markerLayer, trafficLines } from "./map.js";

// Helper function to resolve an address or coordinate pair into lat/lng.
async function resolveCoordinates(input) {
  const parts = input.split(',');
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { lat: parseFloat(parts[0]), lng: parseFloat(parts[1]) };
  } else {
    try {
      const url = `${BASE_URL}/geocoding/${encodeURIComponent(input)}/?api_key=${API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      const geoObj = data.resourceSet?.find(r => r.geo && r.geo.latitude && r.geo.longitude);
      if (geoObj) return { lat: geoObj.geo.latitude, lng: geoObj.geo.longitude };
    } catch (err) {
      console.error("Geocoding error:", err);
    }
  }
  return null;
}

// Main routing function called by the user.
export async function handleRouting() {
  // Retrieve input values.
  const startInput = document.getElementById("start").value.trim();
  const endInput = document.getElementById("end").value.trim();
  if (!startInput || !endInput) {
    alert("Please enter both start and end locations.");
    return;
  }

  const start = await resolveCoordinates(startInput);
  const end = await resolveCoordinates(endInput);

  if (!start || !end) {
    alert("Invalid start or end location.");
    return;
  }

  await getRoute(start, end);
}

export async function getRoute(start, end) {
  try {
    const routeURL = `${BASE_URL}/route/${start.lat},${start.lng}/${end.lat},${end.lng}/1/?api_key=${API_KEY}`;
    const response = await fetch(routeURL);
    const data = await response.json();
    const route = data.resourceSet?.[0]?.resources?.[0];
    const coordinates = route?.routePath?.line?.coordinates;
    if (!route || !coordinates?.length) throw new Error("No route coordinates found.");

    // Clear previous route and traffic.
    if (window.routeLine) map.removeLayer(window.routeLine);
    trafficLines.forEach(line => map.removeLayer(line));
    window.trafficLines = [];

    const routeCoords = coordinates.map(coord => [coord[0], coord[1]]);
    window.routeLine = L.polyline(routeCoords, { color: 'blue', weight: 5 }).addTo(map);

    // Add start and end markers.
    const startMarker = L.marker([start.lat, start.lng], { title: "Start" }).addTo(map);
    const endMarker = L.marker([end.lat, end.lng], { title: "End" }).addTo(map);
    window.trafficLines.push(startMarker, endMarker);

    // Adjust view based on route bounding box.
    const [south, west, north, east] = route.bbox;
    const bounds = L.latLngBounds([south, west], [north, east]);
    map.fitBounds(bounds);

    // Display route information.
    const travelTime = Math.round(route.travelDurationInSeconds / 60);
    const distance = (route.travelDistance).toFixed(2);
    document.getElementById("trafficAlerts").innerHTML = `
      <div class="alert alert-success">
        <strong>Route Found:</strong> ${distance} km | ${travelTime} minutes
      </div>
    `;

    // Fetch traffic incidents.
    await fetchTraffic(bounds);
  } catch (err) {
    console.error("Route error:", err);
    alert("Failed to get route.");
  }
}

async function fetchTraffic(bounds) {
  const south = bounds.getSouth();
  const west = bounds.getWest();
  const north = bounds.getNorth();
  const east = bounds.getEast();
  try {
    const trafficUrl = `${BASE_URL}/traffic/${south}/${west}/${north}/${east}/?api_key=${API_KEY}`;
    const res = await fetch(trafficUrl);
    const data = await res.json();
    const incidents = data.trafficIncidents || [];
    const alertsContainer = document.getElementById("trafficAlerts");
    const routeSummary = alertsContainer.innerHTML.includes("Route Found") ? alertsContainer.innerHTML : "";

    if (incidents.length === 0) {
      alertsContainer.innerHTML = routeSummary + `
        <div class="alert alert-info mt-3">
          No traffic incidents found in this area.
        </div>
      `;
      return;
    }

    const today = new Date().toDateString();
    incidents.sort((a, b) => extractEpoch(b.start) - extractEpoch(a.start));

    let trafficHTML = routeSummary + `<h6 class="mt-3">Found ${incidents.length} traffic incidents:</h6>`;
    for (const incident of incidents) {
      const epoch = extractEpoch(incident.start);
      const incidentDate = new Date(epoch);
      const incidentDateStr = incidentDate.toDateString();
      const incidentTimeStr = incidentDate.toLocaleTimeString();
      const isToday = incidentDateStr === today;

      // Add polylines only for incidents from today.
      if (isToday) {
        const lat1 = incident.point.coordinates[0];
        const lng1 = incident.point.coordinates[1];
        const lat2 = incident.toPoint?.coordinates?.[0] || lat1;
        const lng2 = incident.toPoint?.coordinates?.[1] || lng1;
        const line = L.polyline([[lat1, lng1], [lat2, lng2]], {
          color: 'red',
          weight: 4,
          dashArray: '5, 10'
        }).addTo(map);
        window.trafficLines.push(line);
      }

      trafficHTML += `
        <div class="traffic-item ${isToday ? 'alert-warning' : ''}">
          <strong>${incident.title}</strong><br>
          ${incident.description}<br>
          <small>Severity: ${incident.severity} | ${incidentDateStr}, ${incidentTimeStr}</small>
        </div>
      `;
    }
    alertsContainer.innerHTML = trafficHTML;
  } catch (err) {
    console.error("Traffic error:", err);
    document.getElementById("trafficAlerts").innerHTML += `
      <div class="alert alert-danger">
        Failed to fetch traffic data.
      </div>
    `;
  }
}

function extractEpoch(dotNetTimeStr) {
  const match = /\/Date\((\d+)\)\//.exec(dotNetTimeStr);
  return match ? parseInt(match[1]) : 0;
}
