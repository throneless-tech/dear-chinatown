import mapboxgl from 'mapbox-gl';
import Airtable from 'airtable';
import ExpandToggle from "@threespot/expand-toggle";

const map = document.getElementById('map');
const legendLists = [...(document.getElementsByClassName('legend-assets-item-list'))];
const existing = document.getElementById('existing');
const past = document.getElementById('past');
const toggles = document.querySelectorAll("[data-expands]");

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
          let name = point.get("Name");
          legendLists.forEach((list) => {
            if(point.get("Category") == list.id) {
              let item = document.createElement("li");
              item.classList.add("legend-assets-item-list-item");
              item.innerHTML = name;
              list.appendChild(item);
            }
            list.classList.add("expandable");
            toggles.forEach(el => new ExpandToggle(el));
          });

          if (point.get("Existing?")) {
            existing.innerHTML += `<li class="assets-item-list-item">${i + 1}. ${name}`;
          } else {
            past.innerHTML += `<li class="assets-item-list-item">${i + 1}. ${name}`;
          }
          fetch(`http://mapquestapi.com/geocoding/v1/address\?key\=${process.env.MAPQUEST_API_KEY}\&location\=${point.get("Address")}`)
            .then(response => response.json())
            .then(data => {
              coordinates = [parseFloat(data.results[0].locations[0].latLng.lng), parseFloat(data.results[0].locations[0].latLng.lat)];
              properties = point.fields;
              let feature = {
                "type": "Feature",
                "geometry": {
                  "type": "Point", "coordinates": coordinates
                },
                "properties": properties
              };
              collection.features.push(feature);
            });
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

    map.loadImage('../circle.svg', function(error, image) {
      if (error) throw error;
      map.addImage('circle-icon', image, { 'sdf': true });

      map.addSource('places', {
        'type': 'geojson',
        'data': collection,
      })

      map.addLayer({
        'id': '3d-buildings',
        'source': 'composite',
        'source-layer': 'building',
        'type': 'fill',
        'minzoom': 1,
        'paint': {
          'fill-color': '#E0DFC8',
        },
      }, 'places');

      map.addSource('currentBuildings', {
        type: 'geojson',
        data: {
          "type": "FeatureCollection",
          "features": [],
        }
      });

      map.addLayer({
        "id": "highlight",
        "source": "currentBuildings",
        'type': 'line',
        'minzoom': 1,
        'paint': {
          'line-color': '#f00',
          'line-width': 3
        }
      }, "places");

      map.addLayer({
        'id': 'places',
        'type': 'symbol',
        'source': 'places',
        'layout': {
          'icon-image': 'circle-icon',
          'icon-size': 1
        },
        'paint': {
          'icon-color': [
            'match', // Use the 'match' expression: https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-match
            ['get', 'Category'], // Use the result 'STORE_TYPE' property
            'Arts', '#D9891C',
            'Business', '#D42A2A',
            'Community', 'rgba(212,42,42,0.3)',
            'Family', '#878484',
            'Landmark', '#EFC01C',
            'Park', '#064E3C',
            'Recreation', '#BAD9C6',
            '#000' // any other store type
          ]
        }
      });;
    });


    console.log(collection);

    // var layers = map.getStyle().layers;
    // var labelLayerId;
    // for (var i = 0; i < layers.length; i++) {
    //   if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
    //     labelLayerId = layers[i].id;
    //     break;
    //   }
    // }



    // map.on('click', '3d-buildings', function(e) {
    //   map.getSource('currentBuildings').setData({
    //     "type": "FeatureCollection",
    //     "features": e.features
    //   });
    // });

    map.on('click', 'places', (e) => {
      const coordinates = e.features[0].geometry.coordinates.slice();
      const name = e.features[0].properties.Name;
      const address = e.features[0].properties.Address;
      const description = e.features[0].properties.Quote;
      const type = e.features[0].properties.Category;

      // Ensure that if the map is zoomed out such that multiple
      // copies of the feature are visible, the popup appears
      // over the copy being pointed to.
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }

      new mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(`<div class="mapboxgl-popup-content-title f-rose f-green">${name}</div><div class="mapboxgl-popup-content-info f-serif f-green">${address} | ${type}</div><div class="mapboxgl-popup-content-quote f-serif">${description ? description : ''}</div>`)
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
  });
}
