// Tree Map Application JavaScript using Mapbox GL JS

// Global variables
let map;
let treeMarkers = [];
let treeData = [];
let userLocationMarker;
let headingMarker;
let displayScientificNames = false; // Default to common names
let clusterSourceAdded = false;
let userHeading = 0;
let initialLoad = true;
let permissionRequested = false; // Track if we've already asked for permissions
let orientationSupported = false; // Track if orientation is supported
let orientationActive = false; // Track if orientation updates are active
let lastOrientationUpdate = 0; // For throttling updates
let orientationThrottleTime = 100; // Update orientation no more than once per 100ms
let locationUpdateInterval = null; // Track the interval for location updates

// Mapbox access token - REPLACE WITH YOUR OWN TOKEN
const mapboxAccessToken =
  "pk.eyJ1IjoiZ3JlZ2xvcnl1cyIsImEiOiJjbTg4dWF5a3IwdWNiMmpwc2xkMHh2MG90In0.MiqAh3PR2fbJOvFblQBPSg";

// Debug panel for mobile testing
function createDebugPanel() {
  const debugPanel = document.createElement("div");
  debugPanel.id = "debug-panel";
  debugPanel.style.position = "absolute";
  debugPanel.style.bottom = "60px";
  debugPanel.style.left = "10px";
  debugPanel.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  debugPanel.style.color = "white";
  debugPanel.style.padding = "10px";
  debugPanel.style.borderRadius = "5px";
  debugPanel.style.maxWidth = "300px";
  debugPanel.style.fontSize = "12px";
  debugPanel.style.zIndex = "1000";
  debugPanel.innerHTML = "Orientation Debug Panel";
  document.body.appendChild(debugPanel);
  return debugPanel;
}

// Function to log debug info to the panel
function logToDebugPanel(message) {
  const panel = document.getElementById("debug-panel") || createDebugPanel();
  panel.innerHTML = message;
}

// IMPORTANT: Define utility functions first to avoid "not defined" errors
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

// Initialize the map with improved touch controls
function initMap() {
  console.log("Initializing map with Mapbox...");

  // Initialize Mapbox map with better touch handling
  mapboxgl.accessToken = mapboxAccessToken;

  map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/dark-v11",
    center: [-87.6877, 42.0451],
    zoom: 14,
    attributionControl: false,
    bearing: 0,
    pitchWithRotate: false,
    dragRotate: false,
    // Enhanced touch settings for mobile
    boxZoom: true,
    doubleClickZoom: true,
    touchZoomRotate: true, // Enable touch zoom/rotate
    dragPan: {
      enableTouch: true, // Explicitly enable touch dragging
    },
    interactive: true, // Ensure the map is interactive
  });

  // Add navigation control (zoom buttons)
  map.addControl(
    new mapboxgl.NavigationControl({
      showCompass: false,
    }),
    "bottom-right"
  );

  // Detect touch interactions to pause orientation updates
  map.on("touchstart", () => {
    // If user is touching the map, temporarily pause orientation updates
    orientationActive = false;
    const compassButton = document.getElementById("compass-button");
    if (compassButton && compassButton.classList.contains("active")) {
      compassButton.classList.add("paused");
    }
  });

  map.on("touchend", () => {
    // Resume orientation updates if the compass was active before
    const compassButton = document.getElementById("compass-button");
    if (compassButton && compassButton.classList.contains("paused")) {
      compassButton.classList.remove("paused");
      orientationActive = true;
    }
  });

  // Add custom controls once map loads
  map.on("load", function () {
    console.log("Map loaded, adding controls...");

    // Add loading indicator overlay
    const loadingIndicator = document.getElementById("loading-indicator");
    if (!loadingIndicator) {
      const newLoadingIndicator = document.createElement("div");
      newLoadingIndicator.id = "loading-indicator";
      newLoadingIndicator.innerHTML = "Loading tree data...";
      newLoadingIndicator.style.display = "none";
      newLoadingIndicator.style.position = "absolute";
      newLoadingIndicator.style.bottom = "10px";
      newLoadingIndicator.style.left = "10px";
      newLoadingIndicator.style.zIndex = "999";
      newLoadingIndicator.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
      newLoadingIndicator.style.padding = "5px 10px";
      newLoadingIndicator.style.borderRadius = "5px";
      newLoadingIndicator.style.fontWeight = "bold";
      document.body.appendChild(newLoadingIndicator);
    }

    // Add location button
    addLocationButton();

    // Add name toggle button
    addNameToggleButton();

    // Add compass button (for all devices)
    addCompassButton();

    // Create debug panel
    createDebugPanel();

    // Wait until map is fully loaded before loading tree data
    loadTreeData();

    // Prepare for clustering by adding the cluster source and layers
    setupClusterLayers();

    // When map moves, update visible trees
    map.on("moveend", function () {
      if (window.fullTreeData) {
        updateVisibleTrees();
      }
    });

    // When map zoom changes
    map.on("zoomend", function () {
      const currentZoom = map.getZoom();

      // Only refresh at high zoom levels where precision matters
      if (currentZoom >= 17) {
        updateVisibleTrees();
      }
    });

    // Automatically request user location after map is initialized
    setTimeout(function () {
      getUserLocation(true); // true = initial load, less intrusive
    }, 1000);
  });
}

