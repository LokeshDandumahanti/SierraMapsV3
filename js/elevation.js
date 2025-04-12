// js/elevation.js
import { map, API_KEY, BASE_URL } from "./map.js";

const SAMPLE_COUNT = 20;

export async function getElevationProfile() {
  const srcText = document.getElementById('elevationStart').value;
  const dstText = document.getElementById('elevationEnd').value;
  if (!srcText || !dstText) {
    alert("Please enter both start and end locations.");
    return;
  }

  const srcLoc = await geocode(srcText);
  const dstLoc = await geocode(dstText);
  if (!srcLoc || !dstLoc) {
    alert("Location not found.");
    return;
  }

  // Set view and optionally clear previous layers.
  map.setView(srcLoc, 8);

  try {
    const routeRes = await fetch(`${BASE_URL}/route/${srcLoc.lat},${srcLoc.lng}/${dstLoc.lat},${dstLoc.lng}/1/?api_key=${API_KEY}`);
    const routeData = await routeRes.json();
    const path = routeData.resourceSet?.[0]?.resources?.[0]?.routePath?.line?.coordinates;
    if (!path || path.length === 0) {
      alert("Route not found.");
      return;
    }

    const leafletPath = path.map(([lat, lng]) => [lat, lng]);
    const routeLine = L.polyline(leafletPath, { color: 'green', weight: 4 }).addTo(map);
    map.fitBounds(routeLine.getBounds());

    // Sample points along the route.
    const sampled = [];
    const step = Math.floor(path.length / SAMPLE_COUNT);
    for (let i = 0; i < path.length; i += step) {
      sampled.push(path[i]);
      if (sampled.length === SAMPLE_COUNT) break;
    }
    const pointParam = sampled.map(p => `${p[0]},${p[1]}`).join(',');
    const elevationRes = await fetch(`${BASE_URL}/elevation/polyline/?points=${pointParam}&samples=${SAMPLE_COUNT}&heights=sealevel&api_key=${API_KEY}`);
    const elevationData = await elevationRes.json();
    const elevations = elevationData.resourceSet?.[0]?.resources?.[0]?.elevations;
    if (!elevations || elevations.length === 0) {
      alert("Elevation data not found.");
      return;
    }

    // Calculate cumulative distance for the sampled points.
    const distance = [0];
    for (let i = 1; i < sampled.length; i++) {
      distance.push(distance[i - 1] + getDistance(
        { lat: sampled[i - 1][0], lng: sampled[i - 1][1] },
        { lat: sampled[i][0], lng: sampled[i][1] }
      ));
    }

    drawElevationChart(distance, elevations);
    // Switch to the elevation tab.
    document.getElementById('elevation-tab').click();

  } catch (err) {
    console.error("Elevation error:", err);
    alert("Failed to get elevation data.");
  }
}

async function geocode(address) {
  try {
    const res = await fetch(`${BASE_URL}/geocoding/${encodeURIComponent(address)}/?api_key=${API_KEY}`);
    const data = await res.json();
    if (!data || !data.resourceSet || !Array.isArray(data.resourceSet) || data.resourceSet.length === 0) {
      return null;
    }
    const first = data.resourceSet[0];
    const lat = first.geo?.latitude || first.address?.geo?.latitude;
    const lng = first.geo?.longitude || first.address?.geo?.longitude;
    if (typeof lat !== "number" || typeof lng !== "number") return null;
    return { lat: parseFloat(lat), lng: parseFloat(lng) };
  } catch (err) {
    console.error("Geocoding error:", err);
    return null;
  }
}

function getDistance(a, b) {
  const R = 6371; // Earth's radius in km.
  const dLat = deg2rad(b.lat - a.lat);
  const dLon = deg2rad(b.lng - a.lng);
  const lat1 = deg2rad(a.lat);
  const lat2 = deg2rad(b.lat);
  const a_ = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(a_), Math.sqrt(1 - a_));
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function drawElevationChart(xLabels, yValues) {
  const ctx = document.getElementById('elevationChart').getContext('2d');
  if (window.elevationChart instanceof Chart) {
    window.elevationChart.destroy();
  }

  // Calculate the minimum and maximum elevations with a 10% padding.
  const minElevation = Math.min(...yValues);
  const maxElevation = Math.max(...yValues);
  const padding = (maxElevation - minElevation) * 0.1;

  window.elevationChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: xLabels.map(d => d.toFixed(2) + ' km'),
      datasets: [{
        label: 'Elevation (m)',
        data: yValues,
        borderColor: 'green',
        fill: true,
        backgroundColor: 'rgba(0,128,0,0.2)',
        pointRadius: 2,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: 'Distance (km)' }
        },
        y: {
          // Using suggestedMin and suggestedMax so that the y-axis scales properly.
          suggestedMin: minElevation - padding,
          suggestedMax: maxElevation + padding,
          title: { display: true, text: 'Elevation (m)' }
        }
      },
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: context => `Elevation: ${context.raw} m`
          }
        }
      }
    }
  });
}
