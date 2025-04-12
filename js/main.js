// js/main.js
import "./map.js";       // Initializes the map and shared layers
import { handleRouting } from "./routing.js";
import { getElevationProfile } from "./elevation.js";
import { fetchPlaces } from "./places.js";

// Expose functions globally so that the inline onclick attributes in the HTML work.
window.handleRouting = handleRouting;
window.getElevationProfile = getElevationProfile;
window.fetchPlaces = fetchPlaces;

// Initialize Bootstrap tabs and force map resize when tabs are shown.
document.addEventListener('DOMContentLoaded', () => {
  const triggerTabList = Array.from(document.querySelectorAll('#mapTabs button'));
  triggerTabList.forEach(triggerEl => {
    const tabTrigger = new bootstrap.Tab(triggerEl);
    triggerEl.addEventListener('click', event => {
      event.preventDefault();
      tabTrigger.show();
    });
  });

  document.querySelectorAll('#mapTabs button').forEach(tab => {
    tab.addEventListener('shown.bs.tab', () => {
      // Assuming map is a global variable from map.js (or exported to window if needed)
      window.map.invalidateSize();
    });
  });
});