// Add location button to map
function addLocationButton() {
  // Get existing button or create a new one
  let locationButton = document.getElementById("location-button");

  if (!locationButton) {
    // Create a new button if it doesn't exist
    locationButton = document.createElement("div");
    locationButton.id = "location-button";
    locationButton.className = "custom-button";
    locationButton.innerHTML = "📍";
    locationButton.title = "Show My Location";
    locationButton.style.position = "absolute";
    locationButton.style.top = "10px";
    locationButton.style.left = "10px";
    locationButton.style.zIndex = "10";
    locationButton.style.backgroundColor = "white";
    locationButton.style.padding = "10px";
    locationButton.style.borderRadius = "4px";
    locationButton.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.3)";
    locationButton.style.cursor = "pointer";
    locationButton.style.width = "44px";
    locationButton.style.height = "44px";
    locationButton.style.display = "flex";
    locationButton.style.alignItems = "center";
    locationButton.style.justifyContent = "center";
    locationButton.style.fontSize = "20px";
    document.getElementById("map").appendChild(locationButton);
  }

  // Add event listener (remove any existing ones first)
  locationButton.removeEventListener("click", locationButtonClicked);
  locationButton.addEventListener("click", locationButtonClicked);
}

// Add compass button - always visible
function addCompassButton() {
  let compassButton = document.getElementById("compass-button");

  if (!compassButton) {
    compassButton = document.createElement("div");
    compassButton.id = "compass-button";
    compassButton.className = "custom-button";
    compassButton.innerHTML = "🧭";
    compassButton.title = "Toggle Compass";
    compassButton.style.position = "absolute";
    compassButton.style.top = "10px";
    compassButton.style.right = "10px";
    compassButton.style.zIndex = "10";
    compassButton.style.backgroundColor = "white";
    compassButton.style.padding = "10px";
    compassButton.style.borderRadius = "4px";
    compassButton.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.3)";
    compassButton.style.cursor = "pointer";
    compassButton.style.width = "44px";
    compassButton.style.height = "44px";
    compassButton.style.display = "flex";
    compassButton.style.alignItems = "center";
    compassButton.style.justifyContent = "center";
    compassButton.style.fontSize = "20px";
    document.getElementById("map").appendChild(compassButton);

    // Event listener
    compassButton.addEventListener("click", function () {
      // Toggle compass on/off instead of just enabling
      if (orientationActive) {
        // Turn off orientation
        orientationActive = false;
        this.classList.remove("active");
        this.style.backgroundColor = "white";
        this.style.borderColor = "#ccc";
        this.style.borderWidth = "1px";
        this.style.borderStyle = "solid";
        this.innerHTML = "🧭";
        logToDebugPanel("Compass deactivated - touch controls enabled");
      } else {
        // Request permission or turn on orientation if already granted
        if (
          typeof DeviceOrientationEvent.requestPermission === "function" &&
          !orientationSupported
        ) {
          // iOS
          requestiOSPermission();
        } else {
          // Android or already has permission
          setupDeviceOrientation(true); // Force setup
          orientationActive = true;
          this.classList.add("active");
          this.style.backgroundColor = "#e6f2ff";
          this.style.borderColor = "#4285F4";
          this.style.borderWidth = "2px";
          this.style.borderStyle = "solid";
          logToDebugPanel(
            "Compass activated - tap screen to temporarily pause"
          );
        }
      }
    });
  }
}

