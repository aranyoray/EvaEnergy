/**
 * EvaDemand - Energy Demand Choropleth Analysis
 * Simplified for performance - County boundaries with heatmap
 */

let map;
let countiesData = new Map();

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

function calculateDemand(lat, population) {
    const baseDemand = population * 0.015; // 15 kW per capita
    const latitudeFactor = 1 + (Math.abs(lat - 35) * 0.01); // Higher in extreme climates
    return baseDemand * latitudeFactor;
}

async function loadCountyData() {
    const loadingEl = document.getElementById('loading');

    try {
        loadingEl.querySelector('p').textContent = 'Loading US county boundaries...';

        const response = await fetch('https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json');
        const geojson = await response.json();

        loadingEl.querySelector('p').textContent = 'Calculating energy demand...';

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

            const population = countyInfo ? countyInfo.population : 50000;
            const demand = calculateDemand(lat, population);
            const demandDensity = demand / 1000; // MW/1000 people

            countiesData.set(fips, {
                fips,
                demand,
                demandDensity,
                population,
                state: countyInfo ? countyInfo.state : 'Unknown',
                lat,
                lon
            });

            feature.properties.demand = demandDensity;
            feature.properties.population = population;
            feature.properties.state = countyInfo ? countyInfo.state : 'Unknown';
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
                    ['get', 'demand'],
                    0, '#feedde',
                    10, '#fdbe85',
                    20, '#fd8d3c',
                    30, '#e6550d',
                    50, '#a63603'
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
                const demand = feature.properties.demand;
                const population = feature.properties.population;
                const state = feature.properties.state;

                new maplibregl.Popup({ closeButton: false, closeOnClick: false })
                .setLngLat(e.lngLat)
                .setHTML(`
                    <div style="padding: 8px;">
                        <strong>${state}</strong><br>
                        Population: ${population.toLocaleString()}<br>
                        Demand: <span style="color: #e6550d; font-weight: bold;">${(demand * 1000).toFixed(0)} kW</span><br>
                        <small>${demand > 30 ? 'Very High' : demand > 20 ? 'High' : demand > 10 ? 'Moderate' : 'Low'} Demand</small>
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
    const demands = Array.from(countiesData.values()).map(d => d.demand);
    const totalDemand = demands.reduce((sum, d) => sum + d, 0);
    const avgDemand = totalDemand / demands.length;
    const maxDemand = Math.max(...demands);

    document.getElementById('locationCount').textContent = countiesData.size;
    document.getElementById('avgDemand').textContent = (avgDemand / 1000).toFixed(1);
    document.getElementById('totalDemand').textContent = (totalDemand / 1000000).toFixed(1);
    document.getElementById('peakDemand').textContent = (maxDemand / 1000).toFixed(1);
}

function showTopDemand() {
    const top = Array.from(countiesData.values())
        .sort((a, b) => b.demand - a.demand)
        .slice(0, 10);

    const bounds = new maplibregl.LngLatBounds();
    top.forEach(c => bounds.extend([c.lon, c.lat]));
    map.fitBounds(bounds, { padding: 100 });

    console.log('Top 10 Demand:', top.map((c, i) =>
        `${i + 1}. ${c.state}: ${(c.demand / 1000).toFixed(1)} MW`
    ).join('\n'));
}

function toggleResolution() {
    alert('County-level resolution active.');
}

function toggleIndustrial() {
    alert('Industrial activity overlay coming soon.');
}

window.addEventListener('load', () => {
    initSharedNavigation('demand');
    initMap();
});
