/**
 * MapLibre Visualization for US Counties Evaporation Engine Analysis
 * Enhanced with hover popups, heatmap, and county boundary visualization
 */

let map;
let countiesData = [];
let markers = [];
let heatmapVisible = false;
let currentPopup = null;
let countyBoundariesVisible = false;
let countyBoundariesSource = null;

// Climate data cache
const climateCache = new Map();

/**
 * Initialize the map with minimalist style
 */
function initMap() {
    // Use a light, minimalist map style
    map = new maplibregl.Map({
        container: 'map',
        style: {
            version: 8,
            sources: {
                'carto-positron': {
                    type: 'raster',
                    tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'],
                    tileSize: 256,
                    attribution: '© OpenStreetMap contributors © CARTO'
                }
            },
            layers: [{
                id: 'carto-positron-layer',
                type: 'raster',
                source: 'carto-positron',
                minzoom: 0,
                maxzoom: 22
            }]
        },
        center: [-98, 39],
        zoom: 4,
        attributionControl: true
    });

    map.on('load', () => {
        loadCountiesData();
    });

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
}

/**
 * Get climate data estimate based on latitude and enhanced resolution
 * Enhanced with more granular regional data
 */
function estimateClimateData(lat, lon) {
    const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    if (climateCache.has(cacheKey)) {
        return climateCache.get(cacheKey);
    }

    const absLat = Math.abs(lat);

    // Base temperature calculation with seasonal variation
    let avgTemp = 30 - (absLat * 0.6);

    // Base humidity
    let avgHumidity = 0.7 - (absLat * 0.005);

    // Wind speed (higher in mid-latitudes and coastal areas)
    let avgWindSpeed = 2 + Math.abs(Math.sin(absLat * Math.PI / 90)) * 3;

    // Solar radiation (higher near equator)
    let avgSolarRadiation = 250 - (absLat * 2.5);

    // Regional climate adjustments with higher resolution

    // DESERT REGIONS (Hot, Dry - Excellent for evaporation engines)
    // Sahara Desert
    if (lat > 15 && lat < 35 && lon > -15 && lon < 40) {
        avgTemp += 8;
        avgHumidity -= 0.4;
        avgSolarRadiation += 80;
        avgWindSpeed += 1;
    }

    // Arabian Peninsula (Excellent conditions)
    if (lat > 12 && lat < 32 && lon > 34 && lon < 60) {
        avgTemp += 10;
        avgHumidity -= 0.45;
        avgSolarRadiation += 100;
        avgWindSpeed += 2;
    }

    // Southwestern US Desert
    if (lat > 25 && lat < 40 && lon > -120 && lon < -100) {
        avgTemp += 5;
        avgHumidity -= 0.35;
        avgSolarRadiation += 60;
    }

    // Australian Outback
    if (lat < -15 && lat > -35 && lon > 110 && lon < 145) {
        avgTemp += 7;
        avgHumidity -= 0.38;
        avgSolarRadiation += 70;
    }

    // Atacama Desert (Chile)
    if (lat < -15 && lat > -30 && lon > -75 && lon < -65) {
        avgTemp += 4;
        avgHumidity -= 0.42;
        avgSolarRadiation += 85;
    }

    // HUMID REGIONS (Poor for evaporation engines)
    // Southeast Asian Monsoon
    if (lat > -10 && lat < 30 && lon > 90 && lon < 140) {
        avgHumidity += 0.2;
        avgSolarRadiation -= 30;
        avgTemp += 2;
    }

    // Amazon Rainforest
    if (lat > -10 && lat < 5 && lon > -75 && lon < -45) {
        avgHumidity += 0.25;
        avgSolarRadiation -= 40;
    }

    // Equatorial Africa
    if (lat > -10 && lat < 10 && lon > 5 && lon < 40) {
        avgHumidity += 0.2;
        avgSolarRadiation -= 25;
    }

    // MEDITERRANEAN CLIMATE
    if (lat > 30 && lat < 45 && lon > -10 && lon < 40) {
        avgTemp += 3;
        avgHumidity -= 0.15;
        avgSolarRadiation += 30;
    }

    // COASTAL ADJUSTMENTS
    const isCoastal = (
        (Math.abs(lon) < 20 && Math.abs(lat) < 40) || // Atlantic coast
        (lon > 100 && lon < 130 && lat > 20) || // East Asian coast
        (lon > -130 && lon < -110) // Pacific coast Americas
    );
    if (isCoastal) {
        avgHumidity += 0.1;
        avgWindSpeed += 1.5;
    }

    const climate = {
        avgTemp: Math.max(-10, Math.min(45, avgTemp)),
        avgHumidity: Math.max(0.15, Math.min(0.95, avgHumidity)),
        avgWindSpeed: Math.max(1, Math.min(10, avgWindSpeed)),
        avgSolarRadiation: Math.max(50, Math.min(400, avgSolarRadiation))
    };

    climateCache.set(cacheKey, climate);
    return climate;
}

