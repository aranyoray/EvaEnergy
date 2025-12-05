/**
 * MapLibre Visualization for Capital Cities Evaporation Engine Analysis
 */

let map;
let citiesData = [];
let markers = [];
let heatmapVisible = false;

// Climate data cache
const climateCache = new Map();

/**
 * Initialize the map
 */
function initMap() {
    map = new maplibregl.Map({
        container: 'map',
        style: {
            version: 8,
            glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
            sources: {
                'osm': {
                    type: 'raster',
                    tiles: [
                        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
                    ],
                    tileSize: 256,
                    attribution: '© OpenStreetMap contributors'
                }
            },
            layers: [{
                id: 'osm',
                type: 'raster',
                source: 'osm',
                minzoom: 0,
                maxzoom: 19
            }]
        },
        center: [20, 20],
        zoom: 2,
        attributionControl: true
    });

    map.on('load', () => {
        loadCitiesData();
    });

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
}

/**
 * Get climate data estimate based on latitude
 * This is a simplified estimation for demonstration
 * In production, would fetch from Open-Meteo API
 */
function estimateClimateData(lat, lon) {
    // Use cached data if available
    const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    if (climateCache.has(cacheKey)) {
        return climateCache.get(cacheKey);
    }

    // Simplified climate estimation based on latitude and longitude
    const absLat = Math.abs(lat);

    // Temperature decreases with latitude
    const avgTemp = 30 - (absLat * 0.6);

    // Humidity estimation (higher near equator and coasts)
    const baseHumidity = 0.7 - (absLat * 0.005);
    const avgHumidity = Math.max(0.3, Math.min(0.9, baseHumidity));

    // Wind speed (generally higher in mid-latitudes)
    const avgWindSpeed = 2 + Math.abs(Math.sin(absLat * Math.PI / 90)) * 3;

    // Solar radiation (higher near equator)
    const avgSolarRadiation = 250 - (absLat * 2.5);

    // Regional adjustments
    let tempAdj = 0;
    let humidityAdj = 0;
    let radiationAdj = 0;

    // Desert regions (approximate)
    if ((absLat > 15 && absLat < 35) || (absLat > 15 && absLat < 30)) {
        // Subtropical high-pressure belts (deserts)
        if ((lon > -20 && lon < 50 && lat > 15 && lat < 35) || // Sahara, Arabia
            (lon > -120 && lon < -100 && lat > 20 && lat < 40) || // SW USA
            (lon > 110 && lon < 140 && lat < -20 && lat > -35)) { // Australia
            tempAdj = 5;
            humidityAdj = -0.3;
            radiationAdj = 50;
        }
    }

    // Monsoon regions
    if (lat > 5 && lat < 30 && lon > 70 && lon < 100) {
        humidityAdj = 0.15;
    }

    // Mediterranean
    if (lat > 30 && lat < 45 && lon > -10 && lon < 40) {
        tempAdj = 2;
        humidityAdj = -0.1;
        radiationAdj = 20;
    }

    const climate = {
        avgTemp: avgTemp + tempAdj,
        avgHumidity: Math.max(0.2, Math.min(0.95, avgHumidity + humidityAdj)),
        avgWindSpeed: avgWindSpeed,
        avgSolarRadiation: avgSolarRadiation + radiationAdj
    };

    climateCache.set(cacheKey, climate);
    return climate;
}

/**
 * Load and process cities data
 */
