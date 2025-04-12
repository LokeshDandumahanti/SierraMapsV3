// js/places.js
import { map, API_KEY, BASE_URL, markerLayer } from "./map.js";

export async function fetchPlaces() {
  if (!window.bbox) {
    alert("Draw a bounding box on the map first.");
    return;
  }
  try {
    const url = `${BASE_URL}/spatialdata/?south=${window.bbox.south}&west=${window.bbox.west}&north=${window.bbox.north}&east=${window.bbox.east}&top=15&api_key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const places = data.resourceSet || [];
    document.getElementById('placesContainer').innerHTML = '';
    markerLayer.clearLayers(); // Clear previous markers.
    if (places.length === 0) {
      document.getElementById('placesContainer').innerHTML = `
        <div class="col-12">
          <div class="alert alert-info">No places found in the selected area. Try a different location.</div>
        </div>
      `;
      return;
    }

    for (const place of places) {
      const weather = await fetchWeather(place.Latitude, place.Longitude);
      showPlaceCard(place, weather);
      addPlaceMarker(place, weather);
    }
    // Switch to the places tab.
    document.getElementById('places-tab').click();
  } catch (err) {
    console.error("Places error:", err);
    alert("Failed to get nearby places.");
  }
}

async function fetchWeather(lat, lng) {
  try {
    const res = await fetch(`${BASE_URL}/weather/${lat}/${lng}/metric/?api_key=${API_KEY}`);
    const data = await res.json();
    return data.weather_data?.current || {};
  } catch (err) {
    console.error("Weather error:", err);
    return {};
  }
}

function showPlaceCard(place, weather) {
  const icon = weather.weather?.[0]?.icon || "01d";
  const temp = weather.temp ? `${weather.temp}°C` : "N/A";
  const condition = weather.weather?.[0]?.description || "Unknown";
  const card = `
    <div class="col-md-4 place-card">
      <div class="card">
        <div class="card-body">
          <h5 class="card-title">${place.DisplayName}</h5>
          <p class="card-text">${place.AddressLine || ''}, ${place.Locality || ''}, ${place.AdminDistrict || ''}</p>
          <p class="mb-1"><strong>Phone:</strong> ${place.Phone || "N/A"}</p>
          <p><strong>Weather:</strong> ${condition} <img src="https://openweathermap.org/img/wn/${icon}.png"> <strong>${temp}</strong></p>
          <button class="btn btn-sm btn-outline-primary" onclick="map.setView([${place.Latitude}, ${place.Longitude}], 17)">View on Map</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('placesContainer').insertAdjacentHTML('beforeend', card);
}

function addPlaceMarker(place, weather) {
  const iconUrl = `https://openweathermap.org/img/wn/${weather.weather?.[0]?.icon || "01d"}.png`;
  const popupContent = `
    <strong>${place.DisplayName}</strong><br>
    ${place.Locality || ''}, ${place.AdminDistrict || ''}<br>
    <img src="${iconUrl}" style="width:24px; vertical-align:middle;"> ${weather.temp ? weather.temp + "°C" : "N/A"}
  `;
  L.marker([place.Latitude, place.Longitude])
    .bindPopup(popupContent)
    .addTo(markerLayer);
}