// Location button click handler
function locationButtonClicked() {
  // Call getUserLocation with false to indicate this was a manual request
  getUserLocation(false);
}

// Add name toggle button
function addNameToggleButton() {
  // Create a custom HTML element for the button
  const nameToggleButton = document.createElement("div");
  nameToggleButton.id = "name-toggle-button";
  nameToggleButton.className = "custom-button";
  nameToggleButton.style.position = "absolute";
  nameToggleButton.style.bottom = "10px"; // Ensure it's visible in portrait mode
  nameToggleButton.style.right = "10px";
  nameToggleButton.style.zIndex = "10"; // Higher than default controls
  nameToggleButton.style.minWidth = "auto";
  nameToggleButton.style.padding = "10px 15px";
  nameToggleButton.innerHTML = "Scientific Names";
  nameToggleButton.addEventListener("click", toggleNameDisplay);
  document.getElementById("map").appendChild(nameToggleButton);
}

// Function to toggle between scientific and common names
function toggleNameDisplay() {
  displayScientificNames = !displayScientificNames;

  // Update the button text
  const toggleButton = document.getElementById("name-toggle-button");
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

// Setup clustering layers for tree visualization
function setupClusterLayers() {
  console.log("Setting up cluster layers...");

  try {
    // Add empty source for tree data
    map.addSource("trees", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 40,
    });
    console.log("✅ Tree source added successfully");
    clusterSourceAdded = true;
  } catch (error) {
    console.error("❌ Error adding tree source:", error);
    return; // Exit if we can't add the source
  }

  // Add layers for clustered and unclustered points

  // 1. Cluster circles
  map.addLayer({
    id: "clusters",
    type: "circle",
    source: "trees",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": [
        "step",
        ["get", "point_count"],
        "#51bbd6", // color for clusters with < 10 points
        10,
        "#f1f075", // color for clusters with < 50 points
        50,
        "#f28cb1", // color for clusters with >= 50 points
      ],
      "circle-radius": [
        "step",
        ["get", "point_count"],
        25, // radius for clusters with < 10 points (larger for touch)
        10,
        35, // radius for clusters with < 50 points
        50,
        45, // radius for clusters with >= 50 points
      ],
      "circle-opacity": 0.7,
    },
  });

  // 2. Cluster count labels
  map.addLayer({
    id: "cluster-count",
    type: "symbol",
    source: "trees",
    filter: ["has", "point_count"],
    layout: {
      "text-field": "{point_count_abbreviated}",
      "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
      "text-size": 14, // Larger text for better touch
    },
    paint: {
      "text-color": "#ffffff",
    },
  });

  // 3. Individual tree markers (circles sized by tree diameter)
  map.addLayer({
    id: "unclustered-trees",
    type: "circle",
    source: "trees",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": ["get", "color"], // Color from properties
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        14,
        ["*", 0.8, ["sqrt", ["max", ["get", "dbh"], 1]]], // slightly larger at low zoom
        18,
        ["*", 2.5, ["sqrt", ["max", ["get", "dbh"], 1]]], // larger at high zoom
        20,
        ["*", 5, ["sqrt", ["max", ["get", "dbh"], 1]]], // even larger at highest zoom
      ],
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.6, // More transparent
    },
  });

  // 4. Tree labels (only visible at high zoom) - Modified for proper positioning
  map.addLayer({
    id: "tree-labels",
    type: "symbol",
    source: "trees",
    filter: ["!", ["has", "point_count"]],
    layout: {
      "text-field": ["get", "displayName"],
      "text-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        17,
        0, // No labels at lower zoom levels
        18,
        12, // Larger minimum size at zoom level 18
        20,
        16, // Larger fixed size at highest zoom
      ],
      "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
      "text-offset": [0, 0], // Center the label over the circle
      "text-anchor": "center",
      "text-allow-overlap": false,
      "text-ignore-placement": false,
      "symbol-sort-key": ["*", -1, ["get", "dbh"]], // Prioritize larger trees
      "text-max-width": 12, // Allow text to wrap if needed
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": "#000000",
      "text-halo-width": 2, // Thicker halo for better contrast against the map
      "text-opacity": 0.9, // Slightly transparent text
    },
  });

  // Add click handler for tree features with larger hit area for touch
  map.on("click", "unclustered-trees", function (e) {
    const feature = e.features[0];
    showTreePopup(feature, e.lngLat);
  });

  // Add click handler for tree labels also
  map.on("click", "tree-labels", function (e) {
    const feature = e.features[0];
    showTreePopup(feature, e.lngLat);
  });

  // Handle cluster clicks to zoom in
  map.on("click", "clusters", function (e) {
    const features = map.queryRenderedFeatures(e.point, {
      layers: ["clusters"],
    });
    const clusterId = features[0].properties.cluster_id;

    map
      .getSource("trees")
      .getClusterExpansionZoom(clusterId, function (err, zoom) {
        if (err) return;

        map.easeTo({
          center: features[0].geometry.coordinates,
          zoom: zoom,
        });
      });
  });

  // Change cursor on hover for all interactive elements
  const interactiveLayers = ["clusters", "unclustered-trees", "tree-labels"];
  interactiveLayers.forEach((layer) => {
    map.on("mouseenter", layer, () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", layer, () => {
      map.getCanvas().style.cursor = "";
    });
  });

  console.log("✅ All cluster layers added successfully");
}

