// Tree Map Application JavaScript

// Global variables
let map;
let treeMarkers = [];
let markerClusterGroup;
let treeData = [];
let userMarker;
let headingMarker;
let displayScientificNames = false; // Changed default to common names
let autoRotateMap = true; // Track whether map should auto-rotate based on orientation

// Initialize the map
function initMap() {
  console.log("Initializing map...");
  // Create a map centered on Evanston, IL
  map = L.map("map", {
    maxZoom: 25, // Very high but finite number
    zoomSnap: 0, // Disable zoom snapping
    zoomDelta: 0.1, // Allow for very fine zoom control
    wheelPxPerZoomLevel: 150, // Make scroll wheel zooming very gradual
  }).setView([42.0451, -87.6877], 14);

  // Add OpenStreetMap tile layer
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 25, // Match the map's maxZoom
  }).addTo(map);

  // Initialize marker cluster group with improved settings for precision
  markerClusterGroup = L.markerClusterGroup({
    chunkedLoading: true,
    chunkInterval: 100,
    chunkDelay: 50,
    maxClusterRadius: function (zoom) {
      // Reduce clustering radius as zoom level increases
      return zoom >= 22
        ? 3
        : zoom >= 20
        ? 5
        : zoom >= 18
        ? 10
        : zoom >= 16
        ? 20
        : zoom >= 14
        ? 40
        : 60;
    },
    disableClusteringAtZoom: 22, // Disable clustering at very high zoom
    spiderfyOnMaxZoom: false,
    showCoverageOnHover: true,
    zoomToBoundsOnClick: true,
  });

  map.addLayer(markerClusterGroup);

  // Add a button for getting the user's location
  const locationButton = L.control({ position: "topleft" });
  locationButton.onAdd = function (map) {
    const div = L.DomUtil.create("div", "leaflet-bar leaflet-control");
    div.innerHTML = `<a href="#" title="Show My Location" style="font-weight: bold; text-decoration: none; color: black; display: block; text-align: center; height: 30px; width: 30px; line-height: 30px; background-color: white;">📍</a>`;
    div.onclick = function () {
      getUserLocation();
      return false;
    };
    return div;
  };
  locationButton.addTo(map);

  // Add loading indicator
  const loadingIndicator = L.control({ position: "bottomleft" });
  loadingIndicator.onAdd = function (map) {
    const div = L.DomUtil.create("div", "info-panel");
    div.id = "loading-indicator";
    div.innerHTML = "Loading tree data...";
    div.style.display = "none";
    return div;
  };
  loadingIndicator.addTo(map);

  // Add count display
  const treeCountDisplay = L.control({ position: "topright" });
  treeCountDisplay.onAdd = function (map) {
    const div = L.DomUtil.create("div", "info-panel");
    div.id = "tree-count";
    div.innerHTML = "Loading trees...";
    return div;
  };
  treeCountDisplay.addTo(map);

  // Add name toggle button
  const nameToggleButton = L.control({ position: "bottomright" });
  nameToggleButton.onAdd = function (map) {
    const div = L.DomUtil.create("div", "leaflet-bar leaflet-control");
    div.innerHTML = `<a href="#" id="name-toggle" title="Toggle Scientific/Common Names" 
                    style="font-weight: bold; text-decoration: none; color: black; 
                    display: block; text-align: center; padding: 5px; 
                    background-color: white; width: auto;">Scientific Names</a>`;
    div.onclick = function () {
      toggleNameDisplay();
      return false;
    };
    return div;
  };
  nameToggleButton.addTo(map);

  // Add a button to toggle map rotation
  const rotateToggleButton = L.control({ position: "topleft" });
  rotateToggleButton.onAdd = function (map) {
    const div = L.DomUtil.create("div", "leaflet-bar leaflet-control");
    div.innerHTML = `<a href="#" id="rotate-toggle" title="Toggle Map Rotation" 
                    style="font-weight: bold; text-decoration: none; color: black; 
                    display: block; text-align: center; height: 30px; width: 30px; 
                    line-height: 30px; background-color: white;">🧭</a>`;
    div.onclick = function () {
      toggleMapRotation();
      return false;
    };
    return div;
  };
  rotateToggleButton.addTo(map);

  // Add event listener for map movement to update visible trees
  map.on("moveend", function () {
    if (window.fullTreeData) {
      updateVisibleTrees();
    }
  });

  // When map zoom changes, adjust marker sizes for better precision
  map.on("zoomend", function () {
    const currentZoom = map.getZoom();

    // Only refresh if we're at high zoom levels where precision matters
    if (currentZoom >= 17) {
      updateVisibleTrees();
    }
  });

  // Automatically request user location after map is initialized
  setTimeout(function () {
    getUserLocation();
  }, 1000); // Short delay to ensure map is ready

  // Setup device orientation if available
  setupDeviceOrientation();

  console.log("Map initialized, loading tree data...");
  // Load tree data
  loadTreeData();

  // Disable touch event restrictions
  document.addEventListener(
    "gesturestart",
    function (e) {
      e.preventDefault();
    },
    { passive: false }
  );

  document.addEventListener(
    "gesturechange",
    function (e) {
      e.preventDefault();
    },
    { passive: false }
  );

  // Make sure map supports rotation
  enableMapRotation();
}

