/**
 * EvaDeficit - Supply-Demand Gap Choropleth Analysis
 * Simplified for performance - County boundaries with heatmap
 */

let map;
let countiesData = new Map();

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

function initMap() {
    map = new maplibregl.Map({
        container: 'map',
        style: 'https://demotiles.maplibre.org/style.json',
        center: [-98, 39],
        zoom: 4,
        minZoom: 3,
        maxZoom: 10,
        maxBounds: [[-170, 15], [-50, 72]],
        attributionControl: true
    });

    map.on('load', () => {
        loadCountyData();
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
}

function getStateCapacity(state) {
    const stateCode = STATE_ABBREV[state] || state;
    return US_STATE_ENERGY_CAPACITY[stateCode] || {
        nuclear: 0, coal: 0, gas: 0, hydro: 0, wind: 0, solar: 0, geothermal: 0, biomass: 0
    };
}

async function loadCountyData() {
    const loadingEl = document.getElementById('loading');

    try {
        loadingEl.querySelector('p').textContent = 'Loading US county boundaries...';

        const response = await fetch('https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json');
        const geojson = await response.json();

        loadingEl.querySelector('p').textContent = 'Calculating energy deficit...';

        geojson.features.forEach(feature => {
            const coords = feature.geometry.type === 'Polygon'
                ? feature.geometry.coordinates[0][0]
                : feature.geometry.coordinates[0][0][0];

            const lat = coords[1];
            const lon = coords[0];
            const fips = feature.id;

            const countyInfo = usCounties.find(c =>
                Math.abs(c.lat - lat) < 2 && Math.abs(c.lon - lon) < 2
            );

            const state = countyInfo ? countyInfo.state : 'Unknown';
            const population = countyInfo ? countyInfo.population : 50000;

            const demand = population * 0.015;
            const stateCapacity = getStateCapacity(state);
            const totalCapacity = Object.values(stateCapacity).reduce((sum, val) => sum + val, 0);

            // Simplified deficit calculation
            const deficit = demand - (totalCapacity / 100); // Rough estimate

            countiesData.set(fips, {
                fips,
                state,
                demand,
                supply: totalCapacity / 100,
                deficit,
                lat,
                lon
            });

            feature.properties.deficit = deficit;
            feature.properties.state = state;
        });

        map.addSource('counties', {
            type: 'geojson',
            data: geojson
        });

        map.addLayer({
            id: 'counties-fill',
            type: 'fill',
            source: 'counties',
            paint: {
                'fill-color': [
                    'interpolate',
                    ['linear'],
                    ['get', 'deficit'],
                    -5000, '#2166ac',  // Large surplus (blue)
                    -1000, '#67a9cf',  // Surplus
                    0, '#f7f7f7',      // Balanced (white)
                    1000, '#fddbc7',   // Deficit
                    5000, '#d73027'    // Critical deficit (red)
                ],
                'fill-opacity': 0.7
            }
        });

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

        let hoveredFips = null;

        map.on('mousemove', 'counties-fill', (e) => {
            if (e.features.length > 0) {
                if (hoveredFips !== null) {
                    map.setFeatureState({ source: 'counties', id: hoveredFips }, { hover: false });
                }

                hoveredFips = e.features[0].id;
                map.setFeatureState({ source: 'counties', id: hoveredFips }, { hover: true });

                const feature = e.features[0];
                const deficit = feature.properties.deficit;
                const state = feature.properties.state;

                const status = deficit > 1000 ? 'Critical Deficit' :
                              deficit > 0 ? 'Deficit' :
                              deficit > -1000 ? 'Balanced' : 'Surplus';

                new maplibregl.Popup({ closeButton: false, closeOnClick: false })
                .setLngLat(e.lngLat)
                .setHTML(`
                    <div style="padding: 8px;">
                        <strong>${state}</strong><br>
                        Gap: <span style="color: ${deficit > 0 ? '#d73027' : '#2166ac'}; font-weight: bold;">
                            ${deficit > 0 ? '+' : ''}${(deficit / 1000).toFixed(1)} GW
                        </span><br>
                        <small>${status}</small>
                    </div>
                `)
                .addTo(map);
            }
        });

        map.on('mouseleave', 'counties-fill', () => {
            if (hoveredFips !== null) {
                map.setFeatureState({ source: 'counties', id: hoveredFips }, { hover: false });
            }
            hoveredFips = null;
            const popups = document.getElementsByClassName('maplibregl-popup');
            if (popups.length) popups[0].remove();
        });

        map.setPaintProperty('counties-fill', 'fill-opacity', [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            1,
            0.7
        ]);

        loadingEl.style.display = 'none';
        updateStatistics();

    } catch (error) {
        console.error('Error:', error);
        loadingEl.querySelector('p').textContent = 'Error loading data. Please refresh.';
    }
}

function updateStatistics() {
    const deficits = Array.from(countiesData.values());
    const deficitCount = deficits.filter(d => d.deficit > 0).length;
    const totalDeficit = deficits.reduce((sum, d) => d.deficit > 0 ? sum + d.deficit : sum, 0);
    const worstDeficit = Math.max(...deficits.map(d => d.deficit));

    document.getElementById('deficitCount').textContent = deficitCount;
    document.getElementById('totalDeficit').textContent = (totalDeficit / 1000).toFixed(1);
    document.getElementById('worstDeficit').textContent = (worstDeficit / 1000).toFixed(1);
    document.getElementById('recommendationCount').textContent = deficitCount;
}

function showDeficitStates() {
    alert('Deficit states are shown in red on the map.');
}

function showSurplusStates() {
    alert('Surplus states are shown in blue on the map.');
}

function showRecommendations() {
    alert('Recommendations: States with deficit should expand Nuclear, Solar, Wind, and Geothermal capacity.');
}

function showFutureProjection() {
    alert('Future projection (2035) analysis coming soon.');
}

window.addEventListener('load', () => {
    initSharedNavigation('deficit');
    initMap();
});
