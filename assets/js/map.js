import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = 'pk.eyJ1IjoicmdhaW5lcyIsImEiOiJjamZuenFmZXIwa2JuMndwZXd1eGQwcTNuIn0.TbNK-TNQxiGUlWFdzEEavw';

const existing = document.getElementById('existing');
const past = document.getElementById('past');

const map = new mapboxgl.Map({
  center: [-77.02249, 38.89920],
  container: 'map',
  style: 'mapbox://styles/rgaines/cjfsbgick6y572rl806on1auc',
  zoom: 15,
});

map.on('load', () => {
  map.addSource('places', {
    'type': 'geojson',
    'data': {
      'type': 'FeatureCollection',
      'features': [
        {
          'type': 'Feature',
          'properties': {
            'description': 'H Street NW. <b>Reminder of a time</b> when there was actual life in Chinatown. <em>Testing with rich text.</em>',
            'icon': 'music',
            'type': 'Landmark',
            'existing': false
          },
          'geometry': {
            'type': 'Point',
            'coordinates': [-77.036530, 38.897676]
          }
        }
      ]
    }
  })

  map.addLayer({
    'id': 'places',
    'type': 'symbol',
    'source': 'places',
    'layout': {
      'icon-image': '{icon}-15',
      'icon-allow-overlap': true
    }
  });

  map.on('click', 'places', (e) => {
    const coordinates = e.features[0].geometry.coordinates.slice();
    const description = e.features[0].properties.description;
    const type = e.features[0].properties.type;

    // Ensure that if the map is zoomed out such that multiple
    // copies of the feature are visible, the popup appears
    // over the copy being pointed to.
    while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
      coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
    }

    new mapboxgl.Popup()
      .setLngLat(coordinates)
      .setHTML(`<p>${type}</p><p>${description}</p>`)
      .addTo(map);
  });

  // Change the cursor to a pointer when the mouse is over the places layer.
  map.on('mouseenter', 'places', () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  // Change it back to a pointer when it leaves.
  map.on('mouseleave', 'places', () => {
    map.getCanvas().style.cursor = '';
  });

  map.setPaintProperty('building', 'fill-color', [
    'interpolate',
    ['exponential', 0.5],
    ['zoom'],
    15,
    '#e2714b',
    22,
    '#eee695'
  ]);

  map.setPaintProperty('building', 'fill-opacity', [
    'interpolate',
    ['exponential', 0.5],
    ['zoom'],
    15,
    0,
    22,
    1
  ]);
});

existing.innerHTML = 'test one two';
past.innerHTML = 'three four';
