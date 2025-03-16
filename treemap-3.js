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
let orientationPermissionGranted = false; // Track if orientation permission is explicitly granted
let isAnimatingBiggestTrees = false; // For debouncing biggest tree animation
let lastOrientationData = null; // Track if we're actually receiving orientation data

// At the top of the file with other constants
const DIM_OPACITY = 0.9; // Maximum opacity for dimming effect during tree highlighting

// Mapbox access token - REPLACE WITH YOUR OWN TOKEN
const mapboxAccessToken =
  "pk.eyJ1IjoiZ3JlZ2xvcnl1cyIsImEiOiJjbTg4dWF5a3IwdWNiMmpwc2xkMHh2MG90In0.MiqAh3PR2fbJOvFblQBPSg";

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

    // Also pause location updates
    if (locationUpdateInterval) {
      clearInterval(locationUpdateInterval);
      locationUpdateInterval = null;
    }

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

    // Restart location updates
    if (!locationUpdateInterval) {
      startLocationUpdates();
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

    // Add find biggest tree button
    addFindBiggestTreeButton();

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
    locationButton.innerHTML =
      "<div style='width:100%; height:100%; display:flex; align-items:center; justify-content:center;'>📍</div>";
    locationButton.title = "Show My Location";
    locationButton.style.position = "absolute";
    locationButton.style.top = "10px";
    locationButton.style.left = "10px";
    locationButton.style.zIndex = "10";
    locationButton.style.backgroundColor = "white";
    locationButton.style.padding = "0"; // Remove padding - content div will handle it
    locationButton.style.borderRadius = "4px";
    locationButton.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.3)";
    locationButton.style.cursor = "pointer";
    locationButton.style.width = "44px";
    locationButton.style.height = "44px";
    locationButton.style.display = "block"; // Changed from flex to block
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
    compassButton.innerHTML =
      "<div style='width:100%; height:100%; display:flex; align-items:center; justify-content:center;'>🧭</div>";
    compassButton.title = "Toggle Compass";
    compassButton.style.position = "absolute";
    compassButton.style.top = "10px";
    compassButton.style.right = "10px";
    compassButton.style.zIndex = "10";
    compassButton.style.backgroundColor = "white";
    compassButton.style.padding = "0"; // Remove padding - content div will handle it
    compassButton.style.borderRadius = "4px";
    compassButton.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.3)";
    compassButton.style.cursor = "pointer";
    compassButton.style.width = "44px";
    compassButton.style.height = "44px";
    compassButton.style.display = "block"; // Changed from flex to block
    compassButton.style.fontSize = "20px";
    document.getElementById("map").appendChild(compassButton);

    // Event listener
    compassButton.addEventListener("click", function () {
      // Immediate visual feedback when clicked
      this.style.backgroundColor = "#e6f2ff";
      this.style.borderColor = "#4285F4";
      this.style.borderWidth = "2px";
      this.style.borderStyle = "solid";

      // Toggle compass on/off instead of just enabling
      if (orientationActive) {
        // Turn off orientation
        orientationActive = false;
        this.classList.remove("active");
        this.style.backgroundColor = "white";
        this.style.borderColor = "#ccc";
        this.style.borderWidth = "1px";
        this.style.borderStyle = "solid";
        this.querySelector("div").innerHTML = "🧭"; // Update inner div
      } else {
        // Request permission or turn on orientation if already granted
        if (
          typeof DeviceOrientationEvent.requestPermission === "function" &&
          !orientationPermissionGranted
        ) {
          // iOS specific flow
          this.querySelector("div").innerHTML =
            "🧭<div style='font-size: 10px; margin-top: 2px;'>Requesting...</div>";
          requestiOSPermission();
        } else {
          // Android or already has permission
          this.classList.add("active");
          setupDeviceOrientation(true); // Force setup
          orientationActive = true;
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
  const nameToggleButton = document.createElement("div");
  nameToggleButton.id = "name-toggle-button";
  nameToggleButton.className = "custom-button";
  nameToggleButton.style.position = "absolute";
  nameToggleButton.style.bottom = "10px";
  nameToggleButton.style.right = "10px";
  nameToggleButton.style.zIndex = "10";
  nameToggleButton.style.padding = "0"; // Remove padding - content div will handle it
  nameToggleButton.style.backgroundColor = "white";
  nameToggleButton.style.borderRadius = "4px";
  nameToggleButton.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.3)";
  nameToggleButton.style.cursor = "pointer";
  nameToggleButton.style.width = "auto";
  nameToggleButton.style.minHeight = "44px"; // Use min-height instead of fixed height
  nameToggleButton.style.height = "auto"; // Allow height to adjust to content
  nameToggleButton.style.display = "block";
  nameToggleButton.style.textAlign = "center";
  nameToggleButton.style.minWidth = "90px";

  // Create content div that fills the entire button
  const contentDiv = document.createElement("div");
  contentDiv.style.width = "100%";
  contentDiv.style.height = "100%";
  contentDiv.style.display = "flex";
  contentDiv.style.alignItems = "center";
  contentDiv.style.justifyContent = "center";
  contentDiv.style.padding = "8px"; // Reduce padding to 8px - symmetrical on all sides
  contentDiv.style.boxSizing = "border-box"; // Make sure padding is included in width/height
  contentDiv.style.fontSize = "12px"; // Slightly smaller font size to fit better
  contentDiv.style.lineHeight = "1.2"; // Tighter line height
  contentDiv.innerHTML = displayScientificNames
    ? "Show<br>common<br>names"
    : "Show<br>scientific<br>names";

  nameToggleButton.appendChild(contentDiv);
  nameToggleButton.addEventListener("click", toggleNameDisplay);
  document.getElementById("map").appendChild(nameToggleButton);
}

// Function to toggle between scientific and common names - updated
function toggleNameDisplay() {
  displayScientificNames = !displayScientificNames;

  // Update the button text with new wording and line breaks
  const toggleButton = document.getElementById("name-toggle-button");
  if (toggleButton) {
    const contentDiv = toggleButton.querySelector("div");
    if (contentDiv) {
      contentDiv.innerHTML = displayScientificNames
        ? "Show<br>common<br>names"
        : "Show<br>scientific<br>names";
    }
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
    // Add empty source for tree data without clustering
    map.addSource("trees", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
      // Remove cluster-related options
    });
    console.log("✅ Tree source added successfully");
    clusterSourceAdded = true;
  } catch (error) {
    console.error("❌ Error adding tree source:", error);
    return;
  }

  // Remove the cluster circles and cluster count layers
  // Only keep the unclustered-trees and tree-labels layers

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

  // Change cursor on hover for all interactive elements
  const interactiveLayers = ["unclustered-trees", "tree-labels"];
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

    // NEW: Also create scientific name with line breaks for map display
    properties.scientificNameForMap = scientificName.split(" ").join("\n");

    properties.commonName = formattedCommonName;
    properties.mapLabel = mapLabel;

    // Set initial display name based on current mode
    properties.displayName = displayScientificNames
      ? properties.scientificNameForMap // Use the version with line breaks
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
      ? feature.properties.scientificNameForMap // Use version with line breaks
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
        console.log(`Location acquired! Current heading: ${userHeading}°`);
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
  if (orientationSupported && !forceSetup) return;

  if (window.DeviceOrientationEvent) {
    // Fix for iOS permission flow - don't early return
    if (
      typeof DeviceOrientationEvent.requestPermission === "function" &&
      !orientationPermissionGranted
    ) {
      console.log("iOS device detected, waiting for explicit permission");
      return; // Still return, but only if permission hasn't been granted
    }

    try {
      // Clean up existing listeners
      window.removeEventListener("deviceorientation", handleOrientation);
      window.removeEventListener(
        "deviceorientationabsolute",
        handleOrientation
      );

      // Set a timeout to verify we're actually receiving orientation data
      lastOrientationData = null;
      setTimeout(() => {
        if (!lastOrientationData && orientationActive) {
          console.log("⚠️ No orientation data received after 2 seconds");
          const compassButton = document.getElementById("compass-button");
          if (compassButton) {
            compassButton.querySelector("div").innerHTML =
              "🧭<div style='font-size: 10px; color: orange; margin-top: 2px;'>no data</div>";
          }
        }
      }, 2000);

      // Add event listeners
      window.addEventListener("deviceorientation", handleOrientation);
      if ("ondeviceorientationabsolute" in window) {
        window.addEventListener("deviceorientationabsolute", handleOrientation);
      }

      orientationSupported = true;
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
      console.error("Error setting up orientation:", e);
      const compassButton = document.getElementById("compass-button");
      if (compassButton) {
        compassButton.style.backgroundColor = "white";
        compassButton.querySelector("div").innerHTML =
          "🧭<div style='font-size: 10px; color: red; margin-top: 2px;'>error</div>";
      }
    }
  }
}

// Request iOS permission for orientation
function requestiOSPermission() {
  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    DeviceOrientationEvent.requestPermission()
      .then((permissionState) => {
        if (permissionState === "granted") {
          orientationPermissionGranted = true; // Mark permission as explicitly granted
          orientationSupported = true;
          orientationActive = true;

          // Actually set up the orientation handling - this was missing
          setupDeviceOrientation(true);

          const compassButton = document.getElementById("compass-button");
          if (compassButton) {
            compassButton.classList.add("active");
            compassButton.style.backgroundColor = "#e6f2ff";
            compassButton.style.borderColor = "#4285F4";
            compassButton.style.borderWidth = "2px";
            compassButton.style.borderStyle = "solid";
          }
        } else {
          console.log("❌ iOS orientation permission denied");
          const compassButton = document.getElementById("compass-button");
          if (compassButton) {
            compassButton.style.backgroundColor = "white";
            compassButton.querySelector("div").innerHTML =
              "🧭<div style='font-size: 10px; color: red; margin-top: 2px;'>denied</div>";
            // Reset button after 2 seconds
            setTimeout(() => {
              compassButton.querySelector("div").innerHTML = "🧭";
            }, 2000);
          }
        }
      })
      .catch((error) => {
        console.error("Error requesting permission: " + error.message);
        const compassButton = document.getElementById("compass-button");
        if (compassButton) {
          compassButton.style.backgroundColor = "white";
          compassButton.querySelector("div").innerHTML =
            "🧭<div style='font-size: 10px; color: red; margin-top: 2px;'>error</div>";
          // Reset button after 2 seconds
          setTimeout(() => {
            compassButton.querySelector("div").innerHTML = "🧭";
          }, 2000);
        }
      });
  }
}

