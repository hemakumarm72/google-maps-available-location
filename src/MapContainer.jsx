import React, { useState, useEffect } from 'react';
import { Map, GoogleApiWrapper, Marker, Polyline } from 'google-maps-react';
import axios from 'axios';

const { decode } = require('@googlemaps/polyline-codec');

const mapStyles = {
  width: '100%',
  height: '100%',
};

const MapContainer = (props) => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [originCoordinates, setOriginCoordinates] = useState('');
  const [destinationCoordinates, setDestinationCoordinates] = useState('');
  const [station, setStation] = useState([]);
  const [nearby, setNearby] = useState([]);

  const [route, setRoute] = useState([]);
  const [token, setToken] = useState('');

  useEffect(() => {
    // Initialize the Places Autocomplete service

    const originAutocomplete = new props.google.maps.places.Autocomplete(
      document.getElementById('origin-input')
    );
    const destinationAutocomplete = new props.google.maps.places.Autocomplete(
      document.getElementById('destination-input')
    );

    // Set the Autocomplete options
    originAutocomplete.setFields(['formatted_address', 'geometry']);
    destinationAutocomplete.setFields(['formatted_address', 'geometry']);

    // Listen for place changes and update the input values and coordinates
    originAutocomplete.addListener('place_changed', () => {
      const place = originAutocomplete.getPlace();
      setOrigin('');
      setOriginCoordinates('');
      setOrigin(place.formatted_address || '');
      setOriginCoordinates(
        place.geometry
          ? {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            }
          : null
      );
    });

    destinationAutocomplete.addListener('place_changed', () => {
      const place = destinationAutocomplete.getPlace();
      setDestination('');
      setDestinationCoordinates('');
      setDestination(place.formatted_address || '');
      setDestinationCoordinates(
        place.geometry
          ? {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            }
          : null
      );
    });
  }, [props.google.maps.places.Autocomplete]);

  const handleSearch = async () => {
    // Perform your search logic here
    // Call the Google Maps Directions Service to fetch the route
    if (originCoordinates && destinationCoordinates) {
      const directionsService = new props.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: originCoordinates,
          destination: destinationCoordinates,
          travelMode: 'DRIVING',
        },
        async (result, status) => {
          if (status === 'OK') {
            const results = result;
            const decodevalue = decode(results.routes[0].overview_polyline, 5);

            await axios
              .post(
                'http://54.251.225.222:9000/api/mobile/users/getstations',
                {
                  nearby_cateroies: 'All', // 3 caterioes (All, "", cafes)
                  mapinformation: decodevalue,
                },
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              )
              .then((res) => {
                console.log(res?.data?.data?.message ?? 'error');
                setStation([]);
                setNearby([]);
                setStation(
                  res?.data?.data?.getstation[0]?.station_locations ?? []
                );
                setNearby(
                  res?.data?.data?.getstation[0]?.nearby_locations ?? []
                );
              })
              .catch((error) => {
                console.log(error);
              });
            const points = results.routes[0].overview_path.map((point) => ({
              lat: point.lat(),
              lng: point.lng(),
            }));
            setRoute([points]);
          }
        }
      );
    }
  };
  const handleMapReady = (mapProps, map) => {
    map.setOptions({
      disableDefaultUI: true, // Disable default UI controls on the map
      draggable: true, // Make the map draggable
      zoomControl: true, // Enable zoom control on the map
      zoomControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_CENTER, // Set zoom control position
      },
    });
  };

  return (
    <div>
      <div>
        <input
          type='text'
          id='token-input'
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder='token'
        />
        <input
          type='text'
          id='origin-input'
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          placeholder='Origin'
        />
        <input
          type='text'
          id='destination-input'
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder='Destination'
        />

        <button onClick={handleSearch}>Search</button>
      </div>
      <Map
        google={props.google}
        zoom={5.7}
        style={mapStyles}
        initialCenter={{
          lat: 22.838653014617776,
          lng: 79.48296253552503,
        }}
        onReady={handleMapReady}
      >
        {originCoordinates && (
          <Marker position={originCoordinates} title='Origin' />
        )}

        {destinationCoordinates && (
          <Marker position={destinationCoordinates} title='Destination' />
        )}

        {station.length > 0 &&
          station.map((item) => (
            <Marker
              position={{
                lat: Number(item.latitude),
                lng: Number(item.longitude),
              }}
              title={item.name}
              key={item._id}
              icon={{
                url: item.station_point_icon,
              }}
            />
          ))}

        {nearby.length > 0 &&
          nearby.map((item) => (
            <Marker
              position={{
                lat: Number(item.latitude),
                lng: Number(item.longitude),
              }}
              title={item.spot_name}
              key={item._id}
              icon={{
                url: item.nearby_point_icon,
              }}
            />
          ))}

        {route.length > 0 && (
          <Polyline
            path={route[0]}
            strokeColor='#FF0000'
            strokeOpacity={0.8}
            strokeWeight={2}
          />
        )}
      </Map>
    </div>
  );
};

export default GoogleApiWrapper({
  apiKey: process.env.REACT_APP_API,
})(MapContainer);
