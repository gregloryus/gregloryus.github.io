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

// Mapbox access token - REPLACE WITH YOUR OWN TOKEN
const mapboxAccessToken =
  "pk.eyJ1IjoiZ3JlZ2xvcnl1cyIsImEiOiJjbTg4dWF5a3IwdWNiMmpwc2xkMHh2MG90In0.MiqAh3PR2fbJOvFblQBPSg";

// Initialize the map
function initMap() {
  console.log("Initializing map with Mapbox...");

  // Initialize Mapbox map
  mapboxgl.accessToken = mapboxAccessToken;

  map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/dark-v11", // Dark style for minimalist design
    center: [-87.6877, 42.0451], // Evanston, IL coordinates - reversed for Mapbox
    zoom: 14,
    attributionControl: false,
    bearing: 0, // Initial rotation - will be updated based on user's heading
    pitchWithRotate: false,
    dragRotate: false, // Disable manual rotation via mouse/touch
  });

  // Add custom controls once map loads
  map.on("load", function () {
    console.log("Map loaded, adding controls...");

    // Add loading indicator overlay
    const loadingIndicator = document.createElement("div");
    loadingIndicator.id = "loading-indicator";
    loadingIndicator.innerHTML = "Loading tree data...";
    loadingIndicator.style.display = "none";
    document.body.appendChild(loadingIndicator);

    // Add location button
    addLocationButton();

    // Add name toggle button
    addNameToggleButton();

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
      getUserLocation();
    }, 1000);

    // Setup device orientation with iOS focus
    setupDeviceOrientation();
  });

  // Add navigation control (zoom buttons)
  map.addControl(
    new mapboxgl.NavigationControl({
      showCompass: false, // Hide the compass since we'll use our own heading indicator
    }),
    "bottom-right"
  );
}

// Add location button to map
function addLocationButton() {
  // Create a custom HTML element for the button
  const locationButton = document.createElement("div");
  locationButton.className =
    "mapboxgl-ctrl mapboxgl-ctrl-group location-button";
  locationButton.innerHTML =
    '<button type="button" title="Show My Location" style="font-weight: bold; text-decoration: none; color: black; display: block; text-align: center; height: 30px; width: 30px; line-height: 30px;">📍</button>';
  locationButton.addEventListener("click", getUserLocation);

  // Add the custom control directly to the DOM
  locationButton.style.position = "absolute";
  locationButton.style.top = "10px";
  locationButton.style.left = "10px";
  locationButton.style.zIndex = "1";
  document.getElementById("map").appendChild(locationButton);
}

// Add name toggle button to map
function addNameToggleButton() {
  // Create a custom HTML element for the button
  const nameToggleButton = document.createElement("div");
  nameToggleButton.className =
    "mapboxgl-ctrl mapboxgl-ctrl-group name-toggle-button";
  nameToggleButton.innerHTML =
    '<button id="name-toggle" type="button" title="Toggle Scientific/Common Names" style="font-weight: bold; text-decoration: none; color: black; display: block; text-align: center; padding: 5px; background-color: white; width: auto;">Scientific Names</button>';
  nameToggleButton.addEventListener("click", toggleNameDisplay);

  // Add the custom control directly to the DOM
  nameToggleButton.style.position = "absolute";
  nameToggleButton.style.bottom = "50px";
  nameToggleButton.style.right = "10px";
  nameToggleButton.style.zIndex = "1";
  document.getElementById("map").appendChild(nameToggleButton);
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

// Setup clustering layers for tree visualization
function setupClusterLayers() {
  // Add empty source for tree data
  map.addSource("trees", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [],
    },
    cluster: true,
    clusterMaxZoom: 14, // Disable clustering at higher zoom levels
    clusterRadius: 40,
  });

  clusterSourceAdded = true;

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
        20, // radius for clusters with < 10 points
        10,
        30, // radius for clusters with < 50 points
        50,
        40, // radius for clusters with >= 50 points
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
      "text-size": 12,
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
        ["*", 0.5, ["sqrt", ["max", ["get", "dbh"], 1]]], // smaller at low zoom
        18,
        ["*", 2, ["sqrt", ["max", ["get", "dbh"], 1]]], // larger at high zoom
        20,
        ["*", 4, ["sqrt", ["max", ["get", "dbh"], 1]]], // even larger at highest zoom
      ],
      "circle-stroke-width": 1,
      "circle-stroke-color": "#000000",
      "circle-opacity": 0.4, // More transparent
    },
  });

  // 4. Tree labels (only visible at high zoom) - Modified for better positioning and legibility
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
        10, // Fixed minimum size at zoom level 18
        20,
        14, // Larger fixed size at highest zoom
      ],
      "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
      "text-offset": [0, -1.5], // Position labels above the circles
      "text-anchor": "center",
      "text-allow-overlap": false,
      "text-ignore-placement": false,
      "symbol-sort-key": ["*", -1, ["get", "dbh"]], // Prioritize larger trees
      "text-max-width": 12, // Allow text to wrap if needed
    },
    paint: {
      "text-color": ["get", "color"],
      "text-halo-color": "#000000",
      "text-halo-width": 2, // Thicker halo for better contrast against the map
      "text-opacity": 0.9, // Slightly transparent text
    },
  });

  // Add click handler for tree features
  map.on("click", "unclustered-trees", function (e) {
    const feature = e.features[0];
    showTreePopup(feature, e.lngLat);
  });

  // Change cursor on hover
  map.on("mouseenter", "unclustered-trees", function () {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", "unclustered-trees", function () {
    map.getCanvas().style.cursor = "";
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

  // Change cursor on cluster hover
  map.on("mouseenter", "clusters", function () {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", "clusters", function () {
    map.getCanvas().style.cursor = "";
  });
}

// Show popup for a tree
function showTreePopup(feature, lngLat) {
  // Create popup content
  const popupContent = createPopupContent(feature.properties);

  // Create and show the popup
  new mapboxgl.Popup().setLngLat(lngLat).setHTML(popupContent).addTo(map);
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

    // Process the data to add required properties for display
    processTreeData(data);

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
    properties.commonName = commonName;

    // Set initial display name based on current mode
    properties.displayName = displayScientificNames
      ? properties.scientificName
      : properties.commonName;
  });
}