// Show popup for a tree - modified to fix accessibility issue
function showTreePopup(feature, lngLat) {
  // Create popup content
  const popupContent = createPopupContent(feature.properties);

  // Create and show the popup with mobile-friendly settings and fixed accessibility
  new mapboxgl.Popup({
    closeButton: true,
    closeOnClick: true,
    maxWidth: "300px",
    className: "tree-popup-container",
    // Fix aria-hidden issue by specifying focus attributes
    focusAfterOpen: false,
  })
    .setLngLat(lngLat)
    .setHTML(popupContent)
    .addTo(map);
}

// Load tree data from file
async function loadTreeData() {
  showLoading("Loading tree data...");
  console.log("Attempting to load tree data...");

  try {
    // Check if we're running on github.io or locally
    const isGitHubPages = window.location.hostname.includes("github.io");

    // Set the correct URL based on environment - UPDATED to use trimmed version
    const url = isGitHubPages
      ? "https://raw.githubusercontent.com/gregloryus/gregloryus.github.io/master/trimmed_trees_min.geojson"
      : "trimmed_trees_min.geojson";

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

    // Process the data to add required properties for display
    processTreeData(data);
    console.log("✅ Tree data processed");

    // Store full data
    window.fullTreeData = data;

    // Display initial subset
    console.log("Calling displayInitialTrees...");
    displayInitialTrees(data);
  } catch (error) {
    hideLoading();
    console.error("❌ Error in loadTreeData:", error);
    alert(`Error loading tree data: ${error.message}`);
  }
}

// Process tree data to add display properties
function processTreeData(data) {
  if (!data || !data.features) return;

  data.features.forEach((feature) => {
    if (!feature.properties) return;

    const properties = feature.properties;

    // Calculate tree color based on genus
    properties.color = getTreeColor(properties);

    // Convert numeric values to numbers
    if (properties.dbh) {
      properties.dbh = parseFloat(properties.dbh) || 0;
    }

    // Create display name options (will be selected based on user toggle)
    const genus = properties.genus || "";
    const species = properties.spp || "";
    const commonName = properties.common || "Unknown";

    // Format common name according to new rules
    let formattedCommonName = commonName;
    if (commonName.includes(",")) {
      // For names with commas like "maple, Norway"
      const parts = commonName.split(",").map((part) => part.trim());
      // Swap order and capitalize the genus part
      formattedCommonName = parts[1] + " " + parts[0].toUpperCase();
    } else {
      // For names without commas, make everything uppercase
      formattedCommonName = commonName.toUpperCase();
    }

    // Create map label with line breaks between words
    let mapLabel = "";
    if (commonName.includes(",")) {
      const parts = commonName.split(",").map((part) => part.trim());
      // First part after comma
      mapLabel = parts[1] + "\n" + parts[0].toUpperCase();
    } else {
      // For names without commas, add line breaks between words
      mapLabel = commonName.toUpperCase().split(" ").join("\n");
    }

    // Scientific name
    let scientificName;
    const lowerSpecies = species.toLowerCase();
    const lowerGenus = genus.toLowerCase();

    if (lowerSpecies.startsWith(lowerGenus)) {
      scientificName = species; // Species already includes genus
    } else {
      scientificName = `${genus} ${species}`.trim(); // Concatenate genus and species
    }

    properties.scientificName = scientificName;
    properties.commonName = formattedCommonName;
    properties.mapLabel = mapLabel;

    // Set initial display name based on current mode
    properties.displayName = displayScientificNames
      ? properties.scientificName
      : properties.mapLabel;
  });
}