// Setup device orientation to get compass heading
function setupDeviceOrientation() {
  if (window.DeviceOrientationEvent && "ontouchstart" in window) {
    // Check if we need iOS permission
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      // iOS 13+ devices need to request permission
      // Show a modal/overlay to prompt user action immediately
      showOrientationPermissionPrompt();
    } else {
      // Non-iOS devices - directly add event listener
      window.addEventListener("deviceorientation", handleOrientation);
    }
  }
}

// Show a prompt to get orientation permission on iOS
function showOrientationPermissionPrompt() {
  // Create and show an overlay with instructions
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(0,0,0,0.7)";
  overlay.style.zIndex = "1000";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.color = "white";
  overlay.style.textAlign = "center";
  overlay.style.padding = "20px";

  overlay.innerHTML = `
    <div style="background-color: #333; padding: 20px; border-radius: 10px; max-width: 300px;">
      <h2>Enable Compass</h2>
      <p>Tap anywhere on this message to enable the compass feature for better navigation.</p>
      <button style="background-color: #4285F4; border: none; color: white; padding: 10px 20px; 
                    border-radius: 5px; font-weight: bold; margin-top: 15px;">Enable Compass</button>
    </div>
  `;

  document.body.appendChild(overlay);

  // Add click handler to the overlay
  overlay.addEventListener(
    "click",
    function () {
      // Request permission
      DeviceOrientationEvent.requestPermission()
        .then((permissionState) => {
          if (permissionState === "granted") {
            window.addEventListener("deviceorientation", handleOrientation);
            window.hasOrientationPermission = true; // Track that permission is granted
            // Remove the overlay after granting permission
            document.body.removeChild(overlay);
          } else {
            // Update overlay to show permission was denied
            overlay.innerHTML = `
            <div style="background-color: #333; padding: 20px; border-radius: 10px; max-width: 300px;">
              <h2>Permission Denied</h2>
              <p>You denied compass permissions. Some features will be limited.</p>
              <button style="background-color: #4285F4; border: none; color: white; padding: 10px 20px; 
                          border-radius: 5px; font-weight: bold; margin-top: 15px;">Close</button>
            </div>
          `;

            // Add a new click handler to close the overlay
            overlay.addEventListener(
              "click",
              function () {
                document.body.removeChild(overlay);
              },
              { once: true }
            );
          }
        })
        .catch((error) => {
          console.error(
            "Error requesting device orientation permission:",
            error
          );
          // Update overlay to show error
          overlay.innerHTML = `
          <div style="background-color: #333; padding: 20px; border-radius: 10px; max-width: 300px;">
            <h2>Error</h2>
            <p>There was a problem accessing compass features.</p>
            <button style="background-color: #4285F4; border: none; color: white; padding: 10px 20px; 
                        border-radius: 5px; font-weight: bold; margin-top: 15px;">Close</button>
          </div>
        `;

          // Add a new click handler to close the overlay
          overlay.addEventListener(
            "click",
            function () {
              document.body.removeChild(overlay);
            },
            { once: true }
          );
        });
    },
    { once: true }
  );
}