// Throttled orientation handler - update to track received data
function handleOrientation(event) {
  // Skip if orientation is not active
  if (!orientationActive) return;

  // Track that we're receiving orientation data
  lastOrientationData = event;

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
    console.log(debugInfo);
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
    // Show heading number - update the content div
    const contentDiv = compassButton.querySelector("div");
    if (contentDiv) {
      contentDiv.innerHTML = `🧭<div style="font-size: 10px; margin-top: 2px;">${Math.round(
        heading
      )}°</div>`;
    }
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

  // Create Wikipedia link for scientific name with special case for "Ulmus x"
  let wikipediaLink = "";

  if (scientificName && scientificName.trim().match(/^Ulmus\s+x\s*$/i)) {
    // Special case for hybrid elms that only have "Ulmus x" as the name
    wikipediaLink = "https://en.wikipedia.org/wiki/Elm#Hybrid_cultivars";
  } else if (scientificName) {
    // Regular case - link to the species page
    wikipediaLink = `https://en.wikipedia.org/wiki/${encodeURIComponent(
      scientificName.replace(/ /g, "_")
    )}`;
  }

  // Create the popup HTML with new styling and labels - now with Wikipedia link
  return `<div class="tree-popup" style="min-width: 220px; font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.2; padding: 10px;">
    <div style="font-weight: bold; margin-bottom: 2px;">${commonName}</div>
    <div style="color: #999; font-size: 10px; margin-bottom: 12px;">Common name</div>
    
    <div style="font-style: italic; margin-bottom: 2px;">
      ${
        scientificName
          ? `<a href="${wikipediaLink}" target="_blank" style="color: #4285F4; text-decoration: underline;">${scientificName}</a>`
          : "Unknown"
      }
    </div>
    <div style="color: #999; font-size: 10px; margin-bottom: 12px;">Scientific name</div>
    
    <div style="margin-bottom: 2px;">${dbhDisplay}</div>
    <div style="color: #999; font-size: 10px; margin-bottom: 12px;">Trunk width at chest height</div>
    
    ${
      lastUpdated
        ? `<div style="font-style: italic; color: #999; font-size: 10px; text-align: right;">as of ${lastUpdated}</div>`
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

// Add new button and functionality
function addFindBiggestTreeButton() {
  const findBiggestButton = document.createElement("div");
  findBiggestButton.id = "find-biggest-button";
  findBiggestButton.className = "custom-button";
  findBiggestButton.style.position = "absolute";
  findBiggestButton.style.bottom = "10px";
  findBiggestButton.style.left = "10px";
  findBiggestButton.style.zIndex = "10";
  findBiggestButton.style.backgroundColor = "white";
  findBiggestButton.style.padding = "0"; // Remove padding - content div will handle it
  findBiggestButton.style.borderRadius = "4px";
  findBiggestButton.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.3)";
  findBiggestButton.style.cursor = "pointer";
  findBiggestButton.style.width = "auto";
  findBiggestButton.style.minHeight = "44px"; // Use min-height instead of fixed height
  findBiggestButton.style.height = "auto"; // Allow height to adjust to content
  findBiggestButton.style.display = "block";
  findBiggestButton.style.textAlign = "center";
  findBiggestButton.style.minWidth = "90px";

  // Create content div that fills the entire button
  const contentDiv = document.createElement("div");
  contentDiv.style.width = "100%";
  contentDiv.style.height = "100%";
  contentDiv.style.display = "flex";
  contentDiv.style.alignItems = "center";
  contentDiv.style.justifyContent = "center";
  contentDiv.style.padding = "8px"; // Reduce padding to 8px - symmetrical on all sides
  contentDiv.style.boxSizing = "border-box"; // Make sure padding is included in width/height
  contentDiv.style.fontSize = "12px"; // Slightly smaller font size to fit better
  contentDiv.style.lineHeight = "1.2"; // Tighter line height
  contentDiv.innerHTML = "Find<br>biggest<br>tree";

  findBiggestButton.appendChild(contentDiv);
  findBiggestButton.addEventListener("click", highlightBiggestTrees);
  document.getElementById("map").appendChild(findBiggestButton);
}

function highlightBiggestTrees() {
  // Debounce to prevent multiple animations
  if (isAnimatingBiggestTrees) return;

  // Immediate visual feedback on button click
  const findBiggestButton = document.getElementById("find-biggest-button");
  const originalButtonColor = findBiggestButton.style.backgroundColor;
  findBiggestButton.style.backgroundColor = "#e6f2ff";
  findBiggestButton.style.borderColor = "#4285F4";
  findBiggestButton.style.borderWidth = "2px";
  findBiggestButton.style.borderStyle = "solid";

  // Update content of the inner div
  const contentDiv = findBiggestButton.querySelector("div");
  if (contentDiv) {
    contentDiv.innerHTML = "Finding<br>biggest<br>trees...";
  }

  isAnimatingBiggestTrees = true;

  // Get all buttons
  const buttons = [
    document.getElementById("location-button"), // Top-left
    document.getElementById("compass-button"), // Top-right
    document.getElementById("find-biggest-button"), // Bottom-left
    document.getElementById("name-toggle-button"), // Bottom-right
  ];

  // Get map container dimensions
  const mapContainer = map.getContainer();
  const containerWidth = mapContainer.offsetWidth;
  const containerHeight = mapContainer.offsetHeight;

  // Create exclusion rectangles that extend to screen edges
  const exclusionRects = buttons
    .map((button) => {
      if (!button) return null;
      const rect = button.getBoundingClientRect();
      const mapRect = mapContainer.getBoundingClientRect();

      // Convert coordinates relative to map container
      const left = rect.left - mapRect.left;
      const top = rect.top - mapRect.top;
      const right = rect.right - mapRect.left;
      const bottom = rect.bottom - mapRect.top;

      // Extend rectangles to screen edges based on button position
      if (left < containerWidth / 2 && top < containerHeight / 2) {
        // Top-left button: extend to left and top edges
        return [
          [0, 0],
          [right + 10, bottom + 10],
        ];
      } else if (left >= containerWidth / 2 && top < containerHeight / 2) {
        // Top-right button: extend to right and top edges
        return [
          [left - 10, 0],
          [containerWidth, bottom + 10],
        ];
      } else if (left < containerWidth / 2 && top >= containerHeight / 2) {
        // Bottom-left button: extend to left and bottom edges
        return [
          [0, top - 10],
          [right + 10, containerHeight],
        ];
      } else {
        // Bottom-right button: extend to right and bottom edges
        return [
          [left - 10, top - 10],
          [containerWidth, containerHeight],
        ];
      }
    })
    .filter((rect) => rect !== null);

  // Query visible trees, excluding those in button areas
  const features = [];
  const fullMapArea = [
    [0, 0],
    [containerWidth, containerHeight],
  ];

  // Get all visible trees first
  const allVisibleTrees = map.queryRenderedFeatures(fullMapArea, {
    layers: ["unclustered-trees"],
  });

  // Filter out trees in exclusion zones
  allVisibleTrees.forEach((tree) => {
    const point = map.project(tree.geometry.coordinates);
    let isInExclusionZone = false;

    // Check if tree is in any exclusion rectangle
    for (const rect of exclusionRects) {
      if (
        point.x >= rect[0][0] &&
        point.x <= rect[1][0] &&
        point.y >= rect[0][1] &&
        point.y <= rect[1][1]
      ) {
        isInExclusionZone = true;
        break;
      }
    }

    if (!isInExclusionZone) {
      features.push(tree);
    }
  });

  if (!features.length) {
    // Reset button state if no trees found
    findBiggestButton.style.backgroundColor = originalButtonColor;
    findBiggestButton.style.borderColor = "";
    findBiggestButton.style.borderWidth = "";
    findBiggestButton.style.borderStyle = "";

    // Update inner content div
    const contentDiv = findBiggestButton.querySelector("div");
    if (contentDiv) {
      contentDiv.innerHTML = "Find<br>biggest<br>tree";
    }

    isAnimatingBiggestTrees = false;
    return;
  }

  // Find the biggest trees - get the max DBH
  const maxDBH = Math.max(...features.map((f) => f.properties.dbh || 0));
  const biggestTrees = features.filter((f) => f.properties.dbh === maxDBH);

  console.log(
    `Found ${biggestTrees.length} biggest trees with DBH = ${maxDBH}`
  );

  // Create radar pulse layer if it doesn't exist
  if (!map.getLayer("tree-radar-pulse")) {
    map.addLayer({
      id: "tree-radar-pulse",
      type: "circle",
      source: "trees",
      filter: ["==", ["get", "dbh"], -1], // Initially empty
      paint: {
        "circle-radius": 0,
        "circle-color": "transparent",
        "circle-stroke-width": 3,
        "circle-stroke-color": "#00ff00",
        "circle-stroke-opacity": 0.8,
      },
    });
  }

  // Set filter to show just the biggest trees
  map.setFilter("tree-radar-pulse", ["==", ["get", "dbh"], maxDBH]);

  // Add temporary highlighting layer for biggest trees
  if (!map.getLayer("biggest-trees-highlight")) {
    map.addLayer(
      {
        id: "biggest-trees-highlight",
        type: "circle",
        source: "trees",
        filter: ["==", ["get", "dbh"], -1], // Initially empty
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": map.getPaintProperty(
            "unclustered-trees",
            "circle-radius"
          ),
          "circle-stroke-width": 3,
          "circle-stroke-color": "#00ff00",
          "circle-opacity": 0.9,
          "circle-stroke-opacity": 1,
        },
      },
      "tree-radar-pulse"
    );
  }

  // Set the highlight filter
  map.setFilter("biggest-trees-highlight", ["==", ["get", "dbh"], maxDBH]);

  // Create 3 radar pulses with different timings
  let startTime = null;
  const duration = 3000; // 3 seconds total for all pulses

  function animateRadar(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;

    if (elapsed > duration) {
      // Animation complete, clean up
      map.setFilter("tree-radar-pulse", ["==", ["get", "dbh"], -1]);
      map.setFilter("biggest-trees-highlight", ["==", ["get", "dbh"], -1]);

      // Reset button
      findBiggestButton.style.backgroundColor = originalButtonColor;
      findBiggestButton.style.borderColor = "";
      findBiggestButton.style.borderWidth = "";
      findBiggestButton.style.borderStyle = "";

      // Update inner content div
      const contentDiv = findBiggestButton.querySelector("div");
      if (contentDiv) {
        contentDiv.innerHTML = "Find<br>biggest<br>tree";
      }

      isAnimatingBiggestTrees = false;
      return;
    }

    // Calculate pulse sizes for 3 sequential pulses
    const pulseProgress = (elapsed % 1000) / 1000; // 0-1 for each pulse
    const pulseSize = pulseProgress * 50; // Maximum radius 50 pixels

    // Set the pulse radius
    map.setPaintProperty("tree-radar-pulse", "circle-radius", pulseSize);

    // Fade out the pulse as it expands
    const pulseOpacity = Math.max(0, 1 - pulseProgress);
    map.setPaintProperty(
      "tree-radar-pulse",
      "circle-stroke-opacity",
      pulseOpacity
    );

    // Continue animation
    requestAnimationFrame(animateRadar);
  }

  // Start the animation
  requestAnimationFrame(animateRadar);
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