// Display initial subset of trees
function displayInitialTrees(data) {
  console.log("Starting displayInitialTrees...");

  if (!data || !data.features) {
    console.error("❌ Invalid data format:", data);
    hideLoading();
    return;
  }

  // Check if the source is ready
  if (!map.getSource("trees")) {
    console.error("❌ Tree source not found! Re-initializing source...");
    try {
      setupClusterLayers();
    } catch (e) {
      console.error("❌ Failed to set up cluster layers:", e);
      hideLoading();
      return;
    }
  }

  // Get current map bounds
  const bounds = map.getBounds();
  let visibleFeatures = [];

  if (bounds) {
    // Filter to only features in the current view
    visibleFeatures = data.features.filter((feature) => {
      if (!feature.geometry || !feature.geometry.coordinates) return false;

      const coords = feature.geometry.coordinates;
      const lng = coords[0];
      const lat = coords[1];

      return (
        lng >= bounds.getWest() &&
        lng <= bounds.getEast() &&
        lat >= bounds.getSouth() &&
        lat <= bounds.getNorth()
      );
    });
  } else {
    console.log("Map bounds not available, using subset");
    visibleFeatures = data.features.slice(0, 500);
  }

  // Limit number of features to prevent performance issues
  const limitedFeatures = visibleFeatures.slice(0, 500);

  console.log(
    `Loading ${limitedFeatures.length} of ${data.features.length} trees initially`
  );
  showLoading(`Loading ${limitedFeatures.length} trees...`);

  // Update the data in the source
  try {
    if (map.getSource("trees")) {
      console.log("Updating source data with trees...");
      map.getSource("trees").setData({
        type: "FeatureCollection",
        features: limitedFeatures,
      });
      console.log("✅ Source data updated successfully");
    } else {
      console.error("❌ Tree source still not available after setup attempt");
    }
  } catch (error) {
    console.error("❌ Error updating source data:", error);
  }

  hideLoading();

  // If this is initial load, fit map to trees
  if (initialLoad) {
    initialLoad = false;

    // Check if we have trees to fit to
    if (limitedFeatures.length > 0) {
      // Create a bounds object
      const treeBounds = new mapboxgl.LngLatBounds();

      // Extend bounds with each tree location
      limitedFeatures.forEach((feature) => {
        if (feature.geometry && feature.geometry.coordinates) {
          treeBounds.extend(feature.geometry.coordinates);
        }
      });

      // If we have a valid bounds, fit the map to it
      if (treeBounds.isEmpty() === false) {
        map.fitBounds(treeBounds, {
          padding: 50,
          maxZoom: 17,
        });
      }
    }
  }
}

// Update visible trees when map moves or zooms
function updateVisibleTrees() {
  if (!window.fullTreeData || !window.fullTreeData.features) return;

  console.log("Updating visible trees...");
  showLoading("Updating visible trees...");

  // Get current map bounds
  const bounds = map.getBounds();

  // Filter to features in the current view
  const visibleFeatures = window.fullTreeData.features.filter((feature) => {
    if (!feature.geometry || !feature.geometry.coordinates) return false;

    const coords = feature.geometry.coordinates;
    const lng = coords[0];
    const lat = coords[1];

    return (
      lng >= bounds.getWest() &&
      lng <= bounds.getEast() &&
      lat >= bounds.getSouth() &&
      lat <= bounds.getNorth()
    );
  });

  window.visibleTreeFeatures = visibleFeatures;
  window.lastVisibleUpdate = Date.now();

  // Limit number of features to prevent performance issues
  const limitedFeatures = visibleFeatures.slice(0, 1000);

  console.log(
    `Loading ${limitedFeatures.length} of ${visibleFeatures.length} visible trees (from ${window.fullTreeData.features.length} total)`
  );

  // Update the display names based on current toggle setting
  limitedFeatures.forEach((feature) => {
    if (!feature.properties) return;

    feature.properties.displayName = displayScientificNames
      ? feature.properties.scientificName
      : feature.properties.mapLabel;
  });

  // Update the data in the source
  if (map.getSource("trees")) {
    map.getSource("trees").setData({
      type: "FeatureCollection",
      features: limitedFeatures,
    });
  }

  hideLoading();
}

