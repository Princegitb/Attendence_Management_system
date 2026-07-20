import React, { useState, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Circle, Autocomplete } from '@react-google-maps/api';
import { MapPin, Search, Navigation, AlertCircle } from 'lucide-react';

const mapContainerStyle = {
  width: '100%',
  height: '320px',
  borderRadius: '16px',
};

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#4b687a' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#64779e' }] },
  { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#4b687a' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#334e68' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#023e8a' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d70' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6f9ba5' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c456b' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f0f3f8' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0077b6' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] },
];

const libraries = ['places'];

export default function LocationPickerMap({
  latitude,
  longitude,
  radius = 100,
  onLocationSelect
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries,
  });

  const [map, setMap] = useState(null);
  const [autocomplete, setAutocomplete] = useState(null);
  const [currentPos, setCurrentPos] = useState({
    lat: latitude ? parseFloat(latitude) : 28.613939,
    lng: longitude ? parseFloat(longitude) : 77.209021,
  });
  const [searchInput, setSearchInput] = useState('');

  const onMapLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
  }, []);

  const onAutocompleteLoad = (autoInstance) => {
    setAutocomplete(autoInstance);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address || place.name || '';
        
        setCurrentPos({ lat, lng });
        if (map) {
          map.panTo({ lat, lng });
          map.setZoom(17);
        }
        onLocationSelect({ latitude: lat, longitude: lng, address });
      }
    }
  };

  const handleMarkerDragEnd = (e) => {
    const newLat = e.latLng.lat();
    const newLng = e.latLng.lng();
    setCurrentPos({ lat: newLat, lng: newLng });
    onLocationSelect({ latitude: newLat, longitude: newLng });
  };

  const handleMapClick = (e) => {
    const clickLat = e.latLng.lat();
    const clickLng = e.latLng.lng();
    setCurrentPos({ lat: clickLat, lng: clickLng });
    onLocationSelect({ latitude: clickLat, longitude: clickLng });
  };

  const handleDetectCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCurrentPos({ lat, lng });
          if (map) {
            map.panTo({ lat, lng });
            map.setZoom(17);
          }
          onLocationSelect({ latitude: lat, longitude: lng });
        },
        (err) => {
          alert('Could not acquire your current location: ' + err.message);
        }
      );
    }
  };

  // If Google Maps Key is not configured yet or fails to load, render sleek fallback location picker
  if (!apiKey || loadError) {
    return (
      <div className="space-y-3">
        <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-sky-400" /> Fast Location Geocoder
            </span>
            <button
              type="button"
              onClick={handleDetectCurrentLocation}
              className="px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-xl font-semibold flex items-center gap-1 transition-all"
            >
              <Navigation className="w-3.5 h-3.5" /> Detect My GPS
            </button>
          </div>

          <p className="text-[11px] text-slate-400">
            Set Google Maps API Key (`VITE_GOOGLE_MAPS_API_KEY`) in `.env` for interactive Google Maps & Autocomplete.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Latitude</label>
              <input
                type="number"
                step="any"
                value={currentPos.lat}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCurrentPos(prev => ({ ...prev, lat: val }));
                  onLocationSelect({ latitude: val, longitude: currentPos.lng });
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Longitude</label>
              <input
                type="number"
                step="any"
                value={currentPos.lng}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCurrentPos(prev => ({ ...prev, lng: val }));
                  onLocationSelect({ latitude: currentPos.lat, longitude: val });
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-64 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 text-xs">
        Loading Google Maps...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search Autocomplete Header */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
            <input
              type="text"
              placeholder="Search landmark or address (e.g. DLF Cyber City, Gurgaon)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </Autocomplete>
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>

        <button
          type="button"
          onClick={handleDetectCurrentLocation}
          title="Detect Current GPS Location"
          className="p-2 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 rounded-xl transition-all"
        >
          <Navigation className="w-4 h-4" />
        </button>
      </div>

      {/* Interactive Google Map */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-700/80 shadow-lg">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={currentPos}
          zoom={16}
          onLoad={onMapLoad}
          onClick={handleMapClick}
          options={{
            styles: darkMapStyle,
            disableDefaultUI: false,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
          }}
        >
          {/* Draggable Post Marker */}
          <Marker
            position={currentPos}
            draggable={true}
            onDragEnd={handleMarkerDragEnd}
            title="Drag marker to set exact post pin"
          />

          {/* Geo-fence Radius Circle */}
          <Circle
            center={currentPos}
            radius={parseFloat(radius) || 100}
            options={{
              strokeColor: '#0284c7',
              strokeOpacity: 0.8,
              strokeWeight: 2,
              fillColor: '#0284c7',
              fillOpacity: 0.15,
            }}
          />
        </GoogleMap>

        <div className="absolute bottom-2 left-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-[10px] text-slate-300">
          📍 Lat: <span className="font-mono text-sky-400">{currentPos.lat.toFixed(6)}</span> | Lon: <span className="font-mono text-sky-400">{currentPos.lng.toFixed(6)}</span> (Radius: {radius}m)
        </div>
      </div>
    </div>
  );
}