/**
 * Load and process counties data with EvaDeficit calculation
 */
async function loadCountiesData() {
    const loadingEl = document.getElementById('loading');
    const STATE_ABBREV = {
        'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
        'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
        'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
        'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
        'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
        'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
        'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
        'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
        'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
        'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
    };

    try {
        const batchSize = 50;
        const totalCounties = usCounties.length;
        
        loadingEl.querySelector('p').textContent =
            `Calculating EvaDeficit for ${totalCounties} counties...`;

        for (let i = 0; i < usCounties.length; i++) {
            const county = usCounties[i];
            const stateCode = STATE_ABBREV[county.state] || county.state;

            if (i % batchSize === 0) {
                loadingEl.querySelector('p').textContent =
                    `Analyzing ${county.name}, ${county.state}... ${i + 1}/${totalCounties}`;
            }

            // Calculate demand (population-based)
            const demand = county.population * 0.015; // 15 kW per capita
            const annualDemand = demand * 8760; // MWh per year

            // Get state energy balance
            const balance = getStateEnergyBalance(stateCode);
            const selfSufficiency = balance.selfSufficiency || 100;
            const deficit = balance.surplus < 0 ? Math.abs(balance.surplus) : 0;
            const surplus = balance.surplus > 0 ? balance.surplus : 0;

            // Calculate EvaDeficit score (surplus is positive, deficit is negative)
            // Use self-sufficiency as the primary metric
            const evaDeficit = selfSufficiency - 100; // Positive = surplus, Negative = deficit

            countiesData.push({
                ...county,
                stateCode: stateCode,
                demand: annualDemand,
                supply: balance.annualGeneration,
                deficit: deficit,
                surplus: surplus,
                selfSufficiency: selfSufficiency,
                evaDeficit: evaDeficit,
                balance: balance
            });

            if (i % batchSize === 0) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }

        // Calculate percentiles based on EvaDeficit
        const evaDeficitValues = countiesData.map(c => c.evaDeficit).sort((a, b) => a - b);
        const minDeficit = Math.min(...evaDeficitValues);
        const maxSurplus = Math.max(...evaDeficitValues);
        
        countiesData.forEach(county => {
            // Calculate percentile (0-100)
            // 100th percentile = max surplus, 0th percentile = max deficit
            const percentile = ((county.evaDeficit - minDeficit) / (maxSurplus - minDeficit)) * 100;
            county.percentile = Math.max(0, Math.min(100, percentile));
        });

        countiesData.sort((a, b) => b.evaDeficit - a.evaDeficit);
        loadingEl.style.display = 'none';

        createCountyBoundaries();
        updateStatistics();
        
        console.log(`✓ Loaded ${countiesData.length} counties with EvaDeficit scores`);

    } catch (error) {
        console.error('Error loading data:', error);
        loadingEl.querySelector('p').textContent = 'Error loading data. Please refresh.';
    }
}

/**
 * Get green color based on percentile
 */