// Function to start automatic location updates
function startLocationUpdates() {
  // Clear any existing interval
  if (locationUpdateInterval) {
    clearInterval(locationUpdateInterval);
  }

  // Set up new interval for location updates
  locationUpdateInterval = setInterval(() => {
    // Get location without visual notifications or map movement
    getLocationQuietly();
  }, 200);
}

// Get user's location without notifications or map movement
function getLocationQuietly() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      // Success callback
      (position) => {
        const userLocation = [
          position.coords.longitude,
          position.coords.latitude,
        ];

        // Remove previous user marker if exists
        if (userLocationMarker) {
          userLocationMarker.remove();
        }

        // Create the user marker element (larger, more visible marker)
        const userMarkerElement = document.createElement("div");
        userMarkerElement.className = "user-marker";
        userMarkerElement.style.backgroundColor = "#4285F4";
        userMarkerElement.style.width = "18px";
        userMarkerElement.style.height = "18px";
        userMarkerElement.style.borderRadius = "50%";
        userMarkerElement.style.border = "3px solid white";
        userMarkerElement.style.boxShadow = "0 0 5px rgba(0,0,0,0.5)";

        // Add a marker at the user's location
        userLocationMarker = new mapboxgl.Marker({
          element: userMarkerElement,
          anchor: "center",
        })
          .setLngLat(userLocation)
          .addTo(map);
      },
      // Silent error handling for quiet updates
      (error) => {
        console.error("Error in quiet location update:", error);
      },
      // Options
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  }
}

// Modify getUserLocation function to start automatic updates
function getUserLocation(initialRequest = false) {
  if (navigator.geolocation) {
    // Show a message while we're getting location
    showLoading("Getting your location...");

    // Just request location directly - orientation is handled separately
    navigator.geolocation.getCurrentPosition(
      // Success callback
      (position) => {
        hideLoading();
        const userLocation = [
          position.coords.longitude,
          position.coords.latitude,
        ];

        // Remove previous user marker if exists
        if (userLocationMarker) {
          userLocationMarker.remove();
        }

        // Create the user marker element (larger, more visible marker)
        const userMarkerElement = document.createElement("div");
        userMarkerElement.className = "user-marker";
        userMarkerElement.style.backgroundColor = "#4285F4";
        userMarkerElement.style.width = "18px";
        userMarkerElement.style.height = "18px";
        userMarkerElement.style.borderRadius = "50%";
        userMarkerElement.style.border = "3px solid white";
        userMarkerElement.style.boxShadow = "0 0 5px rgba(0,0,0,0.5)";

        // Add a marker at the user's location
        userLocationMarker = new mapboxgl.Marker({
          element: userMarkerElement,
          anchor: "center",
        })
          .setLngLat(userLocation)
          .addTo(map);

        // Center the map on the user's location
        map.flyTo({
          center: userLocation,
          zoom: 19,
          bearing: userHeading,
          essential: true,
        });

        // After getting location, try to set up orientation only if on mobile
        if (isMobileDevice()) {
          setupDeviceOrientation();
        }

        // Start automatic location updates
        startLocationUpdates();

        // Add debug message for orientation
        logToDebugPanel(`Location acquired! Current heading: ${userHeading}°`);
      },
      // Error callback - with simplified error handling
      (error) => {
        hideLoading();
        console.error("Error getting location:", error);

        let errorMessage =
          "Location access was denied or unavailable. Please enable location services and try again.";
        alert(errorMessage);

        // Fall back to a default view of Evanston
        map.flyTo({
          center: [-87.6877, 42.0451],
          zoom: 15,
        });
      },
      // Options - increased timeout and improved accuracy
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  } else {
    hideLoading();
    alert(
      "Geolocation is not supported by your browser. Please use a modern browser like Chrome, Firefox, or Safari."
    );
  }
}

// Detect if user is on a mobile device
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

// Setup device orientation to get compass heading
function setupDeviceOrientation(forceSetup = false) {
  if (orientationSupported && !forceSetup) return; // Skip if already set up

  logToDebugPanel("Setting up device orientation...");

  // Check if device supports orientation events
  if (window.DeviceOrientationEvent) {
    // iOS 13+ requires permission request
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      // For iOS devices
      logToDebugPanel(
        "iOS device detected. Click 🧭 button to enable compass."
      );
      return; // The button will handle the permission request
    } else {
      // For non-iOS devices (Android, older iOS)
      try {
        // Remove any existing listeners first
        window.removeEventListener("deviceorientation", handleOrientation);
        window.removeEventListener(
          "deviceorientationabsolute",
          handleOrientation
        );

        // Add the standard device orientation listener
        window.addEventListener("deviceorientation", handleOrientation);

        // Also try the absolute version, which is more accurate but less supported
        if ("ondeviceorientationabsolute" in window) {
          window.addEventListener(
            "deviceorientationabsolute",
            handleOrientation
          );
          logToDebugPanel("Using deviceorientationabsolute (more accurate)");
        } else {
          logToDebugPanel("Using standard deviceorientation");
        }

        orientationSupported = true;

        // Mark compass as active
        orientationActive = true;
        const compassButton = document.getElementById("compass-button");
        if (compassButton) {
          compassButton.classList.add("active");
          compassButton.style.backgroundColor = "#e6f2ff";
          compassButton.style.borderColor = "#4285F4";
          compassButton.style.borderWidth = "2px";
          compassButton.style.borderStyle = "solid";
        }
      } catch (e) {
        logToDebugPanel("Error setting up orientation: " + e.message);
      }
    }
  } else {
    logToDebugPanel("Device orientation not supported on this device");
  }
}