// Handle device orientation data to show heading and rotate map
function handleOrientation(event) {
  // Alpha is the compass direction the device is facing in degrees
  const heading = event.webkitCompassHeading || Math.abs(event.alpha - 360);

  if (heading && userMarker) {
    // Track that we have orientation permission
    window.hasOrientationPermission = true;

    // If auto-rotate is enabled, rotate the map to match the device orientation
    if (autoRotateMap && map) {
      // Set the map bearing to match the device heading
      map.setBearing(heading);
    }

    // If we already have a heading marker, update it
    if (headingMarker) {
      map.removeLayer(headingMarker);
    }

    // Get user position
    const pos = userMarker.getLatLng();

    // Create a line showing the direction the user is facing
    const headingLine = [
      [pos.lat, pos.lng],
      [
        pos.lat + 0.0003 * Math.cos((heading * Math.PI) / 180),
        pos.lng + 0.0003 * Math.sin((heading * Math.PI) / 180),
      ],
    ];

    // Add the heading indicator
    headingMarker = L.polyline(headingLine, {
      color: "#4285F4",
      weight: 5,
      opacity: 0.7,
    }).addTo(map);
  }
}

// Get user's current location
function getUserLocation() {
  if (navigator.geolocation) {
    // Show a message while we're getting location
    showLoading("Getting your location...");

    navigator.geolocation.getCurrentPosition(
      // Success callback
      (position) => {
        hideLoading();
        const userLocation = [
          position.coords.latitude,
          position.coords.longitude,
        ];

        // Remove previous user marker if exists
        if (userMarker) {
          map.removeLayer(userMarker);
        }

        // Remove previous heading marker if exists
        if (headingMarker) {
          map.removeLayer(headingMarker);
        }

        // Add a marker at the user's location - WITHOUT popup
        userMarker = L.marker(userLocation, {
          icon: L.divIcon({
            className: "user-marker",
            html: '<div style="background-color: #4285F4; width: 15px; height: 15px; border-radius: 50%; border: 2px solid white;"></div>',
            iconSize: [15, 15],
            iconAnchor: [7, 7],
          }),
        }).addTo(map);

        // Center the map on the user's location at maximum zoom
        map.setView(userLocation, 19);

        // After getting location, make sure orientation is also enabled for iOS devices
        if (
          typeof DeviceOrientationEvent.requestPermission === "function" &&
          !window.hasOrientationPermission
        ) {
          showOrientationPermissionPrompt();
        }
      },
      // Error callback - with improved error handling
      (error) => {
        hideLoading();
        console.error("Error getting location:", error);

        let errorMessage = "";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              "Location permission was denied. Please enable location services in your browser settings and try again.";
            // Show instructions based on browser
            if (/Chrome/i.test(navigator.userAgent)) {
              errorMessage +=
                "\n\nIn Chrome: Click the lock icon in the address bar, then set Location to 'Allow'.";
            } else if (/Firefox/i.test(navigator.userAgent)) {
              errorMessage +=
                "\n\nIn Firefox: Click the lock icon in the address bar, then go to Permissions and allow Location Access.";
            } else if (/Safari/i.test(navigator.userAgent)) {
              errorMessage +=
                "\n\nIn Safari: Go to Safari Preferences > Websites > Location and allow for this site.";
            }
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage =
              "Location information is unavailable. Try again later or check your device settings.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again.";
            break;
          default:
            errorMessage =
              "An unknown error occurred while getting your location. Please try again.";
        }

        // Show error alert with more helpful information
        alert(errorMessage);

        // Fall back to a default view of Evanston
        map.setView([42.0451, -87.6877], 15);
      },
      // Options - increased timeout and improved accuracy
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increased from 10000 to 15000
        maximumAge: 0,
      }
    );
  } else {
    alert(
      "Geolocation is not supported by your browser. Please use a modern browser like Chrome, Firefox, or Safari."
    );
  }
}

// Show loading indicator
function showLoading(message = "Loading tree data...") {
  const indicator = document.getElementById("loading-indicator");
  if (indicator) {
    indicator.style.display = "block";
    indicator.innerHTML = message;
  }
}