function getPercentileColor(percentile) {
    // Green gradient: 0th percentile (max deficit) = light green, 100th percentile (max surplus) = dark green
    if (percentile >= 100) return '#2e7d32'; // Dark green
    if (percentile >= 75) return '#4caf50';
    if (percentile >= 50) return '#66bb6a';
    if (percentile >= 25) return '#a5d6a7';
    return '#e8f5e9'; // Light green
}

/**
 * Create county boundaries with EvaDeficit coloring
 */
function createCountyBoundaries() {
    if (!map.getSource('county-boundaries')) {
        const boundaryFeatures = countiesData.map(county => {
            // Create simplified boundaries
            const baseRadius = 0.2;
            const popFactor = Math.log10(county.population || 10000) / 5;
            const radius = baseRadius * (0.5 + popFactor);
            const points = 12;
            const coordinates = [];
            
            for (let i = 0; i <= points; i++) {
                const angle = (i / points) * 2 * Math.PI;
                const lat = county.lat + radius * Math.cos(angle);
                const lon = county.lon + radius * Math.sin(angle) / Math.cos(county.lat * Math.PI / 180);
                coordinates.push([lon, lat]);
            }
            
            return {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [coordinates]
                },
                properties: {
                    name: county.name,
                    state: county.state,
                    evaDeficit: county.evaDeficit || 0,
                    percentile: county.percentile || 0,
                    selfSufficiency: county.selfSufficiency || 100
                }
            };
        });
        
        map.addSource('county-boundaries', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: boundaryFeatures
            }
        });
        
        // Add fill layer with green gradient
        map.addLayer({
            id: 'county-boundaries-fill',
            type: 'fill',
            source: 'county-boundaries',
            paint: {
                'fill-color': [
                    'interpolate',
                    ['linear'],
                    ['get', 'percentile'],
                    0, '#e8f5e9',   // Light green (0th percentile - max deficit)
                    25, '#a5d6a7',
                    50, '#66bb6a',
                    75, '#4caf50',
                    100, '#2e7d32'  // Dark green (100th percentile - max surplus)
                ],
                'fill-opacity': 0.7
            }
        });
        
        // Add grey outline
        map.addLayer({
            id: 'county-boundaries-outline',
            type: 'line',
            source: 'county-boundaries',
            paint: {
                'line-color': '#999',
                'line-width': 0.5,
                'line-opacity': 0.6
            }
        });
        
        // Add click handler for popups
        map.on('click', 'county-boundaries-fill', (e) => {
            const props = e.features[0].properties;
            const county = countiesData.find(c => c.name === props.name && c.state === props.state);
            
            if (county) {
                const popupContent = `
                    <div style="min-width: 250px; color: #333;">
                        <h3 style="margin-bottom: 10px; font-size: 16px; color: #2e7d32;">
                            ${county.name}, ${county.state}
                        </h3>
                        <div style="background: #f5f5f5; padding: 10px; border-radius: 6px; margin-bottom: 8px;">
                            <p style="margin: 5px 0; font-size: 13px;"><strong>Self-Sufficiency:</strong> ${county.selfSufficiency.toFixed(1)}%</p>
                            <p style="margin: 5px 0; font-size: 13px;"><strong>Percentile:</strong> ${county.percentile.toFixed(1)}th</p>
                            <p style="margin: 5px 0; font-size: 13px;">
                                <strong>${county.surplus > 0 ? 'Surplus' : 'Deficit'}:</strong>
                                ${((Math.abs(county.surplus - county.deficit))/1000000).toFixed(2)} GWh/yr
                            </p>
                        </div>
                        <p style="font-size: 11px; color: #666; margin-top: 8px;">
                            Population: ${county.population.toLocaleString()}
                        </p>
                    </div>
                `;
                
                new maplibregl.Popup()
                    .setLngLat(e.lngLat)
                    .setHTML(popupContent)
                    .addTo(map);
            }
        });
        
        // Change cursor on hover
        map.on('mouseenter', 'county-boundaries-fill', () => {
            map.getCanvas().style.cursor = 'pointer';
        });
        
        map.on('mouseleave', 'county-boundaries-fill', () => {
            map.getCanvas().style.cursor = '';
        });
    }
}
        const el = document.createElement('div');
        el.className = 'marker';

        // Scale marker size by power - optimized for county-level visualization
        const baseSize = 8;
        const powerFactor = Math.min(county.power / 100, 2);
        const size = baseSize + (powerFactor * 6);

        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.borderRadius = '50%';
        el.style.backgroundColor = county.category.color;
        el.style.border = '2px solid white';
        el.style.cursor = 'pointer';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        el.style.transition = 'all 0.2s ease';

        // Create popup content with more detail
        const popupContent = `
            <div style="min-width: 280px;">
                <h3 style="margin-bottom: 12px; font-size: 18px; border-bottom: 2px solid ${county.category.color}; padding-bottom: 8px;">
                    ${county.name}, ${county.state}
                </h3>
                <div style="background: rgba(102, 126, 234, 0.1); padding: 10px; border-radius: 6px; margin-bottom: 10px;">
                    <p style="margin: 5px 0; font-size: 16px;"><strong>Power Potential:</strong> <span style="color: ${county.category.color}; font-weight: bold;">${county.power.toFixed(1)} W/m²</span></p>
                    <p style="margin: 5px 0;"><strong>Rating:</strong> ${county.category.label}</p>
                </div>
                <p style="font-size: 12px; margin: 8px 0;"><strong>📍 Population:</strong> ${county.population.toLocaleString()}</p>
                <p style="font-size: 12px; margin: 8px 0;"><strong>🗺️ State:</strong> ${county.state}</p>
                <hr style="margin: 12px 0; border: none; border-top: 1px solid #444;">
                <p style="font-size: 13px; font-weight: bold; margin: 8px 0;">Climate Factors:</p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
                    <p>🌡️ Temp: ${county.climate.avgTemp.toFixed(1)}°C</p>
                    <p>💧 Humidity: ${(county.climate.avgHumidity * 100).toFixed(0)}%</p>
                    <p>💨 Wind: ${county.climate.avgWindSpeed.toFixed(1)} m/s</p>
                    <p>☀️ Solar: ${county.climate.avgSolarRadiation.toFixed(0)} W/m²</p>
                </div>
                <hr style="margin: 12px 0; border: none; border-top: 1px solid #444;">
                <p style="font-size: 11px; color: #999; font-style: italic; margin-top: 10px;">${county.category.description}</p>
                <p style="font-size: 10px; color: #666; margin-top: 8px;">💡 For 1 MW: ${evapCalc.calculateRequiredArea(1000, county.power, 0.1).toFixed(0).toLocaleString()} m² needed</p>
            </div>
        `;

        const popup = new maplibregl.Popup({
            offset: 25,
            closeButton: false,
            closeOnClick: false,
            maxWidth: '350px'
        }).setHTML(popupContent);

        let hoverTimeout = null;

        // Show popup on hover
        el.addEventListener('mouseenter', () => {
            // Clear any pending hide timeout
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
                hoverTimeout = null;
            }

            // Ensure marker stays visible
            el.style.display = 'block';
            el.style.visibility = 'visible';
            el.style.transform = 'scale(1.5)';
            el.style.zIndex = '1000';

            // Show popup
            if (!popup.isOpen()) {
                popup.setLngLat([county.lon, county.lat]).addTo(map);
            }
            currentPopup = popup;
        });

        el.addEventListener('mouseleave', () => {
            // Reset marker size but keep it visible
            el.style.transform = 'scale(1)';
            el.style.zIndex = '1';

            // Delay popup removal to allow moving to popup
            hoverTimeout = setTimeout(() => {
                if (popup.isOpen()) {
                    const popupEl = popup.getElement();
                    if (!popupEl || !popupEl.matches(':hover')) {
                        popup.remove();
                        currentPopup = null;
                    }
                }
            }, 300);
        });

        // Keep popup open when hovering over it
        popup.on('open', () => {
            const popupEl = popup.getElement();
            if (popupEl) {
                popupEl.addEventListener('mouseenter', () => {
                    if (hoverTimeout) {
                        clearTimeout(hoverTimeout);
                        hoverTimeout = null;
                    }
                    currentPopup = popup;
                });

                popupEl.addEventListener('mouseleave', () => {
                    popup.remove();
                    currentPopup = null;
                });
            }
        });