// Request iOS permission for orientation
function requestiOSPermission() {
  logToDebugPanel("Requesting iOS orientation permission...");

  DeviceOrientationEvent.requestPermission()
    .then((permissionState) => {
      if (permissionState === "granted") {
        logToDebugPanel("✅ iOS orientation permission granted");

        // Remove any existing listeners first
        window.removeEventListener("deviceorientation", handleOrientation);

        // Add the event listener
        window.addEventListener("deviceorientation", handleOrientation);
        orientationSupported = true;
        orientationActive = true;

        // Mark compass as active
        const compassButton = document.getElementById("compass-button");
        if (compassButton) {
          compassButton.classList.add("active");
          compassButton.style.backgroundColor = "#e6f2ff";
          compassButton.style.borderColor = "#4285F4";
          compassButton.style.borderWidth = "2px";
          compassButton.style.borderStyle = "solid";
        }
      } else {
        logToDebugPanel("❌ iOS orientation permission denied");
      }
    })
    .catch((error) => {
      logToDebugPanel("Error requesting permission: " + error.message);
    });
}

// Throttled orientation handler - only update at most once per orientationThrottleTime ms
function handleOrientation(event) {
  // Skip if orientation is not active
  if (!orientationActive) return;

  // Throttle updates to avoid overwhelming touch controls
  const now = Date.now();
  if (now - lastOrientationUpdate < orientationThrottleTime) return;
  lastOrientationUpdate = now;

  let debugInfo = "Orientation event received:";
  if (event.alpha !== null) debugInfo += ` alpha: ${event.alpha.toFixed(1)}°`;
  if (event.webkitCompassHeading !== undefined)
    debugInfo += ` webkitCompassHeading: ${event.webkitCompassHeading.toFixed(
      1
    )}°`;
  if (event.absolute) debugInfo += " (absolute)";

  // Only log occasionally to reduce visual noise
  if (now % 1000 < 100) {
    logToDebugPanel(debugInfo);
  }

  let heading;

  // Try to get the most accurate heading depending on what's available
  if (event.webkitCompassHeading !== undefined) {
    // iOS compass heading (already calibrated)
    heading = event.webkitCompassHeading;
  } else if (event.absolute === true && event.alpha !== null) {
    // Android absolute orientation (alpha is measured counterclockwise from west)
    // Convert to clockwise from north
    heading = (360 - event.alpha) % 360;
  } else if (event.alpha !== null) {
    // Fallback for non-absolute orientation
    heading = (360 - event.alpha) % 360;
  } else {
    // No usable heading data
    return;
  }

  userHeading = heading;

  // Update visual indicator of compass
  updateCompassButton(heading);

  // Update the map rotation if we have a user marker and orientation is active
  if (userLocationMarker && orientationActive) {
    map.easeTo({
      bearing: heading,
      duration: 100, // Use shorter animation for less interference with touch
    });
  }
}

