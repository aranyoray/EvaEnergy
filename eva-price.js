/**
 * EvaPrice - Energy Price Choropleth Analysis
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

const STATE_BASE_PRICES = {
    'HI': 32.5, 'AK': 23.8, 'CT': 22.1, 'MA': 21.8, 'NH': 20.6,
    'CA': 19.9, 'RI': 19.3, 'VT': 18.4, 'NY': 17.8, 'ME': 16.7,
    'NJ': 16.2, 'MD': 13.9, 'PA': 13.3, 'DE': 12.8, 'IL': 12.6,
    'AZ': 12.4, 'NV': 12.1, 'MI': 11.9, 'WI': 11.7, 'MN': 11.5,
    'OH': 11.3, 'GA': 11.2, 'FL': 11.1, 'NC': 10.9, 'SC': 10.8,
    'TX': 10.7, 'VA': 10.6, 'TN': 10.5, 'IN': 10.3, 'MO': 10.2,
    'KY': 10.0, 'AL': 9.8, 'MS': 9.7, 'LA': 9.5, 'AR': 9.4,
    'IA': 9.3, 'KS': 9.2, 'OK': 9.1, 'NE': 9.0, 'SD': 8.9,
    'ND': 8.8, 'MT': 8.7, 'WY': 8.6, 'UT': 8.5, 'CO': 8.4,
    'NM': 8.3, 'ID': 8.2, 'OR': 8.1, 'WA': 8.0, 'WV': 9.6
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

function getStatePrice(state) {
    const stateCode = STATE_ABBREV[state] || state;
    return STATE_BASE_PRICES[stateCode] || 12.0;
}

async function loadCountyData() {
    const loadingEl = document.getElementById('loading');

    try {
        loadingEl.querySelector('p').textContent = 'Loading US county boundaries...';

        const response = await fetch('https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json');
        const geojson = await response.json();

        loadingEl.querySelector('p').textContent = 'Calculating energy prices...';

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
            const price = getStatePrice(state);

            countiesData.set(fips, {
                fips,
                state,
                price,
                lat,
                lon
            });

            feature.properties.price = price;
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
                    ['get', 'price'],
                    8, '#ffffcc',      // Very Low (yellow)
                    10, '#c7e9b4',     // Low (light green)
                    12, '#7fcdbb',     // Moderate (teal)
                    15, '#41b6c4',     // High (blue)
                    20, '#2c7fb8',     // Very High (dark blue)
                    25, '#253494'      // Extremely High (navy)
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
                const price = feature.properties.price;
                const state = feature.properties.state;

                const level = price > 20 ? 'Very High' :
                             price > 15 ? 'High' :
                             price > 12 ? 'Moderate' :
                             price > 10 ? 'Low' : 'Very Low';

                new maplibregl.Popup({ closeButton: false, closeOnClick: false })
                .setLngLat(e.lngLat)
                .setHTML(`
                    <div style="padding: 8px;">
                        <strong>${state}</strong><br>
                        Price: <span style="color: #253494; font-weight: bold;">${price.toFixed(2)}¢/kWh</span><br>
                        <small>${level}</small>
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
    const prices = Array.from(countiesData.values());
    const avgPrice = prices.reduce((sum, p) => sum + p.price, 0) / prices.length;
    const maxPrice = Math.max(...prices.map(p => p.price));
    const minPrice = Math.min(...prices.map(p => p.price));
    const highestState = prices.find(p => p.price === maxPrice);
    const lowestState = prices.find(p => p.price === minPrice);

    document.getElementById('avgPrice').textContent = avgPrice.toFixed(2);
    document.getElementById('highestPrice').textContent = `${highestState.state} (${maxPrice.toFixed(2)}¢/kWh)`;
    document.getElementById('lowestPrice').textContent = `${lowestState.state} (${minPrice.toFixed(2)}¢/kWh)`;
    document.getElementById('priceTrend').textContent = 'Stable';
}

function showPriceTrends() {
    alert('Price trends: Renewable states seeing decreasing prices, deficit states seeing increases.');
}

function showHighestPrices() {
    alert('Highest prices are shown in dark blue on the map.');
}

function show2030Forecast() {
    alert('2030 forecast: Overall prices expected to decrease by 5-10% with increased renewable adoption.');
}

function showPriceFactors() {
    alert('Price factors: Supply-demand balance, renewable penetration, urbanization, infrastructure costs.');
}

window.addEventListener('load', () => {
    initSharedNavigation('price');
    initMap();
});
