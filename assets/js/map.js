import mapboxgl from 'mapbox-gl';
import Airtable from 'airtable';
import ExpandToggle from "@threespot/expand-toggle";

const map = document.getElementById('map');
const legendLists = [...(document.getElementsByClassName('legend-assets-item-list'))];
const existing = document.getElementById('existing');
const past = document.getElementById('past');
const toggles = document.querySelectorAll("[data-expands]");

const images =[
  {url: '../circle.png', id: 'circle-icon'},
  {url: '../triangle.png', id: 'triangle-icon'},
]

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
              item.id = point.getId();
              item.innerHTML = name;
              list.appendChild(item);
            }
            list.classList.add("expandable");
            toggles.forEach(element => {
              const el = new ExpandToggle(element);
              if (window.location.hash) {
                const id = window.location.hash.charAt(1).toUpperCase() + window.location.hash.slice(2);
                if (element.dataset.expands === id) {
                  el.expand();
                }
              }
            });
          });

          if (point.get("Existing?")) {
            existing.innerHTML += `<li id="list-${point.getId()}" class="assets-item-list-item">${i + 1}. ${name}`;
          } else {
            past.innerHTML += `<li class="assets-item-list-item">${i + 1}. ${name}`;
          }

          coordinates = [point.get('Longitude'), point.get('Latitude')];
          properties = point.fields;
          properties['id'] = point.getId();
          properties['index'] = i + 1;
          properties['payment'] = point.get('Payment Type') ? point.get('Payment Type').toString() : null;
          properties['image'] = point.get('Images') ? point.get('Images')[0].url : null;
          let feature = {
            "type": "Feature",
            "geometry": {
              "type": "Point", "coordinates": coordinates
            },
            "properties": properties
          };
          collection.features.push(feature);
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

    images.map(img => new Promise((resolve, reject) => {
      map.loadImage(img.url, (error, image) => {
        if (error) throw error;
        map.addImage(img.id, image, {'sdf': 'true'});
      })
    }));

    map.addSource('places', {
      'type': 'geojson',
      'data': collection,
      'cluster': true,
      'clusterMaxZoom': 18, // Max zoom to cluster points
      'clusterRadius': 50 // Radius of each cluster when clustering points (defaults to 50)
    })

    map.addLayer({
      'id': 'clusters',
      'type': 'circle',
      'source': 'places',
      'filter': ['has', 'point_count'],
      'paint': {
        'circle-color': [
          'match', // https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-match
          ['get', 'Category'],
          'Arts', '#D9891C',
          'Business', '#D42A2A',
          'Community', 'rgba(212,42,42,0.3)',
          'Family', '#878484',
          'Landmark', '#EFC01C',
          'Park', '#064E3C',
          'Recreation', '#BAD9C6',
          'Residential', '#6794B4',
          'Religion', '#8A2E8C',
          '#064E3C' // any other type
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20,
          2,
          30,
          5,
          40,
          10,
          50,
          15,
          60,
          20,
          70
        ]
      },
    });

    map.addLayer({
      'id': 'places',
      'type': 'symbol',
      'source': 'places',
      'filter': ['!', ['has', 'point_count']],
      'layout': {
        'icon-image': [
          'case',
          ['boolean', ['has', "Existing?"], true],
          'circle-icon',
          'triangle-icon',
        ],
        'icon-size': 0.65,
        'text-field': ['get', 'index'],
        'text-size': 14,
      },
      'paint': {
        'icon-color': [
          'match', // https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-match
          ['get', 'Category'],
          'Arts', '#D9891C',
          'Business', '#D42A2A',
          'Community', 'rgba(212,42,42,0.3)',
          'Family', '#878484',
          'Landmark', '#EFC01C',
          'Park', '#064E3C',
          'Recreation', '#BAD9C6',
          'Residential', '#6794B4',
          'Religion', '#8A2E8C',
          '#000' //'#E0DFC8' // any other type
        ],
        'text-color': '#fff',
      }
    });

    // Insert the layer beneath any symbol layer.
    const layers = map.getStyle().layers;

    let labelLayerId;
    for (var i = 0; i < layers.length; i++) {
      if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
        labelLayerId = layers[i].id;
        break;
      }
    }

    map.addLayer(
      {
      'id': '3d-buildings',
      'source': 'composite',
      'source-layer': 'building',
      'filter': ['==', 'extrude', 'true'],
      'type': 'fill-extrusion',
      'minzoom': 10,
      'paint': {
        'fill-extrusion-color': '#E0DFC8',
        // use an 'interpolate' expression to add a smooth transition effect to the
        // buildings as the user zooms in
        'fill-extrusion-height': [
          'interpolate',
          ['linear'],
          ['zoom'],
          15,
          0,
          15.05,
          ['get', 'height']
        ],
        'fill-extrusion-base': [
          'interpolate',
          ['linear'],
          ['zoom'],
          15,
          0,
          15.05,
          ['get', 'min_height']
        ],
        'fill-extrusion-opacity': 0.6
      }
      },
      labelLayerId
    );

    map.on('click', 'places', (e) => {
      const coordinates = e.features[0].geometry.coordinates.slice();
      const name = e.features[0].properties.Name;
      const address = e.features[0].properties.Address;
      const description = e.features[0].properties.Quote;
      const type = e.features[0].properties.Category;
      const image = e.features[0].properties.image;

      // Ensure that if the map is zoomed out such that multiple
      // copies of the feature are visible, the popup appears
      // over the copy being pointed to.
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }

      map.flyTo({
        center: [coordinates[0], (coordinates[1]  + 0.00005)],
        zoom: 19,
      });

      new mapboxgl.Popup({offset: 20})
        .setLngLat(coordinates)
        .setHTML(`${image !== 'null' ? `<img src=${image} class="mapboxgl-popup-content-image" />` : ''}<div class="mapboxgl-popup-content-title f-rose f-green">${name}</div><div class="mapboxgl-popup-content-info f-serif f-green">${address} | ${type}</div><div class="mapboxgl-popup-content-quote f-serif">${description ? description : ''}</div>`)
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

    // fly to a location upon click in the legend or list
    const legendItems = document.querySelectorAll('.legend-assets-item-list-item');
    legendItems.forEach(item => {
      item.addEventListener('click', function () {
        const popup = document.getElementsByClassName('mapboxgl-popup');
        if ( popup.length ) {
            popup[0].remove();
        }
        collection.features.find(point => {
          if (item.id === point.properties.id) {
            const image = point.properties.image;

            map.flyTo({
              center: [point.geometry.coordinates[0], (point.geometry.coordinates[1]  + 0.00005)],
              zoom: 19,
            });
            new mapboxgl.Popup({offset: 20})
              .setLngLat(point.geometry.coordinates)
              .setHTML(`${image ? `<img src=${image} class="mapboxgl-popup-content-image" />` : ''}<div class="mapboxgl-popup-content-title f-rose f-green">${point.properties.Name}</div><div class="mapboxgl-popup-content-info f-serif f-green">${point.properties.Address} | ${point.properties.Category}</div>${point.properties.Website ? `<div class="mapboxgl-popup-content-info f-serif f-green"><a href="${point.properties.Website}">${point.properties.Website}</a></div>` : ''}${point.properties.payment ? `<div class="mapboxgl-popup-content-info f-serif f-green">Accepted payment types: ${point.properties.payment}</div>` : ''}${point.properties['Contact Info'] ? `<div class="mapboxgl-popup-content-info f-serif f-green">Contact info: ${point.properties['Contact Info']}</div>` : ''}${point.properties['Special Product'] ? `<div class="mapboxgl-popup-content-info f-serif f-green">Special product: ${point.properties['Special Product']}</div>` : ''}${point.properties.History ? `<div class="mapboxgl-popup-content-info f-serif f-green">History: ${point.properties.History}</div>` : ''}<div class="mapboxgl-popup-content-quote f-serif">${point.properties.Description ? point.properties.Description : ''}</div>`)
              .addTo(map);
          }
        })
      })
    })

    const listItems = document.querySelectorAll('.assets-item-list-item');
    listItems.forEach(item => {
      item.addEventListener('click', function () {
        const popup = document.getElementsByClassName('mapboxgl-popup');
        if ( popup.length ) {
            popup[0].remove();
        }
        collection.features.find(point => {
          if (item.id.slice(5) === point.properties.id) {
            const image = point.properties.image;
            map.flyTo({
              center: [point.geometry.coordinates[0], (point.geometry.coordinates[1]  + 0.00005)],
              zoom: 19,
            });
            new mapboxgl.Popup({offset: 20})
              .setLngLat(point.geometry.coordinates)
              .setHTML(`${image ? `<img src=${image} class="mapboxgl-popup-content-image" />` : ''}<div class="mapboxgl-popup-content-title f-rose f-green">${point.properties.Name}</div><div class="mapboxgl-popup-content-info f-serif f-green">${point.properties.Address} | ${point.properties.Category}</div>${point.properties.Website ? `<div class="mapboxgl-popup-content-info f-serif f-green"><a href="${point.properties.Website}">${point.properties.Website}</a></div>` : ''}${point.properties.payment ? `<div class="mapboxgl-popup-content-info f-serif f-green">Accepted payment types: ${point.properties.payment}</div>` : ''}${point.properties['Contact Info'] ? `<div class="mapboxgl-popup-content-info f-serif f-green">Contact info: ${point.properties['Contact Info']}</div>` : ''}${point.properties['Special Product'] ? `<div class="mapboxgl-popup-content-info f-serif f-green">Special product: ${point.properties['Special Product']}</div>` : ''}${point.properties.History ? `<div class="mapboxgl-popup-content-info f-serif f-green">History: ${point.properties.History}</div>` : ''}<div class="mapboxgl-popup-content-quote f-serif">${point.properties.Description ? point.properties.Description : ''}</div>`)
              .addTo(map);
          }
        })
      })
    })
  });
}
