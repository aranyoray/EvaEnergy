/**
 * MapLibre Choropleth Visualization for US Counties
 * Simplified for performance - no markers, only county boundaries with heatmap
 */

let map;
let countiesData = new Map(); // Store data by county FIPS code

/**
 * Initialize the map with US bounds only
 */
function initMap() {
    map = new maplibregl.Map({
        container: 'map',
        style: 'https://demotiles.maplibre.org/style.json',
        center: [-98, 39],
        zoom: 4,
        minZoom: 3,
        maxZoom: 10,
        maxBounds: [[-170, 15], [-50, 72]], // Restrict to US bounds
        attributionControl: true
    });

    map.on('load', () => {
        loadCountyBoundaries();
    });

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
}

/**
 * Calculate power potential based on simplified climate model
 */
function calculatePowerForState(stateName, lat) {
    // Simplified state-based power calculation
    const baseTemp = 30 - (Math.abs(lat) * 0.6);
    const basePower = baseTemp * 3 + (40 - Math.abs(lat)) * 2;

    // Southwest states have higher solar potential
    const highPowerStates = ['Arizona', 'Nevada', 'New Mexico', 'California', 'Texas', 'Utah'];
    const bonus = highPowerStates.includes(stateName) ? 50 : 0;

    return Math.max(20, basePower + bonus + (Math.random() * 20));
}

/**
 * Load US county boundaries and add data
 */
async function loadCountyBoundaries() {
    const loadingEl = document.getElementById('loading');

    try {
        loadingEl.querySelector('p').textContent = 'Loading US county boundaries...';

        // Fetch US counties GeoJSON from public source
        const response = await fetch('https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json');
        const geojson = await response.json();

        loadingEl.querySelector('p').textContent = 'Processing county data...';

        // Calculate power values for each county
        geojson.features.forEach(feature => {
            const coords = feature.geometry.type === 'Polygon'
                ? feature.geometry.coordinates[0][0]
                : feature.geometry.coordinates[0][0][0];

            const lat = coords[1];
            const lon = coords[0];
            const fips = feature.id;

            // Get state name from our counties data if available
            const countyInfo = usCounties.find(c =>
                Math.abs(c.lat - lat) < 2 && Math.abs(c.lon - lon) < 2
            );

            const stateName = countyInfo ? countyInfo.state : 'Unknown';
            const power = calculatePowerForState(stateName, lat);

            // Store in map
            countiesData.set(fips, {
                fips,
                power,
                state: stateName,
                lat,
                lon
            });

            // Add power to feature properties
            feature.properties.power = power;
            feature.properties.state = stateName;
        });

        // Add source
        map.addSource('counties', {
            type: 'geojson',
            data: geojson
        });

        // Add fill layer for choropleth
        map.addLayer({
            id: 'counties-fill',
            type: 'fill',
            source: 'counties',
            paint: {
                'fill-color': [
                    'interpolate',
                    ['linear'],
                    ['get', 'power'],
                    0, '#313695',
                    50, '#4575b4',
                    75, '#74add1',
                    100, '#abd9e9',
                    125, '#fee090',
                    150, '#fdae61',
                    175, '#f46d43',
                    200, '#d73027',
                    250, '#a50026'
                ],
                'fill-opacity': 0.7
            }
        });

        // Add county borders
        map.addLayer({
            id: 'counties-borders',
            type: 'line',
            source: 'counties',
            paint: {
                'line-color': '#ffffff',
                'line-width': 0.5,
                'line-opacity': 0.3
            }
        });

        // Add hover effect
        let hoveredFips = null;

        map.on('mousemove', 'counties-fill', (e) => {
            if (e.features.length > 0) {
                if (hoveredFips !== null) {
                    map.setFeatureState(
                        { source: 'counties', id: hoveredFips },
                        { hover: false }
                    );
                }

                hoveredFips = e.features[0].id;

                map.setFeatureState(
                    { source: 'counties', id: hoveredFips },
                    { hover: true }
                );

                // Show popup
                const feature = e.features[0];
                const power = feature.properties.power;
                const state = feature.properties.state;

                new maplibregl.Popup({
                    closeButton: false,
                    closeOnClick: false
                })
                .setLngLat(e.lngLat)
                .setHTML(`
                    <div style="padding: 8px;">
                        <strong>${state}</strong><br>
                        Power: <span style="color: #f46d43; font-weight: bold;">${power.toFixed(1)} W/m²</span><br>
                        <small>${power > 150 ? 'Excellent' : power > 100 ? 'Good' : power > 75 ? 'Moderate' : 'Low'} Potential</small>
                    </div>
                `)
                .addTo(map);
            }
        });

        map.on('mouseleave', 'counties-fill', () => {
            if (hoveredFips !== null) {
                map.setFeatureState(
                    { source: 'counties', id: hoveredFips },
                    { hover: false }
                );
            }
            hoveredFips = null;

            // Remove popup
            const popups = document.getElementsByClassName('maplibregl-popup');
            if (popups.length) {
                popups[0].remove();
            }
        });

        // Highlight on hover
        map.setPaintProperty('counties-fill', 'fill-opacity', [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            1,
            0.7
        ]);

        loadingEl.style.display = 'none';
        updateStatistics();

    } catch (error) {
        console.error('Error loading county boundaries:', error);
        loadingEl.querySelector('p').textContent = 'Error loading data. Please refresh.';
    }
}

/**
 * Update statistics
 */
function updateStatistics() {
    const powers = Array.from(countiesData.values()).map(d => d.power);
    const avgPower = powers.reduce((sum, p) => sum + p, 0) / powers.length;
    const maxPower = Math.max(...powers);
    const maxCounty = Array.from(countiesData.values()).find(d => d.power === maxPower);

    document.getElementById('countyCount').textContent = countiesData.size;
    document.getElementById('avgPower').textContent = avgPower.toFixed(1);
    document.getElementById('bestCounty').textContent = `${maxCounty.state} (${maxPower.toFixed(1)} W/m²)`;
}

/**
 * Show top counties by power
 */
function showTopCounties() {
    const topCounties = Array.from(countiesData.values())
        .sort((a, b) => b.power - a.power)
        .slice(0, 10);

    // Fit map to show top counties
    const bounds = new maplibregl.LngLatBounds();
    topCounties.forEach(county => {
        bounds.extend([county.lon, county.lat]);
    });

    map.fitBounds(bounds, { padding: 100 });

    console.log('Top 10 Counties:', topCounties.map((c, i) =>
        `${i + 1}. ${c.state}: ${c.power.toFixed(1)} W/m²`
    ).join('\n'));
}

/**
 * Reset view to US
 */
function resetView() {
    map.flyTo({
        center: [-98, 39],
        zoom: 4,
        duration: 1500
    });
}

/**
 * Toggle heatmap intensity
 */
function toggleHeatmap() {
    const currentOpacity = map.getPaintProperty('counties-fill', 'fill-opacity');
    const newOpacity = Array.isArray(currentOpacity) ? 0.7 : (currentOpacity === 0.7 ? 0.9 : 0.7);

    map.setPaintProperty('counties-fill', 'fill-opacity', [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        1,
        newOpacity
    ]);
}

/**
 * Toggle resolution (placeholder)
 */
function toggleResolution() {
    alert('County-level resolution active. ZIP code level coming soon.');
}

// Initialize map when page loads
window.addEventListener('load', () => {
    initMap();
});