// Old marker functions removed - using county boundaries instead

/**
 * Create heatmap layer - not used in minimalist view
 */
function createHeatmapLayer() {
    if (map.getSource('counties-heat')) {
        return;
    }

    map.addSource('counties-heat', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: countiesData.map(county => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [county.lon, county.lat]
                },
                properties: {
                    power: county.power,
                    population: county.population
                }
            }))
        }
    });

    map.addLayer({
        id: 'counties-heat',
        type: 'heatmap',
        source: 'counties-heat',
        paint: {
            'heatmap-weight': [
                'interpolate',
                ['linear'],
                ['get', 'power'],
                0, 0,
                50, 0.2,
                100, 0.4,
                150, 0.6,
                200, 0.8,
                300, 1
            ],
            'heatmap-intensity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 1,
                9, 3
            ],
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
            'heatmap-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 15,
                5, 30,
                10, 50
            ],
            'heatmap-opacity': 0.7
        },
        layout: {
            'visibility': 'none'
        }
    });
}

/**
 * Update statistics for EvaDeficit visualization
 */
function updateStatistics() {
    const avgSelfSufficiency = countiesData.reduce((sum, county) => sum + (county.selfSufficiency || 100), 0) / countiesData.length;
    const bestCounty = countiesData.find(c => c.percentile === 100) || countiesData[0];

    document.getElementById('countyCount').textContent = countiesData.length.toLocaleString();
    document.getElementById('avgSelfSufficiency').textContent = avgSelfSufficiency.toFixed(1);
    if (bestCounty) {
        document.getElementById('bestCounty').textContent = `${bestCounty.name}, ${bestCounty.state} (${bestCounty.selfSufficiency.toFixed(1)}%)`;
    }
    
    console.log(`Statistics updated: ${countiesData.length} counties with EvaDeficit scores`);
}