// Hide loading indicator
function hideLoading() {
  const indicator = document.getElementById("loading-indicator");
  if (indicator) {
    indicator.style.display = "none";
  }
}

// Update tree count display
function updateTreeCount(visible, total) {
  const countDisplay = document.getElementById("tree-count");
  if (countDisplay) {
    countDisplay.innerHTML = `Showing ${visible} of ${total} trees`;
  }
}

// Load tree data from file
async function loadTreeData() {
  showLoading("Loading tree data...");
  console.log("Attempting to load tree data...");

  try {
    // Check if we're running on github.io or locally
    const isGitHubPages = window.location.hostname.includes("github.io");

    // Set the correct URL based on environment
    const url = isGitHubPages
      ? "https://raw.githubusercontent.com/gregloryus/gregloryus.github.io/master/trees.geojson"
      : "trees.geojson";

    console.log("Trying to load from:", url);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    showLoading("Processing GeoJSON data...");
    const data = await response.json();

    console.log(
      "Successfully loaded GeoJSON data:",
      data.features
        ? `${data.features.length} features found`
        : "Invalid format"
    );

    // Store full data
    window.fullTreeData = data;

    // Display initial subset
    displayInitialTrees(data);
  } catch (error) {
    hideLoading();
    console.error("Error in loadTreeData:", error);
    alert(`Error loading tree data: ${error.message}`);
  }
}

// Convert parsed CSV data to GeoJSON format
function convertToGeoJSON(csvData) {
  return csvData
    .map((record) => {
      return {
        type: "Feature",
        properties: { ...record },
        geometry: {
          type: "Point",
          coordinates: [
            parseFloat(record.LONGITUDE || 0),
            parseFloat(record.LATITUDE || 0),
          ],
        },
      };
    })
    .filter(
      (feature) =>
        !isNaN(feature.geometry.coordinates[0]) &&
        !isNaN(feature.geometry.coordinates[1]) &&
        feature.geometry.coordinates[0] !== 0 &&
        feature.geometry.coordinates[1] !== 0
    );
}

// Simple CSV parser
function parseCSV(csvText) {
  const lines = csvText.split("\n");
  const headers = lines[0].split(",").map((header) => header.trim());

  return lines
    .slice(1)
    .map((line) => {
      if (!line.trim()) return null; // Skip empty lines

      const values = line.split(",");
      const obj = {};

      headers.forEach((header, index) => {
        obj[header] = values[index] ? values[index].trim() : "";
      });

      return obj;
    })
    .filter((item) => item !== null); // Remove null values
}

// Display initial subset of trees
function displayInitialTrees(data) {
  console.log("Displaying initial trees...");
  if (!data || !data.features) {
    console.error("Invalid data format:", data);
    hideLoading();
    return;
  }

  // Clear the marker cluster
  markerClusterGroup.clearLayers();

  const bounds = map.getBounds();
  let visibleFeatures = [];

  // Only filter by bounds if we have a valid bounds object
  if (bounds && bounds.isValid()) {
    visibleFeatures = data.features.filter((feature) => {
      if (!feature.geometry || !feature.geometry.coordinates) return false;
      const coords = feature.geometry.coordinates;
      return bounds.contains(L.latLng(coords[1], coords[0]));
    });
  } else {
    // If bounds aren't valid yet, just take a subset
    visibleFeatures = data.features.slice(0, 500);
  }

  // Limit to 500 trees initially for performance
  const limitedFeatures = visibleFeatures.slice(0, 500);

  console.log(
    `Loading ${limitedFeatures.length} of ${data.features.length} trees initially`
  );
  showLoading(`Loading ${limitedFeatures.length} trees...`);

  // Create filtered data
  const filteredData = {
    type: "FeatureCollection",
    features: limitedFeatures,
  };

  // Create GeoJSON layer
  const geoJsonLayer = L.geoJSON(filteredData, {
    pointToLayer: createTreeMarker,
    onEachFeature: bindTreePopup,
  });

  // Add to cluster group
  markerClusterGroup.addLayer(geoJsonLayer);

  // Update counter
  updateTreeCount(limitedFeatures.length, data.features.length);

  // Hide loading indicator
  hideLoading();
}

