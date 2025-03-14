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

// Add the Leaflet.Rotate plugin dependencies at the top of the file

// Initialize the map
function initMap() {
  console.log("Initializing map...");
  // Create a map centered on Evanston, IL with rotation support
  map = L.map("map", {
    maxZoom: 50,
    zoomSnap: 0.5,
    zoomDelta: 1.0,
    wheelPxPerZoomLevel: 80,
    rotate: true, // Enable rotation capability
    bearing: 0, // Start with north up
    rotateControl: {
      // Add the rotation control
      closeOnZeroBearing: false,
      position: "topleft",
    },
    attributionControl: false, // Remove the attribution control
  }).setView([42.0451, -87.6877], 14);

  // Add OpenStreetMap tile layer without attribution
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    subdomains: "abcd",
    maxZoom: 50,
  }).addTo(map);

  // Initialize marker cluster group with improved settings for precision
  markerClusterGroup = L.markerClusterGroup({
    chunkedLoading: true,
    chunkInterval: 100,
    chunkDelay: 50,
    maxClusterRadius: function (zoom) {
      // Reduce clustering radius as zoom level increases
      // At zoom 18+, use minimal clustering values
      return zoom >= 20
        ? 1 // Almost no clustering at very high zoom
        : zoom >= 18
        ? 3 // Very minimal clustering at zoom 18-19
        : zoom >= 16
        ? 20
        : zoom >= 14
        ? 40
        : 60;
    },
    disableClusteringAtZoom: 18, // Completely disable clustering at zoom 18 and above
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

  // Setup device orientation with iOS focus
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
}

// Setup device orientation to get compass heading with iOS priority
function setupDeviceOrientation() {
  // Check if device supports orientation events
  if (window.DeviceOrientationEvent) {
    // Check if we're on iOS (iOS 13+ needs permission)
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      // iOS-specific setup
      setupiOSOrientation();
    } else {
      // Non-iOS setup (Android, desktop)
      window.addEventListener(
        "deviceorientationabsolute",
        handleOrientation,
        true
      );
      // Fallback to regular deviceorientation if absolute is not available
      window.addEventListener("deviceorientation", handleOrientation, true);
    }
  } else {
    console.log("Device orientation not supported on this device");
  }
}

// iOS-specific orientation setup
function setupiOSOrientation() {
  // If we already have permission, add the listener
  if (window.hasOrientationPermission) {
    window.addEventListener("deviceorientation", handleiOSOrientation, true);
    return;
  }

  // Show the permission prompt
  showOrientationPermissionPrompt();
}

// iOS-specific orientation handler
function handleiOSOrientation(event) {
  if (event.webkitCompassHeading !== undefined) {
    const heading = event.webkitCompassHeading;
    if (autoRotateMap && map) {
      map.setBearing(heading);
      updateHeadingIndicator(heading);
    }
  }
}

// General orientation handler (for non-iOS devices)
function handleOrientation(event) {
  let heading;

  // Try to get the most accurate heading depending on what's available
  if (event.webkitCompassHeading !== undefined) {
    // iOS compass heading
    heading = event.webkitCompassHeading;
  } else if (event.absolute === true && event.alpha !== null) {
    // Android absolute orientation (alpha is measured counterclockwise from west)
    // Convert to clockwise from north
    heading = (360 - event.alpha) % 360;
  } else if (event.alpha !== null) {
    // Fallback: non-absolute alpha
    heading = (360 - event.alpha) % 360;
  } else {
    // No usable heading data
    return;
  }

  // Only rotate if auto-rotation is enabled
  if (autoRotateMap && map) {
    map.setBearing(heading);
    updateHeadingIndicator(heading);
  }
}