async function loadCitiesData() {
    const loadingEl = document.getElementById('loading');

    try {
        // Process each capital city
        for (let i = 0; i < capitalCities.length; i++) {
            const city = capitalCities[i];

            // Update loading message
            loadingEl.querySelector('p').textContent =
                `Analyzing ${city.name} (${i + 1}/${capitalCities.length})...`;

            // Get climate estimate
            const climate = estimateClimateData(city.lat, city.lon);

            // Calculate power potential
            const power = evapCalc.estimatePowerFromClimateaverages(climate);
            const category = evapCalc.getPowerCategory(power);

            citiesData.push({
                ...city,
                climate: climate,
                power: power,
                category: category
            });

            // Small delay to show progress
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Sort by power (descending)
        citiesData.sort((a, b) => b.power - a.power);

        // Hide loading
        loadingEl.style.display = 'none';

        // Create visualization
        createMarkers();
        updateStatistics();

    } catch (error) {
        console.error('Error loading data:', error);
        loadingEl.querySelector('p').textContent = 'Error loading data. Please refresh.';
    }
}

/**
 * Create markers for all cities
 */
function createMarkers() {
    citiesData.forEach(city => {
        // Create custom marker
        const el = document.createElement('div');
        el.className = 'marker';
        el.style.width = '20px';
        el.style.height = '20px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = city.category.color;
        el.style.border = '2px solid white';
        el.style.cursor = 'pointer';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';

        // Add hover effect
        el.addEventListener('mouseenter', () => {
            el.style.transform = 'scale(1.3)';
            el.style.zIndex = '1000';
        });

        el.addEventListener('mouseleave', () => {
            el.style.transform = 'scale(1)';
            el.style.zIndex = '1';
        });

        // Create popup content
        const popupContent = `
            <h3>${city.name}, ${city.country}</h3>
            <p><strong>Power Potential:</strong> ${city.power.toFixed(2)} W/m²</p>
            <p><strong>Rating:</strong> ${city.category.label}</p>
            <hr style="margin: 10px 0; border: none; border-top: 1px solid #444;">
            <p style="font-size: 12px;"><strong>Climate Factors:</strong></p>
            <p style="font-size: 11px;">• Temperature: ${city.climate.avgTemp.toFixed(1)}°C</p>
            <p style="font-size: 11px;">• Humidity: ${(city.climate.avgHumidity * 100).toFixed(0)}%</p>
            <p style="font-size: 11px;">• Wind Speed: ${city.climate.avgWindSpeed.toFixed(1)} m/s</p>
            <p style="font-size: 11px;">• Solar Radiation: ${city.climate.avgSolarRadiation.toFixed(0)} W/m²</p>
            <hr style="margin: 10px 0; border: none; border-top: 1px solid #444;">
            <p style="font-size: 11px; color: #999;">${city.category.description}</p>
        `;

        const popup = new maplibregl.Popup({ offset: 25 })
            .setHTML(popupContent);

        const marker = new maplibregl.Marker({ element: el })
            .setLngLat([city.lon, city.lat])
            .setPopup(popup)
            .addTo(map);

        markers.push({ marker, city });
    });
}

/**
 * Update global statistics
 */
function updateStatistics() {
    const avgPower = citiesData.reduce((sum, city) => sum + city.power, 0) / citiesData.length;
    const bestCity = citiesData[0]; // Already sorted

    document.getElementById('cityCount').textContent = citiesData.length;
    document.getElementById('avgPower').textContent = avgPower.toFixed(1);
    document.getElementById('bestCity').textContent = `${bestCity.name} (${bestCity.power.toFixed(1)} W/m²)`;
}

/**
 * Show top 10 cities
 */
function showTopCities() {
    const top10 = citiesData.slice(0, 10);

    // Fit bounds to include all top cities
    const bounds = new maplibregl.LngLatBounds();
    top10.forEach(city => {
        bounds.extend([city.lon, city.lat]);
    });

    map.fitBounds(bounds, { padding: 100, maxZoom: 5 });

    // Highlight top cities
    markers.forEach(({ marker, city }) => {
        const el = marker.getElement();
        if (top10.includes(city)) {
            el.style.transform = 'scale(1.5)';
            el.style.boxShadow = '0 0 20px rgba(255, 255, 0, 0.8)';
            setTimeout(() => {
                el.style.transform = 'scale(1)';
                el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
            }, 2000);
        }
    });
}

/**
 * Reset view to global
 */
function resetView() {
    map.flyTo({
        center: [20, 20],
        zoom: 2,
        duration: 2000
    });
}

/**
 * Toggle heatmap view
 */
function toggleHeatmap() {
    heatmapVisible = !heatmapVisible;

    if (heatmapVisible) {
        // Add heatmap layer
        if (!map.getSource('cities-heat')) {
            map.addSource('cities-heat', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: citiesData.map(city => ({
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [city.lon, city.lat]
                        },
                        properties: {
                            power: city.power
                        }
                    }))
                }
            });

            map.addLayer({
                id: 'cities-heat',
                type: 'heatmap',
                source: 'cities-heat',
                paint: {
                    'heatmap-weight': [
                        'interpolate',
                        ['linear'],
                        ['get', 'power'],
                        0, 0,
                        300, 1
                    ],
                    'heatmap-intensity': 1,
                    'heatmap-color': [
                        'interpolate',
                        ['linear'],
                        ['heatmap-density'],
                        0, 'rgba(33,102,172,0)',
                        0.2, 'rgb(103,169,207)',
                        0.4, 'rgb(209,229,240)',
                        0.6, 'rgb(253,219,199)',
                        0.8, 'rgb(239,138,98)',
                        1, 'rgb(178,24,43)'
                    ],
                    'heatmap-radius': 40,
                    'heatmap-opacity': 0.8
                }
            });
        } else {
            map.setLayoutProperty('cities-heat', 'visibility', 'visible');
        }
    } else {
        if (map.getLayer('cities-heat')) {
            map.setLayoutProperty('cities-heat', 'visibility', 'none');
        }
    }
}

/**
 * Fetch real weather data from Open-Meteo API
 * This is for future enhancement to get actual data
 */
async function fetchWeatherData(lat, lon, startDate, endDate) {
    const url = `https://archive-api.open-meteo.com/v1/archive?` +
        `latitude=${lat}&longitude=${lon}&` +
        `start_date=${startDate}&end_date=${endDate}&` +
        `daily=temperature_2m_mean,relative_humidity_2m_mean,wind_speed_10m_mean,` +
        `shortwave_radiation_sum&timezone=auto`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching weather data:', error);
        return null;
    }
}

// Initialize map when page loads
window.addEventListener('load', initMap);