// Create markers for trees
function createTreeMarker(feature, latlng) {
  const currentZoom = map.getZoom();

  // At highest zoom levels (18+), use text labels instead of circles
  if (currentZoom >= 18) {
    // Get the appropriate name based on current display mode
    const genus = feature.properties.genus || "";
    const species = feature.properties.spp || "";
    const commonName = feature.properties.common || "Unknown";

    let displayName;
    if (displayScientificNames) {
      // For scientific names: ensure we don't repeat the genus and use lowercase
      // Check if species already starts with the genus name
      const lowerSpecies = species.toLowerCase();
      const lowerGenus = genus.toLowerCase();

      if (lowerSpecies.startsWith(lowerGenus)) {
        displayName = lowerSpecies; // Species already includes genus
      } else {
        displayName = `${lowerGenus} ${lowerSpecies}`.trim(); // Concatenate genus and species
      }
    } else {
      // For common names, use as is
      displayName = commonName;
    }

    // Split the name by spaces and join with line breaks to create a more compact label
    const words = displayName.split(" ");
    displayName = words.join("<br>");

    // Create a text label with the tree name
    return L.marker(latlng, {
      icon: L.divIcon({
        className: "tree-text-label",
        html: `<div style="text-transform: ${
          displayScientificNames ? "lowercase" : "uppercase"
        }; 
              color: ${getTreeColor(feature.properties)}; 
              text-shadow: 0px 0px 2px #000, 0px 0px 2px #000; font-size: 11px; 
              text-align: center; background-color: rgba(0,0,0,0.3); 
              padding: 3px; border-radius: 4px; font-weight: bold;">${displayName}</div>`,
        iconSize: [100, 60],
        iconAnchor: [50, 30],
      }),
    });
  } else {
    // Default style for lower zoom levels - circle markers
    const markerOptions = {
      radius: 5,
      fillColor: getTreeColor(feature.properties),
      color: "#000",
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8,
    };

    // At higher zoom levels (but below 18), use slightly larger markers
    if (currentZoom >= 16) {
      markerOptions.radius = 6;
      markerOptions.weight = 2;
    }

    return L.circleMarker(latlng, markerOptions);
  }
}

// Get color based on tree genus
function getTreeColor(properties) {
  const genus = properties.genus || "";

  // Color coding by common genera
  const genusColors = {
    Acer: "#e41a1c", // Maple - red
    Quercus: "#4daf4a", // Oak - green
    Ulmus: "#377eb8", // Elm - blue
    Tilia: "#ff7f00", // Linden - orange
    Gleditsia: "#984ea3", // Honeylocust - purple
    Fraxinus: "#ffff33", // Ash - yellow
    Celtis: "#a65628", // Hackberry - brown
    Platanus: "#f781bf", // Sycamore - pink
  };

  return genusColors[genus] || "#999999"; // Default gray
}

// Bind popup to tree marker
function bindTreePopup(feature, layer) {
  if (feature.properties) {
    // Get scientific name (genus + species)
    const genus = feature.properties.genus || "";
    const species = feature.properties.spp || "";
    const commonName = feature.properties.common || "Unknown";
    const scientificName = `${genus} ${species}`.trim();

    let popupContent = `<div class="tree-popup">
                      <h3>${scientificName || commonName}</h3>
                      <p><em>${commonName}</em></p>
                      <table>`;

    // Add important properties to the popup
    const importantProps = [
      "dbh",
      "address",
      "street",
      "lifecycle",
      "created_date",
    ];
    importantProps.forEach((prop) => {
      if (feature.properties[prop]) {
        const label = prop
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
        popupContent += `<tr><td><strong>${label}:</strong></td><td>${feature.properties[prop]}</td></tr>`;
      }
    });

    // Add a "View all details" expandable section
    popupContent += `</table>
                    <p><a href="#" onclick="toggleDetails(this); return false;">View all details</a></p>
                    <div class="all-details" style="display:none;">
                      <table>`;

    // Add all properties
    for (const [key, value] of Object.entries(feature.properties)) {
      if (value && !importantProps.includes(key)) {
        const label = key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
        popupContent += `<tr><td><strong>${label}:</strong></td><td>${value}</td></tr>`;
      }
    }

    popupContent += `</table></div></div>`;

    layer.bindPopup(popupContent);
  }
}

