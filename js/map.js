// js/map.js

// Hardcoded API key and Base URL used by all modules.
export const API_KEY = 'fbc463e658ec6dce63a2087393a279aa';
export const BASE_URL = "https://sierramaps.ftp.sh/api";

// Initialize the map and add the OSM tile layer.
export const map = L.map('map').setView([37.78, -122.43], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '© OpenStreetMap'
}).addTo(map);

// Shared layers and variables.
export const drawnItems = new L.FeatureGroup().addTo(map);
export const markerLayer = new L.LayerGroup().addTo(map);
export let trafficLines = [];
export let routeLine = null;

// Draw control for the spatial selection feature.
const drawControl = new L.Control.Draw({
  draw: {
    polygon: false,
    circle: false,
    marker: false,
    polyline: false,
    circlemarker: false,
    rectangle: {
      shapeOptions: {
        color: '#007bff'
      }
    }
  },
  edit: {
    featureGroup: drawnItems,
    edit: false,
    remove: true
  }
});
map.addControl(drawControl);

map.on('draw:created', e => {
  drawnItems.clearLayers();
  drawnItems.addLayer(e.layer);
  const bounds = e.layer.getBounds();
  // Export the bounding box globally for use in places.js.
  window.bbox = {
    south: bounds.getSouth(),
    west: bounds.getWest(),
    north: bounds.getNorth(),
    east: bounds.getEast()
  };
});