// Update the compass button appearance based on heading
function updateCompassButton(heading) {
  const compassButton = document.getElementById("compass-button");
  if (compassButton && compassButton.classList.contains("active")) {
    // Show heading number
    compassButton.innerHTML = `🧭<div style="font-size: 10px; margin-top: 2px;">${Math.round(
      heading
    )}°</div>`;
  }
}

// Helper function to create consistent popup content
function createPopupContent(properties) {
  const species = properties.spp || "";
  const scientificName = properties.scientificName || "";
  const commonName = properties.commonName || "Unknown"; // Already formatted
  const dbh = properties.dbh || "Unknown";

  // Format the date - check both possible date field names
  let lastUpdated = "";
  if (properties.last_edited_date) {
    try {
      const date = new Date(properties.last_edited_date);
      lastUpdated = date.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
    } catch (e) {
      lastUpdated = properties.last_edited_date;
    }
  } else if (properties.created_date) {
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

  // Format DBH with the simplified format
  let dbhDisplay = "Unknown";
  if (dbh !== "Unknown") {
    const dbhInches = parseFloat(dbh);
    if (!isNaN(dbhInches)) {
      const feet = Math.floor(dbhInches / 12);
      const inches = Math.round(dbhInches % 12);

      if (feet > 0) {
        dbhDisplay = `${dbhInches}" (${feet}ft ${inches}in)`;
      } else {
        dbhDisplay = `${dbhInches}"`;
      }
    }
  }

  // Create the popup HTML with new styling and labels
  return `<div class="tree-popup" style="min-width: 220px; font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.2; padding: 10px;">
    <div style="font-weight: bold; margin-bottom: 2px;">${commonName}</div>
    <div style="color: #999; font-size: 10px; margin-bottom: 12px;">Common name</div>
    
    <div style="font-style: italic; margin-bottom: 2px;">${scientificName}</div>
    <div style="color: #999; font-size: 10px; margin-bottom: 12px;">Scientific name</div>
    
    <div style="margin-bottom: 2px;">${dbhDisplay}</div>
    <div style="color: #999; font-size: 10px; margin-bottom: 12px;">Trunk width at chest height</div>
    
    ${
      lastUpdated
        ? `<div style="font-style: italic; color: #999; font-size: 10px;">as of ${lastUpdated}</div>`
        : ""
    }
  </div>`;
}

// Get color based on tree genus
function getTreeColor(properties) {
  const genus = properties.genus || "";

  // Updated color coding with your new color preferences
  const genusColors = {
    Acer: "#FF362D", // Maple - updated to bright red
    Quercus: "#BA4A00", // Oak - updated to brown
    Ulmus: "#A9DFBF", // Elm - updated to light green
    Tilia: "#F9E79F", // Linden - updated to light yellow
    Gleditsia: "#FFD059", // Honeylocust - bright orangey yellow (unchanged)
    Fraxinus: "#BBAA9A", // Ash - tannish grey (unchanged)
    Celtis: "#A13E30", // Hackberry - brownish red (unchanged)
    Platanus: "#C0D860", // Sycamore - yellowy green (unchanged)
    Salix: "#A63CE8", // Willow - bright purple (unchanged)
    Pinus: "#52BE80", // Pine - updated to medium green
    Malus: "#F5B7B1", // Apple - added new light pink/salmon
    Fagus: "#78C2ED", // Beech - light blue (unchanged)
  };

  return genusColors[genus] || "#005500"; // Deep green default
}

// Initialize when the page loads
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, initializing map...");

  // Clear any existing location update interval (useful on reload)
  if (locationUpdateInterval) {
    clearInterval(locationUpdateInterval);
    locationUpdateInterval = null;
  }

  initMap();

  // Add a safety check to verify tree data loading
  setTimeout(function () {
    if (!window.fullTreeData) {
      console.log("⚠️ No tree data loaded after 5 seconds, retrying...");
      loadTreeData();
    }
  }, 5000);
});
