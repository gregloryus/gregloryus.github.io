# Evanston Tree Map

An interactive web application that displays all public trees in Evanston, IL on a map. This application allows users to explore tree locations, view detailed information about each tree, and find trees near their current location.

## Features

- Interactive map displaying all public trees in Evanston
- Click on any tree to view detailed information including species, size, condition, etc.
- Locate yourself on the map to find nearby trees
- Lightweight implementation using HTML, CSS, and JavaScript
- Mobile-friendly responsive design

## How to Use

1. Open `treemap.html` in a web browser
2. The map will load with all trees displayed as blue circles
3. Click on any tree to view detailed information about it
4. Click the 📍 button in the top left corner to show your current location
5. When you share your location, the five nearest trees will be highlighted in green

## Data Source

This application uses tree data from the City of Evanston's open data portal:
https://data.cityofevanston.org/Information-Technology-includes-maps-geospatial-da/Trees/5xaw-wg36/about_data

## Setup Instructions

1. Clone or download this repository
2. Ensure your tree data file is named either `trees.json` or `trees.csv` and placed in the same directory as the HTML file
3. Open `treemap.html` in a web browser

## Notes on Data Format

The application expects the tree data in one of the following formats:

1. GeoJSON format with a FeatureCollection containing tree locations as points
2. JSON array format (typically converted from CSV)
3. CSV format with columns including LATITUDE and LONGITUDE

The application will automatically try to load the data in the order listed above.

## Future Enhancements

- Add filtering options for tree species, size, etc.
- Implement clustering for better performance with large datasets
- Add different styling based on tree genus or species
- Include leaf icons or other visual indicators for different tree types

## License

MIT License

## Author

Created by [Your Name]
