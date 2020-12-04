import mapboxgl from 'mapbox-gl';
import Airtable from 'airtable';

const map = document.getElementById('map');
const existing = document.getElementById('existing');
const past = document.getElementById('past');

if (!!map) {
  const base = new Airtable({apiKey: process.env.AIRTABLE_API_KEY}).base(process.env.AIRTABLE_BASE);

  let assets = [];
  let collection = {"type": "FeatureCollection", "features": []};

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
        let coordinates, properties;
        assets.forEach((point, i) => {
          if (point.get("Existing?")) {
            existing.innerHTML += `<li class="assets-item-list-item">${i + 1}. ${point.get("Name")}`;
          } else {
            past.innerHTML += `<li class="assets-item-list-item">${i + 1}. ${point.get("Name")}`;
          }
          // fetch(`http://open.mapquestapi.com/geocoding/v1/address\?key\=${process.env.MAPQUEST_API_KEY}\&location\=${point.fields.Address}`)
          //   .then(response => response.json())
          //   .then(data => {
          //     coordinates = [parseFloat(data.results[0].locations[0].latLng.lng), parseFloat(data.results[0].locations[0].latLng.lat)];
          //     properties = point.fields;
          //     let feature = {
          //       "type": "Feature",
          //       "geometry": {
          //         "type": "Point", "coordinates": coordinates
          //       },
          //       "properties": properties
          //     };
          //     collection.features.push(feature);
          //   });
        })
    });

  mapboxgl.accessToken = process.env.MAPBOX_TOKEN;

  const map = new mapboxgl.Map({
    center: [-77.02249, 38.89920],
    container: 'map',
    style: process.env.MAPBOX_STYLE,
    zoom: 15,
  });

  map.on('load', () => {
    map.resize();

    map.addSource('places', {
      'type': 'geojson',
      'data': collection,
    })

    map.addLayer({
      'id': 'places',
      'type': 'symbol',
      'source': 'places',
      'layout': {
        'icon-image': 'music-15',
        'icon-allow-overlap': true
      }
    });

    map.on('click', 'places', (e) => {
      const coordinates = e.features[0].geometry.coordinates.slice();
      const description = e.features[0].properties.Description;
      const type = e.features[0].properties.Category;

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
}