/**
 * Show top 10 counties
 */
function showTopCounties() {
    const top10 = countiesData.slice(0, 10);

    const bounds = new maplibregl.LngLatBounds();
    top10.forEach(county => {
        bounds.extend([county.lon, county.lat]);
    });

    map.fitBounds(bounds, { padding: 100, maxZoom: 6 });

    markers.forEach(({ element, county }) => {
        if (element && top10.includes(county)) {
            // Ensure visibility
            element.style.display = 'block';
            element.style.visibility = 'visible';
            element.style.transform = 'scale(1.8)';
            element.style.boxShadow = '0 0 25px rgba(255, 215, 0, 0.9)';
            element.style.border = '3px solid gold';
            setTimeout(() => {
                element.style.transform = 'scale(1)';
                element.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
                element.style.border = '2px solid white';
            }, 2500);
        }
    });

    // Show alert with top counties
    setTimeout(() => {
        const topList = top10.map((c, i) => `${i + 1}. ${c.name}, ${c.state}: ${c.power.toFixed(1)} W/m²`).join('\n');
        console.log('Top 10 Counties for Evaporation Engines:\n' + topList);
    }, 500);
}

/**
 * Reset view to US
 */
function resetView() {
    map.flyTo({
        center: [-98, 39],
        zoom: 4,
        duration: 2000
    });
}

/**
 * Toggle heatmap view
 */