// Display initial subset of trees
function displayInitialTrees(data) {
  console.log("Displaying initial trees...");
  if (!data || !data.features) {
    console.error("Invalid data format:", data);
    hideLoading();
    return;
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
    // If no bounds yet, just use a subset
    visibleFeatures = data.features.slice(0, 500);
  }

  // Limit number of features to prevent performance issues
  const limitedFeatures = visibleFeatures.slice(0, 500);

  console.log(
    `Loading ${limitedFeatures.length} of ${data.features.length} trees initially`
  );
  showLoading(`Loading ${limitedFeatures.length} trees...`);

  // Update the data in the source
  if (map.getSource("trees")) {
    map.getSource("trees").setData({
      type: "FeatureCollection",
      features: limitedFeatures,
    });
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
      : feature.properties.commonName;
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
          position.coords.longitude, // Mapbox uses [lng, lat] order
          position.coords.latitude,
        ];

        // Remove previous user marker if exists
        if (userLocationMarker) {
          userLocationMarker.remove();
        }

        // Create the user marker element
        const userMarkerElement = document.createElement("div");
        userMarkerElement.className = "user-marker";
        userMarkerElement.style.backgroundColor = "#4285F4";
        userMarkerElement.style.width = "15px";
        userMarkerElement.style.height = "15px";
        userMarkerElement.style.borderRadius = "50%";
        userMarkerElement.style.border = "2px solid white";

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
          bearing: userHeading, // Apply any existing heading
          essential: true, // This animation is considered essential with respect to prefers-reduced-motion
        });

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
        map.flyTo({
          center: [-87.6877, 42.0451],
          zoom: 15,
        });
      },
      // Options - increased timeout and improved accuracy
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  } else {
    alert(
      "Geolocation is not supported by your browser. Please use a modern browser like Chrome, Firefox, or Safari."
    );
  }
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

// iOS-specific orientation handler - update map rotation
function handleiOSOrientation(event) {
  // iOS provides webkitCompassHeading which is already calibrated
  if (event.webkitCompassHeading !== undefined) {
    // webkitCompassHeading is measured clockwise from north in degrees (0-359)
    userHeading = event.webkitCompassHeading;
    updateMapRotation(userHeading);
  }
}

// General orientation handler - update map rotation
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

  userHeading = heading;
  updateMapRotation(heading);
}

// Update the map rotation based on the heading
function updateMapRotation(heading) {
  // Only update if we have a user marker and heading is valid
  if (!userLocationMarker || heading === undefined) return;

  // Update the map bearing (rotation) to match the user's heading
  map.easeTo({
    bearing: heading,
    duration: 300, // smooth transition over 300ms
  });

  // Store the current heading for later use
  userHeading = heading;
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

// Initialize when the page loads
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, initializing map...");
  initMap();
});