// Update the heading indicator arrow
function updateHeadingIndicator(heading) {
  // Only update if we have a user marker
  if (!userMarker) return;

  // Get user position
  const pos = userMarker.getLatLng();

  // Remove previous heading marker if it exists
  if (headingMarker) {
    map.removeLayer(headingMarker);
  }

  // Create a line showing the direction
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

// Show a prompt optimized for iOS to get orientation permission
function showOrientationPermissionPrompt() {
  // Create an iOS-style overlay
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
  overlay.style.fontFamily =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  // iOS-style dialog content
  overlay.innerHTML = `
    <div style="background-color: #fff; padding: 20px; border-radius: 13px; max-width: 280px; color: #000;">
      <h2 style="margin-top: 0; font-size: 18px;">Allow Access to Motion & Orientation</h2>
      <p style="margin-bottom: 20px; font-size: 14px;">This enables the compass feature that shows which direction you're facing on the map.</p>
      <button style="background-color: #007AFF; border: none; color: white; padding: 10px 0; 
                  border-radius: 10px; font-weight: 600; margin-top: 15px; width: 100%; font-size: 16px;">Allow</button>
    </div>
  `;

  document.body.appendChild(overlay);

  // Handle the permission request when the user taps Allow
  overlay.querySelector("button").addEventListener(
    "click",
    function () {
      DeviceOrientationEvent.requestPermission()
        .then((permissionState) => {
          if (permissionState === "granted") {
            // Add the orientation event listener for iOS
            window.addEventListener(
              "deviceorientation",
              handleiOSOrientation,
              true
            );
            window.hasOrientationPermission = true;

            // Remove the overlay
            document.body.removeChild(overlay);
          } else {
            // Update overlay to show permission denial
            overlay.innerHTML = `
            <div style="background-color: #fff; padding: 20px; border-radius: 13px; max-width: 280px; color: #000;">
              <h2 style="margin-top: 0; font-size: 18px;">Permission Denied</h2>
              <p style="margin-bottom: 20px; font-size: 14px;">The compass feature won't work without motion access. You can enable it in Settings > Safari > Motion & Orientation Access.</p>
              <button style="background-color: #007AFF; border: none; color: white; padding: 10px 0; 
                          border-radius: 10px; font-weight: 600; margin-top: 15px; width: 100%; font-size: 16px;">Close</button>
            </div>
          `;

            // Add a new click handler to close the overlay
            overlay.querySelector("button").addEventListener(
              "click",
              function () {
                document.body.removeChild(overlay);
              },
              { once: true }
            );
          }
        })
        .catch((error) => {
          console.error("Error requesting orientation permission:", error);

          // Update overlay to show error
          overlay.innerHTML = `
          <div style="background-color: #fff; padding: 20px; border-radius: 13px; max-width: 280px; color: #000;">
            <h2 style="margin-top: 0; font-size: 18px;">Error</h2>
            <p style="margin-bottom: 20px; font-size: 14px;">There was a problem accessing compass features. Make sure your iOS is updated and try again.</p>
            <button style="background-color: #007AFF; border: none; color: white; padding: 10px 0; 
                        border-radius: 10px; font-weight: 600; margin-top: 15px; width: 100%; font-size: 16px;">Close</button>
          </div>
        `;

          // Add a new click handler to close the overlay
          overlay.querySelector("button").addEventListener(
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
  // Function intentionally left empty as we no longer show the count
  return;
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

  markerClusterGroup.clearLayers();

  const bounds = map.getBounds();
  let visibleFeatures = [];

  if (bounds && bounds.isValid()) {
    visibleFeatures = data.features.filter((feature) => {
      if (!feature.geometry || !feature.geometry.coordinates) return false;
      const coords = feature.geometry.coordinates;
      return bounds.contains(L.latLng(coords[1], coords[0]));
    });
  } else {
    visibleFeatures = data.features.slice(0, 500);
  }

  const limitedFeatures = visibleFeatures.slice(0, 500);

  console.log(
    `Loading ${limitedFeatures.length} of ${data.features.length} trees initially`
  );
  showLoading(`Loading ${limitedFeatures.length} trees...`);

  const filteredData = {
    type: "FeatureCollection",
    features: limitedFeatures,
  };

  // Use pointToLayer only, and remove onEachFeature
  const geoJsonLayer = L.geoJSON(filteredData, {
    pointToLayer: createTreeMarker,
  });

  markerClusterGroup.addLayer(geoJsonLayer);
  updateTreeCount(limitedFeatures.length, data.features.length);
  hideLoading();
}

// Create markers for trees
function createTreeMarker(feature, latlng) {
  const currentZoom = map.getZoom();
  const dbh = parseFloat(feature.properties.dbh) || 0;

  // At highest zoom levels (18+), use both circles proportional to DBH and text labels
  if (currentZoom >= 18) {
    // Skip trees with very small DBH when zoomed in
    if (dbh < 0.5) {
      // Create a basic marker for tiny trees that's easier to click
      return L.circle(latlng, {
        radius: 0.3, // Slightly larger for better clickability
        fillColor: getTreeColor(feature.properties),
        color: "#000",
        weight: 1,
        opacity: 0.7,
        fillOpacity: 0.3,
      }).bindPopup(createPopupContent(feature.properties));
    }

    // Create shared popup content for consistency
    const popupContent = createPopupContent(feature.properties);

    // Create a layer group to hold both the circle and text label
    const treeLayerGroup = L.layerGroup();

    // 1. Create a true-scale circle based on the DBH
    // DBH is in feet, convert to meters for Leaflet (1 foot = 0.3048 meters)
    const diameterInFeet = dbh;
    const radiusInMeters = (diameterInFeet / 2) * 0.3048;

    // Create a properly scaled circle marker
    const circleMarker = L.circle(latlng, {
      radius: radiusInMeters,
      fillColor: getTreeColor(feature.properties),
      color: "#000",
      weight: 1,
      opacity: 1.0,
      fillOpacity: 0.3,
    }).bindPopup(popupContent);

    treeLayerGroup.addLayer(circleMarker);

    // 2. Create clickable text label
    // Get the appropriate name based on current display mode
    const genus = feature.properties.genus || "";
    const species = feature.properties.spp || "";
    const commonName = feature.properties.common || "Unknown";

    let displayName;
    if (displayScientificNames) {
      // For scientific names: ensure we don't repeat the genus
      const lowerSpecies = species.toLowerCase();
      const lowerGenus = genus.toLowerCase();

      if (lowerSpecies.startsWith(lowerGenus)) {
        displayName = species; // Species already includes genus
      } else {
        displayName = `${genus} ${species}`.trim(); // Concatenate genus and species
      }
    } else {
      // For common names, use as is
      displayName = commonName;
    }

    // Split the name by spaces and join with line breaks to create a more compact label
    const words = displayName.split(" ");
    displayName = words.join("<br>");

    // Get the dynamically calculated font size
    const minFontSize = 9;
    const maxFontSize = 22;
    const fontSize = getSmartFontSize(dbh, minFontSize, maxFontSize);

    // Create a clickable text label with improved vertical centering
    const textLabel = L.marker(latlng, {
      icon: L.divIcon({
        className: "tree-text-label",
        html: `<div style="
              cursor: pointer;
              color: ${getTreeColor(feature.properties)}; 
              text-shadow: 0px 0px 3px #000; 
              font-size: ${fontSize}px; 
              text-align: center; 
              font-weight: bold;
              opacity: 0.9;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100%;
              padding: 0;">${displayName}</div>`,
        iconSize: [120, 80], // Larger size to be more clickable
        iconAnchor: [60, 40], // Center of the icon horizontally and vertically
      }),
      interactive: true, // Make sure it's interactive
      zIndexOffset: 1000, // Ensure text is above the circle
    }).bindPopup(popupContent); // Bind the same popup as the circle

    // Add click debugging to help see when text is clicked
    textLabel.on("click", function () {
      console.log("Text label clicked", feature.properties.spp);
    });

    treeLayerGroup.addLayer(textLabel);

    // Return the layer group containing both circle and text
    return treeLayerGroup;
  } else {
    // For lower zoom levels
    const diameterInFeet = Math.max(dbh, 2); // Ensure visibility at lower zooms
    let radiusInMeters = (diameterInFeet / 2) * 0.3048;

    // Calculate the minimum radius in meters that would represent 5px on screen
    // Get meters per pixel at current zoom and latitude
    const lat = latlng.lat;
    const metersPerPixel =
      (156543.03 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, currentZoom);
    const minRadiusInMeters = 5 * metersPerPixel;

    // Use the larger of the actual tree size or our minimum size
    radiusInMeters = Math.max(radiusInMeters, minRadiusInMeters);

    return L.circle(latlng, {
      radius: radiusInMeters,
      fillColor: getTreeColor(feature.properties),
      color: "#000",
      weight: 1,
      opacity: 1,
      fillOpacity: 0.3,
    }).bindPopup(createPopupContent(feature.properties));
  }
}

// Helper function to create consistent popup content
function createPopupContent(properties) {
  const species = properties.spp || "";
  const commonName = properties.common || "Unknown";
  const dbh = properties.dbh || "Unknown";

  // Format the date
  let lastUpdated = "";
  if (properties.created_date) {
    try {
      const date = new Date(properties.created_date);
      lastUpdated = date.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
    } catch (e) {
      lastUpdated = properties.created_date;
    }
  }

  // Create the popup HTML with monospace font and consistent formatting
  return `<div class="tree-popup" style="min-width: 200px; font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.5;">
    <div style="font-weight: bold; text-transform: uppercase;">${commonName}</div>
    <div style="font-style: italic;">${species}</div>
    <div>${dbh} ft. wide</div>
    ${
      lastUpdated
        ? `<div style="color: #777;">Last updated: ${lastUpdated}</div>`
        : ""
    }
  </div>`;
}

// Function to calculate a smart font size based on DBH
function getSmartFontSize(dbh, minFontSize, maxFontSize) {
  // Cache these calculations to avoid repeating for each tree
  if (
    !window.dbhStats ||
    window.dbhStatsLastUpdate !== window.lastVisibleUpdate
  ) {
    // Find min and max DBH values in the current visible trees
    const visibleDBHs = [];

    if (window.visibleTreeFeatures) {
      window.visibleTreeFeatures.forEach((feature) => {
        const dbh = parseFloat(feature.properties.dbh) || 0;
        if (dbh >= 0.5) {
          // Only consider visible trees
          visibleDBHs.push(dbh);
        }
      });
    }

    // Calculate statistics from visible trees
    let minDBH = Math.min(...visibleDBHs);
    let maxDBH = Math.max(...visibleDBHs);

    // If there are no visible trees or only one tree, use default range
    if (visibleDBHs.length <= 1 || minDBH === maxDBH) {
      minDBH = 1;
      maxDBH = 80;
    } else {
      // Check if the range is too narrow (less than 20% difference)
      const ratio = maxDBH / minDBH;
      if (ratio < 1.2) {
        // Expand the range to ensure at least 20% difference
        const midpoint = (minDBH + maxDBH) / 2;
        minDBH = midpoint / 1.1; // 10% below midpoint
        maxDBH = midpoint * 1.1; // 10% above midpoint
      }

      // Constrain the range to reasonable limits
      minDBH = Math.max(1, minDBH);
      maxDBH = Math.min(80, maxDBH);
    }

    // Save statistics for reuse
    window.dbhStats = {
      min: minDBH,
      max: maxDBH,
    };
    window.dbhStatsLastUpdate = window.lastVisibleUpdate;
  }

  // Use the cached statistics
  const { min: minDBH, max: maxDBH } = window.dbhStats;

  // Calculate the normalized position of this DBH in the range
  let normalizedValue;
  if (maxDBH === minDBH) {
    normalizedValue = 0.5; // If all trees are the same size, use the middle of the range
  } else {
    normalizedValue = (dbh - minDBH) / (maxDBH - minDBH);
  }

  // Clamp between 0 and 1
  normalizedValue = Math.max(0, Math.min(1, normalizedValue));

  // Calculate final font size
  return minFontSize + normalizedValue * (maxFontSize - minFontSize);
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
    // Get species name (which already contains genus)
    const species = feature.properties.spp || "";
    const commonName = feature.properties.common || "Unknown";
    const dbh = feature.properties.dbh || "Unknown";

    // Format the date to show only month and year if available
    let lastUpdated = "";
    if (feature.properties.created_date) {
      try {
        const date = new Date(feature.properties.created_date);
        lastUpdated = date.toLocaleDateString(undefined, {
          month: "long",
          year: "numeric",
        });
      } catch (e) {
        // If date parsing fails, use the original string
        lastUpdated = feature.properties.created_date;
      }
    }

    // Create the simplified popup content
    let popupContent = `<div class="tree-popup" style="min-width: 200px;">
      <div style="font-weight: bold; font-size: 16px;">${species}</div>
      <div style="font-style: italic; margin-bottom: 5px;">${commonName}</div>
      <div>Diameter: ${dbh} ft</div>`;

    // Add last updated info in smaller text if available
    if (lastUpdated) {
      popupContent += `<div style="font-size: 11px; color: #888; margin-top: 8px;">Last updated: ${lastUpdated}</div>`;
    }

    popupContent += `</div>`;

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

  const bounds = map.getBounds();
  const visibleFeatures = window.fullTreeData.features.filter((feature) => {
    if (!feature.geometry || !feature.geometry.coordinates) return false;
    const coords = feature.geometry.coordinates;
    return bounds.contains(L.latLng(coords[1], coords[0]));
  });

  window.visibleTreeFeatures = visibleFeatures;
  window.lastVisibleUpdate = Date.now();

  const limitedFeatures = visibleFeatures.slice(0, 1000);

  console.log(
    `Loading ${limitedFeatures.length} of ${visibleFeatures.length} visible trees (from ${window.fullTreeData.features.length} total)`
  );

  const filteredData = {
    type: "FeatureCollection",
    features: limitedFeatures,
  };

  markerClusterGroup.clearLayers();

  // Create GeoJSON layer with pointToLayer only, remove onEachFeature
  const geoJsonLayer = L.geoJSON(filteredData, {
    pointToLayer: createTreeMarker,
    // Removed onEachFeature since we're binding popups directly in createTreeMarker
  });

  markerClusterGroup.addLayer(geoJsonLayer);
  updateTreeCount(limitedFeatures.length, window.fullTreeData.features.length);
  hideLoading();
}

// Simplified toggleMapRotation function
function toggleMapRotation() {
  autoRotateMap = !autoRotateMap;

  const toggleButton = document.getElementById("rotate-toggle");
  if (toggleButton) {
    // Update visual appearance based on state
    if (autoRotateMap) {
      toggleButton.style.backgroundColor = "#4285F4";
      toggleButton.style.color = "white";

      // Reset heading marker if we have user location
      if (userMarker && map.getBearing) {
        updateHeadingIndicator(map.getBearing());
      }
    } else {
      toggleButton.style.backgroundColor = "white";
      toggleButton.style.color = "black";

      // Reset to north up
      if (map) {
        map.setBearing(0);
      }
    }
  }

  // If we don't have orientation permissions but want to rotate, prompt for them on iOS
  if (
    autoRotateMap &&
    !window.hasOrientationPermission &&
    typeof DeviceOrientationEvent !== "undefined" &&
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