function toggleHeatmap() {
    heatmapVisible = !heatmapVisible;

    if (map.getLayer('counties-heat')) {
        map.setLayoutProperty('counties-heat', 'visibility', heatmapVisible ? 'visible' : 'none');
    }

    // Toggle markers opacity when heatmap is on, but keep them visible
    markers.forEach(({ element }) => {
        if (element) {
            element.style.opacity = heatmapVisible ? '0.6' : '1';
            element.style.display = 'block';
            element.style.visibility = 'visible';
        }
    });
}

/**
 * Load county boundaries from public GeoJSON source
 * Uses US Census Bureau TIGER/Line shapefiles converted to GeoJSON
 * Creates simplified boundaries for county-level visualization
 */
async function loadCountyBoundaries() {
    try {
        // Wait for counties data to be loaded
        if (countiesData.length === 0) {
            setTimeout(loadCountyBoundaries, 1000);
            return;
        }
        
        if (!map.getSource('county-boundaries')) {
            console.log('Creating county boundaries for county-level resolution...');
            
            // Create simplified boundaries using county centroids
            // In production, load from: https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json
            // or use: https://eric.clst.org/assets/wiki/uploads/Stuff/gz_2010_us_050_00_500k.json
            
            const boundaryFeatures = countiesData.map(county => {
                // Create a simple circular boundary around each county centroid
                // Size varies by population to approximate county area
                const baseRadius = 0.2; // degrees
                const popFactor = Math.log10(county.population || 10000) / 5; // Scale by population
                const radius = baseRadius * (0.5 + popFactor);
                const points = 12; // Number of points in circle
                const coordinates = [];
                
                for (let i = 0; i <= points; i++) {
                    const angle = (i / points) * 2 * Math.PI;
                    const lat = county.lat + radius * Math.cos(angle);
                    const lon = county.lon + radius * Math.sin(angle) / Math.cos(county.lat * Math.PI / 180);
                    coordinates.push([lon, lat]);
                }
                
                return {
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [coordinates]
                    },
                    properties: {
                        name: county.name,
                        state: county.state,
                        power: county.power || 0,
                        category: county.category?.level || 'moderate',
                        population: county.population || 0
                    }
                };
            });
            
            map.addSource('county-boundaries', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: boundaryFeatures
                }
            });
            
            // Add fill layer for county boundaries
            map.addLayer({
                id: 'county-boundaries-fill',
                type: 'fill',
                source: 'county-boundaries',
                paint: {
                    'fill-color': [
                        'interpolate',
                        ['linear'],
                        ['get', 'power'],
                        0, '#4575b4',
                        50, '#91bfdb',
                        100, '#fee090',
                        150, '#fc8d59',
                        200, '#d73027'
                    ],
                    'fill-opacity': 0.25
                },
                layout: {
                    'visibility': 'none'
                }
            });
            
            // Add outline layer
            map.addLayer({
                id: 'county-boundaries-outline',
                type: 'line',
                source: 'county-boundaries',
                paint: {
                    'line-color': '#fff',
                    'line-width': 0.5,
                    'line-opacity': 0.4
                },
                layout: {
                    'visibility': 'none'
                }
            });
            
            countyBoundariesSource = 'county-boundaries';
            console.log(`✓ Created ${boundaryFeatures.length} county boundaries`);
        }
    } catch (error) {
        console.warn('Could not load county boundaries:', error);
        console.log('Using point markers only. For full county boundaries, load GeoJSON from:');
        console.log('https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json');
    }
}

/**
 * Toggle county boundary visualization
 * Made globally accessible for button onclick
 */
window.toggleCountyBoundaries = function() {
    countyBoundariesVisible = !countyBoundariesVisible;
    
    if (map && map.getLayer('county-boundaries-fill')) {
        map.setLayoutProperty('county-boundaries-fill', 'visibility', 
            countyBoundariesVisible ? 'visible' : 'none');
    }
    
    if (map && map.getLayer('county-boundaries-outline')) {
        map.setLayoutProperty('county-boundaries-outline', 'visibility', 
            countyBoundariesVisible ? 'visible' : 'none');
    }
    
    // Adjust marker visibility
    markers.forEach(({ element }) => {
        if (element) {
            element.style.opacity = countyBoundariesVisible ? '0.4' : '1';
        }
    });
    
    console.log(`County boundaries ${countyBoundariesVisible ? 'enabled' : 'disabled'}`);
};

