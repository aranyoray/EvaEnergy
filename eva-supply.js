/**
 * EvaSupply - Energy Supply Choropleth Analysis
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

        loadingEl.querySelector('p').textContent = 'Calculating energy supply...';

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
            const stateCapacity = getStateCapacity(state);

            const totalCapacity = Object.values(stateCapacity).reduce((sum, val) => sum + val, 0);
            const renewableCapacity = stateCapacity.wind + stateCapacity.solar +
                                     stateCapacity.hydro + stateCapacity.geothermal +
                                     stateCapacity.biomass;

            countiesData.set(fips, {
                fips,
                state,
                totalCapacity,
                renewableCapacity,
                nuclear: stateCapacity.nuclear,
                lat,
                lon
            });

            feature.properties.capacity = totalCapacity;
            feature.properties.renewable = renewableCapacity;
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
                    ['get', 'capacity'],
                    0, '#f7fbff',
                    10000, '#deebf7',
                    25000, '#9ecae1',
                    50000, '#4292c6',
                    100000, '#08519c'
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
                const capacity = feature.properties.capacity;
                const renewable = feature.properties.renewable;
                const state = feature.properties.state;
                const renewablePercent = capacity > 0 ? (renewable / capacity * 100) : 0;

                new maplibregl.Popup({ closeButton: false, closeOnClick: false })
                .setLngLat(e.lngLat)
                .setHTML(`
                    <div style="padding: 8px;">
                        <strong>${state}</strong><br>
                        Total Capacity: <span style="color: #08519c; font-weight: bold;">${(capacity / 1000).toFixed(1)} GW</span><br>
                        Renewable: ${renewablePercent.toFixed(1)}%<br>
                        <small>${capacity > 50000 ? 'Very High' : capacity > 25000 ? 'High' : capacity > 10000 ? 'Moderate' : 'Low'}</small>
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
    const capacities = Array.from(countiesData.values());
    const totalCapacity = capacities.reduce((sum, c) => sum + c.totalCapacity, 0) / capacities.length;
    const totalRenewable = capacities.reduce((sum, c) => sum + c.renewableCapacity, 0) / capacities.length;
    const renewablePercent = totalCapacity > 0 ? (totalRenewable / totalCapacity * 100) : 0;

    document.getElementById('totalCapacity').textContent = (totalCapacity / 1000).toFixed(1);
    document.getElementById('renewablePercent').textContent = renewablePercent.toFixed(1);
    document.getElementById('nuclearCapacity').textContent =
        (capacities.reduce((sum, c) => sum + c.nuclear, 0) / capacities.length / 1000).toFixed(1);
}

function showEnergyMix() {
    alert('Energy mix breakdown available in popup on hover.');
}

function toggleSource() {
    alert('Source toggle coming soon.');
}

function showRenewablePotential() {
    alert('Renewable potential analysis coming soon.');
}

function showNuclearCapacity() {
    alert('Nuclear capacity details available in popup on hover.');
}

window.addEventListener('load', () => {
    initSharedNavigation('supply');
    initMap();
});
