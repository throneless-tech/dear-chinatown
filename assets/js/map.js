import mapboxgl from 'mapbox-gl';
import Airtable from 'airtable';

const base = new Airtable({apiKey: process.env.AIRTABLE_API_KEY}).base(process.env.AIRTABLE_BASE);

let assets = [];
let data = {"type": "FeatureCollection", "features": []};

base('Assets')
  .select({
      view: "Grid view"
  }).eachPage(function page(records, fetchNextPage) {
      records.forEach(function(record) {
        assets.push(record);
      });
      fetchNextPage();
  }, function done(err) {
      if (err) { console.error(err); return; };
      assets.forEach(point => {
        let coordinate = [parseFloat(point.fields.Longitude), parseFloat(point.fields.Latitude)];
        let properties = point.fields;
        delete properties.Longitude;
        delete properties.Latitude;
        let feature = {
          "type": "Feature",
          "geometry": {
            "type": "Point", "coordinates": coordinate
          },
          "properties": properties
        };
        data.features.push(feature);
      })
  });

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
    'data': data,
  })

  map.addLayer({
    'id': 'places',
    'type': 'symbol',
    'source': 'places',
    'layout': {
      'icon-image': 'circle-15',
      'icon-allow-overlap': true
    }
  });

  map.on('click', 'places', (e) => {
    console.log(e.features[0]);
    const coordinates = e.features[0].geometry.coordinates.slice();
    const description = e.features[0].properties.Description;
    const type = e.features[0].properties.Type;

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