// Toggle details in popup
window.toggleDetails = function (link) {
  const detailsDiv = link.parentNode.nextElementSibling;
  if (detailsDiv.style.display === "none") {
    detailsDiv.style.display = "block";
    link.textContent = "Hide details";
  } else {
    detailsDiv.style.display = "none";
    link.textContent = "View all details";
  }
};

// Function to toggle between scientific and common names
function toggleNameDisplay() {
  displayScientificNames = !displayScientificNames;

  // Update the button text
  const toggleButton = document.getElementById("name-toggle");
  if (toggleButton) {
    toggleButton.textContent = displayScientificNames
      ? "Scientific Names"
      : "Common Names";
  }

  // Refresh the visible trees to update the display
  if (window.fullTreeData) {
    updateVisibleTrees();
  }
}

// Update visible trees when map is moved
function updateVisibleTrees() {
  if (!window.fullTreeData || !window.fullTreeData.features) return;

  console.log("Updating visible trees...");
  showLoading("Updating visible trees...");

  // Get current map bounds
  const bounds = map.getBounds();

  // Filter trees in current view
  const visibleFeatures = window.fullTreeData.features.filter((feature) => {
    if (!feature.geometry || !feature.geometry.coordinates) return false;
    const coords = feature.geometry.coordinates;
    return bounds.contains(L.latLng(coords[1], coords[0]));
  });

  // Limit number of trees for performance
  const limitedFeatures = visibleFeatures.slice(0, 1000);

  console.log(
    `Loading ${limitedFeatures.length} of ${visibleFeatures.length} visible trees (from ${window.fullTreeData.features.length} total)`
  );

  // Create filtered data
  const filteredData = {
    type: "FeatureCollection",
    features: limitedFeatures,
  };

  // Clear existing markers and add new ones
  markerClusterGroup.clearLayers();

  // Create GeoJSON layer with the current name display setting
  const geoJsonLayer = L.geoJSON(filteredData, {
    pointToLayer: createTreeMarker,
    onEachFeature: bindTreePopup,
  });

  // Add to cluster group
  markerClusterGroup.addLayer(geoJsonLayer);

  // Update counter
  updateTreeCount(limitedFeatures.length, window.fullTreeData.features.length);

  // Hide loading indicator
  hideLoading();
}

// Function to enable map rotation capabilities
function enableMapRotation() {
  // Check if Leaflet has already been extended with rotation capabilities
  if (!L.Map.prototype.setBearing) {
    // Add rotation capabilities to Leaflet map
    L.Map.include({
      setBearing: function (bearing) {
        // Store current center
        const center = this.getCenter();

        // Rotate the map container
        this.getContainer().style.transform = `rotate(${-bearing}deg)`;

        // Mark the map as rotated so we know about it
        this._bearing = bearing;

        // Fire a rotation event
        this.fire("rotate");

        return this;
      },

      getBearing: function () {
        return this._bearing || 0;
      },

      resetBearing: function () {
        this.setBearing(0);
        return this;
      },
    });
  }
}

// Function to toggle map rotation mode
function toggleMapRotation() {
  autoRotateMap = !autoRotateMap;

  const toggleButton = document.getElementById("rotate-toggle");
  if (toggleButton) {
    // Update visual appearance based on state
    if (autoRotateMap) {
      toggleButton.style.backgroundColor = "#4285F4";
      toggleButton.style.color = "white";
    } else {
      toggleButton.style.backgroundColor = "white";
      toggleButton.style.color = "black";
      // Reset the map rotation to north up
      map.resetBearing();
    }
  }

  // If we don't have orientation permissions but want to rotate, prompt for them
  if (
    autoRotateMap &&
    !window.hasOrientationPermission &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    showOrientationPermissionPrompt();
  }
}

// Initialize when the page loads
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, initializing map...");
  initMap();
});