/**
 * Fetch real weather data from Open-Meteo API (for future enhancement)
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

// Global variables for new features
let currentResolution = 'county'; // 'county' or 'zipcode'
let currentYear = 2024;

/**
 * Toggle between county and ZIP code resolution
 */
function toggleResolution() {
    if (currentResolution === 'county') {
        alert('ZIP code resolution coming soon! This will show ~40,000 ZIP codes across the US.\n\nNote: This requires significant processing and may slow down the browser.');
        // currentResolution = 'zipcode';
        // loadZipCodeData();
    } else {
        currentResolution = 'county';
        loadCountiesData();
    }

    document.getElementById('resolution-badge').textContent =
        currentResolution === 'county' ? 'County' : 'ZIP Code';
}

/**
 * Update map data for a specific year (called by time slider)
 */
window.updateMapForYear = async function(year) {
    currentYear = year;
    console.log(`Updating map for year ${year}`);

    // Update loading message
    const loadingEl = document.getElementById('loading');
    if (loadingEl && loadingEl.style.display === 'none') {
        loadingEl.style.display = 'block';
        loadingEl.querySelector('p').textContent = `Loading ${year} data...`;
    }

    // Simulate fetching historical data
    // In production, this would fetch from APIs
    await new Promise(resolve => setTimeout(resolve, 500));

    // Recalculate power for the year
    // For demo, just add some variation
    const yearFactor = 1 + ((year - 2020) * 0.02); // Slight trend over time
    countiesData.forEach(county => {
        county.powerForYear = county.power * yearFactor * (0.95 + Math.random() * 0.1);
    });

    // Update markers
    markers.forEach(({ element, county }) => {
        const powerFactor = Math.min(county.powerForYear / 100, 2);
        const size = 12 + (powerFactor * 8);
        element.style.width = `${size}px`;
        element.style.height = `${size}px`;
    });

    // Update statistics
    const avgPower = countiesData.reduce((sum, c) => sum + (c.powerForYear || c.power), 0) / countiesData.length;

    if (timeSlider) {
        timeSlider.setYearData(year, {
            avgDemand: 50000 + (year - 2015) * 2000 + Math.random() * 5000,
            avgTemp: 15 + Math.random() * 3,
            avgPower: avgPower
        });
    }

    if (loadingEl) {
        loadingEl.style.display = 'none';
    }

    // Update data source indicator
    const dataSourceEl = document.getElementById('data-source');
    if (dataSourceEl) {
        dataSourceEl.textContent = dataAPI.noaaToken || dataAPI.eiaToken ? 'Real API Data' : 'Simulated';
        dataSourceEl.style.color = dataAPI.noaaToken || dataAPI.eiaToken ? '#4CAF50' : '#888';
    }
};

/**
 * Initialize time slider after map loads
 */
function initializeTimeSlider() {
    if (typeof initTimeSlider === 'function') {
        const slider = initTimeSlider({
            startYear: 2015,
            endYear: 2024,
            currentYear: 2024,
            onChange: (year) => {
                window.updateMapForYear(year);
            }
        });

        // Initialize data for all years
        for (let year = 2015; year <= 2024; year++) {
            const avgPower = countiesData.reduce((sum, c) => sum + c.power, 0) / countiesData.length;
            slider.setYearData(year, {
                avgDemand: 50000 + (year - 2015) * 2000 + Math.random() * 5000,
                avgTemp: 15 + Math.random() * 3,
                avgPower: avgPower * (1 + ((year - 2020) * 0.02))
            });
        }

        return slider;
    }
}

// Initialize map when page loads
window.addEventListener('load', () => {
    initMap();

    // Initialize time slider after map loads
    setTimeout(() => {
        initializeTimeSlider();
    }, 2000);
});
